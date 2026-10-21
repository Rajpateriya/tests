from typing import Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.exceptions import ForbiddenException
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.result import UserDashboardStatsOut
from app.schemas.user import ChangePasswordRequest, UserProfileUpdate, UserResponse
from app.services.auth_service import AuthService
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/users", tags=["Users & Dashboard"], dependencies=[Depends(check_rate_limit)])


@router.get("/{user_id}/dashboard", response_model=APIResponse[UserDashboardStatsOut])
async def get_user_dashboard(
    user_id: str,
    course_id: Optional[str] = Query(None, description="Filter analytics to attempts belonging to a specific course"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve aggregate lifetime analytics, percentile, and performance metrics for the user."""
    # Ensure students can only access their own dashboard (unless admin)
    if current_user.role.value != "admin" and current_user.id != user_id:
        raise ForbiddenException("You can only access your own dashboard")

    eval_service = EvaluationService(db)
    dashboard_data = await eval_service.get_user_dashboard(user_id, course_id=course_id)
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


@router.post("/change-password", response_model=APIResponse[dict])
async def change_password(
    payload: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Change the authenticated user's password."""
    auth_service = AuthService(db)
    res = await auth_service.change_password(
        current_user.id, payload.current_password, payload.new_password
    )
    return APIResponse(
        success=True,
        message=res.get("message", "Password changed successfully"),
        data=res,
    )

