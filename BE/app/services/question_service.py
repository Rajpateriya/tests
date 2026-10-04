import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import NotFoundException
from app.models.question import Difficulty, OptionItem
from app.repositories.question_repo import QuestionRepository
from app.schemas.question import QuestionCreate, QuestionFilterParams, QuestionOut, QuestionPage


class QuestionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = QuestionRepository(db)

    async def get_by_id(self, question_id: str) -> QuestionOut:
        q = await self.repo.get_by_id(question_id)
        if not q:
            raise NotFoundException(f"Question with id '{question_id}' not found")
        return self._to_question_out(q)

    async def list_questions(
        self,
        params: QuestionFilterParams,
        skip: int = 0,
        limit: int = 20,
    ) -> List[QuestionOut]:
        items = await self.repo.find_filtered(
            skip=skip, limit=limit, **self._filters(params)
        )
        return [self._to_question_out(item) for item in items]

    async def list_page(
        self, params: QuestionFilterParams, page: int = 1, page_size: int = 20
    ) -> QuestionPage:
        """One page (newest first) plus the totals a pagination control needs."""
        filters = self._filters(params)
        total = await self.repo.count_filtered(**filters)
        pages = max(1, -(-total // page_size))
        page = min(max(page, 1), pages)
        items = await self.repo.find_filtered(
            skip=(page - 1) * page_size, limit=page_size, newest_first=True, **filters
        )
        return QuestionPage(
            items=[self._to_question_out(item) for item in items],
            total=total, page=page, page_size=page_size, pages=pages,
        )

    @staticmethod
    def _filters(params: QuestionFilterParams) -> Dict[str, Any]:
        return {
            "subject": params.subject,
            "topic": params.topic,
            "difficulty": params.difficulty.value if params.difficulty else None,
            "search": params.search,
            "sub_subject": params.sub_subject,
            "subtopic": params.subtopic,
            "target_exam": params.target_exam,
            "source": params.source,
        }

    async def create_question(self, req: QuestionCreate) -> QuestionOut:
        q_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        doc = {
            "_id": q_id,
            "subject": req.subject,
            "topic": req.topic,
            "difficulty": req.difficulty.value,
            "question_text": req.question_text,
            "options": [opt.model_dump() for opt in req.options],
            "correct_option": req.correct_option.strip().upper(),
            "solution_explanation": req.solution_explanation,
            "external_id": req.external_id,
            "created_at": now,
        }
        await self.repo.insert(doc)
        return self._to_question_out(doc)

    async def ingest_pipeline_questions(self, questions: List[QuestionCreate]) -> Dict[str, Any]:
        """Connector/Ingestion method to import questions from external automated data pipeline."""
        now = datetime.now(timezone.utc)
        docs_to_insert = []
        for q in questions:
            q_id = str(uuid.uuid4())
            docs_to_insert.append({
                "_id": q_id,
                "subject": q.subject,
                "topic": q.topic,
                "difficulty": q.difficulty.value,
                "question_text": q.question_text,
                "options": [opt.model_dump() for opt in q.options],
                "correct_option": q.correct_option.strip().upper(),
                "solution_explanation": q.solution_explanation,
                "external_id": q.external_id,
                "created_at": now,
            })
        if docs_to_insert:
            await self.repo.insert_many(docs_to_insert)
        return {
            "ingested_count": len(docs_to_insert),
            "question_ids": [d["_id"] for d in docs_to_insert],
        }

    async def sample_questions_for_mock(
        self,
        count: int,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> List[str]:
        sampled = await self.repo.sample_questions(
            count=count,
            subject=subject,
            topic=topic,
            difficulty=difficulty,
        )
        return [q["_id"] for q in sampled]

    def _to_question_out(self, doc: Dict[str, Any]) -> QuestionOut:
        return QuestionOut(
            id=doc["_id"],
            subject=doc["subject"],
            topic=doc["topic"],
            difficulty=Difficulty(doc["difficulty"]),
            question_text=doc["question_text"],
            options=[OptionItem(**opt) for opt in doc["options"]],
            correct_option=doc["correct_option"],
            solution_explanation=doc["solution_explanation"],
            created_at=doc["created_at"],
            sub_subject=doc.get("sub_subject"),
            subtopic=doc.get("subtopic"),
            target_exam=doc.get("target_exam"),
            source=doc.get("source"),
            grounded=doc.get("grounded"),
            used_in_tests=doc.get("used_in_tests"),
        )
