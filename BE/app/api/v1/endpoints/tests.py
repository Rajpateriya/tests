from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.models.test import TestType
from app.schemas.attempt import AttemptStartResponse
from app.schemas.common import APIResponse
from app.schemas.test import TestDetailOut, TestFilterParams, TestSummaryOut
from app.schemas.user import UserResponse
from app.services.exam_engine_service import ExamEngineService
from app.services.test_service import TestService

router = APIRouter(prefix="/tests", tags=["Tests Discovery & Engine"], dependencies=[Depends(check_rate_limit)])


@router.get("", response_model=APIResponse[List[TestSummaryOut]])
async def list_tests(
    test_type: Optional[TestType] = Query(None, description="Filter by test type (FULL, SUBJECT, TOPIC_MINI)"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    target_exam: Optional[str] = Query(None, description="Filter by target exam (e.g. SSC CGL)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Test Discovery Dashboard:
    List available mock tests with filters for Full Mocks, Subject-wise, or Topic-wise Mini Mocks.
    """
    service = TestService(db)
    params = TestFilterParams(
        test_type=test_type,
        subject=subject,
        topic=topic,
        target_exam=target_exam,
        is_active=True,
    )
    tests = await service.list_tests(params, skip=skip, limit=limit)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(tests)} available tests",
        data=tests,
    )


@router.get("/{test_id}", response_model=APIResponse[TestDetailOut])
async def get_test_details(
    test_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get metadata and configuration for a specific mock test."""
    service = TestService(db)
    test = await service.get_test_by_id(test_id)
    return APIResponse(
        success=True,
        message="Test details retrieved",
        data=test,
    )


@router.post("/{test_id}/start", response_model=APIResponse[AttemptStartResponse], status_code=status.HTTP_201_CREATED)
async def start_test(
    test_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Initialize an exam attempt (The 'Exam Room').
    Starts the server-side timer, prepares the question palette, and initiates Redis state tracking.
    If the user has an existing active attempt on this test, resumes seamlessly.
    """
    engine_service = ExamEngineService(db)
    attempt_session = await engine_service.start_attempt(current_user.id, test_id)
    return APIResponse(
        success=True,
        message="Test session initialized",
        data=attempt_session,
    )
