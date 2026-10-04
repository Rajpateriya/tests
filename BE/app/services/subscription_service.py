import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import BadRequestException, NotFoundException
from app.repositories.user_repo import UserRepository


SUBSCRIPTION_PLANS = {
    "PASS_7_DAYS": {
        "id": "PASS_7_DAYS",
        "name": "7-Day Sprint Pass",
        "badge": "Sprint Pass",
        "duration_days": 7,
        "base_price": 49,
        "max_coins_discount": 25,
        "description": "7 days of intensive mock exam practice with full solution keys and TCS iON exam simulation.",
        "features": [
            "7 Days Full Platform Access",
            "15 Full Tier-I & Tier-II Mocks",
            "TCS iON Exam Engine UI",
            "Step-by-Step Answer Explanations",
        ],
        "popular": False,
    },
    "PASS_MONTHLY": {
        "id": "PASS_MONTHLY",
        "name": "Monthly Pro Pass",
        "badge": "MOST POPULAR",
        "duration_days": 30,
        "base_price": 149,
        "max_coins_discount": 50,
        "description": "30 days full-spectrum mock preparation with AI analytics, weak-area drills, and All-India percentile.",
        "features": [
            "30 Days Unlimited Access",
            "All-India Percentile & AIR Rank",
            "Speed vs Accuracy Diagnostics",
            "Previous Year Papers (PYQs 2019-2025)",
            "Instant Doubt Clarification",
        ],
        "popular": True,
    },
    "PASS_ANNUAL": {
        "id": "PASS_ANNUAL",
        "name": "Annual Elite Pass",
        "badge": "BEST VALUE",
        "duration_days": 365,
        "base_price": 499,
        "max_coins_discount": 100,
        "description": "365 days VIP access across all exams (SSC, Banking, Railways) with dynamic question generator.",
        "features": [
            "365 Days All-Access Membership",
            "Multi-Exam Prep (SSC, Banking, RRB, PSC)",
            "Unlimited AI Question Pipeline Generation",
            "High-Yield Theory Compendiums (PDF)",
            "Priority Helpline & Mentor Guidance",
        ],
        "popular": False,
    },
}


class SubscriptionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.user_repo = UserRepository(db)
        self.payments_collection = db["payments"]
        self.orders_collection = db["orders"]

    def get_plans(self) -> List[Dict[str, Any]]:
        """Return all available subscription plans and coin redemption rules."""
        return list(SUBSCRIPTION_PLANS.values())

    async def calculate_discount(
        self, user_id: str, plan_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """Compute base price, eligible coin discount, and final payable amount."""
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            raise NotFoundException(f"Subscription plan '{plan_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        user_coins = user.get("profile", {}).get("coins_balance", 0)
        base_price = plan["base_price"]
        max_coins = plan["max_coins_discount"]

        if apply_coins and user_coins > 0:
            # 1 coin = ₹1 discount, leaving at least ₹1 payable
            coins_applied = min(user_coins, max_coins, max(0, base_price - 1))
            discount_amount = coins_applied
        else:
            coins_applied = 0
            discount_amount = 0

        final_price = max(1, base_price - discount_amount)

        return {
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "base_price": base_price,
            "user_coins_available": user_coins,
            "max_coins_allowed": max_coins,
            "coins_applied": coins_applied,
            "discount_amount": discount_amount,
            "final_payable_amount": final_price,
            "coins_remaining_after": max(0, user_coins - coins_applied),
        }

    async def create_order(
        self, user_id: str, plan_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """Create a payment order for Razorpay checkout."""
        discount_info = await self.calculate_discount(user_id, plan_id, apply_coins)

        order_id = f"order_{uuid.uuid4().hex[:14]}"
        order_doc = {
            "_id": order_id,
            "order_id": order_id,
            "user_id": user_id,
            "plan_id": plan_id,
            "base_price": discount_info["base_price"],
            "coins_applied": discount_info["coins_applied"],
            "discount_amount": discount_info["discount_amount"],
            "final_payable_amount": discount_info["final_payable_amount"],
            "currency": "INR",
            "status": "CREATED",
            "created_at": datetime.now(timezone.utc),
        }
        await self.orders_collection.insert_one(order_doc)

        return {
            "order_id": order_id,
            "amount_paise": discount_info["final_payable_amount"] * 100,
            "amount_rupees": discount_info["final_payable_amount"],
            "currency": "INR",
            "plan_id": plan_id,
            "plan_name": discount_info["plan_name"],
            "coins_applied": discount_info["coins_applied"],
            "discount_amount": discount_info["discount_amount"],
            "user_coins_available": discount_info["user_coins_available"],
        }

    async def verify_and_activate(
        self,
        user_id: str,
        order_id: str,
        payment_id: str,
        plan_id: str,
        coins_used: int = 0,
        signature: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verify payment completion, deduct used coins, and activate pass."""
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            raise NotFoundException(f"Subscription plan '{plan_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=plan["duration_days"])

        # Deduct coins if applied
        if coins_used > 0:
            await self.user_repo.update_coins(user_id, -coins_used)

        # Activate subscription in user profile
        updated_user = await self.user_repo.update_subscription(
            user_id=user_id,
            plan_id=plan_id,
            status="ACTIVE",
            expires_at=expires_at,
        )

        # Record payment transaction
        payment_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "order_id": order_id,
            "payment_id": payment_id,
            "plan_id": plan_id,
            "coins_used": coins_used,
            "amount_paid": max(1, plan["base_price"] - coins_used),
            "status": "SUCCESS",
            "activated_at": now,
            "expires_at": expires_at,
        }
        await self.payments_collection.insert_one(payment_doc)

        # Update order status
        await self.orders_collection.update_one(
            {"_id": order_id},
            {"$set": {"status": "PAID", "payment_id": payment_id, "updated_at": now}}
        )

        new_coins = updated_user.get("profile", {}).get("coins_balance", 0) if updated_user else 0

        return {
            "success": True,
            "message": f"Successfully activated {plan['name']}!",
            "subscription": {
                "plan": plan_id,
                "plan_name": plan["name"],
                "status": "ACTIVE",
                "activated_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "duration_days": plan["duration_days"],
            },
            "coins_deducted": coins_used,
            "coins_balance": new_coins,
            "payment_id": payment_id,
            "order_id": order_id,
        }

    async def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        """Fetch current active subscription status and coins balance."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        profile = user.get("profile", {})
        plan_id = profile.get("subscription_plan", "FREE")
        status = profile.get("subscription_status", "INACTIVE")
        expires_at = profile.get("subscription_expires_at")
        coins = profile.get("coins_balance", 0)

        is_active = status == "ACTIVE"
        if is_active and expires_at:
            if isinstance(expires_at, datetime):
                exp_utc = expires_at.replace(tzinfo=timezone.utc) if expires_at.tzinfo is None else expires_at
                if exp_utc < datetime.now(timezone.utc):
                    is_active = False
                    status = "EXPIRED"

        plan_details = SUBSCRIPTION_PLANS.get(plan_id, {
            "id": "FREE",
            "name": "Free Aspirant",
            "features": ["1 Free Mock Test", "Public Discovery"],
        })

        return {
            "plan": plan_id,
            "plan_name": plan_details.get("name", plan_id),
            "status": status,
            "is_active": is_active,
            "expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
            "coins_balance": coins,
        }
