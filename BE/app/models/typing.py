from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class TypingPassageInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    exam_category: str = "SSC CGL DEST"
    content: str
    duration_seconds: int = 900
    target_wpm: float = 27.0
    target_keystrokes: int = 2000
    difficulty: str = "Medium"
    language: str = "English"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}


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
    is_qualified: bool
    qualification_reason: str
    typed_text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
