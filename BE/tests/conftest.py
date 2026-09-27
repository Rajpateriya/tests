import asyncio
import os
import sys
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.db.indexes import init_db_indexes
from app.db.mongodb import db_manager
from app.db.redis import InMemoryCache, redis_manager
from app.db.seed_data import seed_database
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    """Setup isolated in-memory test database for every test."""
    mock_client = AsyncMongoMockClient()
    test_db = mock_client["test_mock_exam_db"]
    db_manager.client = mock_client
    db_manager.db = test_db
    db_manager.is_mock = True

    # Use in-memory cache for Redis
    redis_manager.client = InMemoryCache()
    redis_manager.is_fallback = True

    await init_db_indexes(test_db)
    await seed_database(test_db)

    yield test_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_student_headers(client: AsyncClient):
    """Authenticate with default student and return Bearer auth headers."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@mockexam.com", "password": "Student@123"},
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_admin_headers(client: AsyncClient):
    """Authenticate with default admin and return Bearer auth headers."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@mockexam.com", "password": "Admin@123"},
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
