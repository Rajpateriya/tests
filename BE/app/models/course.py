from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CourseQuizOption(BaseModel):
    id: str
    text: str


class CourseQuizQuestion(BaseModel):
    id: str
    question_text: str
    options: List[CourseQuizOption]
    correct_option: str
    solution_explanation: str
    difficulty: str = "Medium"
    subject: str
    topic: Optional[str] = None


class CourseSubjectQuiz(BaseModel):
    id: str
    title: str
    subject: str
    topic: Optional[str] = None
    target_exam: str
    duration_minutes: int = 15
    total_questions: int
    positive_marks: float = 2.0
    negative_marks: float = 0.5
    questions: List[CourseQuizQuestion] = Field(default_factory=list)


class CourseInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    target_exam: str
    tagline: str
    description: str
    original_price: float
    discounted_price: float
    badge: str = "Bestseller"
    rating: float = 4.9
    reviews_count: int = 1420
    enrolled_count: int = 8900
    thumbnail_icon: str = "SparklesIcon"
    subjects: List[str] = Field(default_factory=list)
    quizzes: List[CourseSubjectQuiz] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    created_by: Optional[str] = None  # admin user id; None for seeded courses
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
