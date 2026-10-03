from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user
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

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Payments"], dependencies=[Depends(check_rate_limit)])


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
    """Generate a payment order for Razorpay checkout with coin deduction computed."""
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
    """Verify transaction, activate user subscription, and deduct redeemed GovCoins."""
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
