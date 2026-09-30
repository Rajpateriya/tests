from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class PYQInDB(BaseModel):
    """A real past-year question, used as a style/tone reference during quiz
    generation. Unlike theory chunks, PYQs ARE exam-specific — tone/format
    genuinely differs between SSC CGL, UPSC, RRB, etc. No embedding — just a
    plain stored record, matched by exact subject/exam/topic filters.
    """

    id: str = Field(alias="_id")
    subject: str
    sub_subject: Optional[str] = None
    topic: str
    subtopic: str
    target_exam: str
    question_text: str
    options: List[str]
    correct_option: str
    source_pdf: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
