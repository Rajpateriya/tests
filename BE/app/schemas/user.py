from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import EnrolledCourseItem, UserProfile, UserRole


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    role: UserRole = UserRole.STUDENT
    target_exams: Optional[List[str]] = Field(default_factory=lambda: ["SSC CGL"])
    preferred_subjects: Optional[List[str]] = Field(default_factory=list)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    email: EmailStr
    message: str
    reset_code: Optional[str] = None
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(min_length=6, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    profile: UserProfile
    created_at: datetime


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    target_exams: Optional[List[str]] = None
    preferred_subjects: Optional[List[str]] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    target_exams: Optional[List[str]] = None
    preferred_subjects: Optional[List[str]] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    coins_balance: Optional[int] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)


class PaginatedUsersResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
