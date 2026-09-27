from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.attempt import AttemptStatus
from app.repositories.base import BaseRepository


class AttemptRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "attempts")

    async def get_active_attempt(self, user_id: str, test_id: str) -> Optional[Dict[str, Any]]:
        """Find an in-progress attempt for a user on a given test."""
        return await self.find_one({
            "user_id": user_id,
            "test_id": test_id,
            "status": AttemptStatus.IN_PROGRESS.value,
        })

    async def get_any_active_attempt_for_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Check if user currently has ANY active test running (prevent multiple tests simultaneously)."""
        return await self.find_one({
            "user_id": user_id,
            "status": AttemptStatus.IN_PROGRESS.value,
        })

    async def update_sync_state(
        self,
        attempt_id: str,
        current_question_index: int,
        palette_states: Dict[str, Any],
        answers: Dict[str, str],
        time_spent_per_question: Dict[str, int],
        tab_switch_count: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """Persist in-progress state to MongoDB."""
        update_data: Dict[str, Any] = {
            "current_question_index": current_question_index,
            "palette_states": palette_states,
            "answers": answers,
            "time_spent_per_question": time_spent_per_question,
        }
        if tab_switch_count is not None:
            update_data["tab_switch_count"] = tab_switch_count

        await self.collection.update_one({"_id": attempt_id}, {"$set": update_data})
        return await self.get_by_id(attempt_id)

    async def get_user_attempts(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return await self.find_many(
            {"user_id": user_id},
            limit=limit,
            sort=[("start_time", -1)],
        )

    async def get_test_rank_and_percentile(self, test_id: str, target_score: float) -> Dict[str, Any]:
        """
        Calculates student's rank and percentile against all completed attempts for this test.
        Percentile = ((Number of students with score < target_score) / Total Students) * 100
        """
        completed_query = {
            "test_id": test_id,
            "status": AttemptStatus.COMPLETED.value,
        }
        total_participants = await self.count(completed_query)
        if total_participants <= 1:
            return {
                "rank": 1,
                "percentile": 100.0,
                "total_participants": max(1, total_participants),
            }

        better_scores = await self.count({
            **completed_query,
            "total_score": {"$gt": target_score},
        })
        strictly_less_scores = await self.count({
            **completed_query,
            "total_score": {"$lt": target_score},
        })

        rank = better_scores + 1
        percentile = round((strictly_less_scores / total_participants) * 100, 2)
        return {
            "rank": rank,
            "percentile": percentile,
            "total_participants": total_participants,
        }
