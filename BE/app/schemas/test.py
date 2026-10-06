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


class TestUpdate(BaseModel):
    """Admin: change a test's settings. Fields left out stay as they are."""
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    duration_minutes: Optional[int] = Field(default=None, gt=0)
    positive_marks_per_q: Optional[float] = Field(default=None, gt=0)
    negative_marks_per_q: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


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


class TestCourseRef(BaseModel):
    id: str
    title: str
    is_published: bool = True


class AdminTestDetailOut(TestDetailOut):
    """Admin view of one test: also inactive ones, the courses it is tagged to, and when it changed."""
    updated_at: Optional[datetime] = None
    courses: List[TestCourseRef] = Field(default_factory=list)


class TestQuestionOut(BaseModel):
    """One question of a test as an admin sees it: correct answer and explanation included."""
    id: str
    question_text: str
    options: List[dict]
    correct_option: str
    solution_explanation: str = ""
    difficulty: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None


class TestFilterParams(BaseModel):
    test_type: Optional[TestType] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    target_exam: Optional[str] = None
    search: Optional[str] = None  # matches the title or subject, ignoring case
    is_active: Optional[bool] = True
