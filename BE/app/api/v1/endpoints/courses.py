from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, security_scheme
from app.core.rate_limiter import check_rate_limit
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.course import (
    CourseCreateOrderRequest,
    CourseDetailOut,
    CourseEnrollmentResponse,
    CourseOrderResponse,
    CourseSummaryOut,
    CourseVerifyPaymentRequest,
)
from app.schemas.user import UserResponse
from app.services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["Courses & Razorpay"], dependencies=[Depends(check_rate_limit)])


async def get_optional_user(
    auth=Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[UserResponse]:
    """Helper to detect user if authenticated, without throwing 401 for guests."""
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_token(auth.credentials)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"_id": user_id})
        if not user:
            return None
        from app.models.user import UserRole
        return UserResponse(
            id=user["_id"],
            email=user["email"],
            full_name=user["full_name"],
            role=UserRole(user.get("role", "student")),
            is_active=user.get("is_active", True),
            profile=user.get("profile", {}),
            created_at=user["created_at"],
        )
    except Exception:
        return None


@router.get("", response_model=APIResponse[List[CourseSummaryOut]])
async def list_courses(
    target_exam: Optional[str] = Query(None, description="Filter courses by target exam"),
    current_user: Optional[UserResponse] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all available exam-oriented courses with pricing, discounts, and enrollment status."""
    service = CourseService(db)
    user_id = current_user.id if current_user else None
    courses = await service.list_courses(user_id=user_id, target_exam=target_exam)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(courses)} courses",
        data=courses,
    )


@router.get("/my-enrollments", response_model=APIResponse[List[Dict[str, Any]]])
async def get_my_enrolled_courses(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve courses currently enrolled by the authenticated user with subject quizzes."""
    service = CourseService(db)
    courses = await service.get_my_enrolled_courses(current_user.id)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(courses)} enrolled courses",
        data=courses,
    )


@router.get("/{course_id}", response_model=APIResponse[CourseDetailOut])
async def get_course_detail(
    course_id: str,
    current_user: Optional[UserResponse] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve full course details including syllabus, subject-wise quizzes, and detailed answer explanations."""
    service = CourseService(db)
    user_id = current_user.id if current_user else None
    course = await service.get_course_detail(course_id=course_id, user_id=user_id)
    return APIResponse(
        success=True,
        message="Course details retrieved successfully",
        data=course,
    )


@router.post("/{course_id}/create-order", response_model=APIResponse[CourseOrderResponse])
async def create_course_order(
    course_id: str,
    req: CourseCreateOrderRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Generate a Razorpay checkout order for course enrollment with coin discount applied."""
    service = CourseService(db)
    order = await service.create_order(
        user_id=current_user.id,
        course_id=course_id,
        apply_coins=req.apply_coins,
    )
    return APIResponse(
        success=True,
        message="Razorpay order created successfully",
        data=order,
    )


@router.post("/{course_id}/verify-payment", response_model=APIResponse[CourseEnrollmentResponse])
async def verify_course_payment(
    course_id: str,
    req: CourseVerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Verify transaction with Razorpay signature, activate course in user profile, and record payment."""
    service = CourseService(db)
    result = await service.verify_and_enroll(
        user_id=current_user.id,
        course_id=course_id,
        order_id=req.order_id,
        payment_id=req.payment_id,
        signature=req.signature,
        coins_used=req.coins_used,
    )
    return APIResponse(
        success=True,
        message=result.message,
        data=result,
    )
