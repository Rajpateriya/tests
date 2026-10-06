from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"email": email.lower().strip()})

    async def update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        update_set = {}
        for k, v in profile_data.items():
            if v is not None:
                if k in ("full_name",):
                    update_set[k] = v
                else:
                    update_set[f"profile.{k}"] = v
        if update_set:
            await self.collection.update_one({"_id": user_id}, {"$set": update_set})
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

    async def set_password_reset(
        self, email: str, reset_code: str, reset_token: str, expires_at: datetime
    ) -> Optional[Dict[str, Any]]:
        await self.collection.update_one(
            {"email": email.lower().strip()},
            {
                "$set": {
                    "reset_password_code": reset_code,
                    "reset_password_token": reset_token,
                    "reset_password_expires_at": expires_at,
                }
            },
        )
        return await self.get_by_email(email)

    async def verify_reset_code(self, email: str, reset_code: str) -> Optional[Dict[str, Any]]:
        user = await self.get_by_email(email)
        if not user:
            return None
        stored_code = user.get("reset_password_code")
        expires_at = user.get("reset_password_expires_at")
        if not stored_code or not expires_at:
            return None
        # Handle string or datetime for expires_at (mongomock vs real mongo)
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at)
            except Exception:
                pass
        now = datetime.now(timezone.utc)
        if hasattr(expires_at, "tzinfo") and expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        if stored_code.strip() != reset_code.strip() or expires_at < now:
            return None
        return user

    async def reset_password(self, email: str, reset_code: str, hashed_password: str) -> Optional[Dict[str, Any]]:
        user = await self.verify_reset_code(email, reset_code)
        if not user:
            return None
        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_password,
                    "updated_at": now,
                },
                "$unset": {
                    "reset_password_code": "",
                    "reset_password_token": "",
                    "reset_password_expires_at": "",
                },
            },
        )
        return await self.get_by_id(user["_id"])

    async def get_paginated_users(
        self,
        query: Dict[str, Any],
        skip: int = 0,
        limit: int = 10,
        sort: Optional[List[tuple]] = None,
    ) -> tuple[list[Dict[str, Any]], int]:
        total = await self.count(query)
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        else:
            cursor = cursor.sort([("created_at", -1)])
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        items = await cursor.to_list(length=limit)
        return items, total

    async def admin_update_user(self, user_id: str, update_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        update_set: Dict[str, Any] = {"updated_at": now}
        top_level_fields = {"email", "full_name", "role", "is_active", "hashed_password"}
        profile_fields = {
            "target_exams",
            "preferred_subjects",
            "phone_number",
            "avatar_url",
            "coins_balance",
            "subscription_plan",
            "subscription_status",
            "current_streak",
            "longest_streak",
        }

        for k, v in update_dict.items():
            if v is None:
                continue
            if k in top_level_fields:
                if k == "email":
                    update_set[k] = v.lower().strip()
                elif k == "role":
                    update_set[k] = v.value if hasattr(v, "value") else str(v)
                else:
                    update_set[k] = v
            elif k in profile_fields:
                update_set[f"profile.{k}"] = v

        if update_set:
            await self.collection.update_one({"_id": user_id}, {"$set": update_set})
        return await self.get_by_id(user_id)

    async def add_enrolled_course(self, user_id: str, course_record: Any) -> Optional[Dict[str, Any]]:
        record_dict = course_record.model_dump() if hasattr(course_record, "model_dump") else dict(course_record)
        course_id = record_dict.get("course_id")
        if course_id:
            # Remove any existing enrollment for this course to avoid duplicates, then append
            await self.collection.update_one(
                {"_id": user_id},
                {"$pull": {"profile.enrolled_courses": {"course_id": course_id}}}
            )
        await self.collection.update_one(
            {"_id": user_id},
            {"$push": {"profile.enrolled_courses": record_dict}}
        )
        return await self.get_by_id(user_id)

