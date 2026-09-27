import asyncio
import os
import sys

# Ensure app root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.logging import logger
from app.db.indexes import init_db_indexes
from app.db.mongodb import db_manager
from app.db.seed_data import seed_database


async def main():
    logger.info("Connecting to MongoDB to seed database...")
    await db_manager.connect()
    db = db_manager.get_database()
    await init_db_indexes(db)
    await seed_database(db)
    await db_manager.close()
    logger.info("Seeding script executed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
