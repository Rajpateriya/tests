import math
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserRole
from app.repositories.token_blacklist_repo import TokenBlacklistRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import (
    ForgotPasswordResponse,
    PaginatedUsersResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserAdminUpdate,
    UserLoginRequest,
    UserProfileUpdate,
    UserRegisterRequest,
    UserResponse,
)


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = UserRepository(db)
        self.blacklist_repo = TokenBlacklistRepository(db)

    async def register(self, req: UserRegisterRequest) -> UserResponse:
        existing = await self.repo.get_by_email(req.email)
        if existing:
            raise ConflictException(f"User with email '{req.email}' already exists")

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        user_doc = {
            "_id": user_id,
            "email": req.email.lower().strip(),
            "full_name": req.full_name.strip(),
            "hashed_password": hash_password(req.password),
            "role": req.role.value,
            "is_active": True,
            "profile": {
                "target_exams": req.target_exams or ["SSC CGL"],
                "preferred_subjects": req.preferred_subjects or [],
                "phone_number": None,
                "avatar_url": None,
                "coins_balance": 150,
                "current_streak": 0,
                "longest_streak": 0,
                "subscription_plan": "FREE",
                "subscription_status": "INACTIVE",
            },
            "created_at": now,
            "updated_at": now,
        }
        await self.repo.insert(user_doc)
        return self._to_user_response(user_doc)

    async def login(self, req: UserLoginRequest) -> Dict[str, Any]:
        user = await self.repo.get_by_email(req.email)
        if not user:
            raise UnauthorizedException("Invalid email or password")

        if not verify_password(req.password, user["hashed_password"]):
            raise UnauthorizedException("Invalid email or password")

        if not user.get("is_active", True):
            raise UnauthorizedException("Account is disabled. Please contact administrator.")

        # Remember Me: extend token lifetimes if enabled (30 days vs standard minutes)
        if req.remember_me:
            access_delta = timedelta(days=30)
            refresh_delta = timedelta(days=60)
            expires_in_seconds = 30 * 24 * 3600
        else:
            access_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            refresh_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        access_token = create_access_token(
            subject=user["_id"],
            role=user.get("role", "student"),
            expires_delta=access_delta,
            extra_claims={"email": user["email"], "remember_me": req.remember_me},
        )
        refresh_token = create_refresh_token(
            subject=user["_id"],
            role=user.get("role", "student"),
            expires_delta=refresh_delta,
        )

        return {
            "token": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=expires_in_seconds,
            ),
            "user": self._to_user_response(user),
        }

    async def forgot_password(self, email: str) -> ForgotPasswordResponse:
        user = await self.repo.get_by_email(email)
        if not user:
            raise NotFoundException(f"No registered account found with email '{email}'")

        # Generate a 6-digit numeric OTP code and secure reset token
        reset_code = f"{secrets.randbelow(900000) + 100000}"
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        await self.repo.set_password_reset(
            email=email,
            reset_code=reset_code,
            reset_token=reset_token,
            expires_at=expires_at,
        )

        return ForgotPasswordResponse(
            email=email,
            message="Password reset code generated successfully. Please enter the 6-digit code to choose a new password.",
            reset_code=reset_code,
            reset_token=reset_token,
        )

    async def reset_password(self, req: ResetPasswordRequest) -> Dict[str, Any]:
        user = await self.repo.verify_reset_code(req.email, req.reset_code)
        if not user:
            raise UnauthorizedException("Invalid or expired 6-digit verification code. Please request a new code.")

        new_hashed = hash_password(req.new_password)
        updated_user = await self.repo.reset_password(req.email, req.reset_code, new_hashed)
        if not updated_user:
            raise BadRequestException("Unable to reset password. Please try again.")

        return {
            "email": req.email,
            "message": "Password has been successfully updated. You may now sign in with your new password.",
        }

    async def logout(self, access_token: Optional[str], refresh_token: Optional[str] = None) -> None:
        """Blacklist the given token(s) by their `jti`, so neither can be used again even
        though they have not expired yet. Tokens without a `jti` (very old ones) are skipped."""
        for token in (access_token, refresh_token):
            if not token:
                continue
            try:
                payload = decode_token(token)
            except ValueError:
                continue
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                await self.blacklist_repo.add(jti, expires_at=datetime.fromtimestamp(exp, tz=timezone.utc))

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            if payload.get("jti") and await self.blacklist_repo.is_blacklisted(payload["jti"]):
                raise UnauthorizedException("Token has been logged out")
            user_id = payload.get("sub")
            user = await self.repo.get_by_id(user_id)
            if not user or not user.get("is_active", True):
                raise UnauthorizedException("User not found or inactive")

            # The refresh token just used is now spent: blacklist it too, so it cannot be replayed.
            if payload.get("jti") and payload.get("exp"):
                await self.blacklist_repo.add(
                    payload["jti"], expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
                )

            new_access_token = create_access_token(
                subject=user["_id"],
                role=user.get("role", "student"),
                extra_claims={"email": user["email"]},
            )
            new_refresh_token = create_refresh_token(
                subject=user["_id"],
                role=user.get("role", "student"),
            )
            return TokenResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
        except Exception:
            raise UnauthorizedException("Invalid or expired refresh token")

    async def get_current_user(self, user_id: str) -> UserResponse:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        return self._to_user_response(user)

    async def update_profile(self, user_id: str, update: UserProfileUpdate) -> UserResponse:
        update_data = update.model_dump(exclude_unset=True)
        user = await self.repo.update_profile(user_id, update_data)
        if not user:
            raise NotFoundException("User not found")
        return self._to_user_response(user)

    # --- Admin Studio User Operations ---
    async def get_users_paginated(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> PaginatedUsersResponse:
        query: Dict[str, Any] = {}
        if search:
            s = search.strip()
            query["$or"] = [
                {"email": {"$regex": s, "$options": "i"}},
                {"full_name": {"$regex": s, "$options": "i"}},
            ]
        if role:
            query["role"] = role
        if is_active is not None:
            query["is_active"] = is_active

        skip = (page - 1) * page_size
        items_raw, total = await self.repo.get_paginated_users(query, skip=skip, limit=page_size)
        items = [self._to_user_response(u) for u in items_raw]
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return PaginatedUsersResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def admin_get_user(self, user_id: str) -> UserResponse:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with ID '{user_id}' not found")
        return self._to_user_response(user)

    async def admin_update_user(
        self,
        user_id: str,
        update_req: UserAdminUpdate,
        admin_user: UserResponse,
    ) -> UserResponse:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with ID '{user_id}' not found")

        # Safety checks for current admin: cannot demote or deactivate self
        if user["_id"] == admin_user.id:
            if update_req.role is not None and update_req.role != UserRole.ADMIN:
                raise ForbiddenException("You cannot revoke your own administrator privileges")
            if update_req.is_active is False:
                raise ForbiddenException("You cannot disable your own administrator account")

        update_dict = update_req.model_dump(exclude_unset=True)

        # Check email uniqueness if email is being updated
        if "email" in update_dict and update_dict["email"] != user["email"]:
            existing = await self.repo.get_by_email(update_dict["email"])
            if existing and existing["_id"] != user_id:
                raise ConflictException(f"Email '{update_dict['email']}' is already in use by another user")

        # Hash new password if provided by admin
        if "password" in update_dict and update_dict["password"]:
            update_dict["hashed_password"] = hash_password(update_dict["password"])
            del update_dict["password"]

        updated = await self.repo.admin_update_user(user_id, update_dict)
        if not updated:
            raise NotFoundException(f"User '{user_id}' could not be updated")
        return self._to_user_response(updated)

    async def admin_delete_user(self, user_id: str, admin_user: UserResponse) -> bool:
        if user_id == admin_user.id:
            raise ForbiddenException("You cannot delete your own administrator account")
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with ID '{user_id}' not found")
        return await self.repo.delete(user_id)

    def _to_user_response(self, doc: Dict[str, Any]) -> UserResponse:
        return UserResponse(
            id=doc["_id"],
            email=doc["email"],
            full_name=doc["full_name"],
            role=UserRole(doc.get("role", "student")),
            is_active=doc.get("is_active", True),
            profile=doc.get("profile", {}),
            created_at=doc["created_at"],
        )
