from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.attempt import AttemptStatus
from app.models.question import Difficulty, OptionItem


class QuestionResultDetail(BaseModel):
    question_id: str
    subject: str
    topic: str
    difficulty: Difficulty
    question_text: str
    options: List[OptionItem]
    correct_option: str
    selected_option: Optional[str] = None
    is_correct: bool
    is_attempted: bool
    marks_awarded: float
    time_taken_seconds: int
    solution_explanation: str


class AttemptResultOut(BaseModel):
    attempt_id: str
    user_id: str
    test_id: str
    test_title: str
    status: AttemptStatus
    total_score: float
    max_possible_score: float
    percentage: float
    accuracy_percentage: float
    correct_count: int
    incorrect_count: int
    unattempted_count: int
    total_questions: int
    total_time_taken_seconds: int
    start_time: datetime
    end_time: Optional[datetime] = None
    tab_switch_count: Optional[int] = None
    ended_reason: Optional[str] = None  # "tab_switch" when the test was ended for switching tabs too often


class TopicAccuracy(BaseModel):
    topic: str
    subject: str
    total_questions: int
    attempted: int
    correct: int
    accuracy_percentage: float
    avg_time_per_q_seconds: float


class SubjectAccuracy(BaseModel):
    subject: str
    total_questions: int
    attempted: int
    correct: int
    accuracy_percentage: float
    avg_time_per_q_seconds: float


class DetailedInsightsOut(BaseModel):
    attempt_id: str
    test_id: str
    test_title: str
    total_score: float
    percentile: float
    rank: int
    total_participants: int
    overall_accuracy: float
    avg_time_per_question: float
    subject_analysis: List[SubjectAccuracy]
    topic_analysis: List[TopicAccuracy]
    strong_areas: List[str]  # topics with >= 75% accuracy
    weak_areas: List[str]    # topics with < 50% accuracy
    questions_breakdown: List[QuestionResultDetail]


class UserDashboardStatsOut(BaseModel):
    user_id: str
    total_mocks_attempted: int = 0
    average_score: float = 0.0
    average_accuracy: float = 0.0
    best_score: float = 0.0
    overall_percentile: float = 0.0
    current_streak_days: int = 0
    coins_balance: int = 0
    global_rank: int = 0
    total_candidates: int = 0
    avg_speed_seconds: float = 0.0
    total_solved_questions: int = 0
    total_available_questions: int = 0
    upcoming_tests_count: int = 0
    subject_performance: Dict[str, float] = Field(default_factory=dict)
    difficulty_stats: Optional[Dict[str, Any]] = None  # easy/medium/hard breakdown
    recent_attempts: List[AttemptResultOut] = Field(default_factory=list)
    recommended_tests: List[Dict[str, Any]] = Field(default_factory=list)
    upcoming_tests: Optional[List[Dict[str, Any]]] = None
    activity_history: Optional[List[Dict[str, Any]]] = None

