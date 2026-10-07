import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.test import TestType
from app.repositories.question_repo import QuestionRepository
from app.repositories.test_repo import TestRepository
from app.schemas.test import (
    AdminTestDetailOut,
    TestCourseRef,
    TestCreate,
    TestDetailOut,
    TestFilterParams,
    TestQuestionOut,
    TestSummaryOut,
    TestUpdate,
)


class TestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
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
            search=params.search,
            is_active=params.is_active,
            is_free=params.is_free,
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
            "sub_subject": req.sub_subject,
            "topic": req.topic,
            "duration_minutes": req.duration_minutes,
            "total_marks": total_marks,
            "positive_marks_per_q": req.positive_marks_per_q,
            "negative_marks_per_q": req.negative_marks_per_q,
            "question_ids": req.question_ids,
            "total_questions": total_questions,
            "is_active": req.is_active,
            "is_free": req.is_free,
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

    # ── Admin: see, edit and delete a test ──

    async def _admin_detail(self, doc: Dict[str, Any]) -> AdminTestDetailOut:
        courses = await self.db.courses.find(
            {"quizzes.id": doc["_id"]}, {"title": 1, "is_published": 1}
        ).to_list(length=100)
        return AdminTestDetailOut(
            **self._to_detail(doc).model_dump(),
            updated_at=doc.get("updated_at"),
            courses=[
                TestCourseRef(id=c["_id"], title=c.get("title", ""), is_published=c.get("is_published", True))
                for c in courses
            ],
        )

    async def get_admin_test(self, test_id: str) -> AdminTestDetailOut:
        doc = await self.test_repo.get_by_id(test_id)
        if not doc:
            raise NotFoundException(f"Test with id '{test_id}' not found")
        return await self._admin_detail(doc)

    async def list_questions_for_admin(self, test_id: str) -> List[TestQuestionOut]:
        """The test's questions in test order, with the correct answers (admin only)."""
        doc = await self.test_repo.get_by_id(test_id)
        if not doc:
            raise NotFoundException(f"Test with id '{test_id}' not found")
        questions = await self.question_repo.get_by_ids(doc.get("question_ids", []))
        return [
            TestQuestionOut(
                id=q["_id"],
                question_text=q.get("question_text", ""),
                options=q.get("options", []),
                correct_option=q.get("correct_option", ""),
                solution_explanation=q.get("solution_explanation", ""),
                difficulty=q.get("difficulty"),
                subject=q.get("subject"),
                topic=q.get("topic"),
                subtopic=q.get("subtopic"),
            )
            for q in questions
        ]

    async def update_test(self, test_id: str, req: TestUpdate) -> AdminTestDetailOut:
        doc = await self.test_repo.get_by_id(test_id)
        if not doc:
            raise NotFoundException(f"Test with id '{test_id}' not found")

        changes = req.model_dump(exclude_none=True)
        if "title" in changes:
            changes["title"] = changes["title"].strip()
        if "description" in changes:
            changes["description"] = changes["description"].strip()
        if "positive_marks_per_q" in changes:
            count = doc.get("total_questions") or len(doc.get("question_ids", []))
            changes["total_marks"] = round(changes["positive_marks_per_q"] * count, 2)
        if not changes:
            return await self._admin_detail(doc)

        changes["updated_at"] = datetime.now(timezone.utc)
        updated = await self.test_repo.update(test_id, changes)

        # Courses keep a small copy of the test's title, duration and marks for display: keep it in step.
        copies = {
            "title": updated.get("title"),
            "duration_minutes": updated.get("duration_minutes"),
            "positive_marks": updated.get("positive_marks_per_q"),
            "negative_marks": updated.get("negative_marks_per_q"),
        }
        async for course in self.db.courses.find({"quizzes.id": test_id}):
            quizzes = [{**q, **copies} if q.get("id") == test_id else q for q in course.get("quizzes", [])]
            await self.db.courses.update_one({"_id": course["_id"]}, {"$set": {"quizzes": quizzes}})

        return await self._admin_detail(updated)

    async def delete_test(self, test_id: str) -> Dict[str, Any]:
        """Delete a test and take it out of every course that had it. Students' finished results
        are kept; a test someone is taking right now cannot be deleted under them."""
        doc = await self.test_repo.get_by_id(test_id)
        if not doc:
            raise NotFoundException(f"Test with id '{test_id}' not found")

        taking_now = await self.db.attempts.count_documents(
            {"test_id": test_id, "status": {"$in": ["IN_PROGRESS", "PAUSED"]}}
        )
        if taking_now:
            raise ConflictException(
                f"{taking_now} student(s) are taking this test right now. Delete it once they have finished."
            )

        removed_from, unpublished = [], []
        now = datetime.now(timezone.utc)
        async for course in self.db.courses.find({"quizzes.id": test_id}):
            quizzes = [q for q in course.get("quizzes", []) if q.get("id") != test_id]
            changes: Dict[str, Any] = {"quizzes": quizzes, "updated_at": now}
            if course.get("created_by"):  # admin-made course: its subjects follow the tests that remain
                changes["subjects"] = list(dict.fromkeys(q["subject"] for q in quizzes if q.get("subject")))
            if not quizzes and course.get("is_published") is not False:
                changes["is_published"] = False  # a course with nothing in it must not stay published
                unpublished.append(course.get("title", ""))
            await self.db.courses.update_one({"_id": course["_id"]}, {"$set": changes})
            removed_from.append(course.get("title", ""))

        await self.test_repo.delete(test_id)
        kept = await self.db.attempts.count_documents({"test_id": test_id})
        return {
            "deleted": test_id,
            "title": doc.get("title", ""),
            "removed_from_courses": removed_from,
            "unpublished_courses": unpublished,
            "attempts_kept": kept,
        }

    def _to_summary(self, doc: Dict[str, Any]) -> TestSummaryOut:
        return TestSummaryOut(
            id=doc["_id"],
            title=doc["title"],
            description=doc.get("description", ""),
            test_type=TestType(doc["test_type"]),
            target_exam=doc.get("target_exam", "SSC CGL"),
            subject=doc.get("subject"),
            sub_subject=doc.get("sub_subject"),
            topic=doc.get("topic"),
            duration_minutes=doc["duration_minutes"],
            total_marks=doc["total_marks"],
            positive_marks_per_q=doc.get("positive_marks_per_q", 2.0),
            negative_marks_per_q=doc.get("negative_marks_per_q", 0.5),
            total_questions=doc.get("total_questions", len(doc.get("question_ids", []))),
            is_active=doc.get("is_active", True),
            is_free=doc.get("is_free", False),
            created_at=doc["created_at"],
        )

    def _to_detail(self, doc: Dict[str, Any]) -> TestDetailOut:
        summary = self._to_summary(doc)
        return TestDetailOut(
            **summary.model_dump(),
            question_ids=doc.get("question_ids", []),
        )
