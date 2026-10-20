from typing import Optional
from fastapi import APIRouter, Body, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, security_scheme
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RegisterInitiateResponse,
    ResetPasswordRequest,
    SendOtpRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyOtpRequest,
    VerifyResetCodeRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"], dependencies=[Depends(check_rate_limit)])


@router.post("/register", response_model=APIResponse[RegisterInitiateResponse], status_code=status.HTTP_200_OK)
async def register(
    req: UserRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Initiate registration: validate input, temporarily stage registration, and send verification OTP."""
    auth_service = AuthService(db)
    res = await auth_service.register(req)
    return APIResponse(
        success=True,
        message=res.message,
        data=res,
    )


@router.post("/login", response_model=APIResponse[dict])
async def login(
    req: UserLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate user with email and password, returning JWT access & refresh tokens."""
    auth_service = AuthService(db)
    result = await auth_service.login(req)
    return APIResponse(
        success=True,
        message="Login successful",
        data={
            "tokens": result["token"].model_dump(),
            "user": result["user"].model_dump(),
        },
    )


@router.post("/send-otp", response_model=APIResponse[dict])
async def send_otp(
    req: SendOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send or resend a 6-digit OTP to the user's email."""
    auth_service = AuthService(db)
    res = await auth_service.send_otp(req)
    return APIResponse(
        success=True,
        message=res.get("message", "OTP sent to your email"),
        data=res,
    )


@router.post("/verify-otp", response_model=APIResponse[UserResponse])
async def verify_otp(
    req: VerifyOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Verify OTP and create the user in the database upon successful verification."""
    auth_service = AuthService(db)
    user = await auth_service.verify_otp(req)
    return APIResponse(
        success=True,
        message="OTP verified successfully. Your account has been created.",
        data=user,
    )


@router.post("/forgot-password", response_model=APIResponse[ForgotPasswordResponse])
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Initiate password recovery by generating a secure 6-digit verification code."""
    auth_service = AuthService(db)
    res = await auth_service.forgot_password(req.email)
    return APIResponse(
        success=True,
        message=res.message,
        data=res,
    )


@router.post("/verify-reset-code", response_model=APIResponse[dict])
async def verify_reset_code(
    req: VerifyResetCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Verify that the 6-digit password reset OTP is valid and unexpired."""
    auth_service = AuthService(db)
    res = await auth_service.verify_reset_code(req.email, req.reset_code)
    return APIResponse(
        success=True,
        message=res["message"],
        data=res,
    )


@router.post("/reset-password", response_model=APIResponse[dict])
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reset user password using the 6-digit verification code."""
    auth_service = AuthService(db)
    res = await auth_service.reset_password(req)
    return APIResponse(
        success=True,
        message=res["message"],
        data=res,
    )


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieve details of currently authenticated user."""
    return APIResponse(
        success=True,
        message="User profile retrieved",
        data=current_user,
    )


@router.post("/logout", response_model=APIResponse[dict])
async def logout(
    refresh_token: Optional[str] = Body(None, embed=True),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Log out: blacklist the access token (and the refresh token, if sent), so neither
    can be used again even though they have not expired yet."""
    auth_service = AuthService(db)
    await auth_service.logout(auth.credentials if auth else None, refresh_token)
    return APIResponse(success=True, message="Logged out", data={})


@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Obtain a new access token using a valid refresh token."""
    auth_service = AuthService(db)
    new_tokens = await auth_service.refresh_tokens(refresh_token)
    return APIResponse(
        success=True,
        message="Token refreshed successfully",
        data=new_tokens,
    )


@router.post("/google", response_model=APIResponse[dict])
async def google_oauth(
    credential: str = Body(..., embed=True),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate or register a user via Google Identity Services ID token.
    
    The frontend sends the `credential` JWT obtained from Google's OAuth popup.
    We verify it against Google's public certs, extract the email + profile, then
    either log in the existing user or create a new one (email-verified, no password).
    Returns the same {tokens, user} shape as the regular /login endpoint.
    
    Prerequisites (one-time setup):
      1. Create a Google Cloud project → APIs & Services → Credentials → OAuth 2.0 Client ID (Web app).
      2. Add your domain (https://prepmagnet.in) to 'Authorised JavaScript origins'.
      3. Copy the Client ID and set GOOGLE_OAUTH_CLIENT_ID in BE/.env and VITE_GOOGLE_CLIENT_ID in FE/.env
    """
    from app.core.config import settings

    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("Google Sign-In is not configured on this server. Please contact support.")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as exc:
        from app.core.exceptions import UnauthorizedException
        raise UnauthorizedException(f"Invalid Google credential: {exc}")

    google_email = id_info.get("email", "").lower().strip()
    google_name = id_info.get("name") or id_info.get("given_name") or "PrepMagnet User"
    email_verified = id_info.get("email_verified", False)

    if not google_email or not email_verified:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("Google account email is not verified or unavailable.")

    auth_service = AuthService(db)
    result = await auth_service.google_login_or_register(
        email=google_email,
        full_name=google_name,
    )
    return APIResponse(
        success=True,
        message="Google sign-in successful",
        data={
            "tokens": result["token"].model_dump(),
            "user": result["user"].model_dump(),
        },
    )
