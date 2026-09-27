import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.test import TestType
from app.repositories.question_repo import QuestionRepository
from app.repositories.test_repo import TestRepository
from app.schemas.test import TestCreate, TestDetailOut, TestFilterParams, TestSummaryOut


class TestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.test_repo = TestRepository(db)
        self.question_repo = QuestionRepository(db)

    async def list_tests(
        self,
        params: TestFilterParams,
        skip: int = 0,
        limit: int = 20,
    ) -> List[TestSummaryOut]:
        items = await self.test_repo.find_filtered(
            test_type=params.test_type.value if params.test_type else None,
            subject=params.subject,
            topic=params.topic,
            target_exam=params.target_exam,
            is_active=params.is_active,
            skip=skip,
            limit=limit,
        )
        return [self._to_summary(item) for item in items]

    async def get_test_by_id(self, test_id: str) -> TestDetailOut:
        test = await self.test_repo.get_by_id(test_id)
        if not test:
            raise NotFoundException(f"Test with id '{test_id}' not found")
        return self._to_detail(test)

    async def create_test(self, req: TestCreate) -> TestDetailOut:
        # Validate that questions actually exist
        existing_questions = await self.question_repo.get_by_ids(req.question_ids)
        if len(existing_questions) != len(req.question_ids):
            raise BadRequestException(
                f"Some question IDs do not exist. Found {len(existing_questions)} of {len(req.question_ids)}"
            )

        test_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        total_questions = len(req.question_ids)
        total_marks = total_questions * req.positive_marks_per_q

        doc = {
            "_id": test_id,
            "title": req.title,
            "description": req.description or "",
            "test_type": req.test_type.value,
            "target_exam": req.target_exam,
            "subject": req.subject,
            "topic": req.topic,
            "duration_minutes": req.duration_minutes,
            "total_marks": total_marks,
            "positive_marks_per_q": req.positive_marks_per_q,
            "negative_marks_per_q": req.negative_marks_per_q,
            "question_ids": req.question_ids,
            "total_questions": total_questions,
            "is_active": req.is_active,
            "created_at": now,
            "updated_at": now,
        }
        await self.test_repo.insert(doc)
        return self._to_detail(doc)

    async def auto_generate_mock(
        self,
        title: str,
        test_type: TestType,
        target_exam: str = "SSC CGL",
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        num_questions: int = 25,
        duration_minutes: int = 30,
        positive_marks: float = 2.0,
        negative_marks: float = 0.5,
    ) -> TestDetailOut:
        """Dynamic automated test compilation from the external question database."""
        sampled_questions = await self.question_repo.sample_questions(
            count=num_questions,
            subject=subject,
            topic=topic,
        )
        if not sampled_questions:
            raise BadRequestException("Not enough questions in database matching the criteria")

        question_ids = [q["_id"] for q in sampled_questions]
        req = TestCreate(
            title=title,
            description=f"Auto-generated {test_type.value} Mock for {target_exam}",
            test_type=test_type,
            target_exam=target_exam,
            subject=subject,
            topic=topic,
            duration_minutes=duration_minutes,
            positive_marks_per_q=positive_marks,
            negative_marks_per_q=negative_marks,
            question_ids=question_ids,
            is_active=True,
        )
        return await self.create_test(req)

    def _to_summary(self, doc: Dict[str, Any]) -> TestSummaryOut:
        return TestSummaryOut(
            id=doc["_id"],
            title=doc["title"],
            description=doc.get("description", ""),
            test_type=TestType(doc["test_type"]),
            target_exam=doc.get("target_exam", "SSC CGL"),
            subject=doc.get("subject"),
            topic=doc.get("topic"),
            duration_minutes=doc["duration_minutes"],
            total_marks=doc["total_marks"],
            positive_marks_per_q=doc.get("positive_marks_per_q", 2.0),
            negative_marks_per_q=doc.get("negative_marks_per_q", 0.5),
            total_questions=doc.get("total_questions", len(doc.get("question_ids", []))),
            is_active=doc.get("is_active", True),
            created_at=doc["created_at"],
        )

    def _to_detail(self, doc: Dict[str, Any]) -> TestDetailOut:
        summary = self._to_summary(doc)
        return TestDetailOut(
            **summary.model_dump(),
            question_ids=doc.get("question_ids", []),
        )
