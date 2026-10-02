from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class AttemptStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"



class PaletteStatus(str, Enum):
    NOT_VISITED = "NOT_VISITED"
    NOT_ANSWERED = "NOT_ANSWERED"
    ANSWERED = "ANSWERED"
    MARKED_FOR_REVIEW = "MARKED_FOR_REVIEW"
    ANSWERED_AND_MARKED_FOR_REVIEW = "ANSWERED_AND_MARKED_FOR_REVIEW"


class UserAttemptAnswer(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    time_taken_seconds: int = 0
    is_correct: Optional[bool] = None
    marks_awarded: float = 0.0


class UserAttemptInDB(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    test_id: str
    test_title: str = ""
    test_type: str = "FULL"
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    expiry_time: datetime
    status: AttemptStatus = AttemptStatus.IN_PROGRESS

    # Active Exam Room State (for state persistence & instant resume)
    current_question_index: int = 0
    palette_states: Dict[str, PaletteStatus] = Field(default_factory=dict)
    answers: Dict[str, str] = Field(default_factory=dict)  # question_id -> selected_option
    time_spent_per_question: Dict[str, int] = Field(default_factory=dict)  # question_id -> seconds
    tab_switch_count: int = 0

    # Evaluated Results
    total_score: float = 0.0
    max_possible_score: float = 0.0
    accuracy_percentage: float = 0.0
    correct_count: int = 0
    incorrect_count: int = 0
    unattempted_count: int = 0
    total_time_taken_seconds: int = 0
    detailed_answers: List[UserAttemptAnswer] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
