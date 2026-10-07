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
            IndexModel(
                [("subject", ASCENDING), ("topic", ASCENDING), ("subtopic", ASCENDING), ("target_exam", ASCENDING)],
                name="idx_questions_dedup_scope",
            ),
            IndexModel([("question_hash", ASCENDING)], sparse=True, name="idx_questions_hash"),
            IndexModel(
                [("subject", ASCENDING), ("sub_subject", ASCENDING), ("topic", ASCENDING),
                 ("subtopic", ASCENDING), ("target_exam", ASCENDING), ("difficulty", ASCENDING)],
                name="idx_questions_bank_scope",
            ),
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

    # Theory chunks collection indexes (AI quiz generation RAG store)
    try:
        await db.theory_chunks.create_indexes([
            IndexModel([("subject", ASCENDING)], name="idx_theory_chunks_subject"),
            IndexModel([("subject", ASCENDING), ("topic", ASCENDING)], name="idx_theory_chunks_subject_topic"),
            IndexModel([("subject", ASCENDING), ("text_hash", ASCENDING)], name="idx_theory_chunks_subject_hash"),
            IndexModel(
                [("subject", ASCENDING), ("sub_subject", ASCENDING), ("topic", ASCENDING)],
                name="idx_theory_chunks_sub_subject_topic",
            ),
        ])
    except Exception as e:
        logger.warning(f"Could not create theory_chunks indexes: {e}")

    # PYQ collection indexes (style/tone reference for quiz generation)
    try:
        await db.pyq_questions.create_indexes([
            IndexModel([("subject", ASCENDING), ("target_exam", ASCENDING)], name="idx_pyq_subject_exam"),
            IndexModel([("question_hash", ASCENDING)], unique=True, sparse=True, name="idx_pyq_question_hash"),
            IndexModel(
                [("subject", ASCENDING), ("target_exam", ASCENDING), ("sub_subject", ASCENDING), ("topic", ASCENDING)],
                name="idx_pyq_scope",
            ),
        ])
    except Exception as e:
        logger.warning(f"Could not create pyq_questions indexes: {e}")

    # Staging questions collection indexes (low-groundedness generated questions pending review)
    try:
        await db.staging_questions.create_indexes([
            IndexModel([("status", ASCENDING)], name="idx_staging_questions_status"),
            IndexModel(
                [("subject", ASCENDING), ("topic", ASCENDING), ("subtopic", ASCENDING), ("target_exam", ASCENDING)],
                name="idx_staging_questions_dedup_scope",
            ),
            IndexModel(
                [("subject", ASCENDING), ("sub_subject", ASCENDING), ("topic", ASCENDING),
                 ("subtopic", ASCENDING), ("target_exam", ASCENDING)],
                name="idx_staging_questions_bank_scope",
            ),
        ])
    except Exception as e:
        logger.warning(f"Could not create staging_questions indexes: {e}")

    # Logged-out tokens (jti): a TTL index auto-deletes each entry once the token itself expires
    try:
        await db.token_blacklist.create_indexes([
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="idx_token_blacklist_ttl"),
        ])
    except Exception as e:
        logger.warning(f"Could not create token_blacklist indexes: {e}")

    logger.info("MongoDB indexes successfully initialized.")
