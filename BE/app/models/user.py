from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class UserProfile(BaseModel):
    target_exams: List[str] = Field(default_factory=lambda: ["SSC CGL", "CHSL"])
    preferred_subjects: List[str] = Field(
        default_factory=lambda: ["Quantitative Aptitude", "General Intelligence & Reasoning"]
    )
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    coins_balance: int = 150
    current_streak: int = 5
    longest_streak: int = 12
    last_quiz_date: Optional[str] = None
    streak_history: List[str] = Field(default_factory=list)
    subscription_plan: Optional[str] = "FREE"
    subscription_status: Optional[str] = "INACTIVE"
    subscription_expires_at: Optional[datetime] = None


class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    email: str
    full_name: str
    hashed_password: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True
    profile: UserProfile = Field(default_factory=UserProfile)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
