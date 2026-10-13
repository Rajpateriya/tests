import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.sse_manager import sse_manager
from app.repositories.notification_repo import NotificationRepository
from app.schemas.notification import NotificationOut


class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = NotificationRepository(db)

    def _to_out(self, doc: Dict[str, Any], viewer_id: str) -> NotificationOut:
        return NotificationOut(
            id=doc["_id"],
            audience=doc["audience"],
            user_id=doc.get("user_id"),
            type=doc["type"],
            title=doc["title"],
            message=doc["message"],
            ticket_id=doc.get("ticket_id"),
            is_read=viewer_id in doc.get("read_by", []),
            created_at=doc["created_at"],
        )

    @staticmethod
    def _to_event(doc: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": doc["_id"],
            "type": doc["type"],
            "title": doc["title"],
            "message": doc["message"],
            "ticket_id": doc.get("ticket_id"),
            "created_at": doc["created_at"].isoformat(),
        }

    async def notify_admins(self, type_: str, title: str, message: str, ticket_id: Optional[str] = None) -> None:
        """One shared notification every admin sees (each tracks their own read state)."""
        doc = {
            "_id": str(uuid.uuid4()),
            "audience": "ADMIN",
            "user_id": None,
            "type": type_,
            "title": title,
            "message": message,
            "ticket_id": ticket_id,
            "read_by": [],
            "created_at": datetime.now(timezone.utc),
        }
        await self.repo.insert(doc)
        sse_manager.push_to_admins(self._to_event(doc))

    async def notify_user(self, user_id: str, type_: str, title: str, message: str, ticket_id: Optional[str] = None) -> None:
        doc = {
            "_id": str(uuid.uuid4()),
            "audience": "USER",
            "user_id": user_id,
            "type": type_,
            "title": title,
            "message": message,
            "ticket_id": ticket_id,
            "read_by": [],
            "created_at": datetime.now(timezone.utc),
        }
        await self.repo.insert(doc)
        sse_manager.push_to_user(user_id, self._to_event(doc))

    async def list_mine(self, user_id: str, is_admin: bool, unread_only: bool = False) -> List[NotificationOut]:
        docs = await self.repo.list_for_viewer(user_id, is_admin, unread_only=unread_only)
        return [self._to_out(d, user_id) for d in docs]

    async def count_unread(self, user_id: str, is_admin: bool) -> int:
        return await self.repo.count_unread(user_id, is_admin)

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        await self.repo.mark_read(notification_id, user_id)

    async def mark_all_read(self, user_id: str, is_admin: bool) -> None:
        await self.repo.mark_all_read(user_id, is_admin)
