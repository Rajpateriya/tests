from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PrepMagnet Platform API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # MongoDB Configuration
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "mock_exam_db"
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_POOL_SIZE: int = 100

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = True
    REDIS_FALLBACK_TO_MEMORY: bool = True

    # Security & JWT
    JWT_SECRET_KEY: str = "mock_exam_development_secret_key_antigravity_super_safe_123456"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # CORS

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 120

    # AI Quiz Generation Pipeline
    GOOGLE_API_KEY: str = ""
    # Both tiers point at flash-lite for now — the free-tier RPM quota for
    # plain gemini-3.5-flash (5/min) gets exhausted almost immediately by a
    # multi-subtopic blueprint run; flash-lite's quota is higher.
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_TAGGING_MODEL: str = "gemini-3.5-flash-lite"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    THEORY_TOP_K: int = 6
    # Theory chunks are picked from this many most-relevant candidates,
    # least-used first, so repeat runs see different facts.
    THEORY_CANDIDATE_POOL: int = 15
    PYQ_STYLE_SAMPLE_SIZE: int = 5
    GROUNDEDNESS_THRESHOLD: float = 0.55
    # Generated questions at or above this cosine similarity to an existing
    # question (same subject/topic/subtopic/exam) are rejected as duplicates.
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.90
    GENERATION_TOPUP_ATTEMPTS: int = 2
    # Questions requested per LLM call — asking for dozens at once is unreliable.
    GENERATION_BATCH_SIZE: int = 10
    # Client-side cap so long runs wait for quota instead of failing with 429s.
    LLM_REQUESTS_PER_MINUTE: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
