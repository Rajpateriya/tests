"""Local embedding model service, via LangChain's HuggingFaceEmbeddings wrapper
around sentence-transformers — no external API calls or cost.
"""
from typing import List

import numpy as np
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings
from app.core.logging import logger

EMBEDDING_DIM = 384


class EmbeddingService:
    """Singleton wrapper around a local LangChain embeddings model.

    Lazy-loaded on first use so importing this module never requires
    torch/sentence-transformers to already be downloaded/ready.
    """

    def __init__(self):
        self._embeddings: HuggingFaceEmbeddings | None = None

    def _get_embeddings(self) -> HuggingFaceEmbeddings:
        if self._embeddings is None:
            logger.info(
                f"Loading LangChain HuggingFaceEmbeddings model "
                f"'{settings.EMBEDDING_MODEL_NAME}'..."
            )
            self._embeddings = HuggingFaceEmbeddings(
                model_name=settings.EMBEDDING_MODEL_NAME,
                encode_kwargs={"normalize_embeddings": True},
            )
        return self._embeddings

    def embed(self, text: str) -> List[float]:
        return self._get_embeddings().embed_query(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return self._get_embeddings().embed_documents(list(texts))


embedding_service = EmbeddingService()


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if denom == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / denom)


def rank_by_similarity(
    docs: List[dict], query_embedding: List[float], top_k: int
) -> List[dict]:
    """Brute-force rank docs (each with an 'embedding' field) by cosine similarity.

    Used as a fallback when native `$vectorSearch` isn't available (no Atlas
    index yet, or running against the in-memory mongomock client locally).
    """
    scored = [
        (cosine_similarity(doc["embedding"], query_embedding), doc)
        for doc in docs
        if doc.get("embedding")
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]
