from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base import BaseRepository


class QuizBlueprintRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "quiz_blueprints")
