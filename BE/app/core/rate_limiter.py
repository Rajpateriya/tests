import time
from typing import Dict, Tuple
from fastapi import Request
from app.core.config import settings
from app.core.exceptions import RateLimitExceededException


class SimpleRateLimiter:
    """
    Sliding window rate limiter.
    Stores request timestamps per client IP.
    """

    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
        self._cache: Dict[str, list] = {}

    def is_rate_limited(self, client_id: str) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - 60.0

        timestamps = self._cache.get(client_id, [])
        # filter out timestamps older than window
        timestamps = [t for t in timestamps if t > window_start]

        if len(timestamps) >= self.requests_per_minute:
            retry_after = int(60.0 - (now - timestamps[0]))
            return True, max(1, retry_after)

        timestamps.append(now)
        self._cache[client_id] = timestamps
        return False, 0


rate_limiter = SimpleRateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)


async def check_rate_limit(request: Request) -> None:
    """FastAPI dependency to enforce rate limiting per client IP."""
    client_ip = request.client.host if request.client else "unknown"
    limited, retry_after = rate_limiter.is_rate_limited(client_ip)
    if limited:
        raise RateLimitExceededException(
            f"Rate limit exceeded. Please retry after {retry_after} seconds."
        )
