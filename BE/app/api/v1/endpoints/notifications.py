from typing import List
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.models.user import UserRole
from app.schemas.common import APIResponse
from app.schemas.notification import NotificationOut
from app.schemas.user import UserResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(check_rate_limit)])


@router.get("", response_model=APIResponse[List[NotificationOut]])
async def list_my_notifications(
    unread_only: bool = Query(False),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """A student sees only their own; an admin also sees every admin-wide notification
    (e.g. a new support ticket), with their own read state tracked separately."""
    items = await NotificationService(db).list_mine(
        current_user.id, is_admin=current_user.role == UserRole.ADMIN, unread_only=unread_only
    )
    return APIResponse(success=True, message=f"{len(items)} notifications", data=items)


@router.get("/unread-count", response_model=APIResponse[dict])
async def get_unread_count(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    count = await NotificationService(db).count_unread(current_user.id, is_admin=current_user.role == UserRole.ADMIN)
    return APIResponse(success=True, message="Unread count", data={"unread": count})


@router.post("/{notification_id}/read", response_model=APIResponse[dict])
async def mark_notification_read(
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await NotificationService(db).mark_read(notification_id, current_user.id)
    return APIResponse(success=True, message="Marked read", data={})


@router.post("/read-all", response_model=APIResponse[dict])
async def mark_all_notifications_read(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await NotificationService(db).mark_all_read(current_user.id, is_admin=current_user.role == UserRole.ADMIN)
    return APIResponse(success=True, message="All marked read", data={})
