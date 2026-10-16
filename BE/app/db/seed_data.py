"""Seed data module.
Automatic data seeding has been completely removed from the application.
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger


async def seed_database(db: AsyncIOMotorDatabase) -> None:
    """No-op: Data seeding is completely removed."""
    logger.info("Data seeding is disabled.")
