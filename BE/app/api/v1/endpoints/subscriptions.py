import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.pass_schema import PassResponse, UserActivePassOut
from app.schemas.subscription import (
    CalculateDiscountRequest,
    CreateOrderRequest,
    VerifyPaymentRequest,
)
from app.schemas.user import UserResponse
from app.services.pass_service import PassService
from app.services.subscription_service import SubscriptionService

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions & Payments"],
    dependencies=[Depends(check_rate_limit)],
)


@router.get("/passes", response_model=APIResponse[List[PassResponse]])
async def get_active_passes(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all dynamic targeted passes with covered course details."""
    service = PassService(db)
    passes = await service.list_active_passes()
    return APIResponse(
        success=True,
        message="Active exam passes retrieved",
        data=passes,
    )


@router.get("/my-pass", response_model=APIResponse[Dict[str, Any]])
async def get_my_active_passes(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve currently authenticated user's active passes.
    Automatically checks duration and marks breached passes as EXPIRED.
    """
    service = PassService(db)
    active_passes = await service.sanitize_user_passes(current_user.id)
    return APIResponse(
        success=True,
        message="User active passes retrieved",
        data={
            "has_active_pass": len(active_passes) > 0,
            "active_passes": active_passes,
            "total_active_passes": len(active_passes),
        },
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
    """Calculate the final payable price after applying eligible user GovCoins (100 coins = 10 Rs)."""
    # Check if this is a dynamic pass
    pass_service = PassService(db)
    pass_doc = await pass_service.pass_repo.get_by_id(req.plan_id)
    if pass_doc:
        result = await pass_service.calculate_discount(
            user_id=current_user.id,
            pass_id=req.plan_id,
            apply_coins=req.apply_coins,
        )
    else:
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
    pass_service = PassService(db)
    pass_doc = await pass_service.pass_repo.get_by_id(req.plan_id)
    if pass_doc:
        order = await pass_service.create_order(
            user_id=current_user.id,
            pass_id=req.plan_id,
            apply_coins=req.apply_coins,
        )
    else:
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
    Verify Razorpay HMAC-SHA256 payment signature, activate user subscription or pass,
    and deduct redeemed GovCoins atomically.
    """
    pass_service = PassService(db)
    pass_doc = await pass_service.pass_repo.get_by_id(req.plan_id)
    if pass_doc:
        result = await pass_service.verify_and_activate_pass(
            user_id=current_user.id,
            order_id=req.order_id,
            payment_id=req.payment_id,
            pass_id=req.plan_id,
            coins_used=req.coins_used,
            signature=req.signature,
        )
    else:
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
        order_doc = await orders_col.find_one({"_id": rzp_order_id}) or {}
        notes = entity.get("notes") or order_doc.get("notes", {})
        user_id = notes.get("user_id") or order_doc.get("user_id")
        plan_id = notes.get("plan_id") or notes.get("pass_id") or order_doc.get("plan_id") or order_doc.get("pass_id")
        course_id = notes.get("course_id") or order_doc.get("course_id")

        if not existing:
            # Record payment as SUCCESS from webhook
            # (verify-payment endpoint is the primary path; this is a safety net)
            await payments_col.insert_one(
                {
                    "_id": str(uuid.uuid4()),
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_payment_id": rzp_payment_id,
                    "amount_paid": entity.get("amount", 0) / 100,
                    "currency": entity.get("currency", "INR"),
                    "status": "SUCCESS",
                    "source": "webhook",
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "course_id": course_id,
                    "created_at": datetime.now(timezone.utc),
                }
            )

        await orders_col.update_one(
            {"_id": rzp_order_id},
            {"$set": {"status": "PAID", "razorpay_payment_id": rzp_payment_id}},
        )

        # Asynchronous fulfillment fallback if user closed browser before verify-payment returned
        if user_id:
            try:
                if plan_id:
                    pass_service = PassService(db)
                    pass_doc = await pass_service.pass_repo.get_by_id(plan_id)
                    if pass_doc:
                        await pass_service.verify_and_activate_pass(
                            user_id=user_id,
                            order_id=rzp_order_id,
                            payment_id=rzp_payment_id,
                            pass_id=plan_id,
                            coins_used=int(notes.get("coins_applied", 0)),
                            signature="webhook_verified",
                        )
                    else:
                        sub_service = SubscriptionService(db)
                        await sub_service.verify_and_activate(
                            user_id=user_id,
                            order_id=rzp_order_id,
                            payment_id=rzp_payment_id,
                            plan_id=plan_id,
                            coins_used=int(notes.get("coins_applied", 0)),
                            signature="webhook_verified",
                        )
                elif course_id:
                    from app.services.course_service import CourseService
                    course_service = CourseService(db)
                    await course_service.verify_and_enroll(
                        user_id=user_id,
                        course_id=course_id,
                        order_id=rzp_order_id,
                        payment_id=rzp_payment_id,
                        signature="webhook_verified",
                        coins_used=int(notes.get("coins_applied", 0)),
                    )
                elif notes.get("type") == "cart_checkout" or (isinstance(order_doc.get("notes"), dict) and order_doc["notes"].get("type") == "cart_checkout"):
                    from app.services.cart_service import CartService
                    cart_service = CartService(db)
                    raw_cids = notes.get("course_ids") or (order_doc.get("notes", {}) if isinstance(order_doc.get("notes"), dict) else {}).get("course_ids", [])
                    if isinstance(raw_cids, str):
                        cids = [c.strip() for c in raw_cids.split(",") if c.strip()]
                    else:
                        cids = list(raw_cids)
                    if cids:
                        await cart_service.verify_and_enroll_all(
                            user_id=user_id,
                            order_id=rzp_order_id,
                            payment_id=rzp_payment_id,
                            signature="webhook_verified",
                            coins_used=int(notes.get("coins_applied", 0)),
                            course_ids=cids,
                        )
                        await cart_service.clear_cart(user_id)
            except Exception as fulfill_err:
                __import__("logging").getLogger("uvicorn.error").warning(
                    f"Webhook auto-fulfillment error: {fulfill_err}"
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
                "_id": refund_entity.get("id", str(uuid.uuid4())),
                "razorpay_payment_id": refund_entity.get("payment_id"),
                "amount": refund_entity.get("amount", 0) / 100,
                "status": refund_entity.get("status"),
                "created_at": datetime.now(timezone.utc),
            }
        )

    return {"status": "ok", "event": event}
