from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, require_admin, security_scheme
from app.core.rate_limiter import check_rate_limit
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.course import (
    CourseAdminOut,
    CourseCreateOrderRequest,
    CourseCreateRequest,
    CourseDetailOut,
    CourseEnrollmentResponse,
    CourseOrderResponse,
    CourseSummaryOut,
    CourseUpdateRequest,
    CourseVerifyPaymentRequest,
    EnrolledUserOut,
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


@router.get("/admin/all", response_model=APIResponse[List[CourseAdminOut]])
async def list_all_courses_admin(
    search: Optional[str] = Query(None, description="Matches the title or exam, ignoring case"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: courses (newest first), including archived ones, with who created it and when.

    Without `skip`/`limit` this is every course; Admin Studio pages through it and searches all of them.

    Declared before `/{course_id}` so "admin" is not read as a course id."""
    courses = await CourseService(db).list_all_for_admin(search=search, skip=skip, limit=limit)
    return APIResponse(success=True, message=f"{len(courses)} courses", data=courses)


@router.get("/admin/{course_id}", response_model=APIResponse[CourseAdminOut])
async def get_course_admin(
    course_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: one course in full (drafts and archived included), as opened from Admin Studio.

    Declared after `/admin/all` and before `/{course_id}`."""
    course = await CourseService(db).get_admin_course(course_id)
    return APIResponse(success=True, message="Course retrieved", data=course)


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


@router.post("", response_model=APIResponse[CourseAdminOut], status_code=status.HTTP_201_CREATED)
async def create_course(
    req: CourseCreateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: create a course with its details and price, tagging already-generated tests to it.

    Each id in `test_ids` becomes a quiz of the course (quiz id = test id). Users then enroll
    through `create-order` / `verify-payment`; the tagged tests can only be started once enrolled."""
    course = await CourseService(db).create_course(req, admin_id=admin.id)
    return APIResponse(success=True, message="Course created", data=course)


@router.put("/{course_id}", response_model=APIResponse[CourseAdminOut])
async def update_course(
    course_id: str,
    req: CourseUpdateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: edit details or price, change the tagged tests, or archive with `is_active=false`.

    `test_ids` is the full list of generated tests tagged to the course. A built-in course keeps its
    own embedded quizzes; only the test-backed quizzes are replaced by this list."""
    course = await CourseService(db).update_course(course_id, req)
    return APIResponse(success=True, message="Course updated", data=course)


@router.post("/{course_id}/publish", response_model=APIResponse[CourseAdminOut])
async def publish_course(
    course_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: make a draft course visible to users (needs at least one tagged test).

    Only published courses appear in `GET /courses`, can be bought, and lock their tests."""
    course = await CourseService(db).update_course(course_id, CourseUpdateRequest(is_published=True))
    return APIResponse(success=True, message="Course published", data=course)


@router.post("/{course_id}/unpublish", response_model=APIResponse[CourseAdminOut])
async def unpublish_course(
    course_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: take a course back to draft. Users who already enrolled keep their enrollment."""
    course = await CourseService(db).update_course(course_id, CourseUpdateRequest(is_published=False))
    return APIResponse(success=True, message="Course unpublished", data=course)


@router.get("/{course_id}/enrollments", response_model=APIResponse[List[EnrolledUserOut]])
async def list_course_enrollments(
    course_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: the users enrolled in this course, newest first."""
    users = await CourseService(db).list_enrollments(course_id)
    return APIResponse(success=True, message=f"{len(users)} enrolled users", data=users)


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
