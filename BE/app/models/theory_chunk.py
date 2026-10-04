from typing import List, Literal, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class TheoryChunkInDB(BaseModel):
    """A single heading-scoped chunk of theory content, embedded for retrieval.

    Deliberately exam-agnostic: facts about a subject don't change by exam,
    so no `exam` field is stored here (unlike questions/PYQs, which are).
    """

    id: str = Field(alias="_id")
    subject: str
    sub_subject: Optional[str] = None
    topic: str
    subtopic: str
    topic_source: Literal["taxonomy", "freeform"]
    heading: str
    text: str
    source_pdf: str
    embedding: List[float]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
