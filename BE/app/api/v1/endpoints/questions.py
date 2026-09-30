from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, require_admin
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.models.question import Difficulty
from app.schemas.common import APIResponse
from app.schemas.question import QuestionCreate, QuestionFilterParams, QuestionOut
from app.schemas.user import UserResponse
from app.services.question_service import QuestionService

router = APIRouter(prefix="/questions", tags=["Questions Bank"], dependencies=[Depends(check_rate_limit)])


@router.get("", response_model=APIResponse[List[QuestionOut]])
async def list_questions(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[Difficulty] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search question text"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List questions in the question bank with subject/topic/difficulty filters."""
    service = QuestionService(db)
    params = QuestionFilterParams(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        search=search,
    )
    questions = await service.list_questions(params, skip=skip, limit=limit)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(questions)} questions",
        data=questions,
    )


@router.get("/{question_id}", response_model=APIResponse[QuestionOut])
async def get_question(
    question_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve full details of a single question."""
    service = QuestionService(db)
    question = await service.get_by_id(question_id)
    return APIResponse(
        success=True,
        message="Question retrieved",
        data=question,
    )


@router.post("/import", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def import_pipeline_questions(
    questions: List[QuestionCreate],
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Data Pipeline Ingestion Connector.
    Used by the external data generation pipeline to bulk feed generated question sets.
    """
    service = QuestionService(db)
    result = await service.ingest_pipeline_questions(questions)
    return APIResponse(
        success=True,
        message=f"Successfully imported {result['ingested_count']} questions into the question bank",
        data=result,
    )
