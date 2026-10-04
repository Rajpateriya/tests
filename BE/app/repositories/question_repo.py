import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class QuestionRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "questions")

    async def get_by_ids(self, question_ids: List[str]) -> List[Dict[str, Any]]:
        if not question_ids:
            return []
        cursor = self.collection.find({"_id": {"$in": question_ids}})
        questions = await cursor.to_list(length=len(question_ids))
        # Keep original order of requested question_ids
        q_map = {q["_id"]: q for q in questions}
        return [q_map[qid] for qid in question_ids if qid in q_map]

    @staticmethod
    def _build_query(
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        sub_subject: Optional[str] = None,
        subtopic: Optional[str] = None,
        target_exam: Optional[str] = None,
        source: Optional[str] = None,
    ) -> Dict[str, Any]:
        def exact(value: str) -> Dict[str, str]:
            return {"$regex": f"^{re.escape(value.strip())}$", "$options": "i"}

        query: Dict[str, Any] = {}
        for field, value in (("subject", subject), ("topic", topic), ("sub_subject", sub_subject),
                             ("subtopic", subtopic), ("target_exam", target_exam)):
            if value and value.strip():
                query[field] = exact(value)
        if difficulty:
            query["difficulty"] = difficulty
        if source == "ai_knowledge":
            query["source"] = "ai_knowledge"
        elif source == "theory":
            query["source"] = {"$ne": "ai_knowledge"}  # older questions have no `source`
        if search and search.strip():
            query["question_text"] = {"$regex": re.escape(search.strip()), "$options": "i"}
        return query

    async def find_filtered(
        self,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sub_subject: Optional[str] = None,
        subtopic: Optional[str] = None,
        target_exam: Optional[str] = None,
        source: Optional[str] = None,
        newest_first: bool = False,
    ) -> List[Dict[str, Any]]:
        query = self._build_query(subject, topic, difficulty, search, sub_subject, subtopic, target_exam, source)
        # A stable sort keeps pages from overlapping when many questions share a timestamp.
        sort = [("created_at", -1), ("_id", 1)] if newest_first else None
        return await self.find_many(query, skip=skip, limit=limit, sort=sort)

    async def count_filtered(
        self,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        sub_subject: Optional[str] = None,
        subtopic: Optional[str] = None,
        target_exam: Optional[str] = None,
        source: Optional[str] = None,
    ) -> int:
        return await self.count(
            self._build_query(subject, topic, difficulty, search, sub_subject, subtopic, target_exam, source)
        )

    async def sample_questions(
        self,
        count: int,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Randomly sample N questions matching the criteria (useful for automated mock test generator)."""
        match_stage: Dict[str, Any] = {}
        if subject:
            match_stage["subject"] = {"$regex": f"^{subject}$", "$options": "i"}
        if topic:
            match_stage["topic"] = {"$regex": f"^{topic}$", "$options": "i"}
        if difficulty:
            match_stage["difficulty"] = difficulty

        pipeline = []
        if match_stage:
            pipeline.append({"$match": match_stage})
        pipeline.append({"$sample": {"size": count}})

        cursor = self.collection.aggregate(pipeline)
        return await cursor.to_list(length=count)
