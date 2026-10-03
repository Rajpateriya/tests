from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CalculateDiscountRequest(BaseModel):
    plan_id: str
    apply_coins: bool = True


class CreateOrderRequest(BaseModel):
    plan_id: str
    apply_coins: bool = True


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    plan_id: str
    coins_used: int = 0
    signature: Optional[str] = None
