"""Per-subject quiz blueprint: the shape of one quiz (see app/models/quiz_blueprint.py).

Used only by quiz assembly. Bulk question generation works from the
taxonomy instead, so the blueprint can describe a single quiz without
also having to hold bank-sized question counts.
"""
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.quiz_blueprint import QuizBlueprint
from app.repositories.quiz_blueprint_repo import QuizBlueprintRepository
from app.services.slot_planner import DEFAULT_MIX, LEVELS, plan_quiz
from app.services.taxonomy_service import TaxonomyService, canonical_sub_subject


class QuizBlueprintService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = QuizBlueprintRepository(db)
        self.taxonomy_service = TaxonomyService(db)

    async def get_blueprint(self, subject: str) -> Optional[Dict[str, Any]]:
        return await self.repo.get_by_id(subject)

    async def require_blueprint(self, subject: str) -> Dict[str, Any]:
        doc = await self.get_blueprint(subject)
        if not doc:
            raise NotFoundException(
                f"No blueprint set for '{subject}'. Create one via "
                f"POST /generation/blueprint/{subject}/generate-starter, then PUT /generation/blueprint."
            )
        return doc

    async def set_blueprint(self, blueprint: QuizBlueprint) -> Dict[str, Any]:
        allowed = await self.taxonomy_service.get_sub_subjects(blueprint.subject)
        sections = [section.model_dump() for section in blueprint.sections]

        if allowed:
            seen = set()
            for section in sections:
                canonical = canonical_sub_subject(section["sub_subject"], allowed)
                if canonical is None:
                    raise BadRequestException(
                        f"Section sub_subject {section['sub_subject']!r} is not one of "
                        f"{blueprint.subject}'s sub-subjects: {', '.join(allowed)}"
                    )
                if canonical in seen:
                    raise BadRequestException(f"Sub-subject '{canonical}' has more than one section")
                seen.add(canonical)
                section["sub_subject"] = canonical
        else:
            if len(sections) != 1 or sections[0]["sub_subject"] is not None:
                raise BadRequestException(
                    f"'{blueprint.subject}' has no sub-subjects, so the blueprint needs exactly one "
                    f"section with sub_subject: null"
                )

        doc = {
            "_id": blueprint.subject,
            "total_questions": blueprint.total_questions,
            "difficulty": blueprint.difficulty.model_dump(),
            "sections": sections,
        }
        await self.repo.collection.replace_one({"_id": blueprint.subject}, doc, upsert=True)
        return doc

    async def generate_starter_blueprint(self, subject: str, default_count: int = 3) -> Dict[str, Any]:
        """Counts-mode draft from the taxonomy: every subtopic gets `default_count`.
        Returned for review/editing, not saved."""
        taxonomy = await self.taxonomy_service.get_doc(subject)
        if not taxonomy or not taxonomy.get("tree"):
            raise NotFoundException(
                f"No taxonomy found for '{subject}' — set it via PUT /generation/taxonomy "
                f"or upload theory first."
            )

        allowed: List[str] = taxonomy.get("sub_subjects", [])
        order = allowed if allowed else [None]
        sections = []
        for sub_subject in order:
            topics = [
                {"topic": entry["topic"],
                 "subtopics": [{"subtopic": st, "count": default_count} for st in entry["subtopics"]]}
                for entry in taxonomy["tree"]
                if (entry.get("sub_subject") or None) == sub_subject and entry["subtopics"]
            ]
            if topics:
                sections.append({"sub_subject": sub_subject, "topics": topics})

        return {
            "subject": subject,
            "total_questions": None,
            "difficulty": dict(DEFAULT_MIX),
            "sections": sections,
        }

    async def plan(
        self,
        subject: str,
        sub_subject: Optional[str] = None,
        topic: Optional[str] = None,
        questions_per_quiz: Optional[int] = None,
        difficulty: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        blueprint = await self.require_blueprint(subject)
        slots = plan_quiz(blueprint, sub_subject, topic, questions_per_quiz, difficulty)
        by_difficulty = {level.capitalize(): 0 for level in LEVELS}
        for slot in slots:
            by_difficulty[slot["difficulty"]] += slot["count"]
        return {
            "subject": subject,
            "sub_subject": sub_subject,
            "topic": topic,
            "questions_per_quiz": sum(slot["count"] for slot in slots),
            "by_difficulty": by_difficulty,
            "slots": slots,
        }
