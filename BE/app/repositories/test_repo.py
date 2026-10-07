import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class TestRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "tests")

    async def find_filtered(
        self,
        test_type: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        target_exam: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = True,
        is_free: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if is_active is not None:
            query["is_active"] = is_active
        if is_free is not None:
            query["is_free"] = is_free
        if test_type:
            query["test_type"] = test_type
        if subject:
            query["subject"] = {"$regex": f"^{subject}$", "$options": "i"}
        if topic:
            query["topic"] = {"$regex": f"^{topic}$", "$options": "i"}
        if target_exam:
            query["target_exam"] = {"$regex": f"^{target_exam}$", "$options": "i"}
        if search and search.strip():
            term = {"$regex": re.escape(search.strip()), "$options": "i"}
            query["$or"] = [{"title": term}, {"subject": term}]

        return await self.find_many(
            query,
            skip=skip,
            limit=limit,
            sort=[("created_at", -1), ("_id", 1)],  # stable order so pages never overlap
        )
