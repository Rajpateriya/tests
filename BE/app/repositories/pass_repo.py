import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class PassRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "passes")
        self.db = db

    async def get_by_id(self, pass_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"_id": pass_id})

    async def get_active_passes(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"is_active": True}).sort([("base_price", 1)])
        return await cursor.to_list(length=100)

    async def get_all_passes(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find().sort([("created_at", -1)])
        return await cursor.to_list(length=100)

    async def create_pass(self, pass_dict: Dict[str, Any]) -> Dict[str, Any]:
        if "_id" not in pass_dict:
            pass_dict["_id"] = pass_dict.get("id") or f"pass_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        pass_dict.setdefault("created_at", now)
        pass_dict.setdefault("updated_at", now)
        await self.collection.update_one(
            {"_id": pass_dict["_id"]},
            {"$set": pass_dict},
            upsert=True,
        )
        return await self.get_by_id(pass_dict["_id"])

    async def update_pass(self, pass_id: str, update_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        update_dict["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": pass_id},
            {"$set": update_dict},
        )
        return await self.get_by_id(pass_id)

    async def delete_pass(self, pass_id: str) -> bool:
        res = await self.collection.delete_one({"_id": pass_id})
        return res.deleted_count > 0

    async def count_subscribers_for_pass(self, pass_id: str) -> int:
        now = datetime.now(timezone.utc).isoformat()
        # Count users who have an active pass with this pass_id and not expired
        return await self.db.users.count_documents({
            "profile.active_passes": {
                "$elemMatch": {
                    "pass_id": pass_id,
                    "status": "ACTIVE",
                    "expires_at": {"$gt": now},
                }
            }
        })
