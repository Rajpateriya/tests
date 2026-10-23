"""Orchestrates theory PDF ingestion: extract -> hybrid-tag -> embed -> store.

Tagging is batched (several chunks per LLM call) rather than one call per
chunk — this cuts the number of API calls roughly by BATCH_SIZE, which
matters given the free-tier Gemini rate limits (requests/minute).

Sub-subject: the admin's value if given (already validated by the endpoint);
otherwise, when the subject has sub-subjects, the LLM picks one per chunk
from the taxonomy's list, and an invalid pick is stored as null.
"""
import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.logging import logger
from app.repositories.theory_chunk_repo import TheoryChunkRepository
from app.services.embedding_service import cosine_similarity, embedding_service
from app.services.llm_client import llm_client
from app.services.pdf_processor import extract_theory_chunks
from app.services.taxonomy_service import (
    TaxonomyService,
    build_fixed_topic_section,
    build_taxonomy_prompt_section,
    canonical_sub_subject,
    entries_for,
    merge_entry,
    subtopics_under,
)

BATCH_SIZE = 8
# A new subtopic this similar to one already under the topic reuses the existing name.
SUBTOPIC_REUSE_SIMILARITY = 0.85


class ChunkTag(BaseModel):
    """LLM's classification for one theory chunk."""

    sub_subject: Optional[str] = Field(default=None, description="Only when asked to pick one")
    topic: str = Field(description="Best-matching topic for this content")
    subtopic: str = Field(description="Best-matching subtopic for this content")


class ChunkTagBatch(BaseModel):
    """One tag per chunk, in the SAME ORDER as the chunks given in the prompt."""

    tags: List[ChunkTag]


class PdfTopic(BaseModel):
    """The single topic a whole PDF (one chapter) belongs to."""

    topic: str = Field(description="Chapter-level topic for the whole document")


def _text_hash(text: str) -> str:
    normalised = " ".join(text.lower().split())
    return hashlib.sha256(normalised.encode()).hexdigest()


def _build_batch_tagging_prompt(
    chunks: List[Dict[str, str]],
    entries: List[Dict[str, Any]],
    pick_from: Optional[List[str]],
    fixed_topic: Optional[str] = None,
    existing_subtopics: Optional[List[str]] = None,
) -> str:
    excerpt_lines = []
    for i, chunk in enumerate(chunks, start=1):
        excerpt_lines.append(f"EXCERPT {i}:\nHEADING: {chunk['heading']}\nTEXT:\n{chunk['text'][:1500]}")

    if fixed_topic:
        taxonomy_section = build_fixed_topic_section(fixed_topic, existing_subtopics or [], pick_from)
    else:
        taxonomy_section = build_taxonomy_prompt_section(entries, pick_from=pick_from)
    fields = "sub_subject, topic and subtopic" if pick_from else "topic and subtopic"

    return f"""Classify each of the following {len(chunks)} study material excerpts
by {fields}.

{chr(10).join(excerpt_lines)}

{taxonomy_section}

Return exactly {len(chunks)} tags in the SAME ORDER as the excerpts above —
one tag per excerpt, nothing merged or skipped."""


def _existing_topic_names(tree: List[Dict[str, Any]], sub_subject: Optional[str]) -> List[str]:
    names: List[str] = []
    for entry in entries_for(tree, sub_subject) if sub_subject else tree:
        if not any(entry["topic"].lower() == n.lower() for n in names):
            names.append(entry["topic"])
    return names


def canonical_topic_name(topic: str, existing_topics: List[str]) -> str:
    """Return the exact spelling from existing_topics if same or nearly identical."""
    if not topic or not existing_topics:
        return topic.strip() if topic else "General"
    clean = " ".join(topic.strip().lower().replace("&", "and").split())
    for t in existing_topics:
        t_clean = " ".join(t.strip().lower().replace("&", "and").split())
        if clean == t_clean:
            return t
    return topic.strip()


def sub_subject_for_topic(tree: List[Dict[str, Any]], topic: str) -> Optional[str]:
    """Find the parent sub_subject for a topic in the taxonomy tree."""
    if not topic:
        return None
    for entry in tree:
        if entry.get("topic", "").strip().lower() == topic.strip().lower() and entry.get("sub_subject"):
            return entry["sub_subject"]
    return None


async def _resolve_pdf_topic(
    chunks: List[Dict[str, str]],
    tree: List[Dict[str, Any]],
    sub_subject: Optional[str],
    source_pdf: str,
) -> Optional[str]:
    """One topic for the whole PDF, from one cheap LLM call over its headings.
    Returns None if it can't be decided, in which case tagging falls back to
    choosing a topic per chunk."""
    known = _existing_topic_names(tree, sub_subject)

    def canonical(name: str) -> str:
        name = " ".join(name.split())
        return next((k for k in known if k.lower() == name.lower()), name)

    headings: List[str] = []
    for chunk in chunks:
        heading = chunk["heading"].strip()
        if len(heading) > 3 and heading not in headings:
            headings.append(heading)
        if len(headings) >= 40:
            break
    # If headings clearly span multiple distinct topics in the taxonomy, this is a multi-topic compilation.
    if len(headings) >= 5 and known:
        matched_topics = set()
        for h in headings:
            for t in known:
                words = [w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", t)]
                if words and any(w in h.lower() for w in words):
                    matched_topics.add(t)
        if len(matched_topics) >= 2:
            logger.info(
                f"'{source_pdf}' spans multiple topics ({len(matched_topics)} detected: {matched_topics}) "
                "— tagging per chunk instead of locking entire PDF."
            )
            return None

    opening = " ".join(chunk["text"][:500] for chunk in chunks[:2])
    existing_line = (
        "EXISTING TOPICS: " + ", ".join(known) + "\n"
        "If this document is about one of them, copy that topic EXACTLY.\n"
        if known else ""
    )
    prompt = f"""This is one study document: "{source_pdf}".
SECTION HEADINGS: {'; '.join(headings) or '(none)'}

OPENING TEXT: {opening}

{existing_line}Task:
- If this entire document is dedicated to ONE single topic (e.g. a single chapter on one subject area), return that exact topic name from EXISTING TOPICS.
- If this document is a compilation, monthly capsule, multi-chapter book, or covers MULTIPLE different topics from the list above, return topic as "MULTI_TOPIC"."""
    try:
        response: PdfTopic = await llm_client.generate(prompt, PdfTopic, light=True)
        topic_val = response.topic.strip()
        if not topic_val or topic_val.upper() in ("MULTI_TOPIC", "MULTIPLE_TOPICS", "NONE", "GENERAL"):
            return None
        return canonical(topic_val) if topic_val else None
    except Exception as e:
        logger.error(f"Could not decide a topic for '{source_pdf}': {e} — falling back to per-chunk topics")
        return None


def _reuse_similar_subtopic(subtopic: str, existing: List[str]) -> str:
    """Return an existing subtopic's name when `subtopic` is the same (ignoring
    case) or nearly the same by meaning; otherwise the new name unchanged."""
    subtopic = " ".join(subtopic.split())
    for name in existing:
        if name.lower() == subtopic.lower():
            return name
    if not existing:
        return subtopic
    vectors = embedding_service.embed_batch([subtopic] + existing)
    best_score, best_name = max(
        ((cosine_similarity(vectors[0], vec), name) for vec, name in zip(vectors[1:], existing)),
        key=lambda pair: pair[0],
    )
    return best_name if best_score >= SUBTOPIC_REUSE_SIMILARITY else subtopic


async def ingest_theory_pdf(
    db: AsyncIOMotorDatabase,
    pdf_bytes: bytes,
    subject: str,
    source_pdf: str,
    sub_subject: Optional[str] = None,
) -> Dict[str, Any]:
    """Extract, hybrid-tag (batched), embed and store theory chunks from one PDF.

    The whole PDF gets ONE topic (one LLM decision per PDF). Per-chunk tagging
    then only picks/creates subtopics."""
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

    pdf_topic = await _resolve_pdf_topic(raw_chunks, tree, sub_subject, source_pdf)
    logger.info(f"'{source_pdf}': topic for the whole PDF = {pdf_topic!r}")

    ingested = 0
    failed = 0
    unresolved = 0

    for batch_start in range(0, len(raw_chunks), BATCH_SIZE):
        batch = raw_chunks[batch_start : batch_start + BATCH_SIZE]
        prompt_entries = tree if llm_picks else entries_for(tree, sub_subject)

        try:
            prompt = _build_batch_tagging_prompt(
                batch,
                prompt_entries,
                allowed if llm_picks else None,
                fixed_topic=pdf_topic,
                existing_subtopics=subtopics_under(tree, sub_subject, pdf_topic) if pdf_topic else None,
            )
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
            fallback_topic = pdf_topic or (prompt_entries[0]["topic"] if prompt_entries else "General")
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
                tag_topic = pdf_topic or tag.topic
                tag_topic = canonical_topic_name(tag_topic, _existing_topic_names(tree, None))

                if sub_subject:
                    final_sub_subject = sub_subject
                elif allowed:
                    final_sub_subject = canonical_sub_subject(tag.sub_subject, allowed)
                    if final_sub_subject is None:
                        # Auto-derive from taxonomy tree if tag_topic is a known topic under a sub_subject:
                        final_sub_subject = sub_subject_for_topic(tree, tag_topic)
                    if final_sub_subject is None:
                        unresolved += 1
                        logger.warning(
                            f"Chunk '{raw['heading']}': LLM sub-subject '{tag.sub_subject}' is not in "
                            f"{allowed} — stored with sub_subject=null"
                        )
                else:
                    final_sub_subject = None

                # The PDF's topic is fixed; only the subtopic comes from the tag, and a
                # near-duplicate of an existing subtopic reuses the existing name.
                tag_topic = pdf_topic or tag.topic
                tag_subtopic = _reuse_similar_subtopic(
                    tag.subtopic, subtopics_under(tree, final_sub_subject, tag_topic)
                )

                topic_known = any(
                    entry["topic"].lower() == tag_topic.lower()
                    for entry in entries_for(tree, final_sub_subject)
                )
                orphan = bool(allowed) and final_sub_subject is None
                if not orphan and merge_entry(tree, final_sub_subject, tag_topic, tag_subtopic):
                    await taxonomy_service.add_entry(subject, final_sub_subject, tag_topic, tag_subtopic)

                docs_to_insert.append(
                    {
                        "_id": uuid.uuid4().hex,
                        "subject": subject,
                        "sub_subject": final_sub_subject,
                        "topic": tag_topic,
                        "subtopic": tag_subtopic,
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
        "topic": pdf_topic,
    }
