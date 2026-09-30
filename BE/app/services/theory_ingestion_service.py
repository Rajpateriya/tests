"""Orchestrates theory PDF ingestion: extract -> hybrid-tag -> embed -> store.

Tagging is batched (several chunks per LLM call) rather than one call per
chunk — this cuts the number of API calls roughly by BATCH_SIZE, which
matters given the free-tier Gemini rate limits (requests/minute).

Sub-subject: the admin's value if given (already validated by the endpoint);
otherwise, when the subject has sub-subjects, the LLM picks one per chunk
from the taxonomy's list, and an invalid pick is stored as null.
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.logging import logger
from app.repositories.theory_chunk_repo import TheoryChunkRepository
from app.services.embedding_service import embedding_service
from app.services.llm_client import llm_client
from app.services.pdf_processor import extract_theory_chunks
from app.services.taxonomy_service import (
    TaxonomyService,
    build_taxonomy_prompt_section,
    canonical_sub_subject,
    entries_for,
    merge_entry,
)

BATCH_SIZE = 8


class ChunkTag(BaseModel):
    """LLM's classification for one theory chunk."""

    sub_subject: Optional[str] = Field(default=None, description="Only when asked to pick one")
    topic: str = Field(description="Best-matching topic for this content")
    subtopic: str = Field(description="Best-matching subtopic for this content")


class ChunkTagBatch(BaseModel):
    """One tag per chunk, in the SAME ORDER as the chunks given in the prompt."""

    tags: List[ChunkTag]


def _text_hash(text: str) -> str:
    normalised = " ".join(text.lower().split())
    return hashlib.sha256(normalised.encode()).hexdigest()


def _build_batch_tagging_prompt(
    chunks: List[Dict[str, str]],
    entries: List[Dict[str, Any]],
    pick_from: Optional[List[str]],
) -> str:
    excerpt_lines = []
    for i, chunk in enumerate(chunks, start=1):
        excerpt_lines.append(f"EXCERPT {i}:\nHEADING: {chunk['heading']}\nTEXT:\n{chunk['text'][:1500]}")

    taxonomy_section = build_taxonomy_prompt_section(entries, pick_from=pick_from)
    fields = "sub_subject, topic and subtopic" if pick_from else "topic and subtopic"

    return f"""Classify each of the following {len(chunks)} study material excerpts
by {fields}.

{chr(10).join(excerpt_lines)}

{taxonomy_section}

Return exactly {len(chunks)} tags in the SAME ORDER as the excerpts above —
one tag per excerpt, nothing merged or skipped."""


async def ingest_theory_pdf(
    db: AsyncIOMotorDatabase,
    pdf_bytes: bytes,
    subject: str,
    source_pdf: str,
    sub_subject: Optional[str] = None,
) -> Dict[str, Any]:
    """Extract, hybrid-tag (batched), embed and store theory chunks from one PDF."""
    chunk_repo = TheoryChunkRepository(db)
    taxonomy_service = TaxonomyService(db)

    empty = {"chunks_ingested": 0, "chunks_failed": 0, "chunks_duplicate": 0,
             "sub_subject_unresolved": 0, "total_chunks": 0}
    extracted = extract_theory_chunks(pdf_bytes)
    if not extracted:
        return empty

    # Drop chunks already stored for this subject (e.g. the same PDF uploaded
    # twice) and repeats within this PDF, BEFORE tagging, so duplicates cost
    # no LLM calls and never show up twice in retrieved theory context.
    for chunk in extracted:
        chunk["text_hash"] = _text_hash(chunk["text"])
    already_stored = await chunk_repo.existing_text_hashes(
        subject, [c["text_hash"] for c in extracted]
    )
    raw_chunks: List[Dict[str, str]] = []
    seen = set(already_stored)
    for chunk in extracted:
        if chunk["text_hash"] not in seen:
            seen.add(chunk["text_hash"])
            raw_chunks.append(chunk)
    duplicates = len(extracted) - len(raw_chunks)

    if not raw_chunks:
        return {**empty, "chunks_duplicate": duplicates, "total_chunks": len(extracted)}

    taxonomy_doc = await taxonomy_service.get_doc(subject) or {}
    allowed: List[str] = taxonomy_doc.get("sub_subjects", [])
    tree: List[Dict[str, Any]] = taxonomy_doc.get("tree", [])
    llm_picks = bool(allowed) and sub_subject is None

    ingested = 0
    failed = 0
    unresolved = 0

    for batch_start in range(0, len(raw_chunks), BATCH_SIZE):
        batch = raw_chunks[batch_start : batch_start + BATCH_SIZE]
        prompt_entries = tree if llm_picks else entries_for(tree, sub_subject)

        try:
            prompt = _build_batch_tagging_prompt(batch, prompt_entries, allowed if llm_picks else None)
            response: ChunkTagBatch = await llm_client.generate(prompt, ChunkTagBatch, light=True)
            tags = response.tags
        except Exception as e:
            logger.error(f"Batch tagging failed for chunks {batch_start}-{batch_start + len(batch)}: {e}")
            failed += len(batch)
            continue

        if len(tags) != len(batch):
            logger.warning(
                f"Tagging batch returned {len(tags)} tags for {len(batch)} chunks — "
                f"padding/truncating to match."
            )
            fallback_topic = prompt_entries[0]["topic"] if prompt_entries else "General"
            fallback_subtopic = (
                prompt_entries[0]["subtopics"][0]
                if prompt_entries and prompt_entries[0]["subtopics"]
                else fallback_topic
            )
            while len(tags) < len(batch):
                tags.append(ChunkTag(topic=fallback_topic, subtopic=fallback_subtopic))
            tags = tags[: len(batch)]

        # Embed all chunk texts in this batch in one local call (cheap, no rate limit).
        embeddings = embedding_service.embed_batch([c["text"] for c in batch])

        docs_to_insert: List[Dict[str, Any]] = []
        for raw, tag, embedding in zip(batch, tags, embeddings):
            try:
                if sub_subject:
                    final_sub_subject = sub_subject
                elif allowed:
                    final_sub_subject = canonical_sub_subject(tag.sub_subject, allowed)
                    if final_sub_subject is None:
                        unresolved += 1
                        logger.warning(
                            f"Chunk '{raw['heading']}': LLM sub-subject '{tag.sub_subject}' is not in "
                            f"{allowed} — stored with sub_subject=null"
                        )
                else:
                    final_sub_subject = None

                topic_known = any(
                    entry["topic"].lower() == tag.topic.lower()
                    for entry in entries_for(tree, final_sub_subject)
                )
                orphan = bool(allowed) and final_sub_subject is None
                if not orphan and merge_entry(tree, final_sub_subject, tag.topic, tag.subtopic):
                    await taxonomy_service.add_entry(subject, final_sub_subject, tag.topic, tag.subtopic)

                docs_to_insert.append(
                    {
                        "_id": uuid.uuid4().hex,
                        "subject": subject,
                        "sub_subject": final_sub_subject,
                        "topic": tag.topic,
                        "subtopic": tag.subtopic,
                        "topic_source": "taxonomy" if topic_known else "freeform",
                        "heading": raw["heading"],
                        "text": raw["text"],
                        "text_hash": raw["text_hash"],
                        "usage_count": 0,
                        "source_pdf": source_pdf,
                        "embedding": embedding,
                        "created_at": datetime.now(timezone.utc),
                    }
                )
            except Exception as e:
                logger.error(f"Failed to prepare theory chunk '{raw.get('heading')}': {e}")
                failed += 1

        if docs_to_insert:
            await chunk_repo.insert_many(docs_to_insert)
            ingested += len(docs_to_insert)

    return {
        "chunks_ingested": ingested,
        "chunks_failed": failed,
        "chunks_duplicate": duplicates,
        "sub_subject_unresolved": unresolved,
        "total_chunks": len(extracted),
    }
