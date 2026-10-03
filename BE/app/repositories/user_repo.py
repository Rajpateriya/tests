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

    async def update_coins(self, user_id: str, delta: int) -> int:
        """Add or subtract coins, preventing negative balance."""
        user = await self.get_by_id(user_id)
        if not user:
            return 0
        current = user.get("profile", {}).get("coins_balance", 0)
        new_balance = max(0, current + delta)
        await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"profile.coins_balance": new_balance}}
        )
        return new_balance

    async def update_streak(
        self, user_id: str, streak: int, longest: int, last_date: str, history_date: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        update_doc: Dict[str, Any] = {
            "profile.current_streak": streak,
            "profile.longest_streak": longest,
            "profile.last_quiz_date": last_date,
        }
        if history_date:
            await self.collection.update_one(
                {"_id": user_id},
                {
                    "$set": update_doc,
                    "$addToSet": {"profile.streak_history": history_date},
                }
            )
        else:
            await self.collection.update_one({"_id": user_id}, {"$set": update_doc})
        return await self.get_by_id(user_id)

    async def update_subscription(
        self, user_id: str, plan_id: str, status: str, expires_at: Optional[Any] = None
    ) -> Optional[Dict[str, Any]]:
        await self.collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "profile.subscription_plan": plan_id,
                    "profile.subscription_status": status,
                    "profile.subscription_expires_at": expires_at,
                }
            }
        )
        return await self.get_by_id(user_id)
