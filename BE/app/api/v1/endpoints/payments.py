from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import get_optional_current_user
from app.core.config import settings
from app.core.logging import logger
from app.core.razorpay import (
    create_razorpay_order,
    record_order_in_db,
    record_payment_in_db,
    verify_razorpay_signature,
)
from app.db.mongodb import get_db
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(tags=["Razorpay Standard Payments"])


@router.post(
    "/create-order",
    response_model=CreateOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Create a Razorpay Standard payment order",
)
async def create_order(
    req: CreateOrderRequest,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db: Optional[AsyncIOMotorDatabase] = Depends(get_db),
) -> Dict[str, Any]:
    """
    Step 1: Create Order
    - Validates amount >= 100 paise
    - Calls Razorpay Orders API
    - Persists order in MongoDB for reconciliation
    - Returns order_id, amount, currency, and public key_id
    """
    notes = req.notes or {}
    if current_user and "user_id" not in notes:
        notes["user_id"] = current_user.id
        notes["user_email"] = current_user.email

    order_info = create_razorpay_order(
        amount_paise=req.amount,
        currency=req.currency or "INR",
        receipt=req.receipt,
        notes=notes,
    )

    # Persist in DB
    await record_order_in_db(
        db=db,
        order_id=order_info["order_id"],
        amount_paise=order_info["amount_paise"],
        currency=order_info["currency"],
        receipt=order_info["receipt"],
        user_id=current_user.id if current_user else notes.get("user_id"),
        notes=notes,
    )

    return {
        "order_id": order_info["order_id"],
        "amount": order_info["amount_paise"],
        "currency": order_info["currency"],
        "key_id": order_info["key_id"],
    }


@router.post(
    "/verify-payment",
    response_model=VerifyPaymentResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Razorpay payment signature",
)
async def verify_payment(
    req: VerifyPaymentRequest,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db: Optional[AsyncIOMotorDatabase] = Depends(get_db),
) -> Dict[str, Any]:
    """
    Step 3: Verify Payment Signature
    - Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    - Compares generated signature with razorpay_signature using constant-time comparison
    - Audits payment in DB upon successful verification
    - Returns success only if signatures match
    """
    order_id = req.razorpay_order_id or req.order_id
    payment_id = req.razorpay_payment_id or req.payment_id
    signature = req.razorpay_signature or req.signature

    if not order_id or not payment_id or not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required payment verification fields (order_id, payment_id, signature)",
        )

    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Razorpay secret key is not configured",
        )

    is_valid = verify_razorpay_signature(order_id, payment_id, signature)
    if not is_valid:
        logger.warning(
            f"Razorpay signature mismatch for order: {order_id}, payment: {payment_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed. Signature mismatch.",
        )

    # Persist payment record in DB
    await record_payment_in_db(
        db=db,
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        user_id=current_user.id if current_user else None,
        source="standard_checkout",
    )

    logger.info(f"Razorpay payment verified successfully: order {order_id}, payment {payment_id}")
    return {
        "success": True,
        "message": "Payment verified successfully",
        "order_id": order_id,
        "payment_id": payment_id,
    }
