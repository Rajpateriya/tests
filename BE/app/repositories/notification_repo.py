from typing import Any, Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository):
    """Notifications ('notifications'). An ADMIN-audience one is shared by every admin; each
    admin's own read state is tracked separately in `read_by`, so one admin reading it doesn't
    hide it from another. A USER-audience one belongs to exactly one person."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "notifications")

    def _viewer_query(self, user_id: str, is_admin: bool) -> Dict[str, Any]:
        if is_admin:
            return {"$or": [{"audience": "ADMIN"}, {"user_id": user_id}]}
        return {"audience": "USER", "user_id": user_id}

    async def list_for_viewer(
        self, user_id: str, is_admin: bool, unread_only: bool = False, limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = self._viewer_query(user_id, is_admin)
        if unread_only:
            query = {"$and": [query, {"read_by": {"$ne": user_id}}]}
        cursor = self.collection.find(query).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_unread(self, user_id: str, is_admin: bool) -> int:
        query = self._viewer_query(user_id, is_admin)
        return await self.collection.count_documents({"$and": [query, {"read_by": {"$ne": user_id}}]})

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        await self.collection.update_one({"_id": notification_id}, {"$addToSet": {"read_by": user_id}})

    async def mark_all_read(self, user_id: str, is_admin: bool) -> None:
        await self.collection.update_many(self._viewer_query(user_id, is_admin), {"$addToSet": {"read_by": user_id}})
