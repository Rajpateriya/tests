from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import get_current_user
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.typing import (
    TypingHistoryResponse,
    TypingPassageOut,
    TypingScorecardOut,
    TypingSubmitRequest,
)
from app.schemas.user import UserResponse
from app.services.typing_service import TypingService

router = APIRouter(prefix="/typing", tags=["Typing Master Engine"])


@router.get("/passages", response_model=APIResponse[List[TypingPassageOut]])
async def list_typing_passages(
    category: Optional[str] = Query(None, alias="exam_category", description="Filter by exam category"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get all active typing test passages with target WPM, key depressions, and time limits.
    """
    service = TypingService(db)
    passages = await service.list_passages(category=category)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(passages)} typing passages",
        data=passages,
        status_code=status.HTTP_200_OK,
    )


@router.get("/passages/{passage_id}", response_model=APIResponse[TypingPassageOut])
async def get_typing_passage(
    passage_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve single typing passage by ID for starting the mock test.
    """
    service = TypingService(db)
    passage = await service.get_passage(passage_id)
    return APIResponse(
        success=True,
        message="Typing passage retrieved",
        data=passage,
        status_code=status.HTTP_200_OK,
    )


@router.post("/submit", response_model=APIResponse[TypingScorecardOut])
async def submit_typing_test(
    payload: TypingSubmitRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Submit completed typing test session.
    Evaluates Gross WPM, Net WPM, Keystroke Accuracy, Half/Full mistakes,
    and Exam Qualification (SSC CGL DEST, CHSL, RRB NTPC).
    """
    service = TypingService(db)
    scorecard = await service.evaluate_attempt(str(current_user.id), payload)
    return APIResponse(
        success=True,
        message="Typing test evaluated successfully",
        data=scorecard,
        status_code=status.HTTP_200_OK,
    )


@router.get("/my-history", response_model=APIResponse[TypingHistoryResponse])
async def get_my_typing_history(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve user's typing mock test history, best WPM, accuracy, and qualification rate.
    """
    service = TypingService(db)
    history = await service.get_user_history(str(current_user.id))
    return APIResponse(
        success=True,
        message="Typing test history retrieved",
        data=history,
        status_code=status.HTTP_200_OK,
    )
