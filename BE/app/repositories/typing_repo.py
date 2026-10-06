from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class TypingRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "typing_passages")
        self.attempts_collection = db["typing_attempts"]

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
