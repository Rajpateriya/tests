from typing import Any, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.models.user import UserRole
from app.repositories.token_blacklist_repo import TokenBlacklistRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserResponse

security_scheme = HTTPBearer(auto_error=False)


def extract_subdomain(host: Optional[str], header_subdomain: Optional[str] = None) -> Optional[str]:
    """Helper to parse tenant subdomain from custom header or Host."""
    if header_subdomain and header_subdomain.strip():
        sub = header_subdomain.strip().lower()
        if sub not in ("www", "api", "app", "localhost", "test"):
            return sub
    if not host:
        return None
    hostname = host.split(":")[0].strip().lower()
    parts = hostname.split(".")
    if len(parts) >= 2 and parts[-1] == "localhost":
        if parts[0] != "localhost":
            return parts[0]
    elif len(parts) >= 3:
        if parts[0] not in ("www", "api", "app"):
            return parts[0]
    return None


async def get_tenant_subdomain(
    request: Request,
    x_tenant_subdomain: Optional[str] = Header(None, alias="X-Tenant-Subdomain"),
) -> Optional[str]:
    """Dependency extracting the tenant subdomain from X-Tenant-Subdomain header or Host."""
    host = request.headers.get("host")
    return extract_subdomain(host, x_tenant_subdomain)


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

    if payload.get("jti") and await TokenBlacklistRepository(db).is_blacklisted(payload["jti"]):
        raise UnauthorizedException("Token has been logged out")

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
        role=UserRole(user.get("role", "user")),
        is_active=user.get("is_active", True),
        profile=user.get("profile", {}),
        admin_id=user.get("admin_id"),
        subdomain=user.get("subdomain"),
        organization_name=user.get("organization_name"),
        created_at=user["created_at"],
    )


async def require_admin(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Dependency that ensures the user is an Administrator or Super Administrator."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ForbiddenException("Administrator privileges required for this action")
    return current_user


async def require_super_admin(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Dependency that ensures the user is a Super Administrator."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise ForbiddenException("Super Administrator privileges required for this action")
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
        if payload.get("jti") and await TokenBlacklistRepository(db).is_blacklisted(payload["jti"]):
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
            role=UserRole(user.get("role", "user")),
            is_active=user.get("is_active", True),
            profile=user.get("profile", {}),
            admin_id=user.get("admin_id"),
            subdomain=user.get("subdomain"),
            organization_name=user.get("organization_name"),
            created_at=user["created_at"],
        )
    except Exception:
        return None
