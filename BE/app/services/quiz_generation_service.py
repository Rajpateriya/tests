"""Bulk question generation into the bank, driven by the taxonomy.

Flow: walk the subject's taxonomy (optionally narrowed to a sub-subject and/or
topic) -> for each subtopic, fill the bank up to `per_subtopic` questions for
the exam, split by a difficulty mix -> only the missing gap is generated, in
calls of GENERATION_BATCH_SIZE, each grounded in that subtopic's theory facts
+ PYQ-style examples -> duplicates rejected (hash + meaning, per
subject/sub-subject/topic/subtopic/exam) -> groundedness check -> saved to the
bank or flagged for review.

Re-running the same request only generates what is still missing, so a run
that stops partway (timeout, daily quota) is simply sent again.

Quizzes are NOT created here — they are assembled from the bank using the
blueprint (see quiz_assembly_service.py).
"""
import hashlib
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.core.logging import logger
from app.repositories.pyq_repo import PYQRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.theory_chunk_repo import TheoryChunkRepository
from app.services.embedding_service import cosine_similarity, embedding_service
from app.services.llm_client import llm_client
from app.services.slot_planner import (
    DEFAULT_MIX,
    LABELS,
    LEVELS,
    largest_remainder,
    normalise_level,
    split_by_mix,
)
from app.services.taxonomy_service import TaxonomyService, canonical_sub_subject, entries_for
from app.services.theory_retrieval_service import search_theory

EXAM_STYLES: Dict[str, Dict[str, str]] = {
    "ssc cgl": {
        "style": "Conceptual clarity, moderate difficulty, general knowledge + reasoning focus.",
        "distractors": "Include commonly confused facts, near-correct options, typical student errors.",
    },
    "upsc": {
        "style": "Analytical, application-based, tests depth of understanding over rote recall.",
        "distractors": "Include partially correct statements and closely related but wrong facts.",
    },
    "rrb": {
        "style": "Speed-solvable, moderate difficulty, direct factual/application questions.",
        "distractors": "Include close numerical values and commonly confused terms.",
    },
    "nda": {
        "style": "Fundamentals-focused, moderate difficulty, clear single-concept questions.",
        "distractors": "Include basic conceptual errors and similar-looking options.",
    },
}
DEFAULT_STYLE = {
    "style": "Clear, moderate difficulty, factual and application-based.",
    "distractors": "Include plausible but incorrect options based on common misconceptions.",
}

DIFFICULTY_GUIDE = """DIFFICULTY DEFINITIONS:
- easy: direct recall of a single fact from the THEORY FACTS
- medium: understanding or application — explain, compare, or apply one fact
- hard: multi-step reasoning, combining two or more facts, or statement/assertion–reason analysis"""


class GeneratedMCQ(BaseModel):
    question_text: str
    options: List[str] = Field(min_length=4, max_length=4)
    correct_option: str = Field(description='One of "A", "B", "C", "D"')
    explanation: str
    difficulty: str = Field(description='"easy", "medium" or "hard"')


class GeneratedQuizResponse(BaseModel):
    questions: List[GeneratedMCQ]


def _ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _question_hash(text: str) -> str:
    normalised = " ".join(text.lower().split())
    return hashlib.sha256(normalised.encode()).hexdigest()


def _is_near_duplicate(embedding: List[float], existing: List[List[float]]) -> bool:
    return any(
        cosine_similarity(embedding, other) >= settings.DUPLICATE_SIMILARITY_THRESHOLD
        for other in existing
    )


def _next_batch(gap: Dict[str, int], batch_size: int) -> Dict[str, int]:
    """The difficulty split to ask for in the next call: the whole remaining
    gap if it fits in one call, else `batch_size` shared proportionally."""
    remaining = sum(gap.values())
    if remaining <= batch_size:
        return dict(gap)
    return dict(zip(LEVELS, largest_remainder(batch_size, [gap[level] for level in LEVELS])))


def _build_quiz_prompt(
    target_exam: str,
    subject: str,
    sub_subject: Optional[str],
    topic: str,
    subtopic: str,
    split: Dict[str, int],
    theory_context: str,
    style_context: str,
    avoid_questions: List[str],
    facts_reused: bool,
) -> str:
    exam_style = EXAM_STYLES.get(target_exam.strip().lower(), DEFAULT_STYLE)
    count = sum(split.values())
    split_text = ", ".join(f"{split[level]} {level}" for level in LEVELS if split[level] > 0)

    style_section = (
        f"EXAMPLE QUESTIONS (match this tone/format, write ORIGINAL questions):\n{style_context}"
        if style_context
        else ""
    )
    # Only the handful of questions just rejected as duplicates — never the
    # whole bank, so prompt size stays constant as the bank grows.
    avoid_section = ""
    if avoid_questions:
        avoid_lines = "\n".join(f"- {text}" for text in avoid_questions)
        avoid_section = (
            "ALREADY IN THE QUESTION BANK — do NOT repeat these, or ask the same "
            f"thing in different words:\n{avoid_lines}"
        )
    reuse_note = ""
    if facts_reused:
        reuse_note = (
            "These facts have already been used for earlier questions. Test them from a "
            "different angle than a direct definition question — e.g. which statement is "
            "incorrect, assertion–reason, or applying the fact to a scenario."
        )
    sub_subject_line = f"- Sub-subject: {sub_subject}\n" if sub_subject else ""

    return f"""Generate EXACTLY {count} multiple choice questions for the {target_exam} examination:
{split_text}.

SPECIFICATION:
- Subject: {subject}
{sub_subject_line}- Topic: {topic}
- Subtopic: {subtopic}

EXAM STYLE:
{exam_style['style']}

DISTRACTOR RULES:
{exam_style['distractors']}

{DIFFICULTY_GUIDE}

THEORY FACTS (ground every question in these facts — do not introduce facts,
numbers, or claims that are not supported here or by well-established basic
knowledge; if the facts don't cover something, keep the question simpler
rather than inventing detail):
---
{theory_context}
---

{style_section}

{avoid_section}

{reuse_note}

REQUIREMENTS PER QUESTION:
1. question_text: clear, unambiguous, specifically about {subtopic}
2. options: exactly 4 plain strings (no "A)" style prefixes)
3. correct_option: "A", "B", "C", or "D", matching the option's position
4. explanation: why the correct answer is right, grounded in the THEORY FACTS above
5. difficulty: "easy", "medium" or "hard" — exactly {split_text} across the batch
6. Every question must be answerable and verifiable using the THEORY FACTS section above
7. No "All of the above" / "None of the above" options
8. Each question must test a DIFFERENT fact or ask it a different way — vary the
   format across the batch: direct concept, statement-based (which is
   correct/incorrect), assertion–reason, application/scenario

Generate EXACTLY {count} questions ({split_text}) — not more, not fewer."""


class QuizGenerationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.question_repo = QuestionRepository(db)
        self.pyq_repo = PYQRepository(db)
        self.theory_repo = TheoryChunkRepository(db)
        self.taxonomy_service = TaxonomyService(db)

    async def generate_questions(
        self,
        target_exam: str,
        subject: str,
        sub_subject: Optional[str] = None,
        topic: Optional[str] = None,
        per_subtopic: int = 10,
        difficulty: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        mix = difficulty or dict(DEFAULT_MIX)
        taxonomy = await self.taxonomy_service.get_doc(subject)
        if not taxonomy or not taxonomy.get("tree"):
            raise BadRequestException(
                f"No taxonomy for '{subject}' — set it via PUT /generation/taxonomy or upload theory first."
            )

        allowed: List[str] = taxonomy.get("sub_subjects", [])
        entries = taxonomy["tree"]
        if sub_subject:
            canonical = canonical_sub_subject(sub_subject, allowed)
            if canonical is None:
                raise BadRequestException(
                    f"Unknown sub-subject '{sub_subject}' for '{subject}'. "
                    f"Allowed: {', '.join(allowed) or '(none defined)'}"
                )
            sub_subject = canonical
            entries = entries_for(entries, sub_subject)
        if topic:
            entries = [e for e in entries if e["topic"].strip().lower() == topic.strip().lower()]
        if allowed:
            entries = [e for e in entries if e.get("sub_subject")]
        entries = [e for e in entries if e["subtopics"]]
        if not entries:
            raise BadRequestException(
                f"Nothing in the '{subject}' taxonomy matches sub_subject={sub_subject!r}, topic={topic!r}"
            )

        target = split_by_mix(per_subtopic, mix)
        totals = {"already_in_bank": 0, "generated": 0, "saved": 0, "flagged_for_review": 0,
                  "duplicates_rejected": 0, "shortfall": 0}
        per_subtopic_results: List[Dict[str, Any]] = []

        for entry in entries:
            for subtopic in entry["subtopics"]:
                result = await self._fill_subtopic(
                    target_exam, subject, entry.get("sub_subject"), entry["topic"], subtopic, target
                )
                totals["already_in_bank"] += sum(result["already_in_bank"].values())
                totals["generated"] += result["generated"]
                totals["saved"] += result["saved"]
                totals["flagged_for_review"] += result["flagged"]
                totals["duplicates_rejected"] += result["duplicates_rejected"]
                totals["shortfall"] += sum(result["shortfall"].values())
                per_subtopic_results.append(result)

        skipped_no_theory = [
            {"sub_subject": r["sub_subject"], "topic": r["topic"], "subtopic": r["subtopic"]}
            for r in per_subtopic_results
            if r["skipped"] == "no_theory"
        ]

        return {
            "subject": subject,
            "sub_subject": sub_subject,
            "topic": topic,
            "skipped_no_theory": skipped_no_theory,
            "target_exam": target_exam,
            "subtopics": len(per_subtopic_results),
            "target_per_subtopic": target,
            **totals,
            "per_subtopic": per_subtopic_results,
        }

    async def _fill_subtopic(
        self,
        target_exam: str,
        subject: str,
        sub_subject: Optional[str],
        topic: str,
        subtopic: str,
        target: Dict[str, int],
    ) -> Dict[str, Any]:
        """Bring one subtopic's bank (for this exam) up to `target` per difficulty."""
        existing_hashes, existing_embeddings, existing_counts = await self._load_existing(
            subject, sub_subject, topic, subtopic, target_exam
        )
        gap = {level: max(0, target[level] - existing_counts[level]) for level in LEVELS}
        result: Dict[str, Any] = {
            "sub_subject": sub_subject,
            "topic": topic,
            "subtopic": subtopic,
            "target": dict(target),
            "already_in_bank": dict(existing_counts),
            "requested": dict(gap),
            "accepted": {level: 0 for level in LEVELS},
            "generated": 0,
            "saved": 0,
            "flagged": 0,
            "duplicates_rejected": 0,
            "wrong_difficulty_rejected": 0,
            "malformed": 0,
            "calls": 0,
            "skipped": None,
        }
        if sum(gap.values()) == 0:
            result["shortfall"] = dict(gap)
            return result

        # Never generate without source facts: questions written from the LLM's
        # general knowledge can't be checked for grounding, so they'd enter the
        # bank unverified. Skip and report instead.
        probe = await search_theory(
            self.db, subject, sub_subject=sub_subject, topic=topic, subtopic=subtopic
        )
        if not probe:
            result["skipped"] = "no_theory"
            result["shortfall"] = dict(gap)
            logger.warning(
                f"{subject}/{sub_subject}/{topic}/{subtopic}: no theory ingested for this "
                f"topic — skipped, nothing generated. Upload theory with subject={subject!r}"
                f"{f', sub_subject={sub_subject!r}' if sub_subject else ''}."
            )
            print(f"SKIP {subtopic} [{target_exam}]: no theory for {subject}/{sub_subject}/{topic}\n")
            return result

        style_examples = await self.pyq_repo.sample(
            subject=subject, target_exam=target_exam, sub_subject=sub_subject,
            topic=topic, count=settings.PYQ_STYLE_SAMPLE_SIZE,
        )
        style_context = "\n\n".join(f"Example: {q['question_text']}" for q in style_examples)

        batch_size = settings.GENERATION_BATCH_SIZE
        calls_needed = math.ceil(sum(gap.values()) / batch_size)
        max_calls = calls_needed + settings.GENERATION_TOPUP_ATTEMPTS
        rejected_texts: List[str] = []

        while sum(gap.values()) > 0 and result["calls"] < max_calls:
            result["calls"] += 1
            split = _next_batch(gap, batch_size)

            # Re-retrieved every call: usage counts rise after each call, so
            # later calls in a big run are fed different (least-used) facts.
            theory_chunks = await search_theory(
                self.db, subject, sub_subject=sub_subject, topic=topic, subtopic=subtopic
            )
            theory_context = "\n\n".join(chunk["text"] for chunk in theory_chunks)
            theory_embeddings = [chunk["embedding"] for chunk in theory_chunks]
            facts_reused = bool(theory_chunks) and all(
                chunk.get("usage_count", 0) > 0 for chunk in theory_chunks
            )

            prompt = _build_quiz_prompt(
                target_exam, subject, sub_subject, topic, subtopic, split,
                theory_context, style_context,
                avoid_questions=rejected_texts[-10:],
                facts_reused=facts_reused or result["calls"] > calls_needed,
            )
            try:
                response: GeneratedQuizResponse = await llm_client.generate(prompt, GeneratedQuizResponse)
            except Exception as e:
                logger.error(f"Generation failed for {subject}/{sub_subject}/{topic}/{subtopic}: {e}")
                break

            result["generated"] += len(response.questions)
            valid: List[Tuple[GeneratedMCQ, str]] = []
            for q in response.questions:
                level = normalise_level(q.difficulty)
                if (level is None or len(q.options) != 4
                        or q.correct_option.strip().upper() not in {"A", "B", "C", "D"}):
                    result["malformed"] += 1
                    continue
                valid.append((q, level))
            if not valid:
                continue

            dedup_embeddings = embedding_service.embed_batch([q.question_text for q, _ in valid])
            ground_embeddings = embedding_service.embed_batch(
                [f"{q.question_text} {q.explanation}" for q, _ in valid]
            )

            accepted_this_call = 0
            for (q, level), dedup_emb, ground_emb in zip(valid, dedup_embeddings, ground_embeddings):
                if gap[level] <= 0:
                    result["wrong_difficulty_rejected"] += 1
                    continue

                q_hash = _question_hash(q.question_text)
                if q_hash in existing_hashes or _is_near_duplicate(dedup_emb, existing_embeddings):
                    result["duplicates_rejected"] += 1
                    rejected_texts.append(q.question_text)
                    continue

                grounded, score = self._check_groundedness(ground_emb, theory_embeddings)
                doc = {
                    "_id": uuid4().hex,
                    "subject": subject,
                    "sub_subject": sub_subject,
                    "topic": topic,
                    "subtopic": subtopic,
                    "difficulty": LABELS[level],
                    "question_text": q.question_text,
                    "options": [
                        {"id": letter, "text": text}
                        for letter, text in zip(["A", "B", "C", "D"], q.options)
                    ],
                    "correct_option": q.correct_option.strip().upper(),
                    "solution_explanation": q.explanation,
                    "external_id": None,
                    "question_hash": q_hash,
                    "question_embedding": dedup_emb,
                    "grounded": grounded,
                    "groundedness_score": score,
                    "target_exam": target_exam,
                    "used_in_tests": 0,
                    "created_at": datetime.now(timezone.utc),
                }

                if grounded:
                    await self.question_repo.insert(doc)
                    result["saved"] += 1
                else:
                    doc["status"] = "pending_review"
                    await self.db.staging_questions.insert_one(doc)
                    result["flagged"] += 1

                # Later questions in this same run must not duplicate this one either.
                existing_hashes.add(q_hash)
                existing_embeddings.append(dedup_emb)
                gap[level] -= 1
                result["accepted"][level] += 1
                accepted_this_call += 1

            if accepted_this_call:
                await self.theory_repo.increment_usage([chunk["_id"] for chunk in theory_chunks])

        result["shortfall"] = dict(gap)
        missing = sum(gap.values())
        if missing:
            logger.warning(
                f"{subject}/{sub_subject}/{topic}/{subtopic} [{target_exam}]: {missing} still missing "
                f"after {result['calls']} call(s) {gap} — source material may be exhausted; "
                f"ingest more theory for this subtopic."
            )
        print(
            f"FILL {subtopic} [{target_exam}]: target={target} had={existing_counts} "
            f"accepted={result['accepted']} dupes={result['duplicates_rejected']} "
            f"wrong_difficulty={result['wrong_difficulty_rejected']} calls={result['calls']}\n"
        )
        return result

    async def _load_existing(
        self, subject: str, sub_subject: Optional[str], topic: str, subtopic: str, target_exam: str
    ) -> Tuple[Set[str], List[List[float]], Dict[str, int]]:
        """Hashes, embeddings and per-difficulty counts of every question already
        stored in this scope, live or pending review (pending ones count toward
        the target so a rerun doesn't regenerate what's awaiting approval).
        Scoped by exam: the same fact may appear in an SSC CGL and a UPSC set,
        just never twice within one exam."""
        scope: Dict[str, Any] = {
            "subject": _ci(subject),
            "sub_subject": _ci(sub_subject) if sub_subject else None,
            "topic": _ci(topic),
            "subtopic": _ci(subtopic),
            "target_exam": _ci(target_exam),
        }
        projection = {"question_hash": 1, "question_embedding": 1, "difficulty": 1}

        hashes: Set[str] = set()
        embeddings: List[List[float]] = []
        counts = {level: 0 for level in LEVELS}
        for collection in (self.db.questions, self.db.staging_questions):
            async for doc in collection.find(scope, projection):
                if doc.get("question_hash"):
                    hashes.add(doc["question_hash"])
                if doc.get("question_embedding"):
                    embeddings.append(doc["question_embedding"])
                level = normalise_level(doc.get("difficulty"))
                if level:
                    counts[level] += 1
        return hashes, embeddings, counts

    @staticmethod
    def _check_groundedness(
        q_embedding: List[float], theory_embeddings: List[List[float]]
    ) -> Tuple[bool, float]:
        """Compare the generated question+explanation embedding against the
        retrieved theory chunks' embeddings. Below-threshold similarity means the
        model likely drew on facts outside what was provided (probable
        hallucination), so it gets routed to human review instead of auto-saved."""
        if not theory_embeddings:
            # Nothing to ground against means it can't be verified — never auto-approve.
            return False, 0.0

        best_score = max(cosine_similarity(q_embedding, emb) for emb in theory_embeddings)
        return best_score >= settings.GROUNDEDNESS_THRESHOLD, best_score
