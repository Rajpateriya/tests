from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PassCourseInfo(BaseModel):
    id: str
    title: str
    target_exam: Optional[str] = None
    tagline: Optional[str] = None
    thumbnail_icon: Optional[str] = None
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    total_quizzes: Optional[int] = 0
    subjects: List[str] = Field(default_factory=list)

    model_config = {"extra": "allow"}


class PassCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=120)
    tagline: Optional[str] = "Full-length official simulations, deep error analytics, and All-India percentile tracking."
    badge: Optional[str] = None
    duration_days: int = Field(30, ge=1, le=3650)
    base_price: float = Field(..., ge=1.0)
    original_price: Optional[float] = None
    max_coins_discount: Optional[int] = Field(None, ge=0)
    covered_course_ids: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    is_active: bool = True


class PassUpdateRequest(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    badge: Optional[str] = None
    duration_days: Optional[int] = Field(None, ge=1, le=3650)
    base_price: Optional[float] = Field(None, ge=1.0)
    original_price: Optional[float] = None
    max_coins_discount: Optional[int] = Field(None, ge=0)
    covered_course_ids: Optional[List[str]] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PassResponse(BaseModel):
    id: str
    title: str
    tagline: Optional[str] = None
    badge: Optional[str] = None
    duration_days: int
    base_price: float
    original_price: Optional[float] = None
    max_coins_discount: int
    max_rupee_discount: float
    covered_course_ids: List[str] = Field(default_factory=list)
    covered_courses: List[PassCourseInfo] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    is_active: bool = True
    subscribers_count: Optional[int] = 0
    created_at: Optional[datetime] = None


class UserActivePassOut(BaseModel):
    pass_id: str
    pass_title: str
    covered_course_ids: List[str] = Field(default_factory=list)
    duration_days: int
    purchased_at: str
    expires_at: str
    is_expired: bool = False
    days_remaining: int
    amount_paid: float = 0.0
    coins_used: int = 0
    payment_id: Optional[str] = None
    status: str = "ACTIVE"
