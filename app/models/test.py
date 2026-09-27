from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class TestType(str, Enum):
    FULL = "FULL"
    SUBJECT = "SUBJECT"
    TOPIC_MINI = "TOPIC_MINI"


class TestInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: Optional[str] = ""
    test_type: TestType = TestType.FULL
    target_exam: str = "SSC CGL"
    subject: Optional[str] = None
    topic: Optional[str] = None
    duration_minutes: int
    total_marks: float
    positive_marks_per_q: float = 2.0
    negative_marks_per_q: float = 0.5
    question_ids: List[str] = Field(default_factory=list)
    total_questions: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
