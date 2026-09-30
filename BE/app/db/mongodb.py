from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import logger

try:
    from mongomock_motor import AsyncMongoMockClient
except ImportError:
    AsyncMongoMockClient = None


class MongoDBManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_mock: bool = False

    async def connect(self, uri: Optional[str] = None, db_name: Optional[str] = None) -> None:
        """Initialize async MongoDB client and ping server."""
        mongo_uri = uri or settings.MONGODB_URI
        target_db = db_name or settings.MONGODB_DB_NAME

        try:
            logger.info(f"Connecting to MongoDB at {mongo_uri}...")
            # Set a 2 second serverSelectionTimeoutMS so if mongo is not running locally,
            # it quickly falls back to in-memory mock client rather than hanging the app
            self.client = AsyncIOMotorClient(
                mongo_uri,
                minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
                maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                serverSelectionTimeoutMS=2000,
            )
            # Ping to verify active connection
            await self.client.admin.command("ping")
            self.db = self.client[target_db]
            self.is_mock = False
            logger.info(f"Successfully connected to MongoDB: database '{target_db}'")
        except Exception as exc:
            logger.warning(
                f"Could not connect to live MongoDB ({exc}). "
                f"Switching to in-memory AsyncMongoMockClient for development/testing."
            )
            if AsyncMongoMockClient is not None:
                self.client = AsyncMongoMockClient()
                self.db = self.client[target_db]
                self.is_mock = True
                logger.info(f"Using AsyncMongoMockClient with database '{target_db}'")
            else:
                raise RuntimeError(
                    f"MongoDB connection failed and mongomock_motor is not installed: {exc}"
                )

    async def close(self) -> None:
        """Close MongoDB connection pool."""
        if self.client:
            logger.info("Closing MongoDB connection pool...")
            self.client.close()
            self.client = None
            self.db = None

    def get_database(self) -> AsyncIOMotorDatabase:
        """Get active database instance."""
        if self.db is None:
            raise RuntimeError("Database client is not initialized. Call connect() first.")
        return self.db


db_manager = MongoDBManager()


async def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency for accessing database instance."""
    return db_manager.get_database()
