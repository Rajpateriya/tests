from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
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


class CourseDetailOut(CourseSummaryOut):
    quizzes: List[CourseSubjectQuiz]


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
    signature: Optional[str] = None
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
