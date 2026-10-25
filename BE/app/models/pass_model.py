from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class PassInDB(BaseModel):
    id: str = Field(alias="_id")
    title: str
    tagline: Optional[str] = None
    badge: Optional[str] = None
    duration_days: int = 30
    base_price: float = 0.0
    original_price: Optional[float] = None
    max_coins_discount: int = 0
    covered_course_ids: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    is_active: bool = True
    admin_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}
