from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class TypingRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "typing_master_para")
        self.attempts_collection = db["typing_attempts"]

    async def get_random_passage(self) -> Optional[Dict[str, Any]]:
        cursor = self.collection.aggregate([
            {"$match": {"is_active": {"$ne": False}}},
            {"$sample": {"size": 1}}
        ])
        results = await cursor.to_list(length=1)
        if results:
            return results[0]
        # Fallback to any passage if active filter returns nothing
        cursor2 = self.collection.aggregate([{"$sample": {"size": 1}}])
        results2 = await cursor2.to_list(length=1)
        return results2[0] if results2 else None

    async def get_active_passages(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": {"$ne": False}}
        if category and category != "All":
            query["exam_category"] = category
        cursor = self.collection.find(query)
        return await cursor.to_list(length=100)

    async def save_attempt(self, attempt_doc: Dict[str, Any]) -> Dict[str, Any]:
        await self.attempts_collection.insert_one(attempt_doc)
        return attempt_doc

    async def get_user_attempts(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        cursor = self.attempts_collection.find({"user_id": user_id}).sort([("created_at", -1)]).limit(limit)
        return await cursor.to_list(length=limit)
