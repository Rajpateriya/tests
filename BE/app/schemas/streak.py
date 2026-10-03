from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.question import Difficulty, OptionItem


class DailyQuizQuestionOut(BaseModel):
    id: str
    subject: str
    topic: str
    difficulty: str
    question_text: str
    options: List[OptionItem]
    step_number: Optional[int] = 1


class DailyQuizAnswerSubmit(BaseModel):
    question_id: str
    selected_option: str


class DailyQuizAnswerResult(BaseModel):
    question_id: str
    is_correct: bool
    selected_option: str
    correct_option: str
    solution_explanation: str
    difficulty: str
    subject: str
    topic: str


class DailyQuizSolveRequest(BaseModel):
    correct_count: Optional[int] = 3
    total_count: Optional[int] = 3
