from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class TypingPassageCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Title of the typing passage")
    exam_category: str = Field("SSC CGL", description="Exam category like SSC CGL, SSC CHSL, RRB NTPC")
    content: Optional[str] = Field(None, description="Passage body text")
    paragraph: Optional[str] = Field(None, description="Alternative field for paragraph text")
    marks: int = Field(20, ge=1, le=100, description="Evaluation marks for this passage")
    duration_minutes: int = Field(5, ge=1, le=60, description="Duration in minutes")
    duration_seconds: Optional[int] = Field(None, ge=10, description="Duration in seconds (defaults to duration_minutes * 60)")
    word_count: Optional[int] = Field(None, description="Word count (auto-computed if omitted)")
    target_wpm: float = Field(35.0, ge=10.0, description="Cutoff typing speed target in WPM")
    target_keystrokes: Optional[int] = Field(None, description="Target keystrokes")
    difficulty: str = Field("Medium", description="Passage difficulty (Easy, Medium, Hard)")
    language: str = Field("English", description="Language of typing paragraph")
    is_active: bool = Field(True, description="Whether passage is active for selection")


class TypingPassageOut(BaseModel):
    id: str
    title: str
    exam_category: str
    content: str
    paragraph: Optional[str] = None
    duration_minutes: int = 5
    duration_seconds: int = 300
    marks: int = 20
    word_count: int = 200
    target_wpm: float = 35.0
    target_keystrokes: int = 1200
    difficulty: str = "Medium"
    language: str = "English"
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
    marks_obtained: float = 20.0
    total_marks: int = 20
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
