from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class CourseRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "courses")

    async def get_active_courses(self, target_exam: Optional[str] = None) -> List[Dict[str, Any]]:
        # Visible to users: not archived, and published (built-in courses have no flag = published).
        query: Dict[str, Any] = {"is_active": {"$ne": False}, "is_published": {"$ne": False}}
        if target_exam and target_exam != "All":
            query["$or"] = [{"target_exam": target_exam}, {"exam": target_exam}]
        cursor = self.collection.find(query).sort([("enrolled_count", -1)])
        return await cursor.to_list(length=100)
