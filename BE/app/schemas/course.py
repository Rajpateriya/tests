from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator
from app.models.course import CourseSubjectQuiz


class CourseSummaryOut(BaseModel):
    id: str
    title: str
    target_exam: str
    tagline: str
    description: str
    original_price: float
    discounted_price: float
    discount_percent: int
    badge: str
    rating: float
    reviews_count: int
    enrolled_count: int
    thumbnail_icon: str
    subjects: List[str]
    features: List[str]
    total_quizzes: int
    is_enrolled: bool = False
    quizzes: List[CourseSubjectQuiz] = Field(default_factory=list)


class CourseDetailOut(CourseSummaryOut):
    pass


class CourseAdminOut(CourseDetailOut):
    """Admin view of a course: also shows if it is active/published, and who made it and when."""
    is_active: bool = True
    is_published: bool = True  # false = draft: invisible to users until published
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CourseCreateRequest(BaseModel):
    """Admin: create a course. `test_ids` are existing generated tests; each one becomes a
    quiz in the course (the quiz id is the test id)."""
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(default="", max_length=4000)
    target_exam: str = Field(min_length=2, max_length=60)
    original_price: float = Field(gt=0)
    discounted_price: float = Field(gt=0)
    test_ids: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _price_order(self):
        if self.discounted_price > self.original_price:
            raise ValueError("discounted_price cannot be higher than original_price")
        return self


class CourseUpdateRequest(BaseModel):
    """Admin: change a course. Fields left out stay as they are."""
    title: Optional[str] = Field(default=None, min_length=3, max_length=150)
    description: Optional[str] = Field(default=None, max_length=4000)
    target_exam: Optional[str] = Field(default=None, min_length=2, max_length=60)
    original_price: Optional[float] = Field(default=None, gt=0)
    discounted_price: Optional[float] = Field(default=None, gt=0)
    test_ids: Optional[List[str]] = None  # the full list of tagged tests (embedded built-in quizzes are kept)
    is_active: Optional[bool] = None  # false archives the course (hidden from the catalogue)
    is_published: Optional[bool] = None  # true makes a draft course visible to users


class EnrolledUserOut(BaseModel):
    user_id: str
    full_name: str
    email: str
    enrolled_at: Optional[str] = None
    amount_paid: Optional[float] = None
    status: str = "ACTIVE"


class CourseCreateOrderRequest(BaseModel):
    apply_coins: bool = True


class CourseOrderResponse(BaseModel):
    order_id: str
    amount_paise: int
    amount_rupees: float
    currency: str = "INR"
    key_id: str
    course_id: str
    course_title: str
    coins_applied: int
    discount_amount: float
    user_coins_available: int


class CourseVerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str  # HMAC-SHA256 from Razorpay checkout callback
    coins_used: int = 0


class CourseEnrollmentResponse(BaseModel):
    success: bool
    message: str
    course_id: str
    course_title: str
    enrolled_at: str
    payment_id: str
    amount_paid: float
    coins_deducted: int
    coins_balance: int


class EnrolledCourseOut(BaseModel):
    id: str
    course_id: str
    title: str
    course_title: str
    target_exam: str
    tagline: str
    description: Optional[str] = ""
    thumbnail_icon: str = "SparklesIcon"
    subjects: List[str] = Field(default_factory=list)
    total_quizzes: int = 0
    quizzes: List[CourseSubjectQuiz] = Field(default_factory=list)
    enrolled_at: Optional[str] = None
    amount_paid: Optional[float] = None
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    status: str = "ACTIVE"
    expires_at: Optional[str] = None

    model_config = {"extra": "allow"}

