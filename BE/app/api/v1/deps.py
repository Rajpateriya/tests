from typing import Any, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.db.redis import get_redis
from app.models.user import UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserResponse

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserResponse:
    """Dependency that decodes JWT access token and yields the current user."""
    if not auth or not auth.credentials:
        raise UnauthorizedException("Authentication token is required")

    try:
        payload = decode_token(auth.credentials)
    except ValueError as e:
        raise UnauthorizedException(str(e))

    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Malformed token payload")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User no longer exists")

    if not user.get("is_active", True):
        raise UnauthorizedException("Account is disabled")

    return UserResponse(
        id=user["_id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user.get("role", "student")),
        is_active=user.get("is_active", True),
        profile=user.get("profile", {}),
        created_at=user["created_at"],
    )


async def require_admin(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Dependency that ensures the user is an Administrator."""
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Administrator privileges required for this action")
    return current_user


async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[UserResponse]:
    """Dependency that decodes JWT access token if present, returns None if unauthenticated."""
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_token(auth.credentials)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(user_id)
        if not user or not user.get("is_active", True):
            return None
        return UserResponse(
            id=user["_id"],
            email=user["email"],
            full_name=user["full_name"],
            role=UserRole(user.get("role", "student")),
            is_active=user.get("is_active", True),
            profile=user.get("profile", {}),
            created_at=user["created_at"],
        )
    except Exception:
        return None

