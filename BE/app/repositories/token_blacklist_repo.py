from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class TokenBlacklistRepository(BaseRepository):
    """Logged-out tokens, by their `jti`. A MongoDB TTL index on `expires_at` (set up in
    app/db/indexes.py) purges each entry automatically once the token itself would have expired."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "token_blacklist")

    async def add(self, jti: str, expires_at: datetime) -> None:
        await self.collection.update_one(
            {"_id": jti}, {"$set": {"expires_at": expires_at}}, upsert=True
        )

    async def is_blacklisted(self, jti: str) -> bool:
        return await self.collection.find_one({"_id": jti}) is not None
