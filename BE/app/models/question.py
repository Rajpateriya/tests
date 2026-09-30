from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class OptionItem(BaseModel):
    id: str  # e.g., "A", "B", "C", "D"
    text: str


class QuestionInDB(BaseModel):
    id: str = Field(alias="_id")
    subject: str
    topic: str
    difficulty: Difficulty = Difficulty.MEDIUM
    question_text: str
    options: List[OptionItem]
    correct_option: str
    solution_explanation: str
    external_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
