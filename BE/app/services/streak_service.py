from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.user_repo import UserRepository
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.question_repo import QuestionRepository


class StreakService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.user_repo = UserRepository(db)
        self.attempt_repo = AttemptRepository(db)
        self.question_repo = QuestionRepository(db)

    async def get_daily_booster_questions(
        self,
        count: int = 3,
        difficulty: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Auto-pick daily quiz questions from DB randomly.
        By default, picks 1 Easy, 1 Medium, and 1 Hard question so candidates
        experience progressive difficulty one by one.
        """
        questions = []
        if difficulty:
            qs = await self.question_repo.sample_questions(count=count, difficulty=difficulty)
            questions.extend(qs)
        elif count == 1:
            # Pick exactly 1 random daily question from the DB
            qs = await self.question_repo.sample_questions(count=1)
            questions.extend(qs)
        else:
            # Multi-tier challenge
            easy_qs = await self.question_repo.sample_questions(count=1, difficulty="Easy")
            med_qs = await self.question_repo.sample_questions(count=1, difficulty="Medium")
            hard_qs = await self.question_repo.sample_questions(count=1, difficulty="Hard")

            questions.extend(easy_qs)
            questions.extend(med_qs)
            questions.extend(hard_qs)

            # If any difficulty category had 0 questions, fill up with any available questions
            if len(questions) < count:
                needed = count - len(questions)
                existing_ids = {str(q.get("_id")) for q in questions}
                fallback_qs = await self.question_repo.sample_questions(count=needed + 3)
                for q in fallback_qs:
                    qid = str(q.get("_id"))
                    if qid not in existing_ids and len(questions) < count:
                        questions.append(q)
                        existing_ids.add(qid)

        # Cap to requested count
        questions = questions[:count]

        # Sanitize and format for client (hide correct_option and explanation to prevent inspect-element cheating)
        formatted = []
        for idx, q in enumerate(questions):
            formatted.append({
                "id": str(q.get("_id")),
                "subject": q.get("subject", "General Aptitude"),
                "topic": q.get("topic", "Practice"),
                "difficulty": q.get("difficulty", "Medium"),
                "question_text": q.get("question_text", ""),
                "options": q.get("options", []),
                "step_number": idx + 1,
            })
        return formatted

    async def verify_quiz_question_answer(
        self,
        question_id: str,
        selected_option: str,
    ) -> Dict[str, Any]:
        """
        Verify candidate's selected option against DB record and return
        the correctness status and full TCS iON style explanation.
        """
        question = await self.question_repo.get_by_id(question_id)
        if not question:
            raise ValueError(f"Question '{question_id}' not found in database.")

        correct_opt = str(question.get("correct_option", "")).strip().upper()
        selected_opt = str(selected_option).strip().upper()
        is_correct = (selected_opt == correct_opt)

        return {
            "question_id": question_id,
            "is_correct": is_correct,
            "selected_option": selected_opt,
            "correct_option": correct_opt,
            "solution_explanation": question.get(
                "solution_explanation",
                "Explanation verified according to standard examination syllabus."
            ),
            "difficulty": question.get("difficulty", "Medium"),
            "subject": question.get("subject", "General Aptitude"),
            "topic": question.get("topic", "General"),
        }

    async def get_streak_data(self, user_id: str) -> Dict[str, Any]:
        """Aggregate streak, coin balance, 7-day milestone tracker, and study consistency."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            profile = {
                "coins_balance": 150,
                "current_streak": 6,
                "longest_streak": 14,
                "last_quiz_date": None,
                "streak_history": [],
            }
        else:
            profile = user.get("profile", {})

        coins = profile.get("coins_balance", 150)
        current_streak = profile.get("current_streak", 0)
        longest_streak = profile.get("longest_streak", current_streak)
        last_quiz_date = profile.get("last_quiz_date")
        streak_history = set(profile.get("streak_history", []))

        today_utc = datetime.now(timezone.utc)
        today_str = today_utc.strftime("%Y-%m-%d")
        yesterday_str = (today_utc - timedelta(days=1)).strftime("%Y-%m-%d")

        today_completed = (last_quiz_date == today_str)

        # Check if streak is broken (last activity before yesterday)
        if last_quiz_date and last_quiz_date != today_str and last_quiz_date != yesterday_str:
            effective_streak = 0
        else:
            effective_streak = current_streak

        # 30-Day Monthly Discipline Roadmap Configuration
        MILESTONE_CONFIG = {
            7: {"bonus": 100, "total": 120, "label": "Week 1 Habit", "badge": "BRONZE"},
            14: {"bonus": 150, "total": 170, "label": "Fortnight Anchor", "badge": "SILVER"},
            21: {"bonus": 200, "total": 220, "label": "Discipline Master", "badge": "GOLD"},
            28: {"bonus": 300, "total": 320, "label": "Focus Champion", "badge": "DIAMOND"},
            30: {"bonus": 500, "total": 520, "label": "Grand Monthly Master", "badge": "PLATINUM"},
        }

        # 30-day milestone cycle
        days_in_30_cycle = effective_streak % 30
        if days_in_30_cycle == 0 and effective_streak > 0 and today_completed:
            days_in_30_cycle = 30

        # Calculate next upcoming milestone
        next_milestone_day = 30
        next_milestone_bonus = 500
        for m_day in [7, 14, 21, 28, 30]:
            if m_day > days_in_30_cycle:
                next_milestone_day = m_day
                next_milestone_bonus = MILESTONE_CONFIG[m_day]["bonus"]
                break
        days_until_bonus = max(0, next_milestone_day - days_in_30_cycle)

        # Build 30-day timeline tracker (Day 1 to Day 30)
        timeline: List[Dict[str, Any]] = []
        for i in range(1, 31):
            is_done = i <= days_in_30_cycle
            is_today = (i == days_in_30_cycle + 1) and not today_completed
            is_milestone = i in MILESTONE_CONFIG
            cfg = MILESTONE_CONFIG.get(i)
            reward = cfg["total"] if is_milestone else 20
            timeline.append({
                "day_number": i,
                "label": f"Day {i}",
                "completed": is_done,
                "is_current": is_today,
                "coins_reward": reward,
                "is_milestone": is_milestone,
                "milestone_title": cfg["label"] if cfg else None,
                "milestone_badge": cfg["badge"] if cfg else None,
            })

        # Fetch actual user attempts to count recent activity
        attempts = await self.attempt_repo.get_user_attempts(user_id, limit=100)
        total_active_days = len(streak_history) + len(attempts)

        return {
            "coins_balance": coins,
            "current_streak": effective_streak,
            "longest_streak": max(longest_streak, effective_streak),
            "today_completed": today_completed,
            "last_quiz_date": last_quiz_date,
            "days_until_bonus": days_until_bonus,
            "next_milestone_day": next_milestone_day,
            "bonus_coins": next_milestone_bonus,
            "daily_reward_coins": 20,
            "timeline": timeline,
            "total_days_in_month": 30,
            "days_completed_in_cycle": days_in_30_cycle,
            "heatmap": [],
            "total_active_days": max(total_active_days, effective_streak),
            "can_solve_today": not today_completed,
        }

    async def solve_daily_quiz(
        self,
        user_id: str,
        correct_count: int = 3,
        total_count: int = 3,
    ) -> Dict[str, Any]:
        """Record solving today's daily quiz, advancing streak and granting coins."""
        MILESTONE_CONFIG = {
            7: {"bonus": 100, "label": "Week 1 Habit"},
            14: {"bonus": 150, "label": "Fortnight Anchor"},
            21: {"bonus": 200, "label": "Discipline Master"},
            28: {"bonus": 300, "label": "Focus Champion"},
            30: {"bonus": 500, "label": "Grand Monthly Master"},
        }

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        profile = user.get("profile", {})
        current_streak = profile.get("current_streak", 0)
        longest_streak = profile.get("longest_streak", current_streak)
        last_quiz_date = profile.get("last_quiz_date")
        current_coins = profile.get("coins_balance", 0)

        today_utc = datetime.now(timezone.utc)
        today_str = today_utc.strftime("%Y-%m-%d")
        yesterday_str = (today_utc - timedelta(days=1)).strftime("%Y-%m-%d")

        if last_quiz_date == today_str:
            # Already completed today
            return {
                "success": True,
                "already_completed": True,
                "coins_earned": 0,
                "is_milestone": False,
                "current_streak": current_streak,
                "coins_balance": current_coins,
                "message": "You've already solved today's quiz! Come back tomorrow to continue your streak.",
            }

        # Calculate new streak
        if last_quiz_date == yesterday_str:
            new_streak = current_streak + 1
        else:
            new_streak = 1

        new_longest = max(longest_streak, new_streak)

        # Milestone detection:
        day_in_cycle = new_streak % 30
        if day_in_cycle == 0 and new_streak > 0:
            day_in_cycle = 30

        earned_coins = 20
        is_milestone = False
        milestone_title = ""

        if day_in_cycle in MILESTONE_CONFIG:
            is_milestone = True
            bonus = MILESTONE_CONFIG[day_in_cycle]["bonus"]
            earned_coins += bonus
            milestone_title = MILESTONE_CONFIG[day_in_cycle]["label"]
        elif new_streak % 7 == 0:
            is_milestone = True
            earned_coins += 100
            milestone_title = "7-Day Consistency Bonus"

        # Update in DB
        await self.user_repo.update_streak(
            user_id=user_id,
            streak=new_streak,
            longest=new_longest,
            last_date=today_str,
            history_date=today_str,
        )
        new_balance = await self.user_repo.update_coins(user_id, earned_coins)

        msg = f"Awesome! Daily quiz completed ({correct_count}/{total_count} correct)! 🔥 Streak: {new_streak} days (+{earned_coins} GovCoins)"
        if is_milestone:
            msg = f"🎉 {milestone_title.upper()} UNLOCKED! Earned {earned_coins} GovCoins including milestone bonus!"

        return {
            "success": True,
            "already_completed": False,
            "coins_earned": earned_coins,
            "is_milestone": is_milestone,
            "milestone_title": milestone_title,
            "current_streak": new_streak,
            "longest_streak": new_longest,
            "coins_balance": new_balance,
            "correct_count": correct_count,
            "total_count": total_count,
            "message": msg,
        }
