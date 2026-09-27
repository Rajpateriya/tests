from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.attempt import AttemptStatus, PaletteStatus
from app.schemas.question import QuestionPublicOut


class AttemptStartResponse(BaseModel):
    attempt_id: str
    test_id: str
    test_title: str
    duration_minutes: int
    remaining_seconds: int
    start_time: datetime
    expiry_time: datetime
    status: AttemptStatus
    total_questions: int


class AttemptQuestionsResponse(BaseModel):
    attempt_id: str
    test_id: str
    test_title: str
    duration_minutes: int
    remaining_seconds: int
    current_question_index: int
    palette_states: Dict[str, PaletteStatus]
    answers: Dict[str, str]  # question_id -> selected_option
    time_spent_per_question: Dict[str, int]
    questions: List[QuestionPublicOut]


class AttemptSyncRequest(BaseModel):
    """
    Sync payload sent every few seconds from the frontend exam room.
    Persists user palette state, current question, answers, and time spent.
    """
    current_question_index: int = Field(ge=0)
    palette_states: Dict[str, PaletteStatus] = Field(default_factory=dict)
    answers: Dict[str, str] = Field(default_factory=dict)  # question_id -> option_id
    time_spent_per_question: Dict[str, int] = Field(default_factory=dict)  # question_id -> seconds
    tab_switch_count: Optional[int] = None


class AttemptSyncResponse(BaseModel):
    attempt_id: str
    remaining_seconds: int
    synced_at: datetime
    is_expired: bool = False
    message: str = "State synced successfully"


class AttemptSubmitRequest(BaseModel):
    """
    Final submit payload. Can optionally include the last state before submitting.
    """
    answers: Optional[Dict[str, str]] = None
    time_spent_per_question: Optional[Dict[str, int]] = None
    palette_states: Optional[Dict[str, PaletteStatus]] = None
