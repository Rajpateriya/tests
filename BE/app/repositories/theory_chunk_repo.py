import re
from typing import Any, Dict, List, Optional, Set
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger
from app.repositories.base import BaseRepository
from app.services.embedding_service import rank_by_similarity

VECTOR_INDEX_NAME = "theory_vector_index"


def _ci(value: str) -> Dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


class TheoryChunkRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "theory_chunks")

    @staticmethod
    def _base_filter(
        subject: str, sub_subject: Optional[str] = None, topic: Optional[str] = None
    ) -> Dict[str, Any]:
        query: Dict[str, Any] = {"subject": _ci(subject)}
        if sub_subject:
            query["sub_subject"] = _ci(sub_subject)
        if topic:
            query["topic"] = _ci(topic)
        return query

    async def find_filtered(
        self, subject: str, sub_subject: Optional[str] = None, topic: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(self._base_filter(subject, sub_subject, topic))
        return await cursor.to_list(length=10000)

    async def distinct_subjects(self) -> List[str]:
        return await self.collection.distinct("subject")

    async def existing_text_hashes(self, subject: str, hashes: List[str]) -> Set[str]:
        if not hashes:
            return set()
        cursor = self.collection.find(
            {"subject": _ci(subject), "text_hash": {"$in": hashes}},
            {"text_hash": 1},
        )
        return {doc["text_hash"] async for doc in cursor}

    async def increment_usage(self, chunk_ids: List[str]) -> None:
        if chunk_ids:
            await self.collection.update_many({"_id": {"$in": chunk_ids}}, {"$inc": {"usage_count": 1}})

    async def vector_search(
        self,
        subject: str,
        query_embedding: List[float],
        top_k: int,
        sub_subject: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Rank subject/sub-subject/topic-filtered chunks by similarity to `query_embedding`.

        subject, sub_subject and topic (when given) are hard filters — applied
        BEFORE any similarity ranking: narrow the search space with reliable
        exact metadata first, only then use vector similarity for the
        dimension that doesn't have a clean exact match (the subtopic text).

        Tries the native Atlas `$vectorSearch` stage first; falls back to a
        brute-force cosine-similarity ranking in Python when the vector index
        doesn't exist yet or the server doesn't support it (local MongoDB).
        """
        # Atlas $vectorSearch's `filter` only supports exact-match/range on
        # indexed filter fields, not $regex — unlike the regular find() used
        # in the brute-force fallback below, so this stays a plain equality dict.
        vector_search_filter: Dict[str, Any] = {"subject": subject}
        if sub_subject:
            vector_search_filter["sub_subject"] = sub_subject
        if topic:
            vector_search_filter["topic"] = topic

        pipeline = [
            {
                "$vectorSearch": {
                    "index": VECTOR_INDEX_NAME,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": max(top_k * 10, 50),
                    "limit": top_k,
                    "filter": vector_search_filter,
                }
            }
        ]
        try:
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=top_k)
            if results:
                return results
        except Exception as e:
            logger.debug(f"$vectorSearch unavailable, falling back to brute-force ranking: {e}")

        candidates = await self.find_filtered(subject, sub_subject, topic)
        return rank_by_similarity(candidates, query_embedding, top_k)
