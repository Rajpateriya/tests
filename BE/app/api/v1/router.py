from fastapi import APIRouter
from app.api.v1.endpoints import admin, attempts, auth, generation, questions, results, streak, subscriptions, tests, users

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
