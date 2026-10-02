from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.test import TestType


class TestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    test_type: TestType = TestType.FULL
    target_exam: str = "SSC CGL"
    subject: Optional[str] = None
    sub_subject: Optional[str] = None
    topic: Optional[str] = None
    duration_minutes: int = Field(gt=0, description="Test duration in minutes")
    positive_marks_per_q: float = Field(default=2.0, gt=0)
    negative_marks_per_q: float = Field(default=0.5, ge=0)
    question_ids: List[str] = Field(min_length=1)
    is_active: bool = True


class TestSummaryOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    test_type: TestType
    target_exam: str
    subject: Optional[str] = None
    sub_subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = "MEDIUM"
    duration_minutes: int
    total_marks: float
    positive_marks_per_q: float
    negative_marks_per_q: float
    total_questions: int
    is_active: bool
    created_at: datetime



class TestDetailOut(TestSummaryOut):
    question_ids: List[str]


class TestFilterParams(BaseModel):
    test_type: Optional[TestType] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    target_exam: Optional[str] = None
    is_active: Optional[bool] = True
