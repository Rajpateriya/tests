from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"email": email.lower().strip()})

    async def update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        flat_update = {f"profile.{k}": v for k, v in profile_data.items() if v is not None}
        if flat_update:
            await self.collection.update_one({"_id": user_id}, {"$set": flat_update})
        return await self.get_by_id(user_id)
