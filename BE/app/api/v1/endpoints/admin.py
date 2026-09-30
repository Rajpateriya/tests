from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import require_admin
from app.core.config import settings
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import db_manager, get_db
from app.db.redis import redis_manager
from app.models.test import TestType
from app.schemas.common import APIResponse
from app.schemas.test import TestCreate, TestDetailOut
from app.schemas.user import UserResponse
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


@router.get("/stats", response_model=APIResponse[dict])
async def get_platform_stats(
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Overview metrics of platform usage."""
    users_count = await db.users.count_documents({})
    questions_count = await db.questions.count_documents({})
    tests_count = await db.tests.count_documents({})
    attempts_count = await db.attempts.count_documents({})
    completed_attempts = await db.attempts.count_documents({"status": "COMPLETED"})

    return APIResponse(
        success=True,
        message="Platform metrics retrieved",
        data={
            "total_users": users_count,
            "total_questions_in_bank": questions_count,
            "total_configured_tests": tests_count,
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
