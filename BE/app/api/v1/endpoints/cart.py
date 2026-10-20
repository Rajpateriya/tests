"""
Cart API Endpoints — PrepMagnet Multi-Course Cart Checkout

Routes:
  GET    /cart               — fetch current cart
  POST   /cart/items         — add course to cart
  DELETE /cart/items/{id}    — remove course from cart
  POST   /cart/checkout      — create Razorpay order for whole cart
  POST   /cart/verify        — verify payment + bulk enroll
  DELETE /cart               — clear cart
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.cart import (
    CartAddResponse,
    CartCheckoutRequest,
    CartCheckoutResponse,
    CartItemIn,
    CartOut,
    CartVerifyRequest,
    CartVerifyResponse,
)
from app.schemas.common import APIResponse
from app.schemas.user import UserResponse
from app.services.cart_service import CartService

router = APIRouter(
    prefix="/cart",
    tags=["Cart & Bulk Checkout"],
    dependencies=[Depends(check_rate_limit)],
)


@router.get("", response_model=APIResponse[CartOut])
async def get_cart(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch the authenticated user's current cart with live pricing and enrollment status."""
    service = CartService(db)
    cart = await service.get_cart(current_user.id)
    return APIResponse(success=True, message="Cart retrieved", data=cart)


@router.post("/items", response_model=APIResponse[CartAddResponse], status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    req: CartItemIn,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add a course to cart. Guards against duplicates and already-enrolled courses."""
    service = CartService(db)
    result = await service.add_item(current_user.id, req.course_id)
    return APIResponse(
        success=True,
        message=f"'{result['course_title']}' added to cart",
        data=result,
    )


@router.delete("/items/{course_id}", response_model=APIResponse[CartOut])
async def remove_from_cart(
    course_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove a specific course from cart."""
    service = CartService(db)
    cart = await service.remove_item(current_user.id, course_id)
    return APIResponse(success=True, message="Item removed from cart", data=cart)


@router.delete("", response_model=APIResponse[Dict[str, Any]])
async def clear_cart(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Empty the cart."""
    service = CartService(db)
    await service.clear_cart(current_user.id)
    return APIResponse(success=True, message="Cart cleared", data={"cleared": True})


@router.post("/checkout", response_model=APIResponse[CartCheckoutResponse])
async def cart_checkout(
    req: CartCheckoutRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Create one Razorpay order covering all payable cart items.
    Returns order_id + key_id for the frontend Razorpay checkout modal.
    """
    service = CartService(db)
    order = await service.create_checkout_order(
        user_id=current_user.id,
        apply_coins=req.apply_coins,
    )
    return APIResponse(
        success=True,
        message="Cart checkout order created",
        data=order,
    )


@router.post("/verify", response_model=APIResponse[CartVerifyResponse])
async def verify_cart_payment(
    req: CartVerifyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Verify Razorpay HMAC-SHA256 payment signature, bulk-enroll in all cart courses,
    deduct PrepCoins, and clear the cart.
    """
    service = CartService(db)
    result = await service.verify_and_enroll_all(
        user_id=current_user.id,
        order_id=req.order_id,
        payment_id=req.payment_id,
        signature=req.signature,
        coins_used=req.coins_used,
        course_ids=req.course_ids,
    )
    return APIResponse(
        success=result["success"],
        message=result["message"],
        data=result,
    )
