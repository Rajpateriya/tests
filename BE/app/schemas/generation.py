from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.quiz_blueprint import DifficultyMix


class TaxonomySetRequest(BaseModel):
    """Give EITHER `sub_subjects` (subject has branches, e.g. Science) OR `topics` (it doesn't)."""

    subject: str
    sub_subjects: Optional[Dict[str, Dict[str, List[str]]]] = Field(
        default=None,
        description='e.g. {"Chemistry": {"Chemical Reactions and Equations": ["Balancing Chemical Equations"]}, "Biology": {}}',
    )
    topics: Optional[Dict[str, List[str]]] = Field(
        default=None, description='e.g. {"Profit & Loss": ["Discount", "Marked Price"]}'
    )

    @model_validator(mode="after")
    def _exactly_one(self):
        if (self.sub_subjects is None) == (self.topics is None):
            raise ValueError("Give exactly one of `sub_subjects` or `topics`")
        if self.sub_subjects is not None and not self.sub_subjects:
            raise ValueError("`sub_subjects` needs at least one sub-subject")
        return self


class TheoryUploadResponse(BaseModel):
    subject: str
    sub_subject: Optional[str]
    files_processed: int
    chunks_ingested: int
    chunks_failed: int
    chunks_duplicate: int
    sub_subject_unresolved: int
    total_chunks: int
    per_file: List[Dict[str, Any]]


class PYQUploadResponse(BaseModel):
    subject: str
    sub_subject: Optional[str]
    target_exam: str
    files_processed: int
    questions_ingested: int
    questions_failed: int
    duplicates_skipped: int
    sub_subject_unresolved: int
    per_file: List[Dict[str, Any]]


class QuestionGenerateRequest(BaseModel):
    """Fill the question bank from the taxonomy: every matching subtopic is
    brought up to `per_subtopic` questions for the exam (only the gap is generated)."""

    target_exam: str = "SSC CGL"
    subject: str
    sub_subject: Optional[str] = None
    topic: Optional[str] = None
    per_subtopic: int = Field(default=10, ge=1, le=200)
    difficulty: DifficultyMix = Field(
        default_factory=lambda: DifficultyMix(easy=30, medium=50, hard=20)
    )
    allow_ai_knowledge: bool = Field(
        default=False,
        description="For subtopics with no uploaded theory, write questions from the model's own "
                    "knowledge instead of skipping them. They are saved straight to the bank, "
                    "marked source='ai_knowledge' (not checked against any source).",
    )
    style_notes: Optional[str] = Field(
        default=None, max_length=500,
        description="Optional extra description of the exam's question style, e.g. "
                    "'statement-based, application questions, avoid trivia'.",
    )


class BlueprintPlanRequest(BaseModel):
    sub_subject: Optional[str] = None
    topic: Optional[str] = None
    questions_per_quiz: Optional[int] = Field(default=None, ge=1)
    difficulty: Optional[DifficultyMix] = None


class AssembleRequest(BaseModel):
    target_exam: str = "SSC CGL"
    subject: str
    sub_subject: Optional[str] = None
    topic: Optional[str] = None
    quizzes: int = Field(default=1, ge=1, le=200)
    questions_per_quiz: Optional[int] = Field(
        default=None, ge=1, description="Override the blueprint's size for this run"
    )
    difficulty: Optional[DifficultyMix] = Field(
        default=None, description="Override the blueprint's difficulty mix for this run"
    )
    max_question_reuse: int = Field(
        default=1, ge=1, description="Max number of tests one question may appear in (1 = never repeated)"
    )
    title_prefix: Optional[str] = None
    duration_minutes: int = Field(default=30, gt=0)
    positive_marks: float = Field(default=2.0, gt=0)
    negative_marks: float = Field(default=0.5, ge=0)
