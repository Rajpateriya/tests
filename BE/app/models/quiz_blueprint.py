"""Quiz blueprint: the shape of ONE quiz, used by assembly.

Two modes, never mixed:
  - Weights mode: `total_questions` set; sections/topics/subtopics carry an
    optional `weight` (default 1) and the planner splits the total.
  - Counts mode: no `total_questions`; every subtopic has an exact `count`.

A difficulty mix (easy/medium/hard percentages) is set on the blueprint and
can be overridden on any section, topic or subtopic — the nearest one wins.
"""
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class DifficultyMix(BaseModel):
    easy: int = Field(ge=0, le=100)
    medium: int = Field(ge=0, le=100)
    hard: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def _adds_up(self):
        if self.easy + self.medium + self.hard != 100:
            raise ValueError("difficulty easy + medium + hard must add up to 100")
        return self


class BlueprintSubtopic(BaseModel):
    subtopic: str
    weight: Optional[float] = Field(default=None, gt=0)
    count: Optional[int] = Field(default=None, ge=1)
    difficulty: Optional[DifficultyMix] = None


class BlueprintTopic(BaseModel):
    topic: str
    weight: Optional[float] = Field(default=None, gt=0)
    difficulty: Optional[DifficultyMix] = None
    subtopics: List[BlueprintSubtopic] = Field(min_length=1)


class BlueprintSection(BaseModel):
    sub_subject: Optional[str] = None
    weight: Optional[float] = Field(default=None, gt=0)
    difficulty: Optional[DifficultyMix] = None
    topics: List[BlueprintTopic] = Field(min_length=1)


class QuizBlueprint(BaseModel):
    subject: str
    total_questions: Optional[int] = Field(default=None, ge=1)
    difficulty: DifficultyMix = Field(
        default_factory=lambda: DifficultyMix(easy=30, medium=50, hard=20)
    )
    sections: List[BlueprintSection] = Field(min_length=1)

    @model_validator(mode="after")
    def _one_mode(self):
        subtopics = [st for s in self.sections for t in s.topics for st in t.subtopics]
        any_weight = any(
            node.weight is not None
            for s in self.sections
            for node in [s, *s.topics, *[st for t in s.topics for st in t.subtopics]]
        )
        if self.total_questions is not None:
            if any(st.count is not None for st in subtopics):
                raise ValueError(
                    "Blueprint has total_questions, so use `weight` — not `count` — on subtopics"
                )
        else:
            if any_weight:
                raise ValueError("`weight` needs total_questions; without it, give every subtopic a `count`")
            missing = [st.subtopic for st in subtopics if st.count is None]
            if missing:
                raise ValueError(f"Without total_questions every subtopic needs a count; missing: {missing}")
        return self
