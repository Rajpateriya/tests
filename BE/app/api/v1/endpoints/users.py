from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.exceptions import ForbiddenException
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.result import UserDashboardStatsOut
from app.schemas.user import UserProfileUpdate, UserResponse
from app.services.auth_service import AuthService
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/users", tags=["Users & Dashboard"], dependencies=[Depends(check_rate_limit)])


@router.get("/{user_id}/dashboard", response_model=APIResponse[UserDashboardStatsOut])
async def get_user_dashboard(
    user_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve aggregate lifetime analytics, percentile, and performance metrics for the user."""
    # Ensure students can only access their own dashboard (unless admin)
    if current_user.role.value != "admin" and current_user.id != user_id:
        raise ForbiddenException("You can only access your own dashboard")

    eval_service = EvaluationService(db)
    dashboard_data = await eval_service.get_user_dashboard(user_id)
    return APIResponse(
        success=True,
        message="Dashboard data retrieved",
        data=dashboard_data,
    )


@router.put("/profile", response_model=APIResponse[UserResponse])
async def update_profile(
    update_data: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update user's profile preferences, target exams, or preferred subjects."""
    auth_service = AuthService(db)
    updated = await auth_service.update_profile(current_user.id, update_data)
    return APIResponse(
        success=True,
        message="Profile updated successfully",
        data=updated,
    )
