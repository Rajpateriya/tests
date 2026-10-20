import math
import secrets
import uuid
import resend
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
from app.core.logging import logger
from app.repositories.pending_registration_repo import PendingRegistrationRepository
from app.repositories.token_blacklist_repo import TokenBlacklistRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import (
    ForgotPasswordResponse,
    PaginatedUsersResponse,
    RegisterInitiateResponse,
    ResetPasswordRequest,
    SendOtpRequest,
    TokenResponse,
    UserAdminUpdate,
    UserLoginRequest,
    UserProfileUpdate,
    UserRegisterRequest,
    UserResponse,
    VerifyOtpRequest,
)


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = UserRepository(db)
        self.blacklist_repo = TokenBlacklistRepository(db)
        self.pending_repo = PendingRegistrationRepository(db)

    def _send_otp_email(self, email: str, otp: str) -> None:
        try:
            if settings.RESEND_API_KEY:
                resend.api_key = settings.RESEND_API_KEY.strip()
                resend.Emails.send({
                    "from": settings.RESEND_FROM_EMAIL.strip(),
                    "to": email,
                    "subject": "Your PrepMagnet Verification Code",
                    "html": f"<p>Your 6-digit verification code is <strong>{otp}</strong>. This code is valid for 10 minutes.</p>",
                })
        except Exception as e:
            logger.warning(f"Failed to send OTP email to {email} via Resend: {e}")

    def _send_password_reset_email(self, email: str, reset_code: str) -> None:
        try:
            if settings.RESEND_API_KEY:
                resend.api_key = settings.RESEND_API_KEY.strip()
                resend.Emails.send({
                    "from": settings.RESEND_FROM_EMAIL.strip(),
                    "to": email,
                    "subject": "Your PrepMagnet Password Reset Verification Code",
                    "html": f"""
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Reset Your Password</h2>
                            <p style="color: #64748b; margin: 0; font-size: 14px;">PrepMagnet Candidate Security</p>
                        </div>
                        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                            We received a request to reset the password for your account (<strong>{email}</strong>).
                        </p>
                        <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
                            <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Password Reset OTP</div>
                            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #15803d;">{reset_code}</span>
                        </div>
                        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 16px 0;">
                            This OTP verification code will expire in <strong>15 minutes</strong>. If you did not request this password reset, please ignore this email or contact support.
                        </p>
                        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
                            <p style="color: #94a3b8; font-size: 11px; margin: 0;">Secured with 256-bit encryption • PrepMagnet Platform</p>
                        </div>
                    </div>
                    """,
                })
        except Exception as e:
            logger.warning(f"Failed to send password reset email to {email} via Resend: {e}")

    async def register(self, req: UserRegisterRequest) -> RegisterInitiateResponse:
        email = req.email.lower().strip()
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictException(f"User with email '{email}' already exists")

        otp = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        pending_doc = {
            "email": email,
            "full_name": req.full_name.strip(),
            "hashed_password": hash_password(req.password),
            "role": UserRole.USER.value,
            "target_exams": req.target_exams or [],
            "preferred_subjects": req.preferred_subjects or [],
            "otp": otp,
            "attempts": 0,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }
        await self.pending_repo.upsert_pending(email, pending_doc)
        self._send_otp_email(email, otp)

        is_dev = settings.ENVIRONMENT in ("development", "test") or settings.DEBUG
        return RegisterInitiateResponse(
            email=email,
            message="A 6-digit verification code has been sent to your email. Please verify to complete registration.",
            expires_in=600,
            otp=otp if is_dev else None,
        )

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
            role=user.get("role", "user"),
            expires_delta=access_delta,
            extra_claims={"email": user["email"], "remember_me": req.remember_me},
        )
        refresh_token = create_refresh_token(
            subject=user["_id"],
            role=user.get("role", "user"),
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
        email = email.lower().strip()
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

        self._send_password_reset_email(email, reset_code)

        is_dev = settings.ENVIRONMENT in ("development", "test") or settings.DEBUG
        return ForgotPasswordResponse(
            email=email,
            message="A 6-digit verification code has been sent to your email. Please verify the code to reset your password.",
            reset_code=reset_code if is_dev else None,
            reset_token=reset_token,
        )

    async def verify_reset_code(self, email: str, reset_code: str) -> Dict[str, Any]:
        email = email.lower().strip()
        code = reset_code.strip()
        user = await self.repo.verify_reset_code(email, code)
        if not user:
            raise UnauthorizedException("Invalid or expired 6-digit verification code. Please request a new code.")

        return {
            "valid": True,
            "email": email,
            "message": "OTP verified successfully. Please enter your new password.",
        }

    async def reset_password(self, req: ResetPasswordRequest) -> Dict[str, Any]:
        email = req.email.lower().strip()
        code = req.reset_code.strip()
        user = await self.repo.verify_reset_code(email, code)
        if not user:
            raise UnauthorizedException("Invalid or expired 6-digit verification code. Please request a new code.")

        new_hashed = hash_password(req.new_password)
        updated_user = await self.repo.reset_password(email, code, new_hashed)
        if not updated_user:
            raise BadRequestException("Unable to reset password. Please try again.")

        return {
            "email": email,
            "message": "Password has been successfully updated. You may now sign in with your new password.",
        }

    async def send_otp(self, req: SendOtpRequest) -> Dict[str, Any]:
        email = req.email.lower().strip()
        pending = await self.pending_repo.get_by_email(email)
        if pending:
            otp = f"{secrets.randbelow(900000) + 100000}"
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
            pending["otp"] = otp
            pending["attempts"] = 0
            pending["expires_at"] = expires_at
            await self.pending_repo.upsert_pending(email, pending)
            self._send_otp_email(email, otp)
            is_dev = settings.ENVIRONMENT in ("development", "test") or settings.DEBUG
            return {
                "email": email,
                "message": "A new verification code has been sent to your email.",
                "expires_in": 600,
                "otp": otp if is_dev else None,
            }

        user = await self.repo.get_by_email(email)
        if user:
            otp = f"{secrets.randbelow(900000) + 100000}"
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
            await self.repo.set_otp(email, otp, expires_at)
            self._send_otp_email(email, otp)
            is_dev = settings.ENVIRONMENT in ("development", "test") or settings.DEBUG
            return {
                "email": email,
                "message": "A new verification code has been sent to your email.",
                "expires_in": 600,
                "otp": otp if is_dev else None,
            }

        raise NotFoundException(f"No pending registration or account found with email '{email}'")

    async def verify_otp(self, req: VerifyOtpRequest) -> UserResponse:
        email = req.email.lower().strip()
        otp = req.otp.strip()

        pending = await self.pending_repo.get_by_email(email)
        if not pending:
            user = await self.repo.get_by_email(email)
            if user:
                verified_user = await self.repo.verify_and_clear_otp(email, otp)
                if not verified_user:
                    raise UnauthorizedException("Invalid or expired OTP. Please request a new one.")
                return self._to_user_response(verified_user)
            raise BadRequestException("No pending registration found for this email, or the OTP has expired. Please register again.")

        now = datetime.now(timezone.utc)
        expires_at = pending.get("expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                await self.pending_repo.delete_by_email(email)
                raise BadRequestException("Verification code has expired. Please request a new OTP.")

        attempts = pending.get("attempts", 0)
        if attempts >= 5:
            await self.pending_repo.delete_by_email(email)
            raise BadRequestException("Too many incorrect attempts. Please register again to get a new code.")

        if pending.get("otp") != otp:
            await self.pending_repo.increment_attempts(email)
            remaining = 5 - (attempts + 1)
            if remaining <= 0:
                await self.pending_repo.delete_by_email(email)
                raise UnauthorizedException("Incorrect verification code. Maximum attempts exceeded. Please register again.")
            raise UnauthorizedException(f"Incorrect verification code. {remaining} attempt(s) remaining.")

        existing = await self.repo.get_by_email(email)
        if existing:
            await self.pending_repo.delete_by_email(email)
            raise ConflictException(f"User with email '{email}' already exists")

        # Create user record in database strictly upon successful OTP verification
        user_id = str(uuid.uuid4())
        user_doc = {
            "_id": user_id,
            "email": pending["email"],
            "full_name": pending["full_name"],
            "hashed_password": pending["hashed_password"],
            "role": UserRole.USER.value,
            "is_active": True,
            "profile": {
                "target_exams": pending.get("target_exams") or [],
                "preferred_subjects": pending.get("preferred_subjects") or [],
                "phone_number": None,
                "avatar_url": None,
                "coins_balance": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "subscription_plan": "FREE",
                "subscription_status": "INACTIVE",
            },
            "created_at": now,
            "updated_at": now,
        }
        await self.repo.insert(user_doc)
        await self.pending_repo.delete_by_email(email)

        return self._to_user_response(user_doc)

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
                role=user.get("role", "user"),
                extra_claims={"email": user["email"]},
            )
            new_refresh_token = create_refresh_token(
                subject=user["_id"],
                role=user.get("role", "user"),
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
            if role in ("user", "student"):
                query["role"] = {"$in": ["user", "student"]}
            else:
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
            role=UserRole(doc.get("role", "user")),
            is_active=doc.get("is_active", True),
            profile=doc.get("profile", {}),
            created_at=doc["created_at"],
        )

    async def google_login_or_register(self, email: str, full_name: str) -> Dict[str, Any]:
        """Find or auto-create a PrepMagnet account for a Google-authenticated user.

        - If an account with this email already exists → log them in directly.
        - If no account exists → create one (email already verified by Google, no password needed).
        - Returns the same {token, user} dict as the regular login() method.
        """
        user = await self.repo.get_by_email(email)

        if user:
            # Existing user — just issue tokens; ensure account is active
            if not user.get("is_active", True):
                raise UnauthorizedException("Your account has been disabled. Please contact support.")
        else:
            # New user — auto-create with a random secure password (they will always use Google SSO)
            random_password = secrets.token_urlsafe(32)
            new_user_doc = {
                "_id": str(uuid.uuid4()),
                "email": email,
                "full_name": full_name,
                "hashed_password": hash_password(random_password),
                "role": "user",
                "is_active": True,
                "is_email_verified": True,  # Google has already verified the email
                "auth_provider": "google",
                "target_exams": ["SSC CGL"],  # default; user can update in profile
                "created_at": datetime.now(timezone.utc),
                "profile": {
                    "coins_balance": 0,
                    "subscription_plan": "FREE",
                    "subscription_status": "INACTIVE",
                    "current_streak": 0,
                },
            }
            await self.repo.insert(new_user_doc)
            user = await self.repo.get_by_email(email)
            logger.info("New user auto-registered via Google SSO: %s", email)

        access_token = create_access_token(
            subject=user["_id"],
            role=user.get("role", "user"),
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            extra_claims={"email": user["email"], "auth_provider": "google"},
        )
        refresh_token_str = create_refresh_token(
            subject=user["_id"],
            role=user.get("role", "user"),
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        return {
            "token": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token_str,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
            "user": self._to_user_response(user),
        }
