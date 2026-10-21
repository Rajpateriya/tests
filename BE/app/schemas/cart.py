"""
Cart Schemas — PrepMagnet Multi-Course Cart Checkout
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CartItemIn(BaseModel):
    course_id: str
    apply_coins: bool = False  # coins applied at checkout level, not per item


class CartAddResponse(BaseModel):
    cart_id: str
    course_id: str
    course_title: str
    original_price: float
    discounted_price: float
    thumbnail_icon: str = "SparklesIcon"
    total_items: int
    cart_total: float


class CartItemOut(BaseModel):
    course_id: str
    course_title: str
    target_exam: str
    thumbnail_icon: str = "SparklesIcon"
    original_price: float
    discounted_price: float
    is_enrolled: bool = False


class CartOut(BaseModel):
    cart_id: str
    user_id: str
    items: List[CartItemOut] = Field(default_factory=list)
    subtotal: float
    total_items: int
    coins_available: int = 0


class CartCheckoutRequest(BaseModel):
    apply_coins: bool = True


class CartCheckoutResponse(BaseModel):
    order_id: str
    amount_paise: int
    amount_rupees: float
    currency: str = "INR"
    key_id: str
    course_ids: List[str]
    course_titles: List[str]
    subtotal: float
    coins_applied: int
    discount_amount: float
    final_amount: float
    user_coins_available: int
    is_free: bool = False


class CartVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: Optional[str] = None
    coins_used: int = 0
    course_ids: List[str] = Field(default_factory=list)


class CartVerifyResponse(BaseModel):
    success: bool
    message: str
    enrolled_courses: List[str]
    failed_courses: List[str] = Field(default_factory=list)
    payment_id: str
    order_id: str
    coins_deducted: int
    coins_balance: int
