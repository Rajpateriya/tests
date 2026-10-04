from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
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
    total_mocks_attempted: int
    average_score: float
    average_accuracy: float
    best_score: float
    overall_percentile: float
    current_streak_days: int = 5
    coins_balance: int = 150
    global_rank: int = 1420
    total_solved_questions: int = 85
    total_available_questions: int = 100
    upcoming_tests_count: int = 3
    subject_performance: Dict[str, float]  # subject -> accuracy
    difficulty_stats: Optional[Dict[str, Any]] = None  # easy/medium/hard breakdown
    recent_attempts: List[AttemptResultOut]
    recommended_tests: List[Dict[str, Any]]
    upcoming_tests: Optional[List[Dict[str, Any]]] = None
    activity_history: Optional[List[Dict[str, Any]]] = None

