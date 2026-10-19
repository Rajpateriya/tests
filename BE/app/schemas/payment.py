from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    amount: int = Field(..., description="Amount in paise (minimum 100 paise = 1 INR)")
    currency: str = Field(default="INR", description="Currency code, e.g. INR")
    receipt: Optional[str] = Field(default=None, description="Client receipt identifier")
    notes: Optional[Dict[str, Any]] = Field(default=None, description="Optional key-value notes")


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    signature: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
