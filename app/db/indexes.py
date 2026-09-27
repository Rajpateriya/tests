from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel
from app.core.logging import logger


async def init_db_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create essential MongoDB indexes for performance and data integrity."""
    logger.info("Initializing MongoDB indexes...")

    # Users collection indexes
    try:
        await db.users.create_indexes([
            IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
            IndexModel([("role", ASCENDING)], name="idx_users_role"),
        ])
    except Exception as e:
        logger.warning(f"Could not create user indexes: {e}")

    # Questions collection indexes
    try:
        await db.questions.create_indexes([
            IndexModel([("subject", ASCENDING), ("topic", ASCENDING)], name="idx_questions_subject_topic"),
            IndexModel([("difficulty", ASCENDING)], name="idx_questions_difficulty"),
            IndexModel([("external_id", ASCENDING)], sparse=True, name="idx_questions_external_id"),
        ])
    except Exception as e:
        logger.warning(f"Could not create question indexes: {e}")

    # Tests collection indexes
    try:
        await db.tests.create_indexes([
            IndexModel([("test_type", ASCENDING), ("is_active", ASCENDING)], name="idx_tests_type_active"),
            IndexModel([("created_at", ASCENDING)], name="idx_tests_created_at"),
        ])
    except Exception as e:
        logger.warning(f"Could not create test indexes: {e}")

    # Attempts collection indexes
    try:
        await db.attempts.create_indexes([
            IndexModel([("user_id", ASCENDING), ("test_id", ASCENDING)], name="idx_attempts_user_test"),
            IndexModel([("status", ASCENDING)], name="idx_attempts_status"),
            IndexModel([("start_time", ASCENDING)], name="idx_attempts_start_time"),
            IndexModel([("user_id", ASCENDING), ("status", ASCENDING)], name="idx_attempts_user_status"),
        ])
    except Exception as e:
        logger.warning(f"Could not create attempt indexes: {e}")

    logger.info("MongoDB indexes successfully initialized.")
