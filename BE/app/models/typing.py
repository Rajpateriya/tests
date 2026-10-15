from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class TypingPassageInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    exam_category: str = "SSC CGL"
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
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "extra": "allow"}


class TypingAttemptInDB(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
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
    typed_text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "extra": "allow"}
