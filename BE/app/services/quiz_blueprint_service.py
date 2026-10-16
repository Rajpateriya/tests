"""Per-subject quiz blueprint: the shape of one quiz (see app/models/quiz_blueprint.py).

Used only by quiz assembly. Bulk question generation works from the
taxonomy instead, so the blueprint can describe a single quiz without
also having to hold bank-sized question counts.
"""
import re
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.quiz_blueprint import DEFAULT_BLUEPRINT_NAME, QuizBlueprint
from app.repositories.quiz_blueprint_repo import QuizBlueprintRepository
from app.services.slot_planner import DEFAULT_MIX, LEVELS, plan_quiz
from app.services.taxonomy_service import TaxonomyService, canonical_sub_subject

# Several blueprints per subject are stored one document each, keyed
# "<subject>::<name>". Documents saved before naming existed are keyed on the
# bare subject and are still read as the subject's "Default".
NAME_SEPARATOR = "::"


class QuizBlueprintService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = QuizBlueprintRepository(db)
        self.taxonomy_service = TaxonomyService(db)

    @staticmethod
    def doc_id(subject: str, name: str = DEFAULT_BLUEPRINT_NAME) -> str:
        return f"{subject}{NAME_SEPARATOR}{name}"

    async def get_blueprint(
        self, subject: str, name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """A subject's blueprint by name. Falls back to the pre-naming document,
        which was keyed on the bare subject, so existing blueprints keep working."""
        doc = await self.repo.get_by_id(self.doc_id(subject, name or DEFAULT_BLUEPRINT_NAME))
        if doc is None and (name is None or name == DEFAULT_BLUEPRINT_NAME):
            doc = await self.repo.get_by_id(subject)
            if doc is not None:
                doc.setdefault("name", DEFAULT_BLUEPRINT_NAME)
        return doc

    async def require_blueprint(self, subject: str, name: Optional[str] = None) -> Dict[str, Any]:
        doc = await self.get_blueprint(subject, name)
        if not doc:
            available = [b["name"] for b in await self.list_blueprints(subject)]
            if available:
                raise NotFoundException(
                    f"'{subject}' has no blueprint named {name!r}. "
                    f"Available: {', '.join(available)}."
                )
            raise NotFoundException(
                f"No blueprint set for '{subject}'. Create one via "
                f"POST /generation/blueprint/{subject}/generate-starter, then PUT /generation/blueprint."
            )
        return doc

    async def list_blueprints(self, subject: str) -> List[Dict[str, Any]]:
        """Every blueprint for a subject, as {name, total_questions, topics, subtopics}."""
        prefix = re.escape(f"{subject}{NAME_SEPARATOR}")
        docs = await self.repo.collection.find(
            {"$or": [{"_id": {"$regex": f"^{prefix}"}}, {"_id": subject}]}
        ).to_list(length=None)
        out = []
        for doc in docs:
            topics = [t for s in doc.get("sections", []) for t in s.get("topics", [])]
            out.append({
                "name": doc.get("name") or (
                    doc["_id"].split(NAME_SEPARATOR, 1)[1]
                    if NAME_SEPARATOR in doc["_id"] else DEFAULT_BLUEPRINT_NAME
                ),
                "total_questions": doc.get("total_questions"),
                "topics": len(topics),
                "subtopics": sum(len(t.get("subtopics", [])) for t in topics),
            })
        return sorted(out, key=lambda b: b["name"].lower())

    async def delete_blueprint(self, subject: str, name: str) -> bool:
        result = await self.repo.collection.delete_one({"_id": self.doc_id(subject, name)})
        if result.deleted_count:
            return True
        if name == DEFAULT_BLUEPRINT_NAME:  # the pre-naming document
            return bool((await self.repo.collection.delete_one({"_id": subject})).deleted_count)
        return False

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

        doc_id = self.doc_id(blueprint.subject, blueprint.name)
        doc = {
            "_id": doc_id,
            "subject": blueprint.subject,
            "name": blueprint.name,
            "total_questions": blueprint.total_questions,
            "difficulty": blueprint.difficulty.model_dump(),
            "sections": sections,
        }
        await self.repo.collection.replace_one({"_id": doc_id}, doc, upsert=True)
        # Saving "Default" supersedes the pre-naming document, which was keyed on the
        # bare subject; leaving it would shadow nothing but would linger as a duplicate.
        if blueprint.name == DEFAULT_BLUEPRINT_NAME:
            await self.repo.collection.delete_one({"_id": blueprint.subject})
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
            "name": DEFAULT_BLUEPRINT_NAME,
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
        name: Optional[str] = None,
        quizzes: int = 1,
    ) -> Dict[str, Any]:
        """Plan `quizzes` consecutive quizzes. Each one rotates onto a different set of
        subtopics, so a batch is the only way to see which subtopics the blueprint
        actually reaches — one quiz alone always looks like a fixed list."""
        blueprint = await self.require_blueprint(subject, name)

        quiz_plans, coverage = [], {}
        for n in range(quizzes):
            slots = plan_quiz(blueprint, sub_subject, topic, questions_per_quiz, difficulty, n)
            mix = {level.capitalize(): 0 for level in LEVELS}
            for slot in slots:
                mix[slot["difficulty"]] += slot["count"]
                key = (slot["sub_subject"], slot["topic"], slot["subtopic"])
                entry = coverage.setdefault(key, {
                    "sub_subject": slot["sub_subject"], "topic": slot["topic"],
                    "subtopic": slot["subtopic"], "quizzes": [], "questions": 0,
                })
                if n + 1 not in entry["quizzes"]:
                    entry["quizzes"].append(n + 1)
                entry["questions"] += slot["count"]
            quiz_plans.append({
                "quiz": n + 1,
                "questions": sum(slot["count"] for slot in slots),
                "by_difficulty": mix,
                "slots": slots,
            })

        first = quiz_plans[0]
        return {
            "subject": subject,
            "blueprint": blueprint.get("name", DEFAULT_BLUEPRINT_NAME),
            "sub_subject": sub_subject,
            "topic": topic,
            "quizzes": quizzes,
            "questions_per_quiz": first["questions"],
            "by_difficulty": first["by_difficulty"],
            "slots": first["slots"],
            "quiz_plans": quiz_plans,
            "coverage": sorted(coverage.values(), key=lambda c: (c["topic"], c["subtopic"])),
            "subtopics_reached": len(coverage),
        }
