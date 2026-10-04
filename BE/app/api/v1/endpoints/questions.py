from typing import List, Optional, Union
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, require_admin
from app.core.exceptions import ForbiddenException
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.models.question import Difficulty
from app.models.user import UserRole
from app.schemas.common import APIResponse
from app.schemas.question import QuestionCreate, QuestionFilterParams, QuestionOut, QuestionPage
from app.schemas.user import UserResponse
from app.services.question_service import QuestionService

router = APIRouter(prefix="/questions", tags=["Questions Bank"], dependencies=[Depends(check_rate_limit)])


@router.get("", response_model=APIResponse[Union[QuestionPage, List[QuestionOut]]])
async def list_questions(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[Difficulty] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search question text"),
    sub_subject: Optional[str] = Query(None, description="Filter by sub-subject"),
    subtopic: Optional[str] = Query(None, description="Filter by subtopic"),
    target_exam: Optional[str] = Query(None, description="Filter by target exam"),
    source: Optional[str] = Query(None, pattern="^(theory|ai_knowledge)$",
                                  description="theory = grounded in uploaded theory; ai_knowledge = written without theory"),
    page: Optional[int] = Query(None, ge=1, description="Set to get a paginated response with totals (admin only)"),
    page_size: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List questions in the question bank with filters.

    Without `page` this returns a plain list (`skip`/`limit`), as before. With
    `page` it returns `{items, total, page, page_size, pages}`, newest first,
    for the admin question browser.
    """
    service = QuestionService(db)
    params = QuestionFilterParams(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        search=search,
        sub_subject=sub_subject,
        subtopic=subtopic,
        target_exam=target_exam,
        source=source,
    )
    if page is not None:
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Administrator privileges required to browse the question bank")
        result = await service.list_page(params, page=page, page_size=page_size)
        return APIResponse(
            success=True,
            message=f"{result.total} question(s) match",
            data=result,
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
