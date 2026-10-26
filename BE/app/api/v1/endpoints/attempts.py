from typing import Optional
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.attempt import (
    AttemptQuestionsResponse,
    AttemptStartResponse,
    AttemptSubmitRequest,
    AttemptSyncRequest,
    AttemptSyncResponse,
)
from app.schemas.common import APIResponse
from app.schemas.result import AttemptResultOut
from app.schemas.user import UserResponse
from app.services.evaluation_service import EvaluationService
from app.services.exam_engine_service import ExamEngineService

router = APIRouter(prefix="/attempts", tags=["Exam Room Execution"], dependencies=[Depends(check_rate_limit)])


@router.get("/active", response_model=APIResponse[Optional[AttemptStartResponse]])
async def get_active_attempt(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get user's current in-progress test attempt, if any.
    Used by frontend to restore 'Resume Exam' button on page reload or reconnect.
    """
    engine_service = ExamEngineService(db)
    active = await engine_service.get_active_attempt_for_user(current_user.id)
    return APIResponse(
        success=True,
        message="Active attempt retrieved" if active else "No active attempt",
        data=active,
    )


@router.post("/active/abandon", response_model=APIResponse[dict])
async def abandon_active_attempt(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Abandon or finish the user's active attempt so they can start new tests without conflict.
    """
    engine_service = ExamEngineService(db)
    result = await engine_service.abandon_active_attempt(current_user.id)
    return APIResponse(
        success=True,
        message=result.get("message", "Active attempt ended"),
        data=result,
    )


@router.get("/{attempt_id}/questions", response_model=APIResponse[AttemptQuestionsResponse])
async def get_attempt_questions(
    attempt_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetch questions for the active test session in the Exam Room.
    Returns the public sanitized questions along with current palette states and server timer.
    """
    engine_service = ExamEngineService(db)
    questions_response = await engine_service.get_attempt_questions(attempt_id, current_user.id)
    return APIResponse(
        success=True,
        message="Active attempt questions and exam room state loaded",
        data=questions_response,
    )


@router.post("/{attempt_id}/sync", response_model=APIResponse[AttemptSyncResponse])
async def sync_attempt_state(
    attempt_id: str,
    req: AttemptSyncRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Heartbeat sync endpoint.
    Called periodically (e.g. every 5-10s or on Save & Next) by the frontend exam UI.
    Saves answers, question palette states, and time spent to Redis and MongoDB.
    """
    engine_service = ExamEngineService(db)
    sync_result = await engine_service.sync_attempt_state(attempt_id, current_user.id, req)
    return APIResponse(
        success=True,
        message=sync_result.message,
        data=sync_result,
    )


@router.post("/{attempt_id}/submit", response_model=APIResponse[AttemptResultOut])
async def submit_attempt(
    attempt_id: str,
    req: Optional[AttemptSubmitRequest] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Final Test Submission & Instant Evaluation.
    Grades user answers, calculates negative marking, computes topic/subject accuracy,
    and returns immediate score summary.
    """
    eval_service = EvaluationService(db)
    result = await eval_service.submit_and_evaluate(attempt_id, current_user.id, req)
    return APIResponse(
        success=True,
        message="Test successfully submitted and evaluated",
        data=result,
    )


@router.post("/{attempt_id}/pause", response_model=APIResponse[dict])
async def pause_attempt(
    attempt_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Pause an active test session."""
    engine_service = ExamEngineService(db)
    data = await engine_service.pause_attempt(attempt_id, current_user.id)
    return APIResponse(
        success=True,
        message="Test paused successfully",
        data=data,
    )


@router.post("/{attempt_id}/resume", response_model=APIResponse[dict])
async def resume_attempt(
    attempt_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Resume a paused test session."""
    engine_service = ExamEngineService(db)
    data = await engine_service.resume_attempt(attempt_id, current_user.id)
    return APIResponse(
        success=True,
        message="Test resumed successfully",
        data=data,
    )

