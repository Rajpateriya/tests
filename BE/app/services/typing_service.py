import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import NotFoundException
from app.repositories.typing_repo import TypingRepository
from app.repositories.user_repo import UserRepository
from app.schemas.typing import (
    TypingHistoryResponse,
    TypingPassageOut,
    TypingScorecardOut,
    TypingSubmitRequest,
)


class TypingService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.typing_repo = TypingRepository(db)
        self.user_repo = UserRepository(db)

    async def list_passages(self, category: Optional[str] = None) -> List[TypingPassageOut]:
        passages = await self.typing_repo.get_active_passages(category)
        result = []
        for p in passages:
            content = p.get("content", "")
            words = [w for w in content.split() if w]
            result.append(
                TypingPassageOut(
                    id=p["_id"],
                    title=p["title"],
                    exam_category=p.get("exam_category", "SSC CGL DEST"),
                    content=content,
                    duration_seconds=p.get("duration_seconds", 900),
                    target_wpm=float(p.get("target_wpm", 27.0)),
                    target_keystrokes=int(p.get("target_keystrokes", 2000)),
                    difficulty=p.get("difficulty", "Medium"),
                    language=p.get("language", "English"),
                    total_words=len(words),
                    total_characters=len(content),
                )
            )
        return result

    async def get_passage(self, passage_id: str) -> TypingPassageOut:
        passage = await self.typing_repo.get_by_id(passage_id)
        if not passage:
            raise NotFoundException(f"Typing passage '{passage_id}' not found")
        content = passage.get("content", "")
        words = [w for w in content.split() if w]
        return TypingPassageOut(
            id=passage["_id"],
            title=passage["title"],
            exam_category=passage.get("exam_category", "SSC CGL DEST"),
            content=content,
            duration_seconds=passage.get("duration_seconds", 900),
            target_wpm=float(passage.get("target_wpm", 27.0)),
            target_keystrokes=int(passage.get("target_keystrokes", 2000)),
            difficulty=passage.get("difficulty", "Medium"),
            language=passage.get("language", "English"),
            total_words=len(words),
            total_characters=len(content),
        )

    async def evaluate_attempt(
        self, user_id: str, req: TypingSubmitRequest
    ) -> TypingScorecardOut:
        passage = await self.typing_repo.get_by_id(req.passage_id)
        if not passage:
            raise NotFoundException(f"Typing passage '{req.passage_id}' not found")

        target_text = passage.get("content", "").strip()
        typed_text = req.typed_text.strip()
        time_minutes = max(0.1, req.time_taken_seconds / 60.0)

        # Total keystrokes: characters typed
        total_keystrokes = req.total_keystrokes or len(typed_text)

        # Character-by-character comparison
        min_len = min(len(target_text), len(typed_text))
        correct_keystrokes = 0
        wrong_keystrokes = 0

        for i in range(min_len):
            if target_text[i] == typed_text[i]:
                correct_keystrokes += 1
            else:
                wrong_keystrokes += 1

        # Any extra characters typed beyond target length are counted as wrong
        if len(typed_text) > min_len:
            wrong_keystrokes += len(typed_text) - min_len

        # Word-level error calculation (SSC Standard: Word Omission / Substitution)
        target_words = target_text.split()
        typed_words = typed_text.split()

        word_errors = 0
        min_word_len = min(len(target_words), len(typed_words))
        for i in range(min_word_len):
            if target_words[i] != typed_words[i]:
                word_errors += 1
        if len(typed_words) > min_word_len:
            word_errors += len(typed_words) - min_word_len
        elif len(target_words) > min_word_len:
            # Words omitted
            word_errors += len(target_words) - min_word_len

        # Standard Gross & Net WPM:
        # Standard: 1 word = 5 keystrokes
        gross_wpm = round((total_keystrokes / 5.0) / time_minutes, 1)
        # Net WPM penalizes word errors
        penalty = word_errors / time_minutes
        net_wpm = max(0.0, round(gross_wpm - penalty, 1))

        # Accuracy %
        if total_keystrokes > 0:
            accuracy = round((correct_keystrokes / total_keystrokes) * 100.0, 1)
        else:
            accuracy = 0.0

        # Exam Qualification Logic
        exam_cat = passage.get("exam_category", "SSC CGL DEST").upper()
        target_wpm = float(passage.get("target_wpm", 27.0))
        error_percentage = round(100.0 - accuracy, 1)

        is_qualified = False
        reason = ""

        if "CGL" in exam_cat:
            # SSC CGL DEST standard: Net Speed >= 27 WPM and Error <= 5.0%
            if net_wpm >= 27.0 and error_percentage <= 7.0:
                is_qualified = True
                reason = f"QUALIFIED: Net Speed {net_wpm} WPM (req. ≥ 27 WPM) with {error_percentage}% error (limit ≤ 7%)"
            else:
                is_qualified = False
                fail_reasons = []
                if net_wpm < 27.0:
                    fail_reasons.append(f"Net speed {net_wpm} WPM is below required 27 WPM")
                if error_percentage > 7.0:
                    fail_reasons.append(f"Error rate {error_percentage}% exceeds permissible 7% limit")
                reason = f"NOT QUALIFIED: {', and '.join(fail_reasons)}"
        elif "CHSL" in exam_cat:
            # SSC CHSL standard: Net Speed >= 35 WPM in English, Error <= 7.0%
            if net_wpm >= 35.0 and error_percentage <= 7.0:
                is_qualified = True
                reason = f"QUALIFIED: Net Speed {net_wpm} WPM (req. ≥ 35 WPM) with {error_percentage}% error (limit ≤ 7%)"
            else:
                is_qualified = False
                fail_reasons = []
                if net_wpm < 35.0:
                    fail_reasons.append(f"Net speed {net_wpm} WPM is below required 35 WPM")
                if error_percentage > 7.0:
                    fail_reasons.append(f"Error rate {error_percentage}% exceeds permissible 7% limit")
                reason = f"NOT QUALIFIED: {', and '.join(fail_reasons)}"
        elif "RRB" in exam_cat or "RAILWAY" in exam_cat:
            # RRB NTPC standard: 30 WPM English, Error <= 5.0%
            if net_wpm >= 30.0 and error_percentage <= 5.0:
                is_qualified = True
                reason = f"QUALIFIED: Net Speed {net_wpm} WPM (req. ≥ 30 WPM) with {error_percentage}% error (limit ≤ 5%)"
            else:
                is_qualified = False
                fail_reasons = []
                if net_wpm < 30.0:
                    fail_reasons.append(f"Net speed {net_wpm} WPM is below required 30 WPM")
                if error_percentage > 5.0:
                    fail_reasons.append(f"Error rate {error_percentage}% exceeds permissible 5% limit")
                reason = f"NOT QUALIFIED: {', and '.join(fail_reasons)}"
        else:
            if net_wpm >= target_wpm and accuracy >= 90.0:
                is_qualified = True
                reason = f"QUALIFIED: Met speed target {net_wpm} WPM with high accuracy {accuracy}%"
            else:
                is_qualified = False
                reason = f"NOT QUALIFIED: Net Speed {net_wpm} WPM or Accuracy {accuracy}% below benchmark"

        attempt_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        attempt_doc = {
            "_id": attempt_id,
            "user_id": user_id,
            "passage_id": passage["_id"],
            "passage_title": passage["title"],
            "exam_category": passage.get("exam_category", "SSC CGL DEST"),
            "time_taken_seconds": round(req.time_taken_seconds, 1),
            "gross_wpm": gross_wpm,
            "net_wpm": net_wpm,
            "accuracy_percentage": accuracy,
            "total_keystrokes": total_keystrokes,
            "correct_keystrokes": correct_keystrokes,
            "wrong_keystrokes": wrong_keystrokes,
            "backspace_count": req.backspace_count,
            "error_count": word_errors,
            "is_qualified": is_qualified,
            "qualification_reason": reason,
            "typed_text": typed_text,
            "created_at": now,
        }
        await self.typing_repo.save_attempt(attempt_doc)

        # Update user's typing_stats in profile
        user = await self.user_repo.get_by_id(user_id)
        if user:
            current_stats = user.get("profile", {}).get("typing_stats", {})
            best_wpm = max(current_stats.get("highest_wpm", 0.0), net_wpm)
            best_acc = max(current_stats.get("highest_accuracy", 0.0), accuracy)
            tests_count = current_stats.get("tests_taken", 0) + 1

            await self.db.users.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "profile.typing_stats.highest_wpm": best_wpm,
                        "profile.typing_stats.highest_accuracy": best_acc,
                        "profile.typing_stats.tests_taken": tests_count,
                        "profile.typing_stats.last_test_date": now.strftime("%Y-%m-%d"),
                        "profile.typing_stats.last_wpm": net_wpm,
                    }
                }
            )

        return TypingScorecardOut(
            id=attempt_id,
            passage_id=passage["_id"],
            passage_title=passage["title"],
            exam_category=passage.get("exam_category", "SSC CGL DEST"),
            time_taken_seconds=round(req.time_taken_seconds, 1),
            gross_wpm=gross_wpm,
            net_wpm=net_wpm,
            accuracy_percentage=accuracy,
            total_keystrokes=total_keystrokes,
            correct_keystrokes=correct_keystrokes,
            wrong_keystrokes=wrong_keystrokes,
            backspace_count=req.backspace_count,
            error_count=word_errors,
            is_qualified=is_qualified,
            qualification_reason=reason,
            created_at=now,
        )

    async def get_user_history(self, user_id: str) -> TypingHistoryResponse:
        attempts_raw = await self.typing_repo.get_user_attempts(user_id, limit=20)
        attempts = []
        for a in attempts_raw:
            attempts.append(
                TypingScorecardOut(
                    id=a["_id"],
                    passage_id=a["passage_id"],
                    passage_title=a["passage_title"],
                    exam_category=a.get("exam_category", "SSC CGL DEST"),
                    time_taken_seconds=a["time_taken_seconds"],
                    gross_wpm=a["gross_wpm"],
                    net_wpm=a["net_wpm"],
                    accuracy_percentage=a["accuracy_percentage"],
                    total_keystrokes=a["total_keystrokes"],
                    correct_keystrokes=a["correct_keystrokes"],
                    wrong_keystrokes=a["wrong_keystrokes"],
                    backspace_count=a.get("backspace_count", 0),
                    error_count=a.get("error_count", 0),
                    is_qualified=a.get("is_qualified", False),
                    qualification_reason=a.get("qualification_reason", ""),
                    created_at=a["created_at"],
                )
            )

        total_tests = len(attempts)
        if total_tests > 0:
            best_wpm = max(a.net_wpm for a in attempts)
            avg_wpm = round(sum(a.net_wpm for a in attempts) / total_tests, 1)
            best_acc = max(a.accuracy_percentage for a in attempts)
            qual_count = sum(1 for a in attempts if a.is_qualified)
            qual_rate = round((qual_count / total_tests) * 100.0, 1)
        else:
            best_wpm = 0.0
            avg_wpm = 0.0
            best_acc = 0.0
            qual_rate = 0.0

        return TypingHistoryResponse(
            attempts=attempts,
            total_tests=total_tests,
            best_wpm=best_wpm,
            average_wpm=avg_wpm,
            best_accuracy=best_acc,
            qualification_rate=qual_rate,
        )
