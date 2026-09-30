import asyncio
import json
import time
from typing import Any, Dict, Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger


class InMemoryCache:
    """In-memory key-value cache with TTL expiration for dev/fallback."""

    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expires: Dict[str, float] = {}

    def _is_expired(self, key: str) -> bool:
        if key in self._expires:
            if time.time() > self._expires[key]:
                self._data.pop(key, None)
                self._expires.pop(key, None)
                return True
        return False

    async def get(self, key: str) -> Optional[str]:
        if self._is_expired(key):
            return None
        val = self._data.get(key)
        return val if isinstance(val, str) else json.dumps(val) if val is not None else None

    async def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        self._data[key] = value if isinstance(value, str) else json.dumps(value)
        if ex:
            self._expires[key] = time.time() + ex
        elif key in self._expires:
            del self._expires[key]
        return True

    async def delete(self, key: str) -> int:
        removed = 0
        if key in self._data:
            del self._data[key]
            removed = 1
        if key in self._expires:
            del self._expires[key]
        return removed

    async def exists(self, key: str) -> bool:
        if self._is_expired(key):
            return False
        return key in self._data

    async def hset(self, name: str, key: str, value: Any) -> int:
        if self._is_expired(name):
            self._data[name] = {}
        if name not in self._data or not isinstance(self._data[name], dict):
            self._data[name] = {}
        self._data[name][key] = str(value)
        return 1

    async def hget(self, name: str, key: str) -> Optional[str]:
        if self._is_expired(name):
            return None
        hash_dict = self._data.get(name)
        if isinstance(hash_dict, dict):
            return hash_dict.get(key)
        return None

    async def hgetall(self, name: str) -> Dict[str, str]:
        if self._is_expired(name):
            return {}
        hash_dict = self._data.get(name)
        if isinstance(hash_dict, dict):
            return hash_dict.copy()
        return {}


class RedisManager:
    client: Optional[Any] = None
    is_fallback: bool = False

    async def connect(self) -> None:
        """Connect to Redis server or fallback to memory cache."""
        if not settings.REDIS_ENABLED:
            logger.info("Redis disabled via config. Using in-memory cache.")
            self.client = InMemoryCache()
            self.is_fallback = True
            return

        try:
            logger.info(f"Connecting to Redis at {settings.REDIS_URL}...")
            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
            )
            # Test ping
            await redis_client.ping()
            self.client = redis_client
            self.is_fallback = False
            logger.info("Successfully connected to Redis.")
        except Exception as exc:
            if settings.REDIS_FALLBACK_TO_MEMORY:
                logger.warning(
                    f"Could not connect to Redis ({exc}). Falling back to InMemoryCache."
                )
                self.client = InMemoryCache()
                self.is_fallback = True
            else:
                raise exc

    async def close(self) -> None:
        """Close Redis connection."""
        if self.client and not self.is_fallback:
            logger.info("Closing Redis connection...")
            await self.client.close()
            self.client = None

    def get_client(self) -> Any:
        if self.client is None:
            raise RuntimeError("Redis client is not initialized. Call connect() first.")
        return self.client


redis_manager = RedisManager()


async def get_redis() -> Any:
    """FastAPI dependency for accessing Redis/cache client."""
    return redis_manager.get_client()
