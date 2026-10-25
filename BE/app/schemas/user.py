from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import EnrolledCourseItem, UserProfile, UserRole


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    role: Optional[UserRole] = None
    target_exams: Optional[List[str]] = Field(default_factory=list)
    preferred_subjects: Optional[List[str]] = Field(default_factory=list)
    subdomain: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    subdomain: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    email: EmailStr
    message: str
    reset_code: Optional[str] = None
    reset_token: Optional[str] = None
    otp: Optional[str] = None


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    reset_code: str


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
    admin_id: Optional[str] = None
    subdomain: Optional[str] = None
    organization_name: Optional[str] = None
    created_at: datetime


class SendOtpRequest(BaseModel):
    email: EmailStr
    subdomain: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
    subdomain: Optional[str] = None


class RegisterInitiateResponse(BaseModel):
    email: EmailStr
    message: str
    expires_in: int = 600
    otp: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    target_exams: Optional[List[str]] = None
    preferred_subjects: Optional[List[str]] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(min_length=6, max_length=100)


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
    admin_id: Optional[str] = None
    subdomain: Optional[str] = None
    organization_name: Optional[str] = None


class StudentCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=6, max_length=100)
    target_exams: Optional[List[str]] = Field(default_factory=list)
    preferred_subjects: Optional[List[str]] = Field(default_factory=list)
    phone_number: Optional[str] = None


class TenantAdminCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    subdomain: str = Field(min_length=2, max_length=50)
    organization_name: str = Field(min_length=2, max_length=100)
    phone_number: Optional[str] = None


class TenantAdminUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    subdomain: Optional[str] = None
    organization_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)


class TenantAdminResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    subdomain: Optional[str] = None
    organization_name: Optional[str] = None
    is_active: bool
    student_count: int = 0
    test_count: int = 0
    course_count: int = 0
    created_at: datetime


class PaginatedUsersResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
