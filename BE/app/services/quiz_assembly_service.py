"""Assembles ready-to-take quizzes from the question bank using the blueprint.

The blueprint is turned into one quiz's exact slots (sub_subject, topic,
subtopic, difficulty, count). Each quiz fills every slot from approved bank
questions for the exam, least-used first, never repeating a question inside
a quiz and never using a question in more than `max_question_reuse` tests.
Only complete quizzes are created; if the bank runs out, assembly stops and
reports which slots are short, so bulk generation can fill exactly that gap.
Each quiz is saved through the existing TestService, so it shows up in the
app like any other test.
"""
import random
import re
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.test import TestType
from app.schemas.test import TestCreate
from app.services.quiz_blueprint_service import QuizBlueprintService
from app.services.slot_planner import plan_quiz
from app.services.test_service import TestService


def _ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _max_quizzes(remaining_uses: List[int], per_quiz: int) -> int:
    """How many quizzes a slot's pool can serve: each quiz needs `per_quiz`
    DIFFERENT questions, and each question has limited remaining uses."""
    quizzes = 0
    while sum(min(uses, quizzes + 1) for uses in remaining_uses) >= per_quiz * (quizzes + 1):
        quizzes += 1
    return quizzes


class QuizAssemblyService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.blueprint_service = QuizBlueprintService(db)
        self.test_service = TestService(db)

    async def assemble(
        self,
        target_exam: str,
        subject: str,
        quizzes: int,
        sub_subject: Optional[str] = None,
        topic: Optional[str] = None,
        questions_per_quiz: Optional[int] = None,
        difficulty: Optional[Dict[str, int]] = None,
        max_question_reuse: int = 1,
        title_prefix: Optional[str] = None,
        duration_minutes: int = 30,
        positive_marks: float = 2.0,
        negative_marks: float = 0.5,
    ) -> Dict[str, Any]:
        blueprint = await self.blueprint_service.require_blueprint(subject)
        slots = plan_quiz(blueprint, sub_subject, topic, questions_per_quiz, difficulty)

        pools: List[List[Dict[str, Any]]] = []
        for slot in slots:
            scope: Dict[str, Any] = {
                "subject": _ci(subject),
                "sub_subject": _ci(slot["sub_subject"]) if slot["sub_subject"] else None,
                "topic": _ci(slot["topic"]),
                "subtopic": _ci(slot["subtopic"]),
                "target_exam": _ci(target_exam),
                "difficulty": slot["difficulty"],
                "is_active": {"$ne": False},
            }
            docs = await self.db.questions.find(scope, {"_id": 1, "used_in_tests": 1}).to_list(length=None)
            random.shuffle(docs)  # random tie-break among equally-used questions
            pools.append(docs)

        usage = {doc["_id"]: doc.get("used_in_tests", 0) for pool in pools for doc in pool}
        max_possible = min(
            _max_quizzes([max(0, max_question_reuse - usage[d["_id"]]) for d in pool], slot["count"])
            for slot, pool in zip(slots, pools)
        )

        name = sub_subject or subject
        prefix = title_prefix or f"{name} Mock"
        numbering_start = await self.db.tests.count_documents(
            {"title": {"$regex": f"^{re.escape(prefix)} #\\d+$"}}
        ) + 1

        created: List[Dict[str, Any]] = []
        for n in range(quizzes):
            picked: List[str] = []
            for slot, pool in zip(slots, pools):
                available = sorted(
                    (d for d in pool if usage[d["_id"]] < max_question_reuse),
                    key=lambda d: usage[d["_id"]],
                )
                if len(available) < slot["count"]:
                    picked = []
                    break
                picked.extend(d["_id"] for d in available[: slot["count"]])
            if not picked:
                break

            test = await self.test_service.create_test(
                TestCreate(
                    title=f"{prefix} #{numbering_start + n}",
                    description=f"Assembled from the {subject} blueprint for {target_exam}",
                    test_type=TestType.TOPIC_MINI if topic else TestType.SUBJECT,
                    target_exam=target_exam,
                    subject=subject,
                    sub_subject=sub_subject,
                    topic=topic,
                    duration_minutes=duration_minutes,
                    positive_marks_per_q=positive_marks,
                    negative_marks_per_q=negative_marks,
                    question_ids=picked,
                )
            )
            await self.db.questions.update_many({"_id": {"$in": picked}}, {"$inc": {"used_in_tests": 1}})
            for question_id in picked:
                usage[question_id] += 1
            created.append({"id": test.id, "title": test.title, "total_questions": test.total_questions})

        missing = []
        if len(created) < quizzes:
            for slot, pool in zip(slots, pools):
                available = sum(1 for d in pool if usage[d["_id"]] < max_question_reuse)
                if available < slot["count"]:
                    missing.append({
                        "sub_subject": slot["sub_subject"],
                        "topic": slot["topic"],
                        "subtopic": slot["subtopic"],
                        "difficulty": slot["difficulty"],
                        "needed_per_quiz": slot["count"],
                        "available": available,
                    })

        return {
            "requested": quizzes,
            "created": len(created),
            "not_created": quizzes - len(created),
            "max_possible": max_possible,
            "questions_per_quiz": sum(slot["count"] for slot in slots),
            "tests": created,
            "missing": missing,
        }
