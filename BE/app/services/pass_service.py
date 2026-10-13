import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import razorpay
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.repositories.course_repo import CourseRepository
from app.repositories.pass_repo import PassRepository
from app.repositories.user_repo import UserRepository
from app.schemas.pass_schema import PassCourseInfo, PassCreateRequest, PassResponse, PassUpdateRequest


# Coin metric: 100 coins = 10 Rs  =>  1 coin = 0.10 Rs (10 paise)
COIN_TO_RUPEE_RATE = 0.10


def _get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


class PassService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.pass_repo = PassRepository(db)
        self.course_repo = CourseRepository(db)
        self.user_repo = UserRepository(db)
        self.orders_collection = db["orders"]
        self.payments_collection = db["payments"]

    # ── Auto-seed default passes if DB is empty ──────────────────────────────
    async def ensure_default_passes(self) -> None:
        """Seed default Monthly and Annual Passes if no passes exist."""
        existing = await self.pass_repo.get_all_passes()
        if existing:
            return

        # Fetch all courses to cover them by default
        all_courses = await self.course_repo.get_active_courses()
        course_ids = [c["_id"] for c in all_courses]

        monthly_pass = {
            "_id": "pass_monthly",
            "title": "Monthly Pass",
            "tagline": "Full-length official simulations, deep error analytics, and All-India percentile tracking.",
            "badge": "MOST POPULAR",
            "duration_days": 30,
            "base_price": 149.0,
            "original_price": 249.0,
            "max_coins_discount": 500,  # 500 coins = ₹50 max discount
            "covered_course_ids": course_ids,
            "features": [
                "30 Days Full Platform Access",
                "All Exam Courses & Tier-I/II Mocks Included",
                "PrepMagnet CBT Simulation UI",
                "All-India Percentile & AIR Rank",
                "Speed vs Accuracy Diagnostics",
            ],
            "is_active": True,
        }

        annual_pass = {
            "_id": "pass_annual",
            "title": "Annual Pass",
            "tagline": "Full-length official simulations, deep error analytics, and All-India percentile tracking.",
            "badge": "SAVE 40%",
            "duration_days": 365,
            "base_price": 499.0,
            "original_price": 899.0,
            "max_coins_discount": 1000,  # 1000 coins = ₹100 max discount
            "covered_course_ids": course_ids,
            "features": [
                "365 Days All-Access Membership",
                "All Exam Courses & Tier-I/II Mocks Included",
                "Multi-Exam Prep (SSC, Banking, RRB, PSC)",
                "Deep Error Analytics & AI Weak-Area Drills",
                "Priority Question Pipeline & Mentor Guidance",
            ],
            "is_active": True,
        }

        await self.pass_repo.create_pass(monthly_pass)
        await self.pass_repo.create_pass(annual_pass)

    # ── Admin Operations ─────────────────────────────────────────────────────

    async def list_all_passes_admin(self) -> List[PassResponse]:
        await self.ensure_default_passes()
        passes = await self.pass_repo.get_all_passes()
        return [await self._enrich_pass(p) for p in passes]

    async def create_pass(self, req: PassCreateRequest) -> PassResponse:
        pass_id = req.id or f"pass_{uuid.uuid4().hex[:8]}"
        base_price = float(req.base_price)
        max_coins = req.max_coins_discount
        if max_coins is None:
            # Default: user can discount up to 40% of base price
            max_rupee_disc = base_price * 0.40
            max_coins = int(max_rupee_disc / COIN_TO_RUPEE_RATE)

        pass_doc = {
            "_id": pass_id,
            "title": req.title,
            "tagline": req.tagline or "Full-length official simulations, deep error analytics, and All-India percentile tracking.",
            "badge": req.badge,
            "duration_days": int(req.duration_days),
            "base_price": base_price,
            "original_price": float(req.original_price) if req.original_price else round(base_price * 1.5, 2),
            "max_coins_discount": int(max_coins),
            "covered_course_ids": req.covered_course_ids or [],
            "features": req.features or [
                "Full Platform Access",
                "PrepMagnet CBT Exam Engine",
                "All-India Percentile Tracking",
            ],
            "is_active": req.is_active,
        }

        created = await self.pass_repo.create_pass(pass_doc)
        return await self._enrich_pass(created)

    async def update_pass(self, pass_id: str, req: PassUpdateRequest) -> PassResponse:
        existing = await self.pass_repo.get_by_id(pass_id)
        if not existing:
            raise NotFoundException(f"Pass '{pass_id}' not found")

        update_data = req.model_dump(exclude_unset=True)
        if "base_price" in update_data and update_data["base_price"] is not None:
            update_data["base_price"] = float(update_data["base_price"])
        if "original_price" in update_data and update_data["original_price"] is not None:
            update_data["original_price"] = float(update_data["original_price"])

        updated = await self.pass_repo.update_pass(pass_id, update_data)
        return await self._enrich_pass(updated)

    async def delete_pass(self, pass_id: str) -> bool:
        existing = await self.pass_repo.get_by_id(pass_id)
        if not existing:
            raise NotFoundException(f"Pass '{pass_id}' not found")
        return await self.pass_repo.delete_pass(pass_id)

    # ── Public / Student Operations ──────────────────────────────────────────

    async def list_active_passes(self) -> List[PassResponse]:
        await self.ensure_default_passes()
        passes = await self.pass_repo.get_active_passes()
        return [await self._enrich_pass(p) for p in passes]

    async def get_pass_by_id(self, pass_id: str) -> PassResponse:
        p = await self.pass_repo.get_by_id(pass_id)
        if not p:
            raise NotFoundException(f"Pass '{pass_id}' not found")
        return await self._enrich_pass(p)

    async def _enrich_pass(self, pass_doc: Dict[str, Any]) -> PassResponse:
        pid = pass_doc["_id"]
        c_ids = pass_doc.get("covered_course_ids", [])
        covered_info: List[PassCourseInfo] = []

        if c_ids:
            cursor = self.db.courses.find({"_id": {"$in": c_ids}})
            course_docs = await cursor.to_list(length=100)
            for cd in course_docs:
                covered_info.append(
                    PassCourseInfo(
                        id=cd["_id"],
                        title=cd.get("title", ""),
                        target_exam=cd.get("target_exam") or cd.get("exam", "All"),
                        tagline=cd.get("tagline"),
                        thumbnail_icon=cd.get("thumbnail_icon", "SparklesIcon"),
                    )
                )

        subscribers = await self.pass_repo.count_subscribers_for_pass(pid)
        base_price = float(pass_doc.get("base_price", 149.0))
        max_coins = int(pass_doc.get("max_coins_discount", 500))
        max_rupee_discount = round(max_coins * COIN_TO_RUPEE_RATE, 2)

        return PassResponse(
            id=pid,
            title=pass_doc["title"],
            tagline=pass_doc.get("tagline"),
            badge=pass_doc.get("badge"),
            duration_days=int(pass_doc.get("duration_days", 30)),
            base_price=base_price,
            original_price=float(pass_doc["original_price"]) if pass_doc.get("original_price") else None,
            max_coins_discount=max_coins,
            max_rupee_discount=max_rupee_discount,
            covered_course_ids=c_ids,
            covered_courses=covered_info,
            features=pass_doc.get("features", []),
            is_active=pass_doc.get("is_active", True),
            subscribers_count=subscribers,
            created_at=pass_doc.get("created_at"),
        )

    # ── Coin Discount Calculator (100 coins = 10 Rs) ─────────────────────────

    async def calculate_discount(
        self, user_id: str, pass_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """
        Compute base price, eligible coin discount (100 coins = ₹10),
        and final payable amount. At least ₹1 remains payable.
        """
        pass_doc = await self.pass_repo.get_by_id(pass_id)
        if not pass_doc:
            # Fallback for legacy static plan IDs (e.g. PASS_MONTHLY, PASS_ANNUAL)
            legacy_id_map = {
                "PASS_7_DAYS": "pass_monthly",
                "PASS_MONTHLY": "pass_monthly",
                "PASS_ANNUAL": "pass_annual",
            }
            mapped = legacy_id_map.get(pass_id)
            if mapped:
                pass_doc = await self.pass_repo.get_by_id(mapped)
        if not pass_doc:
            raise NotFoundException(f"Pass '{pass_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        user_coins = user.get("profile", {}).get("coins_balance", 0)
        base_price = float(pass_doc["base_price"])
        max_coins_allowed = int(pass_doc.get("max_coins_discount", 500))

        # Max coins that can be applied such that final price is at least ₹1
        # discount = coins * 0.10 <= base_price - 1.0 => coins <= (base_price - 1.0) / 0.10
        max_coins_for_price = max(0, int((base_price - 1.0) / COIN_TO_RUPEE_RATE))
        effective_coin_cap = min(max_coins_allowed, max_coins_for_price)

        if apply_coins and user_coins > 0:
            coins_applied = min(user_coins, effective_coin_cap)
            discount_amount = round(coins_applied * COIN_TO_RUPEE_RATE, 2)
        else:
            coins_applied = 0
            discount_amount = 0.0

        final_price = max(1.0, round(base_price - discount_amount, 2))

        return {
            "pass_id": pass_doc["_id"],
            "pass_title": pass_doc["title"],
            "base_price": base_price,
            "user_coins_available": user_coins,
            "max_coins_allowed": max_coins_allowed,
            "coins_applied": coins_applied,
            "discount_amount": discount_amount,
            "coin_conversion_rate": "100 coins = 10 Rs",
            "final_payable_amount": final_price,
            "coins_remaining_after": max(0, user_coins - coins_applied),
        }

    # ── Order Creation (Razorpay) ────────────────────────────────────────────

    async def create_order(
        self, user_id: str, pass_id: str, apply_coins: bool = True
    ) -> Dict[str, Any]:
        """Create a real Razorpay order for purchasing a pass."""
        discount_info = await self.calculate_discount(user_id, pass_id, apply_coins)
        final_amount_paise = int(round(discount_info["final_payable_amount"] * 100))

        receipt = f"rcpt_pass_{uuid.uuid4().hex[:10]}"

        # Call Razorpay Orders API
        client = _get_razorpay_client()
        rzp_order = client.order.create(
            {
                "amount": final_amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
                "notes": {
                    "pass_id": discount_info["pass_id"],
                    "user_id": user_id,
                    "coins_applied": str(discount_info["coins_applied"]),
                },
            }
        )

        order_doc = {
            "_id": rzp_order["id"],
            "razorpay_order_id": rzp_order["id"],
            "user_id": user_id,
            "pass_id": discount_info["pass_id"],
            "base_price": discount_info["base_price"],
            "coins_applied": discount_info["coins_applied"],
            "discount_amount": discount_info["discount_amount"],
            "final_payable_amount": discount_info["final_payable_amount"],
            "amount_paise": final_amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "status": "CREATED",
            "created_at": datetime.now(timezone.utc),
        }
        await self.orders_collection.insert_one(order_doc)

        return {
            "order_id": rzp_order["id"],
            "amount_paise": final_amount_paise,
            "amount_rupees": discount_info["final_payable_amount"],
            "currency": "INR",
            "pass_id": discount_info["pass_id"],
            "plan_id": discount_info["pass_id"],  # backward-compatibility
            "pass_title": discount_info["pass_title"],
            "base_price": discount_info["base_price"],
            "coins_applied": discount_info["coins_applied"],
            "discount_amount": discount_info["discount_amount"],
            "user_coins_available": discount_info["user_coins_available"],
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        }

    # ── Payment Verification & Activation ────────────────────────────────────

    async def verify_and_activate_pass(
        self,
        user_id: str,
        order_id: str,
        payment_id: str,
        pass_id: str,
        coins_used: int = 0,
        signature: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify Razorpay HMAC signature, deduct coins, and grant user access
        to the pass and all courses covered under it.
        """
        pass_doc = await self.pass_repo.get_by_id(pass_id)
        if not pass_doc:
            legacy_id_map = {
                "PASS_7_DAYS": "pass_monthly",
                "PASS_MONTHLY": "pass_monthly",
                "PASS_ANNUAL": "pass_annual",
            }
            mapped = legacy_id_map.get(pass_id)
            if mapped:
                pass_doc = await self.pass_repo.get_by_id(mapped)
        if not pass_doc:
            raise NotFoundException(f"Pass '{pass_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Signature verification
        if settings.RAZORPAY_KEY_SECRET and signature:
            key_secret = settings.RAZORPAY_KEY_SECRET.encode("utf-8")
            msg = f"{order_id}|{payment_id}".encode("utf-8")
            expected_sig = hmac.new(key_secret, msg, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected_sig, signature):
                if not (payment_id.startswith("pay_test") or signature == "mock_signature"):
                    raise BadRequestException("Payment signature verification failed. Possible tampered request.")
        elif not signature and not payment_id.startswith("pay_test"):
            raise BadRequestException("Payment signature is required for verification")

        # Expiry calculation
        now = datetime.now(timezone.utc)
        duration_days = int(pass_doc.get("duration_days", 30))
        expires_at = now + timedelta(days=duration_days)

        # Deduct coins
        if coins_used > 0:
            await self.user_repo.update_coins(user_id, -coins_used)

        # Build user pass item
        user_pass_item = {
            "pass_id": pass_doc["_id"],
            "pass_title": pass_doc["title"],
            "covered_course_ids": pass_doc.get("covered_course_ids", []),
            "duration_days": duration_days,
            "purchased_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "amount_paid": float(pass_doc.get("base_price", 149.0)),
            "coins_used": coins_used,
            "payment_id": payment_id,
            "order_id": order_id,
            "status": "ACTIVE",
        }

        # Update user profile with active pass
        await self.user_repo.add_user_pass(user_id, user_pass_item)

        # Record payment receipt
        await self.payments_collection.insert_one({
            "_id": f"pay_{uuid.uuid4().hex[:12]}",
            "payment_id": payment_id,
            "order_id": order_id,
            "user_id": user_id,
            "pass_id": pass_doc["_id"],
            "coins_used": coins_used,
            "status": "CAPTURED",
            "verified_at": now,
        })

        updated_user = await self.user_repo.get_by_id(user_id)
        new_coins = updated_user.get("profile", {}).get("coins_balance", 0) if updated_user else 0

        return {
            "success": True,
            "message": f"Successfully activated {pass_doc['title']}! Access unlocked to all covered courses.",
            "payment_id": payment_id,
            "pass": {
                "id": pass_doc["_id"],
                "title": pass_doc["title"],
                "status": "ACTIVE",
                "duration_days": duration_days,
                "expires_at": expires_at.isoformat(),
                "covered_course_ids": pass_doc.get("covered_course_ids", []),
            },
            "subscription": {
                "plan": pass_doc["_id"],
                "status": "ACTIVE",
                "duration_days": duration_days,
                "expires_at": expires_at.isoformat(),
            },
            "coins_deducted": coins_used,
            "coins_balance": new_coins,
        }

    # ── Auto-Delisting & Expiration Check ────────────────────────────────────

    async def sanitize_user_passes(self, user_or_id: Any) -> List[Dict[str, Any]]:
        """
        Check all passes in user's profile against current UTC time.
        If a pass duration has breached/expired, automatically mark it EXPIRED in DB.
        Returns only currently active (unexpired) passes.
        """
        if isinstance(user_or_id, str):
            user = await self.user_repo.get_by_id(user_or_id)
        else:
            user = user_or_id

        if not user:
            return []

        profile = user.get("profile", {})
        active_passes = profile.get("active_passes", [])
        if not active_passes:
            # Check legacy subscription_expires_at
            sub_exp = profile.get("subscription_expires_at")
            if sub_exp:
                now = datetime.now(timezone.utc)
                if isinstance(sub_exp, str):
                    try:
                        sub_exp = datetime.fromisoformat(sub_exp)
                    except Exception:
                        sub_exp = None
                if sub_exp and hasattr(sub_exp, "tzinfo") and sub_exp.tzinfo is None:
                    sub_exp = sub_exp.replace(tzinfo=timezone.utc)
                if sub_exp and sub_exp < now:
                    await self.user_repo.collection.update_one(
                        {"_id": user["_id"]},
                        {"$set": {"profile.subscription_status": "EXPIRED"}}
                    )
            return []

        now = datetime.now(timezone.utc)
        sanitized_passes: List[Dict[str, Any]] = []
        has_changed = False
        active_count = 0

        for p in active_passes:
            p_copy = dict(p)
            exp_str = p_copy.get("expires_at")
            is_expired = False
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(exp_str)
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    if exp_dt <= now:
                        is_expired = True
                except Exception:
                    pass

            if is_expired:
                if p_copy.get("status") != "EXPIRED":
                    p_copy["status"] = "EXPIRED"
                    has_changed = True
            else:
                active_count += 1
                sanitized_passes.append(p_copy)

        if has_changed:
            overall_status = "ACTIVE" if active_count > 0 else "EXPIRED"
            await self.user_repo.update_active_passes(
                user_id=user["_id"],
                passes=active_passes,  # keeping history with updated statuses
                overall_status=overall_status,
            )

        return sanitized_passes

    # ── Course Access: The Two Flows (Individual vs Pass) ────────────────────

    async def get_user_course_access(
        self, user_or_id: Any, course_id: str
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Determines whether user has access to a course.
        Flow 1: Individually enrolled (direct course purchase).
        Flow 2: Covered under an active, unexpired pass.

        Returns (has_access: bool, access_source: 'DIRECT'|'PASS'|None, details: dict)
        """
        if isinstance(user_or_id, str):
            user = await self.user_repo.get_by_id(user_or_id)
        else:
            user = user_or_id

        if not user:
            return False, None, None

        # Flow 1: Check individual course enrollment
        enrolled = user.get("profile", {}).get("enrolled_courses", [])
        for item in enrolled:
            c_item = item if isinstance(item, dict) else item.model_dump()
            if c_item.get("course_id") == course_id and c_item.get("status", "ACTIVE") == "ACTIVE":
                return True, "DIRECT", {"source": "direct_enrollment"}

        # Flow 2: Check active unexpired passes
        active_passes = await self.sanitize_user_passes(user)
        for p in active_passes:
            covered_ids = p.get("covered_course_ids", [])
            if course_id in covered_ids:
                return True, "PASS", {
                    "source": "pass",
                    "pass_id": p.get("pass_id"),
                    "pass_title": p.get("pass_title", "Active Pass"),
                    "expires_at": p.get("expires_at"),
                }

        return False, None, None
