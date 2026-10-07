from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class SupportTicketRepository(BaseRepository):
    """Contact-form submissions ('support_tickets'), newest first."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "support_tickets")

    async def list_tickets(
        self, status: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"status": status} if status else {}
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_open(self) -> int:
        return await self.collection.count_documents({"status": "OPEN"})

    async def list_for_user(self, user_id: str, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
