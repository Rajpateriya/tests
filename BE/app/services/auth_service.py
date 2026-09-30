import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.exceptions import ConflictException, NotFoundException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.user import TokenResponse, UserLoginRequest, UserProfileUpdate, UserRegisterRequest, UserResponse


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = UserRepository(db)

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
            raise UnauthorizedException("Account is disabled")

        access_token = create_access_token(
            subject=user["_id"],
            role=user.get("role", "student"),
            extra_claims={"email": user["email"]},
        )
        refresh_token = create_refresh_token(
            subject=user["_id"],
            role=user.get("role", "student"),
        )

        return {
            "token": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
            "user": self._to_user_response(user),
        }

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            user_id = payload.get("sub")
            user = await self.repo.get_by_id(user_id)
            if not user or not user.get("is_active", True):
                raise UnauthorizedException("User not found or inactive")

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
