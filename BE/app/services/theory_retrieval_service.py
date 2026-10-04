"""Theory retrieval: exact filters, then similarity, plus usage rotation.

  1. subject      -- hard filter, exact match
  2. sub_subject  -- hard filter, exact match (when given)
  3. topic        -- hard filter, exact match (when given)
  4. subtopic     -- soft filter, vector similarity ranking (when given)
  5. rotation     -- from the THEORY_CANDIDATE_POOL most relevant chunks, pick
                     the least-used ones, so repeat runs see different facts

All reliable, exact metadata (subject, sub_subject, topic) is filtered on BEFORE any
vector similarity ranking — standard RAG practice: narrow the search space
with cheap/precise filters first, only fall back to embeddings for the
dimension that doesn't have a clean exact match (the subtopic query text).

No `exam` dimension — theory facts don't change by exam, so the same
ingested content serves every exam's quiz generation.
"""
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.repositories.theory_chunk_repo import TheoryChunkRepository
from app.services.embedding_service import embedding_service


async def search_theory(
    db: AsyncIOMotorDatabase,
    subject: str,
    sub_subject: Optional[str] = None,
    topic: Optional[str] = None,
    subtopic: Optional[str] = None,
    top_k: Optional[int] = None,
) -> List[Dict[str, Any]]:
    top_k = top_k or settings.THEORY_TOP_K
    repo = TheoryChunkRepository(db)

    if subtopic:
        query_embedding = embedding_service.embed(subtopic)
        pool_size = max(settings.THEORY_CANDIDATE_POOL, top_k)
        candidates = await repo.vector_search(
            subject, query_embedding, pool_size, sub_subject=sub_subject, topic=topic
        )
        if candidates:
            return _least_used_first(candidates, top_k)

    # No subtopic given, or nothing matched within the exact filters:
    # spread across whatever topics/subtopics exist in that filtered set
    # instead of collapsing onto whichever chunks happen to sort first.
    filtered_chunks = await repo.find_filtered(subject, sub_subject, topic)
    if not filtered_chunks:
        return []
    return _diverse_sample(filtered_chunks, top_k)


def _least_used_first(candidates: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    """Pick `top_k` from the relevance-ranked candidate pool, preferring chunks
    that have fed the fewest generated questions so far. Python's sort is
    stable, so among equally-used chunks the relevance order is kept. Once
    every candidate has been used, this naturally cycles back to reusing
    them — rotation is a preference, never an exclusion."""
    return sorted(candidates, key=lambda c: c.get("usage_count", 0))[:top_k]


def _diverse_sample(chunks: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    """Round-robin across distinct subtopic buckets so a broad quiz isn't
    dominated by whichever subtopic happens to have the most ingested chunks."""
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for chunk in chunks:
        buckets.setdefault(chunk.get("subtopic") or chunk.get("topic", "General"), []).append(chunk)

    result: List[Dict[str, Any]] = []
    bucket_lists = [b for b in buckets.values() if b]
    i = 0
    while len(result) < top_k and bucket_lists:
        bucket = bucket_lists[i % len(bucket_lists)]
        result.append(bucket.pop(0))
        bucket_lists = [b for b in bucket_lists if b]
        i += 1

    return result[:top_k]
