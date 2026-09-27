from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserProfile, UserRole


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
