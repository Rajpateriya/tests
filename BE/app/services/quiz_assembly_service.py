"""Assembles ready-to-take quizzes from the question bank using the blueprint.

The blueprint is turned into one quiz's exact slots (sub_subject, topic,
subtopic, difficulty, count). Each quiz fills every slot from approved bank
questions for the exam, least-used first, never repeating a question inside
a quiz and never using a question in more than `max_question_reuse` tests.

A quiz always comes out the requested size. When a slot can't be filled exactly,
it degrades one step at a time and reports every step:

  1. the slot's own subtopic at its own difficulty
  2. the same subtopic at the nearest other difficulty (Hard -> Medium -> Easy,
     Easy -> Medium -> Hard, Medium -> Easy -> Hard)
  3. a sibling subtopic under the same topic, so topic balance survives
  4. any other subtopic in scope, own difficulty first

Only when the whole bank is out of unused questions is a quiz not created, so
asking for 10 quizzes yields 10 whenever the bank holds 10 quizzes' worth.
Assembly then stops and reports which subtopics are short.

Successive quizzes rotate which subtopics they draw from (see `plan_quiz`'s
`rotation`), so a quiz smaller than the blueprint's subtopic count doesn't keep
hitting the same few subtopics and leaving the rest of the bank untouched.

Each quiz is saved through the existing TestService, so it shows up in the
app like any other test.
"""
import random
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.quiz_blueprint import DEFAULT_BLUEPRINT_NAME
from app.models.test import TestType
from app.schemas.test import TestCreate
from app.services.quiz_blueprint_service import QuizBlueprintService
from app.services.slot_planner import plan_quiz, subtopic_keys
from app.services.test_service import TestService

LEVEL_NAMES = ("Easy", "Medium", "Hard")
FALLBACK_ORDER = {"Easy": ["Medium", "Hard"], "Medium": ["Easy", "Hard"], "Hard": ["Medium", "Easy"]}
MAX_SIMULATED_QUIZZES = 500

SubtopicKey = Tuple[str, str, str]


def _ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _key(slot: Dict[str, Any]) -> SubtopicKey:
    return ((slot["sub_subject"] or "").lower(), slot["topic"].lower(), slot["subtopic"].lower())


def _siblings(
    key: SubtopicKey, by_key: Dict[SubtopicKey, Dict[str, List[Dict[str, Any]]]]
) -> List[SubtopicKey]:
    """Other subtopics under the same sub_subject and topic as `key`."""
    return [k for k in by_key if k != key and k[0] == key[0] and k[1] == key[1]]


def _available(
    pool: List[Dict[str, Any]], usage: Dict[str, int], max_reuse: int, taken: Set[str]
) -> List[Dict[str, Any]]:
    """Unused (and not yet picked for this quiz) questions, least-used first."""
    return sorted(
        (d for d in pool if usage[d["_id"]] < max_reuse and d["_id"] not in taken),
        key=lambda d: usage[d["_id"]],
    )


def _pick_quiz(
    slots: List[Dict[str, Any]],
    by_key: Dict[SubtopicKey, Dict[str, List[Dict[str, Any]]]],
    usage: Dict[str, int],
    max_reuse: int,
) -> Optional[Tuple[List[str], List[Dict[str, Any]]]]:
    """Question ids for ONE quiz, plus the difficulty substitutions it needed;
    None if some subtopic can't be filled even using its other difficulties."""
    picked: List[str] = []
    taken: Set[str] = set()
    short: List[Tuple[Dict[str, Any], int]] = []

    # Pass 1: every slot from its own difficulty, so a slot's fallback can never
    # steal a question another slot of this quiz is entitled to.
    for slot in slots:
        pool = by_key[_key(slot)].get(slot["difficulty"], [])
        chosen = _available(pool, usage, max_reuse, taken)[: slot["count"]]
        for doc in chosen:
            taken.add(doc["_id"])
            picked.append(doc["_id"])
        if len(chosen) < slot["count"]:
            short.append((slot, slot["count"] - len(chosen)))

    # Pass 2: top up the short slots from the same subtopic's nearest difficulties.
    substitutions: List[Dict[str, Any]] = []
    for slot, need in short:
        for level in FALLBACK_ORDER[slot["difficulty"]]:
            if need == 0:
                break
            pool = by_key[_key(slot)].get(level, [])
            chosen = _available(pool, usage, max_reuse, taken)[:need]
            for doc in chosen:
                taken.add(doc["_id"])
                picked.append(doc["_id"])
            if chosen:
                substitutions.append({"slot": slot, "wanted": slot["difficulty"], "used": level, "count": len(chosen)})
                need -= len(chosen)

        # Pass 3: the subtopic is dry at every difficulty, so borrow from a sibling
        # subtopic under the same topic. Without this one exhausted subtopic would
        # abort the quiz — and every quiz after it — while its siblings sit on spares.
        for sibling in _siblings(_key(slot), by_key):
            if need == 0:
                break
            for level in (slot["difficulty"], *FALLBACK_ORDER[slot["difficulty"]]):
                if need == 0:
                    break
                chosen = _available(by_key[sibling].get(level, []), usage, max_reuse, taken)[:need]
                for doc in chosen:
                    taken.add(doc["_id"])
                    picked.append(doc["_id"])
                if chosen:
                    substitutions.append({
                        "slot": slot,
                        "wanted": slot["difficulty"],
                        "used": level,
                        "count": len(chosen),
                        "borrowed_from": sibling[2],
                    })
                    need -= len(chosen)

        # Pass 4: last resort — any subtopic still in scope. Topic fidelity is already
        # lost once we get here, so exhaust the slot's own difficulty across every
        # subtopic before giving up difficulty too. This is what makes "ask for 10,
        # get 10" hold: a quiz is now only unbuildable if the whole bank is short.
        if need > 0:
            own_topic = {_key(slot), *_siblings(_key(slot), by_key)}
            elsewhere = [k for k in by_key if k not in own_topic]
            for level in (slot["difficulty"], *FALLBACK_ORDER[slot["difficulty"]]):
                if need == 0:
                    break
                for other in elsewhere:
                    if need == 0:
                        break
                    chosen = _available(by_key[other].get(level, []), usage, max_reuse, taken)[:need]
                    for doc in chosen:
                        taken.add(doc["_id"])
                        picked.append(doc["_id"])
                    if chosen:
                        substitutions.append({
                            "slot": slot,
                            "wanted": slot["difficulty"],
                            "used": level,
                            "count": len(chosen),
                            "borrowed_from": other[2],
                            "borrowed_topic": other[1],
                        })
                        need -= len(chosen)

        if need > 0:
            return None
    return picked, substitutions


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
        blueprint_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        blueprint = await self.blueprint_service.require_blueprint(subject, blueprint_name)

        def slots_for(rotation: int) -> List[Dict[str, Any]]:
            return plan_quiz(
                blueprint, sub_subject, topic, questions_per_quiz, difficulty, rotation
            )

        # One pool per subtopic, split by difficulty, so a short difficulty can borrow
        # from its neighbours. Loaded for EVERY subtopic in the blueprint, not just the
        # ones the first rotation happens to pick, since later quizzes rotate onto others.
        by_key: Dict[SubtopicKey, Dict[str, List[Dict[str, Any]]]] = {}
        for slot in subtopic_keys(blueprint, sub_subject, topic):
            key = _key(slot)
            if key in by_key:
                continue
            scope: Dict[str, Any] = {
                "subject": _ci(subject),
                "sub_subject": _ci(slot["sub_subject"]) if slot["sub_subject"] else None,
                "topic": _ci(slot["topic"]),
                "subtopic": _ci(slot["subtopic"]),
                "target_exam": _ci(target_exam),
                "is_active": {"$ne": False},
            }
            docs = await self.db.questions.find(
                scope, {"_id": 1, "used_in_tests": 1, "difficulty": 1}
            ).to_list(length=None)
            random.shuffle(docs)  # random tie-break among equally-used questions
            buckets: Dict[str, List[Dict[str, Any]]] = {level: [] for level in LEVEL_NAMES}
            for doc in docs:
                level = str(doc.get("difficulty", "")).strip().capitalize()
                if level in buckets:
                    buckets[level].append(doc)
            by_key[key] = buckets

        usage = {
            doc["_id"]: doc.get("used_in_tests", 0)
            for buckets in by_key.values() for pool in buckets.values() for doc in pool
        }

        # How many quizzes the bank could serve in total (dry run on a copy of the usage).
        sim_usage = dict(usage)
        max_possible = 0
        while max_possible < MAX_SIMULATED_QUIZZES:
            result = _pick_quiz(slots_for(max_possible), by_key, sim_usage, max_question_reuse)
            if result is None:
                break
            for question_id in result[0]:
                sim_usage[question_id] += 1
            max_possible += 1

        # Default the title to the blueprint used, so two blueprints of the same
        # subject ("Part A", "Part B") don't share one #1, #2, #3 series.
        used_name = blueprint.get("name") or DEFAULT_BLUEPRINT_NAME
        name = sub_subject or subject
        if used_name != DEFAULT_BLUEPRINT_NAME:
            name = f"{name} {used_name}"
        prefix = title_prefix or f"{name} Mock"
        # Continue from the highest number already used, not from how many exist:
        # deleting #2 of #1-#4 would otherwise restart at #4 and collide with it.
        # The numbers have to be parsed rather than sorted, since "#9" sorts above
        # "#10" lexicographically.
        numbered = await self.db.tests.find(
            {"title": {"$regex": f"^{re.escape(prefix)} #\\d+$"}}, {"title": 1}
        ).to_list(length=None)
        used_numbers = [int(doc["title"].rsplit("#", 1)[1]) for doc in numbered]
        numbering_start = max(used_numbers) + 1 if used_numbers else 1

        created: List[Dict[str, Any]] = []
        substituted: Dict[Tuple[SubtopicKey, str, str, Optional[str]], Dict[str, Any]] = {}
        for n in range(quizzes):
            result = _pick_quiz(slots_for(n), by_key, usage, max_question_reuse)
            if result is None:
                break
            picked, substitutions = result

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

            for sub in substitutions:
                slot = sub["slot"]
                borrowed_from = sub.get("borrowed_from")
                borrowed_topic = sub.get("borrowed_topic")
                entry = substituted.setdefault(
                    (_key(slot), sub["wanted"], sub["used"], borrowed_from),
                    {"sub_subject": slot["sub_subject"], "topic": slot["topic"], "subtopic": slot["subtopic"],
                     "wanted": sub["wanted"], "used": sub["used"], "borrowed_from": borrowed_from,
                     "borrowed_topic": borrowed_topic, "count": 0},
                )
                entry["count"] += sub["count"]

        # A subtopic is short only when ALL its difficulties together can't fill one more quiz.
        # Report against the rotation that actually failed — the next quiz that would
        # have been built — since each rotation asks for a different set of subtopics.
        missing = []
        if len(created) < quizzes:
            needed_by_key: Dict[SubtopicKey, int] = {}
            first_slot: Dict[SubtopicKey, Dict[str, Any]] = {}
            for slot in slots_for(len(created)):
                needed_by_key[_key(slot)] = needed_by_key.get(_key(slot), 0) + slot["count"]
                first_slot.setdefault(_key(slot), slot)
            for key, needed in needed_by_key.items():
                left = sum(
                    1 for pool in by_key[key].values() for d in pool if usage[d["_id"]] < max_question_reuse
                )
                if left < needed:
                    slot = first_slot[key]
                    missing.append({
                        "sub_subject": slot["sub_subject"],
                        "topic": slot["topic"],
                        "subtopic": slot["subtopic"],
                        "difficulty": "Any",
                        "needed_per_quiz": needed,
                        "available": left,
                    })

        return {
            "subject": subject,
            "blueprint": used_name,
            "requested": quizzes,
            "created": len(created),
            "not_created": quizzes - len(created),
            "max_possible": max_possible,
            # Every rotation allocates the same total, so rotation 0 is representative.
            "questions_per_quiz": sum(slot["count"] for slot in slots_for(0)),
            "tests": created,
            "substituted": list(substituted.values()),
            "missing": missing,
        }
