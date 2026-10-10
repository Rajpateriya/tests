from typing import Optional
from pydantic import BaseModel


class CalculateDiscountRequest(BaseModel):
    plan_id: str
    apply_coins: bool = True


class CreateOrderRequest(BaseModel):
    plan_id: str
    apply_coins: bool = True


class VerifyPaymentRequest(BaseModel):
    """
    Payload sent by the frontend after the Razorpay Checkout SDK returns
    control to the handler.  All three Razorpay fields are mandatory for
    HMAC-SHA256 signature verification.
    """
    order_id: str           # razorpay_order_id from checkout
    payment_id: str         # razorpay_payment_id from checkout
    signature: str          # razorpay_signature from checkout
    plan_id: str            # our internal plan identifier
    coins_used: int = 0     # GovCoins redeemed (0 if none)
