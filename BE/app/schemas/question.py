from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.question import Difficulty, OptionItem


class QuestionOptionCreate(BaseModel):
    id: str  # e.g. "A", "B", "C", "D"
    text: str


class QuestionCreate(BaseModel):
    subject: str
    topic: str
    difficulty: Difficulty = Difficulty.MEDIUM
    question_text: str
    options: List[QuestionOptionCreate]
    correct_option: str
    solution_explanation: str
    external_id: Optional[str] = None


class QuestionPublicOut(BaseModel):
    """Question schema served to students during an active test (solution & correct option hidden)."""
    id: str
    subject: str
    topic: str
    difficulty: Difficulty
    question_text: str
    options: List[OptionItem]


class QuestionOut(BaseModel):
    """Full question details including correct answer and explanation (for post-submission review & admin)."""
    id: str
    subject: str
    topic: str
    difficulty: Difficulty
    question_text: str
    options: List[OptionItem]
    correct_option: str
    solution_explanation: str
    created_at: datetime
    # Set on questions made by the AI pipeline; absent on seeded/imported ones.
    sub_subject: Optional[str] = None
    subtopic: Optional[str] = None
    target_exam: Optional[str] = None
    source: Optional[str] = None  # "theory" or "ai_knowledge"
    grounded: Optional[bool] = None
    used_in_tests: Optional[int] = None


class QuestionPage(BaseModel):
    """One page of the question bank, with totals for pagination controls."""
    items: List[QuestionOut]
    total: int
    page: int
    page_size: int
    pages: int


class QuestionFilterParams(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    search: Optional[str] = None
    sub_subject: Optional[str] = None
    subtopic: Optional[str] = None
    target_exam: Optional[str] = None
    source: Optional[str] = None  # "theory" or "ai_knowledge"
