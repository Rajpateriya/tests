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

    async def find_filtered(
        self,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if subject:
            query["subject"] = {"$regex": f"^{subject}$", "$options": "i"}
        if topic:
            query["topic"] = {"$regex": f"^{topic}$", "$options": "i"}
        if difficulty:
            query["difficulty"] = difficulty
        if search:
            query["question_text"] = {"$regex": search, "$options": "i"}

        return await self.find_many(query, skip=skip, limit=limit)

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
