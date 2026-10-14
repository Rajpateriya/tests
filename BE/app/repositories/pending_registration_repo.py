from typing import Any, Dict, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class PendingRegistrationRepository(BaseRepository):
    """Repository for temporary storage of pending user registrations awaiting OTP verification."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "pending_registrations")

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"email": email.lower().strip()})

    async def upsert_pending(self, email: str, data: Dict[str, Any]) -> None:
        clean_email = email.lower().strip()
        data["email"] = clean_email
        await self.collection.update_one(
            {"email": clean_email},
            {"$set": data},
            upsert=True,
        )

    async def increment_attempts(self, email: str) -> int:
        clean_email = email.lower().strip()
        result = await self.collection.find_one_and_update(
            {"email": clean_email},
            {"$inc": {"attempts": 1}},
            return_document=True,
        )
        return result.get("attempts", 1) if result else 1

    async def delete_by_email(self, email: str) -> bool:
        clean_email = email.lower().strip()
        result = await self.collection.delete_one({"email": clean_email})
        return result.deleted_count > 0
