from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    attempts,
    auth,
    courses,
    generation,
    notifications,
    questions,
    results,
    streak,
    subscriptions,
    support,
    tests,
    typing,
    users,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(tests.router)
api_v1_router.include_router(attempts.router)
api_v1_router.include_router(results.router)
api_v1_router.include_router(questions.router)
api_v1_router.include_router(admin.router)
api_v1_router.include_router(generation.router)
api_v1_router.include_router(subscriptions.router)
api_v1_router.include_router(streak.router)
api_v1_router.include_router(courses.router)
api_v1_router.include_router(typing.router)
api_v1_router.include_router(support.router)
api_v1_router.include_router(notifications.router)

