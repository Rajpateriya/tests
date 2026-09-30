"""LangChain-based LLM client for Google Gemini.

Uses LangChain's `with_structured_output` so responses are guaranteed to
validate against a given Pydantic schema, instead of hand-rolled JSON
cleanup/regex.

Two model tiers are kept: the default (higher-quality) model for quiz
generation, and a cheaper/lighter model for high-volume, low-complexity
work like tagging PDF chunks with a topic/subtopic.

Every call goes through a per-model sliding-window rate limiter, so long
runs (bulk generation, large uploads) wait for quota instead of failing.
"""
import asyncio
import time
from collections import deque
from typing import Deque, Dict, Optional, Type, TypeVar

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)

RATE_LIMIT_RETRIES = 2
RATE_LIMIT_BACKOFF_SECONDS = 60


class _RateLimiter:
    """Allows at most `per_minute` calls in any rolling 60-second window."""

    def __init__(self, per_minute: int):
        self.per_minute = max(1, per_minute)
        self.calls: Deque[float] = deque()
        self._lock: Optional[asyncio.Lock] = None

    async def acquire(self) -> None:
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            while True:
                now = time.monotonic()
                while self.calls and now - self.calls[0] >= 60:
                    self.calls.popleft()
                if len(self.calls) < self.per_minute:
                    self.calls.append(now)
                    return
                wait = 60 - (now - self.calls[0]) + 0.1
                logger.info(f"LLM rate limit ({self.per_minute}/min) reached — waiting {wait:.1f}s")
                await asyncio.sleep(wait)


def _is_rate_limited(error: Exception) -> bool:
    text = str(error)
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "ResourceExhausted" in type(error).__name__


class LLMClient:
    """Thin LangChain wrapper around Gemini chat models (default + light tier)."""

    def __init__(self):
        self._llm: ChatGoogleGenerativeAI | None = None
        self._llm_light: ChatGoogleGenerativeAI | None = None
        self._limiters: Dict[str, _RateLimiter] = {}

    @property
    def is_configured(self) -> bool:
        return bool(settings.GOOGLE_API_KEY)

    def _build(self, model: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
            max_retries=2,
            timeout=120.0,
        )

    def _get_llm(self) -> ChatGoogleGenerativeAI:
        if self._llm is None:
            self._llm = self._build(settings.GEMINI_MODEL)
        return self._llm

    def _get_light_llm(self) -> ChatGoogleGenerativeAI:
        if self._llm_light is None:
            self._llm_light = self._build(settings.GEMINI_TAGGING_MODEL)
        return self._llm_light

    def _limiter(self, model_name: str) -> _RateLimiter:
        # Keyed by model name: Gemini quotas are per model, and both tiers may
        # point at the same model, in which case they must share one budget.
        if model_name not in self._limiters:
            self._limiters[model_name] = _RateLimiter(settings.LLM_REQUESTS_PER_MINUTE)
        return self._limiters[model_name]

    async def generate(
        self, prompt: str, response_class: Type[T], light: bool = False
    ) -> T:
        """Call the LLM and return a validated instance of `response_class`.

        Set `light=True` for simple, high-volume tasks (e.g. chunk tagging)
        to use the cheaper `GEMINI_TAGGING_MODEL` instead of the default.
        """
        if not self.is_configured:
            raise RuntimeError("GOOGLE_API_KEY is not configured")

        base_llm = self._get_light_llm() if light else self._get_llm()
        model_name = settings.GEMINI_TAGGING_MODEL if light else settings.GEMINI_MODEL

        print(f"\n{'='*60}")
        print(f"LLM CALL -> model={model_name} response_class={response_class.__name__}")
        print(f"{'='*60}")
        print(prompt[:3000] + ("...[truncated]" if len(prompt) > 3000 else ""))
        print(f"{'='*60}\n")

        # method="json_mode": Gemini's native function-calling schema converter
        # (the default method) can't declare nested Pydantic models inside a
        # list (e.g. `tags: List[ChunkTag]`), raising "Value not declarable
        # with JSON Schema". json_mode prompts for matching JSON directly
        # instead of building a native function schema, avoiding that limit.
        structured_llm = base_llm.with_structured_output(response_class, method="json_mode")

        for attempt in range(RATE_LIMIT_RETRIES + 1):
            await self._limiter(model_name).acquire()
            try:
                result = await structured_llm.ainvoke(prompt)
                print(f"LLM RESPONSE <- {result}\n")
                return result
            except Exception as e:
                if _is_rate_limited(e) and attempt < RATE_LIMIT_RETRIES:
                    logger.warning(
                        f"Gemini quota exceeded (429) — waiting {RATE_LIMIT_BACKOFF_SECONDS}s "
                        f"before retry {attempt + 1}/{RATE_LIMIT_RETRIES}"
                    )
                    await asyncio.sleep(RATE_LIMIT_BACKOFF_SECONDS)
                    continue
                logger.error(f"LLM structured generation failed: {e}")
                raise


llm_client = LLMClient()
