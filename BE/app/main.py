from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import logger
from app.db.indexes import init_db_indexes
from app.db.mongodb import db_manager
from app.db.redis import redis_manager
from app.db.seed_data import seed_database
from app.middlewares.logging_middleware import RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Initializes DB connections, Redis, and indexes on startup,
    and closes resources on shutdown.
    """
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.ENVIRONMENT}' mode...")

    # 1. Connect MongoDB
    await db_manager.connect()

    # 2. Connect Redis
    await redis_manager.connect()

    # 3. Create MongoDB indexes
    db = db_manager.get_database()
    await init_db_indexes(db)

    # 4. Seed initial data if empty
    await seed_database(db)

    logger.info("Application startup sequence completed successfully.")
    yield

    # Shutdown sequence
    logger.info("Application shutdown initiated...")
    await redis_manager.close()
    await db_manager.close()
    logger.info("Application shutdown completed.")


def create_application() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="Scalable Mock Test Platform & Deep Analytics Engine for Government Job Aspirants",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. GZIP Payload Compression (NFR Requirement: question banks payload compression)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 3. Custom Structured Request Logger & ID Correlation Middleware
    app.add_middleware(RequestLoggingMiddleware)

    # 4. Register Custom Domain Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)

    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected internal server error occurred",
                    "details": str(exc) if settings.DEBUG else {},
                },
            },
        )

    # 5. Include API v1 routes
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "1.0.0",
            "docs": "/docs",
            "api_version": settings.API_V1_STR,
            "status": "operational",
        }

    return app


app = create_application()
