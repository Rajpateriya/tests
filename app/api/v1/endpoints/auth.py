from fastapi import APIRouter, Body, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.user import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"], dependencies=[Depends(check_rate_limit)])


@router.post("/register", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(
    req: UserRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Register a new student or admin user."""
    auth_service = AuthService(db)
    user = await auth_service.register(req)
    return APIResponse(
        success=True,
        message="User registered successfully",
        data=user,
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
