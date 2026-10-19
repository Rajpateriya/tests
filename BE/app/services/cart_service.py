"""
CartService — PrepMagnet Multi-Course Cart & Checkout

Responsibilities:
- Persistent per-user cart stored in MongoDB `carts` collection
- Add / remove courses, enforce already-enrolled guard
- Calculate subtotal + coin discount for the whole basket
- Create one Razorpay order covering all cart items (batch checkout)
- Verify payment + bulk-enroll all courses atomically
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.razorpay import (
    create_razorpay_order,
    record_order_in_db,
    record_payment_in_db,
    verify_razorpay_signature,
)
from app.repositories.user_repo import UserRepository
from app.services.course_service import CourseService

COIN_TO_RUPEE = 0.10  # 100 coins = ₹10


class CartService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.carts_col = db["carts"]
        self.orders_col = db["orders"]
        self.payments_col = db["payments"]
        self.user_repo = UserRepository(db)
        self.course_svc = CourseService(db)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_or_create_cart(self, user_id: str) -> Dict[str, Any]:
        cart = await self.carts_col.find_one({"user_id": user_id})
        if not cart:
            cart = {
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "items": [],        # list of { course_id }
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await self.carts_col.insert_one(cart)
        return cart

    async def _hydrate_items(
        self, user_id: str, course_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """Fetch live course data for every course_id in the cart."""
        hydrated = []
        user = await self.user_repo.get_by_id(user_id)
        enrolled_ids = set()
        if user:
            for enr in user.get("profile", {}).get("enrolled_courses", []):
                enrolled_ids.add(enr.get("course_id", ""))

        for cid in course_ids:
            course = await self.db.courses.find_one({"_id": cid, "is_active": True})
            if not course:
                continue
            hydrated.append({
                "course_id": cid,
                "course_title": course.get("title", cid),
                "target_exam": course.get("target_exam", ""),
                "thumbnail_icon": course.get("thumbnail_icon", "SparklesIcon"),
                "original_price": float(course.get("original_price", 0)),
                "discounted_price": float(course.get("discounted_price", 0)),
                "is_enrolled": cid in enrolled_ids,
            })
        return hydrated

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_cart(self, user_id: str) -> Dict[str, Any]:
        """Return the user's current cart with live pricing. Auto-removes enrolled courses."""
        cart = await self._get_or_create_cart(user_id)
        existing_items = cart.get("items", [])

        # Check enrolled courses for this user
        user = await self.user_repo.get_by_id(user_id)
        enrolled_ids = set()
        if user:
            for enr in user.get("profile", {}).get("enrolled_courses", []):
                enrolled_ids.add(enr.get("course_id", ""))

        # Auto-remove any course from cart if user is already enrolled
        already_enrolled = [i["course_id"] for i in existing_items if i.get("course_id") in enrolled_ids]
        if already_enrolled:
            await self.carts_col.update_one(
                {"_id": cart["_id"]},
                {"$pull": {"items": {"course_id": {"$in": already_enrolled}}}},
            )
            item_ids = [i["course_id"] for i in existing_items if i.get("course_id") not in enrolled_ids]
        else:
            item_ids = [i["course_id"] for i in existing_items]

        items = await self._hydrate_items(user_id, item_ids)

        coins = user.get("profile", {}).get("coins_balance", 0) if user else 0
        subtotal = sum(i["discounted_price"] for i in items)
        return {
            "cart_id": str(cart["_id"]),
            "user_id": user_id,
            "items": items,
            "subtotal": round(subtotal, 2),
            "total_items": len(items),
            "coins_available": coins,
        }

    async def add_item(self, user_id: str, course_id: str) -> Dict[str, Any]:
        """Add a course to cart. Guards: must exist, not already enrolled, not duplicate."""
        course = await self.db.courses.find_one({"_id": course_id, "is_active": True})
        if not course:
            raise NotFoundException(f"Course '{course_id}' not found or inactive")

        # Guard: already enrolled
        user = await self.user_repo.get_by_id(user_id)
        if user:
            enrolled_ids = {
                e.get("course_id")
                for e in user.get("profile", {}).get("enrolled_courses", [])
            }
            if course_id in enrolled_ids:
                raise BadRequestException("You are already enrolled in this course")

        cart = await self._get_or_create_cart(user_id)
        existing_ids = {i["course_id"] for i in cart.get("items", [])}

        if course_id in existing_ids:
            raise BadRequestException("Course is already in your cart")

        await self.carts_col.update_one(
            {"_id": cart["_id"]},
            {
                "$push": {"items": {"course_id": course_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

        # Refresh to return accurate count
        updated = await self.get_cart(user_id)
        return {
            "cart_id": str(cart["_id"]),
            "course_id": course_id,
            "course_title": course.get("title", course_id),
            "original_price": float(course.get("original_price", 0)),
            "discounted_price": float(course.get("discounted_price", 0)),
            "thumbnail_icon": course.get("thumbnail_icon", "SparklesIcon"),
            "total_items": updated["total_items"],
            "cart_total": updated["subtotal"],
        }

    async def remove_item(self, user_id: str, course_id: str) -> Dict[str, Any]:
        """Remove a course from cart."""
        cart = await self._get_or_create_cart(user_id)
        await self.carts_col.update_one(
            {"_id": cart["_id"]},
            {
                "$pull": {"items": {"course_id": course_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        return await self.get_cart(user_id)

    async def clear_cart(self, user_id: str) -> None:
        """Empty the cart (called after successful checkout)."""
        await self.carts_col.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "items": [],
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def calculate_discount(
        self, user_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """Calculate subtotal, coin discount, and final payable for the whole cart."""
        cart_data = await self.get_cart(user_id)
        items = cart_data["items"]

        if not items:
            raise BadRequestException("Your cart is empty")

        # Remove already-enrolled courses silently
        payable_items = [i for i in items if not i["is_enrolled"]]
        if not payable_items:
            raise BadRequestException("All items in your cart are already enrolled")

        subtotal = sum(i["discounted_price"] for i in payable_items)
        coins_available = cart_data["coins_available"]

        if apply_coins and coins_available > 0:
            # Max discount: coins can cover at most (subtotal - 1) so ≥ ₹1 is always payable
            max_coins = min(coins_available, int((subtotal - 1.0) / COIN_TO_RUPEE))
            coins_applied = max(0, max_coins)
            discount = round(coins_applied * COIN_TO_RUPEE, 2)
        else:
            coins_applied = 0
            discount = 0.0

        final = max(1.0, round(subtotal - discount, 2))

        return {
            "subtotal": round(subtotal, 2),
            "coins_available": coins_available,
            "coins_applied": coins_applied,
            "discount_amount": discount,
            "final_payable": final,
            "final_payable_paise": int(round(final * 100)),
            "course_ids": [i["course_id"] for i in payable_items],
            "course_titles": [i["course_title"] for i in payable_items],
        }

    async def create_checkout_order(
        self, user_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """Create one Razorpay order for all payable cart items."""
        disc = await self.calculate_discount(user_id, apply_coins)

        receipt = f"cart_{uuid.uuid4().hex[:12]}"
        rzp_order = create_razorpay_order(
            amount_paise=disc["final_payable_paise"],
            currency="INR",
            receipt=receipt,
            notes={
                "user_id": user_id,
                "type": "cart_checkout",
                "course_ids": ",".join(disc["course_ids"]),
                "coins_applied": str(disc["coins_applied"]),
            },
        )

        await record_order_in_db(
            db=self.db,
            order_id=rzp_order["order_id"],
            amount_paise=disc["final_payable_paise"],
            currency="INR",
            receipt=receipt,
            user_id=user_id,
            notes={
                "type": "cart_checkout",
                "course_ids": disc["course_ids"],
                "coins_applied": disc["coins_applied"],
            },
        )

        return {
            "order_id": rzp_order["order_id"],
            "amount_paise": disc["final_payable_paise"],
            "amount_rupees": disc["final_payable"],
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "course_ids": disc["course_ids"],
            "course_titles": disc["course_titles"],
            "subtotal": disc["subtotal"],
            "coins_applied": disc["coins_applied"],
            "discount_amount": disc["discount_amount"],
            "final_amount": disc["final_payable"],
            "user_coins_available": disc["coins_available"],
        }

    async def verify_and_enroll_all(
        self,
        user_id: str,
        order_id: str,
        payment_id: str,
        signature: Optional[str],
        coins_used: int,
        course_ids: List[str],
    ) -> Dict[str, Any]:
        """Verify Razorpay signature then bulk-enroll all courses. Deducts coins once."""
        is_valid = verify_razorpay_signature(order_id, payment_id, signature)
        if not is_valid:
            raise BadRequestException(
                "Payment signature verification failed. Possible tampered request."
            )

        # Deduct coins once for entire cart
        if coins_used > 0:
            await self.user_repo.update_coins(user_id, -coins_used)

        enrolled = []
        failed = []
        now = datetime.now(timezone.utc)

        for course_id in course_ids:
            try:
                course = await self.db.courses.find_one({"_id": course_id})
                if not course:
                    failed.append(course_id)
                    continue

                amount_paid = float(course.get("discounted_price", 0))
                enrollment_record = {
                    "course_id": course["_id"],
                    "course_title": course.get("title", course_id),
                    "target_exam": course.get("target_exam", ""),
                    "tagline": course.get("tagline", ""),
                    "thumbnail_icon": course.get("thumbnail_icon", "SparklesIcon"),
                    "enrolled_at": now.isoformat(),
                    "amount_paid": amount_paid,
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "status": "ACTIVE",
                }
                await self.user_repo.add_enrolled_course(user_id, enrollment_record)
                # Increment enrolled_count on the course
                await self.db.courses.update_one(
                    {"_id": course_id},
                    {"$inc": {"enrolled_count": 1}},
                )
                enrolled.append(course_id)
            except Exception:
                failed.append(course_id)

        # Record payment audit once for the cart order
        await record_payment_in_db(
            db=self.db,
            order_id=order_id,
            payment_id=payment_id,
            signature=signature or "webhook_verified",
            user_id=user_id,
            source="cart_checkout",
            metadata={
                "course_ids": course_ids,
                "enrolled": enrolled,
                "failed": failed,
                "coins_used": coins_used,
            },
        )

        # Clear the cart after successful checkout
        if enrolled:
            await self.clear_cart(user_id)

        user = await self.user_repo.get_by_id(user_id)
        coins_balance = user.get("profile", {}).get("coins_balance", 0) if user else 0

        return {
            "success": len(enrolled) > 0,
            "message": (
                f"Successfully enrolled in {len(enrolled)} course(s)!"
                if enrolled
                else "Enrollment failed for all courses."
            ),
            "enrolled_courses": enrolled,
            "failed_courses": failed,
            "payment_id": payment_id,
            "order_id": order_id,
            "coins_deducted": coins_used,
            "coins_balance": coins_balance,
        }
