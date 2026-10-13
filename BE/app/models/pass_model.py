from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class PassInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    tagline: Optional[str] = "Full-length official simulations, deep error analytics, and All-India percentile tracking."
    badge: Optional[str] = None
    duration_days: int = 30
    base_price: float = 149.0
    original_price: Optional[float] = 249.0
    max_coins_discount: int = 500  # in coins (100 coins = 10 Rs, so 500 coins = 50 Rs)
    covered_course_ids: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
