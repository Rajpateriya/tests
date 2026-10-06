from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import require_admin
from app.core.config import settings
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import db_manager, get_db
from app.db.redis import redis_manager
from app.models.test import TestType
from app.schemas.common import APIResponse
from app.schemas.test import AdminTestDetailOut, TestCreate, TestDetailOut, TestQuestionOut, TestUpdate
from app.schemas.user import PaginatedUsersResponse, UserAdminUpdate, UserResponse
from app.services.auth_service import AuthService
from app.services.test_service import TestService

router = APIRouter(prefix="/admin", tags=["Admin Operations"], dependencies=[Depends(check_rate_limit)])


@router.post("/tests", response_model=APIResponse[TestDetailOut], status_code=status.HTTP_201_CREATED)
async def create_test_config(
    req: TestCreate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Manually configure a mock test specifying exact question IDs and marking scheme."""
    service = TestService(db)
    test = await service.create_test(req)
    return APIResponse(
        success=True,
        message="Mock test configured successfully",
        data=test,
    )


@router.post("/tests/auto-generate", response_model=APIResponse[TestDetailOut], status_code=status.HTTP_201_CREATED)
async def auto_generate_mock(
    title: str = Query(..., description="Title of the mock test"),
    test_type: TestType = Query(TestType.FULL),
    target_exam: str = Query("SSC CGL"),
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    num_questions: int = Query(25, ge=1, le=100),
    duration_minutes: int = Query(30, ge=5, le=180),
    positive_marks: float = Query(2.0),
    negative_marks: float = Query(0.5),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Admin: Dynamically generate a test by randomly sampling questions
    from the automated data pipeline question repository.
    """
    service = TestService(db)
    test = await service.auto_generate_mock(
        title=title,
        test_type=test_type,
        target_exam=target_exam,
        subject=subject,
        topic=topic,
        num_questions=num_questions,
        duration_minutes=duration_minutes,
        positive_marks=positive_marks,
        negative_marks=negative_marks,
    )
    return APIResponse(
        success=True,
        message=f"Automatically compiled test with {test.total_questions} questions",
        data=test,
    )


@router.get("/tests/{test_id}", response_model=APIResponse[AdminTestDetailOut])
async def get_test_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: one test in full (inactive ones too), with the courses it is tagged to."""
    test = await TestService(db).get_admin_test(test_id)
    return APIResponse(success=True, message="Test retrieved", data=test)


@router.get("/tests/{test_id}/questions", response_model=APIResponse[List[TestQuestionOut]])
async def get_test_questions_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: the test's questions in order, with correct answers and explanations."""
    questions = await TestService(db).list_questions_for_admin(test_id)
    return APIResponse(success=True, message=f"{len(questions)} questions", data=questions)


@router.put("/tests/{test_id}", response_model=APIResponse[AdminTestDetailOut])
async def update_test_admin(
    test_id: str,
    req: TestUpdate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: change a test's title, description, duration, marking or on/off state.

    Courses that include the test are updated to match."""
    test = await TestService(db).update_test(test_id, req)
    return APIResponse(success=True, message="Test updated", data=test)


@router.delete("/tests/{test_id}", response_model=APIResponse[dict])
async def delete_test_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: delete a test and remove it from every course that included it.

    A course left with no tests is switched back to draft. Students' finished results are kept.
    Refused (409) while a student is in the middle of taking the test."""
    result = await TestService(db).delete_test(test_id)
    return APIResponse(success=True, message=f"Test '{result['title']}' deleted", data=result)


@router.get("/stats", response_model=APIResponse[dict])
async def get_platform_stats(
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Overview metrics of platform usage."""
    users_count = await db.users.count_documents({})
    questions_count = await db.questions.count_documents({})
    tests_count = await db.tests.count_documents({})
    courses_count = await db.courses.count_documents({})
    attempts_count = await db.attempts.count_documents({})
    completed_attempts = await db.attempts.count_documents({"status": "COMPLETED"})

    return APIResponse(
        success=True,
        message="Platform metrics retrieved",
        data={
            "total_users": users_count,
            "total_questions_in_bank": questions_count,
            "total_configured_tests": tests_count,
            "total_courses": courses_count,
            "total_attempts": attempts_count,
            "completed_attempts": completed_attempts,
        },
    )


@router.get("/health", response_model=APIResponse[dict])
async def check_health(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """System health check verifying database and Redis connectivity."""
    db_status = "connected"
    try:
        await db.command("ping")
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "fallback_memory" if redis_manager.is_fallback else "connected"

    return APIResponse(
        success=True,
        message="System health check",
        data={
            "app": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
            "database": {
                "status": db_status,
                "is_mock": db_manager.is_mock,
            },
            "cache": {
                "status": redis_status,
                "is_fallback": redis_manager.is_fallback,
            },
        },
    )


# --- User Management Operations ---
@router.get("/users", response_model=APIResponse[PaginatedUsersResponse])
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size (default 10)"),
    search: Optional[str] = Query(None, description="Search by email or full name"),
    role: Optional[str] = Query(None, description="Filter by role: student | admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Retrieve paginated user directory with search and filter capabilities."""
    auth_service = AuthService(db)
    result = await auth_service.get_users_paginated(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_active=is_active,
    )
    return APIResponse(
        success=True,
        message=f"Retrieved {len(result.items)} users (Page {result.page} of {result.total_pages})",
        data=result,
    )


@router.get("/users/{user_id}", response_model=APIResponse[UserResponse])
async def get_user_detail(
    user_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Get detailed profile of a specific user."""
    auth_service = AuthService(db)
    user = await auth_service.admin_get_user(user_id)
    return APIResponse(
        success=True,
        message="User profile retrieved",
        data=user,
    )


@router.put("/users/{user_id}", response_model=APIResponse[UserResponse])
async def update_user_profile(
    user_id: str,
    req: UserAdminUpdate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Edit user's profile, promote to admin, modify role/coins/subscription/status."""
    auth_service = AuthService(db)
    updated = await auth_service.admin_update_user(user_id, req, admin)
    return APIResponse(
        success=True,
        message=f"User '{updated.full_name}' updated successfully",
        data=updated,
    )


@router.delete("/users/{user_id}", response_model=APIResponse[dict])
async def delete_user(
    user_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Delete a user account."""
    auth_service = AuthService(db)
    await auth_service.admin_delete_user(user_id, admin)
    return APIResponse(
        success=True,
        message="User deleted successfully",
        data={"user_id": user_id},
    )

