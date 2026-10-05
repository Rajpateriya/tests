from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class TypingPassageOut(BaseModel):
    id: str
    title: str
    exam_category: str
    content: str
    duration_seconds: int
    target_wpm: float
    target_keystrokes: int
    difficulty: str
    language: str
    total_words: int
    total_characters: int


class TypingSubmitRequest(BaseModel):
    passage_id: str
    time_taken_seconds: float = Field(ge=1.0)
    typed_text: str
    backspace_count: int = 0
    total_keystrokes: Optional[int] = None


class TypingScorecardOut(BaseModel):
    id: str
    passage_id: str
    passage_title: str
    exam_category: str
    time_taken_seconds: float
    gross_wpm: float
    net_wpm: float
    accuracy_percentage: float
    total_keystrokes: int
    correct_keystrokes: int
    wrong_keystrokes: int
    backspace_count: int
    error_count: int
    is_qualified: bool
    qualification_reason: str
    created_at: datetime


class TypingHistoryResponse(BaseModel):
    attempts: List[TypingScorecardOut]
    total_tests: int
    best_wpm: float
    average_wpm: float
    best_accuracy: float
    qualification_rate: float
