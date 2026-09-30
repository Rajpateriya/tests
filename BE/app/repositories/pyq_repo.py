import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


def _ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


class PYQRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "pyq_questions")

    async def sample(
        self,
        subject: str,
        target_exam: str,
        sub_subject: Optional[str] = None,
        topic: Optional[str] = None,
        count: int = 5,
    ) -> List[Dict[str, Any]]:
        """Randomly sample real PYQs for use as style/tone reference.

        Exact filter on subject + target_exam (tone is exam-specific), then the
        narrowest match that has any questions: sub_subject+topic, then
        sub_subject only, then subject+exam only. Plain random sample, no
        vector search."""
        base: Dict[str, Any] = {"subject": _ci(subject), "target_exam": _ci(target_exam)}
        attempts: List[Dict[str, Any]] = []
        if topic:
            narrow = {**base, "topic": _ci(topic)}
            if sub_subject:
                narrow["sub_subject"] = _ci(sub_subject)
            attempts.append(narrow)
        if sub_subject:
            attempts.append({**base, "sub_subject": _ci(sub_subject)})
        attempts.append(base)

        for match in attempts:
            pipeline = [{"$match": match}, {"$sample": {"size": count}}]
            results = await self.collection.aggregate(pipeline).to_list(length=count)
            if results:
                return results
        return []
