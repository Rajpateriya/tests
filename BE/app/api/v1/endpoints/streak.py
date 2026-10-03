from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.user import UserResponse
from app.schemas.streak import (
    DailyQuizQuestionOut,
    DailyQuizAnswerSubmit,
    DailyQuizAnswerResult,
    DailyQuizSolveRequest,
)
from app.services.streak_service import StreakService

router = APIRouter(prefix="/streak", tags=["Streak & Daily Quiz"], dependencies=[Depends(check_rate_limit)])


@router.get("/me", response_model=APIResponse[Dict[str, Any]])
async def get_my_streak(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve user's streak status, 7-day milestone tracker, coin balance, and consistency metrics."""
    service = StreakService(db)
    data = await service.get_streak_data(current_user.id)
    return APIResponse(
        success=True,
        message="Streak and activity data retrieved successfully",
        data=data,
    )


@router.get("/daily-quiz/questions", response_model=APIResponse[List[DailyQuizQuestionOut]])
async def get_daily_quiz_questions(
    count: int = Query(3, ge=1, le=10),
    difficulty: Optional[str] = Query(None, description="Optional filter: Easy, Medium, or Hard"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetch daily quiz questions autopicked randomly from the database.
    Default behavior returns 3 questions (1 Easy -> 1 Medium -> 1 Hard)
    for progressive step-by-step examination practice.
    """
    service = StreakService(db)
    questions = await service.get_daily_booster_questions(count=count, difficulty=difficulty)
    return APIResponse(
        success=True,
        message="Daily quiz questions loaded successfully",
        data=questions,
    )


@router.post("/daily-quiz/verify-answer", response_model=APIResponse[DailyQuizAnswerResult])
async def verify_daily_quiz_answer(
    payload: DailyQuizAnswerSubmit,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Verify a candidate's answer for a single daily quiz question and return official solution explanation."""
    service = StreakService(db)
    result = await service.verify_quiz_question_answer(payload.question_id, payload.selected_option)
    return APIResponse(
        success=True,
        message="Answer evaluated",
        data=result,
    )


@router.post("/daily-quiz/solve", response_model=APIResponse[Dict[str, Any]])
async def solve_daily_quiz(
    payload: Optional[DailyQuizSolveRequest] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Mark today's daily quiz solved, advance daily streak, and award GovCoins (+20 daily, +100 on 7-day milestone)."""
    service = StreakService(db)
    req = payload or DailyQuizSolveRequest()
    result = await service.solve_daily_quiz(
        user_id=current_user.id,
        correct_count=req.correct_count or 3,
        total_count=req.total_count or 3,
    )
    return APIResponse(
        success=True,
        message=result.get("message", "Daily quiz processed successfully"),
        data=result,
    )
