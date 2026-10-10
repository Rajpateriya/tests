from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.subscription import (
    CalculateDiscountRequest,
    CreateOrderRequest,
    VerifyPaymentRequest,
)
from app.schemas.user import UserResponse
from app.services.subscription_service import SubscriptionService

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions & Payments"],
    dependencies=[Depends(check_rate_limit)],
)


@router.get("/plans", response_model=APIResponse[List[Dict[str, Any]]])
async def get_subscription_plans(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all available subscription plans with pricing and coin discount limits."""
    service = SubscriptionService(db)
    plans = service.get_plans()
    return APIResponse(
        success=True,
        message="Subscription plans retrieved",
        data=plans,
    )


@router.post("/calculate-discount", response_model=APIResponse[Dict[str, Any]])
async def calculate_discount(
    req: CalculateDiscountRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Calculate the final payable price after applying eligible user GovCoins."""
    service = SubscriptionService(db)
    result = await service.calculate_discount(
        user_id=current_user.id,
        plan_id=req.plan_id,
        apply_coins=req.apply_coins,
    )
    return APIResponse(
        success=True,
        message="Discount calculated successfully",
        data=result,
    )


@router.post("/create-order", response_model=APIResponse[Dict[str, Any]])
async def create_payment_order(
    req: CreateOrderRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Create a real Razorpay order via the Razorpay Orders API.
    Returns order_id, amount_paise, currency and razorpay_key_id so the
    frontend can directly invoke the Razorpay Checkout SDK.
    """
    service = SubscriptionService(db)
    order = await service.create_order(
        user_id=current_user.id,
        plan_id=req.plan_id,
        apply_coins=req.apply_coins,
    )
    return APIResponse(
        success=True,
        message="Payment order created successfully",
        data=order,
    )


@router.post("/verify-payment", response_model=APIResponse[Dict[str, Any]])
async def verify_payment(
    req: VerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Verify Razorpay HMAC-SHA256 payment signature, activate user subscription,
    and deduct redeemed GovCoins atomically.
    """
    service = SubscriptionService(db)
    result = await service.verify_and_activate(
        user_id=current_user.id,
        order_id=req.order_id,
        payment_id=req.payment_id,
        plan_id=req.plan_id,
        coins_used=req.coins_used,
        signature=req.signature,
    )
    return APIResponse(
        success=True,
        message="Payment verified and subscription activated successfully",
        data=result,
    )


@router.get("/my-status", response_model=APIResponse[Dict[str, Any]])
async def get_my_subscription_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve current authenticated user's active pass and coin wallet balance."""
    service = SubscriptionService(db)
    status_data = await service.get_user_subscription(current_user.id)
    return APIResponse(
        success=True,
        message="Subscription status retrieved",
        data=status_data,
    )


# ─── Razorpay Webhook ────────────────────────────────────────────────────────

@router.post(
    "/webhook",
    tags=["Webhooks"],
    include_in_schema=True,
    dependencies=[],  # No auth — Razorpay signs with its own secret
)
async def razorpay_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
):
    """
    Razorpay webhook receiver.

    Events handled:
    - payment.captured   → activate subscription (idempotent)
    - payment.failed     → mark order as FAILED in DB
    - refund.created     → record refund event

    Configure this URL in Razorpay Dashboard → Webhooks:
        https://your-api-domain/api/v1/subscriptions/webhook
    Webhook secret must match RAZORPAY_WEBHOOK_SECRET in .env.
    """
    raw_body = await request.body()

    # ── Signature Verification ────────────────────────────────────────────────
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header",
        )

    if not SubscriptionService.verify_webhook_signature(raw_body, x_razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    payments_col = db["payments"]
    orders_col = db["orders"]

    if event == "payment.captured":
        # ── Idempotent: if payment already recorded, skip ─────────────────
        rzp_payment_id = entity.get("id")
        rzp_order_id = entity.get("order_id")
        existing = await payments_col.find_one({"razorpay_payment_id": rzp_payment_id})
        if not existing:
            # Record payment as SUCCESS from webhook
            # (verify-payment endpoint is the primary path; this is a safety net)
            await payments_col.insert_one(
                {
                    "_id": str(__import__("uuid").uuid4()),
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_payment_id": rzp_payment_id,
                    "amount_paid": entity.get("amount", 0) / 100,
                    "currency": entity.get("currency", "INR"),
                    "status": "SUCCESS",
                    "source": "webhook",
                    "created_at": __import__("datetime").datetime.now(
                        __import__("datetime").timezone.utc
                    ),
                }
            )

        await orders_col.update_one(
            {"_id": rzp_order_id},
            {"$set": {"status": "PAID", "razorpay_payment_id": rzp_payment_id}},
        )

    elif event == "payment.failed":
        rzp_order_id = entity.get("order_id")
        await orders_col.update_one(
            {"_id": rzp_order_id},
            {"$set": {"status": "FAILED", "failure_reason": entity.get("error_description")}},
        )

    elif event == "refund.created":
        refund_entity = payload.get("payload", {}).get("refund", {}).get("entity", {})
        await db["refunds"].insert_one(
            {
                "_id": refund_entity.get("id", str(__import__("uuid").uuid4())),
                "razorpay_payment_id": refund_entity.get("payment_id"),
                "amount": refund_entity.get("amount", 0) / 100,
                "status": refund_entity.get("status"),
                "created_at": __import__("datetime").datetime.now(
                    __import__("datetime").timezone.utc
                ),
            }
        )

    return {"status": "ok", "event": event}
