import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import BadRequestException, ConflictException, ExamStateException, NotFoundException
from app.core.logging import logger
from app.db.redis import RedisManager, redis_manager
from app.models.attempt import AttemptStatus, PaletteStatus
from app.models.question import Difficulty, OptionItem
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.test_repo import TestRepository
from app.schemas.attempt import (
    AttemptQuestionsResponse,
    AttemptStartResponse,
    AttemptSyncRequest,
    AttemptSyncResponse,
)
from app.schemas.question import QuestionPublicOut


class ExamEngineService:
    def __init__(self, db: AsyncIOMotorDatabase, redis: Optional[Any] = None):
        self.db = db
        self.attempt_repo = AttemptRepository(db)
        self.test_repo = TestRepository(db)
        self.question_repo = QuestionRepository(db)
        self.redis = redis or redis_manager.get_client()

    def _redis_attempt_key(self, attempt_id: str) -> str:
        return f"attempt:state:{attempt_id}"

    async def start_attempt(self, user_id: str, test_id: str) -> AttemptStartResponse:
        """
        Initialize an exam attempt.
        - Checks for existing in-progress attempt (returns it for seamless resume).
        - Verifies test exists and is active.
        - Calculates server-side start and expiry time.
        - Prepopulates question palette (all NOT_VISITED except Q1 as NOT_ANSWERED).
        - Caches session in Redis for high-throughput sync.
        """
        # Check if user already has an active attempt for THIS test
        existing_attempt = await self.attempt_repo.get_active_attempt(user_id, test_id)
        if existing_attempt:
            now = datetime.now(timezone.utc)
            expiry_time = existing_attempt["expiry_time"]
            if expiry_time.tzinfo is None:
                expiry_time = expiry_time.replace(tzinfo=timezone.utc)

            remaining_seconds = int((expiry_time - now).total_seconds())
            if remaining_seconds <= 0:
                # Expired, let evaluation handle or return expired
                logger.info(f"Existing attempt {existing_attempt['_id']} expired. Proceeding to auto-submit.")
            else:
                logger.info(f"Resuming existing attempt {existing_attempt['_id']} for user {user_id}")
                return AttemptStartResponse(
                    attempt_id=existing_attempt["_id"],
                    test_id=test_id,
                    test_title=existing_attempt.get("test_title", ""),
                    duration_minutes=existing_attempt.get("duration_minutes", 60),
                    remaining_seconds=remaining_seconds,
                    start_time=existing_attempt["start_time"],
                    expiry_time=expiry_time,
                    status=AttemptStatus.IN_PROGRESS,
                    total_questions=len(existing_attempt.get("palette_states", {})),
                )

        # Check if user has an active test on ANOTHER test (prevent cheating / multi-test)
        other_active = await self.attempt_repo.get_any_active_attempt_for_user(user_id)
        if other_active:
            raise ConflictException(
                f"You already have an active test '{other_active.get('test_title')}' in progress. "
                f"Please submit or finish it before starting another."
            )

        # Retrieve test details
        test = await self.test_repo.get_by_id(test_id)
        if not test:
            raise NotFoundException("Test not found")
        if not test.get("is_active", True):
            raise BadRequestException("This test is currently inactive")

        question_ids = test.get("question_ids", [])
        if not question_ids:
            raise BadRequestException("This test has no questions configured")

        now = datetime.now(timezone.utc)
        duration_minutes = test["duration_minutes"]
        expiry_time = now + timedelta(minutes=duration_minutes)

        # Initialize question palette (TCS iON style)
        palette_states: Dict[str, str] = {}
        for idx, qid in enumerate(question_ids):
            palette_states[qid] = (
                PaletteStatus.NOT_ANSWERED.value if idx == 0 else PaletteStatus.NOT_VISITED.value
            )

        attempt_id = str(uuid.uuid4())
        attempt_doc = {
            "_id": attempt_id,
            "user_id": user_id,
            "test_id": test_id,
            "test_title": test.get("title", ""),
            "test_type": test.get("test_type", "FULL"),
            "duration_minutes": duration_minutes,
            "start_time": now,
            "expiry_time": expiry_time,
            "status": AttemptStatus.IN_PROGRESS.value,
            "current_question_index": 0,
            "palette_states": palette_states,
            "answers": {},
            "time_spent_per_question": {},
            "tab_switch_count": 0,
            "total_score": 0.0,
            "created_at": now,
            "updated_at": now,
        }

        # Save to MongoDB
        await self.attempt_repo.insert(attempt_doc)

        # Cache initial state to Redis with TTL
        cache_data = {
            "attempt_id": attempt_id,
            "user_id": user_id,
            "test_id": test_id,
            "expiry_timestamp": expiry_time.timestamp(),
            "current_question_index": 0,
            "palette_states": palette_states,
            "answers": {},
            "time_spent_per_question": {},
        }
        ttl_seconds = int((expiry_time - now).total_seconds()) + 3600  # grace period
        await self.redis.set(self._redis_attempt_key(attempt_id), json.dumps(cache_data), ex=ttl_seconds)

        return AttemptStartResponse(
            attempt_id=attempt_id,
            test_id=test_id,
            test_title=test.get("title", ""),
            duration_minutes=duration_minutes,
            remaining_seconds=int(duration_minutes * 60),
            start_time=now,
            expiry_time=expiry_time,
            status=AttemptStatus.IN_PROGRESS,
            total_questions=len(question_ids),
        )

    async def get_attempt_questions(self, attempt_id: str, user_id: str) -> AttemptQuestionsResponse:
        """
        Fetch questions for the active test session.
        CRITICAL SECURITY: Masks correct answers and explanations!
        """
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")

        test = await self.test_repo.get_by_id(attempt["test_id"])
        if not test:
            raise NotFoundException("Test configuration not found")

        # Compute remaining seconds
        now = datetime.now(timezone.utc)
        expiry_time = attempt["expiry_time"]
        if expiry_time.tzinfo is None:
            expiry_time = expiry_time.replace(tzinfo=timezone.utc)
        remaining_seconds = max(0, int((expiry_time - now).total_seconds()))

        # Check if Redis has freshest palette / answer states
        cached_raw = await self.redis.get(self._redis_attempt_key(attempt_id))
        if cached_raw:
            cached = json.loads(cached_raw)
            palette_states = {k: PaletteStatus(v) for k, v in cached.get("palette_states", {}).items()}
            answers = cached.get("answers", {})
            time_spent = cached.get("time_spent_per_question", {})
            current_index = cached.get("current_question_index", 0)
        else:
            palette_states = {k: PaletteStatus(v) for k, v in attempt.get("palette_states", {}).items()}
            answers = attempt.get("answers", {})
            time_spent = attempt.get("time_spent_per_question", {})
            current_index = attempt.get("current_question_index", 0)

        # Fetch questions from DB
        question_docs = await self.question_repo.get_by_ids(test.get("question_ids", []))
        public_questions: List[QuestionPublicOut] = []
        for q in question_docs:
            public_questions.append(
                QuestionPublicOut(
                    id=q["_id"],
                    subject=q["subject"],
                    topic=q["topic"],
                    difficulty=Difficulty(q["difficulty"]),
                    question_text=q["question_text"],
                    options=[OptionItem(**opt) for opt in q["options"]],
                )
            )

        return AttemptQuestionsResponse(
            attempt_id=attempt_id,
            test_id=attempt["test_id"],
            test_title=attempt.get("test_title", ""),
            duration_minutes=attempt.get("duration_minutes", test.get("duration_minutes", 60)),
            remaining_seconds=remaining_seconds,
            current_question_index=current_index,
            palette_states=palette_states,
            answers=answers,
            time_spent_per_question=time_spent,
            questions=public_questions,
        )

    async def sync_attempt_state(
        self, attempt_id: str, user_id: str, req: AttemptSyncRequest
    ) -> AttemptSyncResponse:
        """
        Heartbeat / periodic sync endpoint.
        Stores state into Redis instantly, and persists to MongoDB for durability.
        """
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")

        if attempt["status"] != AttemptStatus.IN_PROGRESS.value:
            raise ExamStateException(f"Cannot sync: test is already {attempt['status']}")

        now = datetime.now(timezone.utc)
        expiry_time = attempt["expiry_time"]
        if expiry_time.tzinfo is None:
            expiry_time = expiry_time.replace(tzinfo=timezone.utc)

        remaining_seconds = int((expiry_time - now).total_seconds())
        is_expired = remaining_seconds <= 0

        # Update Redis cache
        cache_data = {
            "attempt_id": attempt_id,
            "user_id": user_id,
            "test_id": attempt["test_id"],
            "expiry_timestamp": expiry_time.timestamp(),
            "current_question_index": req.current_question_index,
            "palette_states": {k: v.value for k, v in req.palette_states.items()},
            "answers": req.answers,
            "time_spent_per_question": req.time_spent_per_question,
        }
        await self.redis.set(
            self._redis_attempt_key(attempt_id),
            json.dumps(cache_data),
            ex=max(3600, remaining_seconds + 3600),
        )

        # Durably update MongoDB
        await self.attempt_repo.update_sync_state(
            attempt_id=attempt_id,
            current_question_index=req.current_question_index,
            palette_states={k: v.value for k, v in req.palette_states.items()},
            answers=req.answers,
            time_spent_per_question=req.time_spent_per_question,
            tab_switch_count=req.tab_switch_count,
        )

        return AttemptSyncResponse(
            attempt_id=attempt_id,
            remaining_seconds=max(0, remaining_seconds),
            synced_at=now,
            is_expired=is_expired,
            message="State saved and synced" if not is_expired else "Exam time has expired",
        )
