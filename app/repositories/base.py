from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class BaseRepository:
    """Base generic repository for MongoDB operations."""

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection: AsyncIOMotorCollection = db[collection_name]

    async def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": item_id})

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one(query)

    async def find_many(
        self,
        query: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        sort: Optional[List[tuple]] = None,
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        return await cursor.to_list(length=limit)

    async def count(self, query: Dict[str, Any]) -> int:
        return await self.collection.count_documents(query)

    async def insert(self, document: Dict[str, Any]) -> Dict[str, Any]:
        await self.collection.insert_one(document)
        return document

    async def insert_many(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not documents:
            return []
        await self.collection.insert_many(documents)
        return documents

    async def update(self, item_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        await self.collection.update_one({"_id": item_id}, {"$set": update_data})
        return await self.get_by_id(item_id)

    async def delete(self, item_id: str) -> bool:
        result = await self.collection.delete_one({"_id": item_id})
        return result.deleted_count > 0
