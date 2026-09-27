from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.result import AttemptResultOut, DetailedInsightsOut
from app.schemas.user import UserResponse
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/results", tags=["Results & Deep Analytics"], dependencies=[Depends(check_rate_limit)])


@router.get("/{attempt_id}", response_model=APIResponse[AttemptResultOut])
async def get_attempt_result(
    attempt_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get immediate score card for a submitted mock test attempt:
    Total score, marks percentage, accuracy percentage, correct/incorrect/unattempted breakdown.
    """
    eval_service = EvaluationService(db)
    result = await eval_service.get_attempt_result(attempt_id, current_user.id)
    return APIResponse(
        success=True,
        message="Attempt results retrieved",
        data=result,
    )


@router.get("/{attempt_id}/insights", response_model=APIResponse[DetailedInsightsOut])
async def get_attempt_insights(
    attempt_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get deep analytical insights:
    - Subject & Topic-wise accuracy
    - Average time spent per question
    - Peer comparison (Percentile ranking & overall rank)
    - Strong and Weak areas identification
    - Full question-by-question review with solutions and explanations
    """
    eval_service = EvaluationService(db)
    insights = await eval_service.get_detailed_insights(attempt_id, current_user.id)
    return APIResponse(
        success=True,
        message="Detailed analytics and insights generated",
        data=insights,
    )
