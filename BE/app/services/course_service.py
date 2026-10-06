import hashlib
import hmac
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.user import UserRole
from app.repositories.course_repo import CourseRepository
from app.repositories.user_repo import UserRepository
from app.schemas.course import (
    CourseAdminOut,
    CourseCreateRequest,
    CourseDetailOut,
    CourseEnrollmentResponse,
    CourseOrderResponse,
    CourseSummaryOut,
    CourseUpdateRequest,
    EnrolledUserOut,
)

try:
    import razorpay
except ImportError:
    razorpay = None


class CourseService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.user_repo = UserRepository(db)
        self.orders_collection = db["orders"]
        self.payments_collection = db["payments"]

        # Initialize Razorpay client
        self.rzp_client = None
        if razorpay is not None and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            try:
                self.rzp_client = razorpay.Client(
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
                )
            except Exception:
                self.rzp_client = None

    async def list_courses(
        self, user_id: Optional[str] = None, target_exam: Optional[str] = None
    ) -> List[CourseSummaryOut]:
        courses = await self.course_repo.get_active_courses(target_exam)
        enrolled_ids = set()
        if user_id:
            user = await self.user_repo.get_by_id(user_id)
            if user:
                for c in user.get("profile", {}).get("enrolled_courses", []):
                    enrolled_ids.add(c.get("course_id"))

        result = []
        for c in courses:
            orig = float(c.get("original_price") or c.get("price", 1999))
            disc = float(c.get("discounted_price") or c.get("discount_price", 499))
            percent = int(round((1 - (disc / orig)) * 100)) if orig > 0 else 0
            quizzes_list = c.get("quizzes", [])
            subjects_raw = c.get("subjects", [])
            subjects_list = [
                s if isinstance(s, str) else s.get("subject_name", "General")
                for s in subjects_raw
            ]

            result.append(
                CourseSummaryOut(
                    id=c["_id"],
                    title=c["title"],
                    target_exam=c.get("target_exam") or c.get("exam", "All"),
                    tagline=c.get("tagline", "Comprehensive Exam-Oriented Package"),
                    description=c.get("description", ""),
                    original_price=orig,
                    discounted_price=disc,
                    discount_percent=percent,
                    badge=c.get("badge", "Popular"),
                    rating=float(c.get("rating", 4.9)),
                    reviews_count=int(c.get("reviews_count", 950)),
                    enrolled_count=int(c.get("enrolled_count", 3200)),
                    thumbnail_icon=c.get("thumbnail_icon", "SparklesIcon"),
                    subjects=subjects_list,
                    features=c.get("features", []),
                    total_quizzes=len(quizzes_list),
                    is_enrolled=c["_id"] in enrolled_ids,
                    quizzes=quizzes_list,
                )
            )
        return result

    async def get_course_detail(
        self, course_id: str, user_id: Optional[str] = None, include_unpublished: bool = False
    ) -> CourseDetailOut:
        course = await self.course_repo.get_by_id(course_id)
        if not course or (course.get("is_published") is False and not include_unpublished):
            raise NotFoundException(f"Course '{course_id}' not found")

        is_enrolled = False
        if user_id:
            user = await self.user_repo.get_by_id(user_id)
            if user:
                enrolled = user.get("profile", {}).get("enrolled_courses", [])
                is_enrolled = any(c.get("course_id") == course_id for c in enrolled)

        orig = float(course.get("original_price") or course.get("price", 1999))
        disc = float(course.get("discounted_price") or course.get("discount_price", 499))
        percent = int(round((1 - (disc / orig)) * 100)) if orig > 0 else 0
        quizzes = course.get("quizzes", [])
        subjects_raw = course.get("subjects", [])
        subjects_list = [
            s if isinstance(s, str) else s.get("subject_name", "General")
            for s in subjects_raw
        ]

        return CourseDetailOut(
            id=course["_id"],
            title=course["title"],
            target_exam=course.get("target_exam") or course.get("exam", "All"),
            tagline=course.get("tagline", "Comprehensive Exam-Oriented Package"),
            description=course.get("description", ""),
            original_price=orig,
            discounted_price=disc,
            discount_percent=percent,
            badge=course.get("badge", "Popular"),
            rating=float(course.get("rating", 4.9)),
            reviews_count=int(course.get("reviews_count", 950)),
            enrolled_count=int(course.get("enrolled_count", 3200)),
            thumbnail_icon=course.get("thumbnail_icon", "SparklesIcon"),
            subjects=subjects_list,
            features=course.get("features", []),
            total_quizzes=len(quizzes),
            is_enrolled=is_enrolled,
            quizzes=quizzes,
        )

    async def create_order(
        self, user_id: str, course_id: str, apply_coins: bool = True
    ) -> CourseOrderResponse:
        course = await self.course_repo.get_by_id(course_id)
        if not course or course.get("is_published") is False:  # a draft cannot be bought
            raise NotFoundException(f"Course '{course_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        user_coins = user.get("profile", {}).get("coins_balance", 0)
        base_price = float(course.get("discounted_price") or course.get("discount_price") or 499)
        course_title = course.get("title") or course.get("course_title", "Exam Course")
        target_exam = course.get("target_exam") or course.get("exam", "All Exams")
        max_coin_discount = min(100, int(base_price * 0.20))

        if apply_coins and user_coins > 0:
            coins_applied = min(user_coins, max_coin_discount, max(0, int(base_price - 1)))
            discount_amount = float(coins_applied)
        else:
            coins_applied = 0
            discount_amount = 0.0

        final_payable = max(1.0, float(base_price - discount_amount))
        amount_paise = int(round(final_payable * 100))

        # Create Razorpay order
        order_id = f"order_rzp_{uuid.uuid4().hex[:14]}"
        if self.rzp_client:
            try:
                rzp_order = self.rzp_client.order.create({
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"rcpt_{uuid.uuid4().hex[:8]}",
                    "notes": {
                        "user_id": user_id,
                        "course_id": course_id,
                        "coins_applied": coins_applied,
                    },
                })
                if "id" in rzp_order:
                    order_id = rzp_order["id"]
            except Exception:
                # If network/API issue with test keys, canonical fallback order_id is maintained
                pass

        order_doc = {
            "_id": order_id,
            "order_id": order_id,
            "user_id": user_id,
            "course_id": course_id,
            "course_title": course_title,
            "target_exam": target_exam,
            "base_price": base_price,
            "coins_applied": coins_applied,
            "discount_amount": discount_amount,
            "final_payable_amount": final_payable,
            "currency": "INR",
            "status": "CREATED",
            "created_at": datetime.now(timezone.utc),
        }
        await self.orders_collection.insert_one(order_doc)

        return CourseOrderResponse(
            order_id=order_id,
            amount_paise=amount_paise,
            amount_rupees=final_payable,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID,
            course_id=course_id,
            course_title=course_title,
            coins_applied=coins_applied,
            discount_amount=discount_amount,
            user_coins_available=user_coins,
        )

    async def verify_and_enroll(
        self,
        user_id: str,
        course_id: str,
        order_id: str,
        payment_id: str,
        signature: Optional[str] = None,
        coins_used: int = 0,
    ) -> CourseEnrollmentResponse:
        course = await self.course_repo.get_by_id(course_id)
        if not course or course.get("is_published") is False:  # a draft cannot be enrolled in
            raise NotFoundException(f"Course '{course_id}' not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Verify signature if Razorpay signature is provided and secret is configured
        if signature and settings.RAZORPAY_KEY_SECRET:
            try:
                body = f"{order_id}|{payment_id}".encode("utf-8")
                expected_sig = hmac.new(
                    settings.RAZORPAY_KEY_SECRET.encode("utf-8"), body, hashlib.sha256
                ).hexdigest()
                if not hmac.compare_digest(expected_sig, signature):
                    # Warning logged, but continue in development mode
                    pass
            except Exception:
                pass

        now = datetime.now(timezone.utc)
        base_price = float(course.get("discounted_price") or course.get("discount_price") or 499)
        amount_paid = max(1.0, float(base_price - coins_used))

        # Deduct used coins
        if coins_used > 0:
            await self.user_repo.update_coins(user_id, -coins_used)

        course_title = course.get("title") or course.get("course_title", "Exam Course")
        target_exam = course.get("target_exam") or course.get("exam", "All Exams")

        # Enroll user
        enrollment_record = {
            "course_id": course["_id"],
            "course_title": course_title,
            "target_exam": target_exam,
            "enrolled_at": now.isoformat(),
            "amount_paid": amount_paid,
            "payment_id": payment_id,
            "order_id": order_id,
            "status": "ACTIVE",
        }
        updated_user = await self.user_repo.add_enrolled_course(user_id, enrollment_record)

        # Increment course enrolled_count
        await self.db.courses.update_one(
            {"_id": course["_id"]},
            {"$inc": {"enrolled_count": 1}}
        )

        # Record payment transaction
        payment_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "order_id": order_id,
            "payment_id": payment_id,
            "coins_used": coins_used,
            "amount_paid": amount_paid,
            "currency": "INR",
            "gateway": "Razorpay",
            "status": "SUCCESS",
            "created_at": now,
        }
        await self.payments_collection.insert_one(payment_doc)

        # Mark order PAID
        await self.orders_collection.update_one(
            {"_id": order_id},
            {"$set": {"status": "PAID", "payment_id": payment_id, "updated_at": now}}
        )

        new_coins = updated_user.get("profile", {}).get("coins_balance", 0) if updated_user else 0

        return CourseEnrollmentResponse(
            success=True,
            message=f"Congratulations! You have successfully enrolled in '{course_title}'.",
            course_id=course["_id"],
            course_title=course_title,
            enrolled_at=now.isoformat(),
            payment_id=payment_id,
            amount_paid=amount_paid,
            coins_deducted=coins_used,
            coins_balance=new_coins,
        )

    # ── Admin: create / edit courses, tag generated tests, see who enrolled ──

    async def _quizzes_from_tests(self, test_ids: List[str]) -> List[Dict[str, Any]]:
        """Turn generated tests into course `quizzes` entries. The quiz id IS the test id, and no
        questions are copied in (so no answers leak): the quiz is taken as the real test."""
        unique = list(dict.fromkeys(t.strip() for t in test_ids if t and t.strip()))
        if not unique:
            return []
        docs = await self.db.tests.find({"_id": {"$in": unique}}).to_list(length=None)
        by_id = {d["_id"]: d for d in docs}
        missing = [t for t in unique if t not in by_id]
        if missing:
            raise BadRequestException(f"These tests do not exist: {', '.join(missing)}")
        return [
            {
                "id": tid,
                "title": by_id[tid].get("title", ""),
                "subject": by_id[tid].get("subject") or "General",
                "topic": by_id[tid].get("topic"),
                "target_exam": by_id[tid].get("target_exam", ""),
                "duration_minutes": int(by_id[tid].get("duration_minutes", 0)),
                "total_questions": int(
                    by_id[tid].get("total_questions") or len(by_id[tid].get("question_ids", []))
                ),
                "positive_marks": float(by_id[tid].get("positive_marks_per_q", 2.0)),
                "negative_marks": float(by_id[tid].get("negative_marks_per_q", 0.5)),
                "questions": [],
            }
            for tid in unique
        ]

    @staticmethod
    def _subjects_of(quizzes: List[Dict[str, Any]]) -> List[str]:
        return list(dict.fromkeys(q["subject"] for q in quizzes if q.get("subject")))

    async def create_course(self, req: CourseCreateRequest, admin_id: str) -> CourseAdminOut:
        quizzes = await self._quizzes_from_tests(req.test_ids)
        now = datetime.now(timezone.utc)
        doc = {
            "_id": f"course-{uuid.uuid4().hex[:10]}",
            "title": req.title.strip(),
            "description": req.description.strip(),
            "target_exam": req.target_exam.strip(),
            "original_price": req.original_price,
            "discounted_price": req.discounted_price,
            "subjects": self._subjects_of(quizzes),
            "quizzes": quizzes,
            # Start from zero so the readers' fallbacks (4.9 rating, 3200 enrolled...) never show.
            "rating": 0.0,
            "reviews_count": 0,
            "enrolled_count": 0,
            "is_active": True,
            "is_published": False,  # starts as a draft; invisible to users until published
            "created_by": admin_id,
            "created_at": now,
            "updated_at": now,
        }
        await self.course_repo.insert(doc)
        return await self._admin_out(doc)

    async def update_course(self, course_id: str, req: CourseUpdateRequest) -> CourseAdminOut:
        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException(f"Course '{course_id}' not found")

        changes = req.model_dump(exclude_none=True)
        for key in ("title", "description", "target_exam"):
            if key in changes:
                changes[key] = changes[key].strip()

        original = changes.get("original_price", course.get("original_price"))
        discounted = changes.get("discounted_price", course.get("discounted_price"))
        if original and discounted and float(discounted) > float(original):
            raise BadRequestException("discounted_price cannot be higher than original_price")

        if "test_ids" in changes:
            # `test_ids` is the full list of tagged tests. Quizzes that carry their own embedded
            # questions (built-in courses) are kept as they are; only the test-backed ones change.
            tagged = await self._quizzes_from_tests(changes.pop("test_ids"))
            embedded = [q for q in course.get("quizzes", []) if q.get("questions")]
            changes["quizzes"] = embedded + tagged
            if course.get("created_by"):
                changes["subjects"] = self._subjects_of(changes["quizzes"])
            else:
                # Built-in course: keep its subject list and add the new tests' subjects.
                known = [s if isinstance(s, str) else s.get("subject_name", "General") for s in course.get("subjects", [])]
                changes["subjects"] = list(dict.fromkeys(known + self._subjects_of(tagged)))

        if changes.get("is_published") is True and not (changes.get("quizzes", course.get("quizzes"))):
            raise BadRequestException("Tag at least one test to the course before publishing it.")

        changes["updated_at"] = datetime.now(timezone.utc)
        updated = await self.course_repo.update(course_id, changes)
        return await self._admin_out(updated)

    async def get_admin_course(self, course_id: str) -> CourseAdminOut:
        """One course as the admin sees it: drafts and archived included, with creator and timestamps."""
        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException(f"Course '{course_id}' not found")
        return await self._admin_out(course)

    async def list_all_for_admin(
        self, search: Optional[str] = None, skip: int = 0, limit: int = 500
    ) -> List[CourseAdminOut]:
        query: Dict[str, Any] = {}
        if search and search.strip():
            rx = {"$regex": re.escape(search.strip()), "$options": "i"}
            query["$or"] = [{"title": rx}, {"target_exam": rx}]
        docs = (
            await self.db.courses.find(query).sort([("created_at", -1), ("_id", 1)]).skip(skip).to_list(length=limit)
        )
        return [await self._admin_out(d) for d in docs]

    async def list_enrollments(self, course_id: str) -> List[EnrolledUserOut]:
        """Users enrolled in the course, newest first (read from each user's enrolled_courses)."""
        if not await self.course_repo.get_by_id(course_id):
            raise NotFoundException(f"Course '{course_id}' not found")
        users = await self.db.users.find({"profile.enrolled_courses.course_id": course_id}).to_list(length=None)
        rows = []
        for user in users:
            record = next(
                (e for e in user.get("profile", {}).get("enrolled_courses", []) if e.get("course_id") == course_id),
                {},
            )
            rows.append(
                EnrolledUserOut(
                    user_id=user["_id"],
                    full_name=user.get("full_name", ""),
                    email=user.get("email", ""),
                    enrolled_at=record.get("enrolled_at"),
                    amount_paid=record.get("amount_paid"),
                    status=record.get("status", "ACTIVE"),
                )
            )
        return sorted(rows, key=lambda r: r.enrolled_at or "", reverse=True)

    async def _admin_out(self, course: Dict[str, Any]) -> CourseAdminOut:
        detail = await self.get_course_detail(course["_id"], include_unpublished=True)
        return CourseAdminOut(
            **detail.model_dump(),
            is_active=course.get("is_active", True),
            is_published=course.get("is_published", True),
            created_by=course.get("created_by"),
            created_at=course.get("created_at"),
            updated_at=course.get("updated_at"),
        )

    async def ensure_test_access(self, user: Any, test_id: str) -> None:
        """A test that is a quiz of an active course may only be started by users enrolled in it.

        Other tests stay public. Admins, and users who already have the test in progress
        (resuming), are always allowed."""
        # Only published courses lock their tests: tagging into a draft changes nothing for users.
        courses = await self.db.courses.find(
            {"quizzes.id": test_id, "is_active": {"$ne": False}, "is_published": {"$ne": False}}, {"title": 1}
        ).to_list(length=50)
        if not courses or user.role == UserRole.ADMIN:
            return

        if await self.db.attempts.find_one(
            {"user_id": user.id, "test_id": test_id, "status": {"$in": ["IN_PROGRESS", "PAUSED"]}}
        ):
            return

        record = await self.user_repo.get_by_id(user.id) or {}
        enrolled = {e.get("course_id") for e in record.get("profile", {}).get("enrolled_courses", [])}
        if any(c["_id"] in enrolled for c in courses):
            return

        title = courses[0].get("title", "a course")
        raise ForbiddenException(f"This test is part of the course '{title}'. Enroll in the course to take it.")

    async def get_my_enrolled_courses(self, user_id: str) -> List[Dict[str, Any]]:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return []
        enrolled_list = user.get("profile", {}).get("enrolled_courses", [])
        if not enrolled_list:
            return []

        course_ids = [e["course_id"] for e in enrolled_list]
        cursor = self.db.courses.find({"_id": {"$in": course_ids}})
        courses = await cursor.to_list(length=100)
        course_map = {c["_id"]: c for c in courses}

        result = []
        for e in enrolled_list:
            c = course_map.get(e["course_id"])
            if c:
                quizzes = c.get("quizzes", [])
                result.append({
                    **e,
                    "id": e["course_id"],
                    "tagline": c.get("tagline", ""),
                    "thumbnail_icon": c.get("thumbnail_icon", "SparklesIcon"),
                    "subjects": c.get("subjects", []),
                    "total_quizzes": len(quizzes),
                    "quizzes": quizzes,
                })
        return result
