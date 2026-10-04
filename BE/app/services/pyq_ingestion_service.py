"""Orchestrates PYQ PDF ingestion: extract raw text -> batch AI-parse+tag -> store.

Unlike theory PDFs, PYQ papers have no exploitable heading structure, so
instead of heading-based chunking this splits the raw text into overlapping
character chunks and asks the LLM to both PARSE individual MCQs out of the
noisy text AND tag them in one call. No embeddings are stored — PYQs are
plain records, matched later by exact subject/exam/sub-subject/topic
filters (see `pyq_repo.py`).

Sub-subject: the admin's value if given; otherwise, when the subject has
sub-subjects, the LLM picks one per question from the taxonomy's list
(real papers mix Physics/Chemistry/Biology), and an invalid pick is null.
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.logging import logger
from app.repositories.pyq_repo import PYQRepository
from app.services.llm_client import llm_client
from app.services.pdf_processor import extract_raw_text
from app.services.taxonomy_service import (
    TaxonomyService,
    build_taxonomy_prompt_section,
    canonical_sub_subject,
    entries_for,
    merge_entry,
)

CHUNK_CHAR_SIZE = 3000
CHUNK_OVERLAP = 300


class ParsedPYQ(BaseModel):
    question_text: str = Field(description="Full question text, no LaTeX")
    options: List[str] = Field(min_length=4, max_length=4, description="Exactly 4 plain option strings")
    correct_option: str = Field(description='"A", "B", "C", or "D"')
    sub_subject: Optional[str] = Field(default=None, description="Only when asked to pick one")
    topic: str
    subtopic: str


class ParsedPYQBatch(BaseModel):
    questions: List[ParsedPYQ] = Field(description="Every MCQ found in this text chunk (can be empty)")


def _build_parse_prompt(
    text_chunk: str,
    subject: str,
    entries: List[Dict[str, Any]],
    pick_from: Optional[List[str]],
) -> str:
    taxonomy_section = build_taxonomy_prompt_section(entries, pick_from=pick_from)
    sub_subject_line = (
        "- sub_subject: pick from the SUB-SUBJECTS list below\n" if pick_from else ""
    )

    return f"""Extract every multiple choice question from this raw exam paper text.
The text may contain OCR noise, page headers/footers, or an answer key mixed in.

For EACH complete question found, extract:
- question_text: the full question, plain text, no LaTeX
- options: exactly 4 plain option strings (no "A)" style prefixes)
- correct_option: "A"/"B"/"C"/"D" — use the answer key if present in the text,
  otherwise determine the correct answer yourself from the subject matter
{sub_subject_line}- topic, subtopic: classify against the taxonomy below

SUBJECT: {subject}

{taxonomy_section}

TEXT:
{text_chunk}

If no complete questions are found in this text, return an empty list.
Do not include partial/truncated questions cut off at the chunk boundary."""


def _split_into_chunks(text: str) -> List[str]:
    chunks = []
    position = 0
    while position < len(text):
        chunks.append(text[position : position + CHUNK_CHAR_SIZE])
        position += CHUNK_CHAR_SIZE - CHUNK_OVERLAP
    return chunks


async def ingest_pyq_pdf(
    db: AsyncIOMotorDatabase,
    pdf_bytes: bytes,
    subject: str,
    target_exam: str,
    source_pdf: str,
    sub_subject: Optional[str] = None,
) -> Dict[str, Any]:
    """Extract, batch-parse+tag, and store PYQs from one PDF."""
    pyq_repo = PYQRepository(db)
    taxonomy_service = TaxonomyService(db)

    raw_text = extract_raw_text(pdf_bytes)
    if not raw_text.strip():
        return {"questions_ingested": 0, "questions_failed": 0, "duplicates_skipped": 0,
                "sub_subject_unresolved": 0}

    taxonomy_doc = await taxonomy_service.get_doc(subject) or {}
    allowed: List[str] = taxonomy_doc.get("sub_subjects", [])
    tree: List[Dict[str, Any]] = taxonomy_doc.get("tree", [])
    llm_picks = bool(allowed) and sub_subject is None
    text_chunks = _split_into_chunks(raw_text)

    ingested = 0
    failed = 0
    duplicates = 0
    unresolved = 0
    seen_hashes: set = set()

    for text_chunk in text_chunks:
        prompt_entries = tree if llm_picks else entries_for(tree, sub_subject)
        try:
            prompt = _build_parse_prompt(text_chunk, subject, prompt_entries, allowed if llm_picks else None)
            response: ParsedPYQBatch = await llm_client.generate(prompt, ParsedPYQBatch, light=True)
        except Exception as e:
            logger.error(f"PYQ parse batch failed: {e}")
            failed += 1
            continue

        docs_to_insert: List[Dict[str, Any]] = []
        for q in response.questions:
            try:
                correct_option = q.correct_option.strip().upper()
                if correct_option not in {"A", "B", "C", "D"} or len(q.options) != 4:
                    failed += 1
                    continue

                q_hash = hashlib.sha256(q.question_text.lower().strip().encode()).hexdigest()
                if q_hash in seen_hashes or await db.pyq_questions.find_one({"question_hash": q_hash}):
                    duplicates += 1
                    continue
                seen_hashes.add(q_hash)

                if sub_subject:
                    final_sub_subject = sub_subject
                elif allowed:
                    final_sub_subject = canonical_sub_subject(q.sub_subject, allowed)
                    if final_sub_subject is None:
                        unresolved += 1
                        logger.warning(
                            f"PYQ sub-subject '{q.sub_subject}' is not in {allowed} — stored with null"
                        )
                else:
                    final_sub_subject = None

                orphan = bool(allowed) and final_sub_subject is None
                if not orphan and merge_entry(tree, final_sub_subject, q.topic, q.subtopic):
                    await taxonomy_service.add_entry(subject, final_sub_subject, q.topic, q.subtopic)

                docs_to_insert.append(
                    {
                        "_id": uuid.uuid4().hex,
                        "subject": subject,
                        "sub_subject": final_sub_subject,
                        "topic": q.topic,
                        "subtopic": q.subtopic,
                        "target_exam": target_exam,
                        "question_text": q.question_text,
                        "options": q.options,
                        "correct_option": correct_option,
                        "question_hash": q_hash,
                        "source_pdf": source_pdf,
                        "created_at": datetime.now(timezone.utc),
                    }
                )
            except Exception as e:
                logger.error(f"Failed to prepare parsed PYQ: {e}")
                failed += 1

        if docs_to_insert:
            await pyq_repo.insert_many(docs_to_insert)
            ingested += len(docs_to_insert)

    return {
        "questions_ingested": ingested,
        "questions_failed": failed,
        "duplicates_skipped": duplicates,
        "sub_subject_unresolved": unresolved,
    }
