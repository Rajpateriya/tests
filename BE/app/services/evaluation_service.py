from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import BadRequestException, ExamStateException, NotFoundException
from app.core.logging import logger
from app.db.redis import redis_manager
from app.models.attempt import AttemptStatus
from app.models.question import Difficulty, OptionItem
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.test_repo import TestRepository
from app.schemas.attempt import AttemptSubmitRequest
from app.schemas.result import (
    AttemptResultOut,
    DetailedInsightsOut,
    QuestionResultDetail,
    SubjectAccuracy,
    TopicAccuracy,
    UserDashboardStatsOut,
)


class EvaluationService:
    def __init__(self, db: AsyncIOMotorDatabase, redis: Optional[Any] = None):
        self.db = db
        self.attempt_repo = AttemptRepository(db)
        self.test_repo = TestRepository(db)
        self.question_repo = QuestionRepository(db)
        self.redis = redis or redis_manager.get_client()

    async def submit_and_evaluate(
        self, attempt_id: str, user_id: str, req: Optional[AttemptSubmitRequest] = None
    ) -> AttemptResultOut:
        """
        Finalize and grade test attempt.
        Computes positive/negative marking, accuracy, and updates attempt to COMPLETED.
        """
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")

        if attempt["status"] == AttemptStatus.COMPLETED.value:
            # Already submitted, return existing result
            return self._to_result_out(attempt)

        test = await self.test_repo.get_by_id(attempt["test_id"])
        if not test:
            raise NotFoundException("Test configuration not found")

        # Merge final submitted payload with saved state
        answers = attempt.get("answers", {})
        time_spent = attempt.get("time_spent_per_question", {})
        palette_states = attempt.get("palette_states", {})

        if req:
            if req.answers:
                answers.update(req.answers)
            if req.time_spent_per_question:
                time_spent.update(req.time_spent_per_question)
            if req.palette_states:
                palette_states.update({k: v.value for k, v in req.palette_states.items()})

        # Fetch all questions for grading
        question_ids = test.get("question_ids", [])
        questions = await self.question_repo.get_by_ids(question_ids)

        pos_marks = float(test.get("positive_marks_per_q", 2.0))
        neg_marks = float(test.get("negative_marks_per_q", 0.5))

        total_score = 0.0
        correct_count = 0
        incorrect_count = 0
        unattempted_count = 0
        total_time_taken = 0
        detailed_answers: List[Dict[str, Any]] = []

        for q in questions:
            qid = q["_id"]
            selected_option = answers.get(qid)
            q_time = int(time_spent.get(qid, 0))
            total_time_taken += q_time

            correct_option = q.get("correct_option", "").strip().upper()
            if not selected_option:
                unattempted_count += 1
                marks_awarded = 0.0
                is_correct = False
            elif selected_option.strip().upper() == correct_option:
                correct_count += 1
                marks_awarded = pos_marks
                total_score += pos_marks
                is_correct = True
            else:
                incorrect_count += 1
                marks_awarded = -neg_marks
                total_score -= neg_marks
                is_correct = False

            detailed_answers.append({
                "question_id": qid,
                "selected_option": selected_option,
                "time_taken_seconds": q_time,
                "is_correct": is_correct,
                "marks_awarded": marks_awarded,
            })

        total_questions = len(questions)
        max_possible_score = total_questions * pos_marks
        attempted_count = correct_count + incorrect_count
        accuracy_percentage = (
            round((correct_count / attempted_count) * 100, 2) if attempted_count > 0 else 0.0
        )
        total_score = round(max(0.0, total_score), 2)  # Typically floor at 0 for overall test score

        now = datetime.now(timezone.utc)
        update_data = {
            "status": AttemptStatus.COMPLETED.value,
            "end_time": now,
            "answers": answers,
            "time_spent_per_question": time_spent,
            "palette_states": palette_states,
            "total_score": total_score,
            "max_possible_score": max_possible_score,
            "accuracy_percentage": accuracy_percentage,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "unattempted_count": unattempted_count,
            "total_time_taken_seconds": total_time_taken,
            "detailed_answers": detailed_answers,
            "updated_at": now,
        }
        # Why/how the attempt ended: the final tab-switch count (the 8-second sync may lag
        # behind it) and, when the exam room ended the test for tab switching, the reason.
        if req and req.tab_switch_count is not None:
            update_data["tab_switch_count"] = max(req.tab_switch_count, attempt.get("tab_switch_count") or 0)
        if req and req.ended_reason:
            update_data["ended_reason"] = req.ended_reason

        # Save evaluated results to MongoDB
        await self.attempt_repo.update(attempt_id, update_data)

        # Invalidate Redis active session cache
        try:
            await self.redis.delete(f"attempt:state:{attempt_id}")
        except Exception as e:
            logger.warning(f"Failed to clear Redis state: {e}")

        # Fetch updated attempt doc
        updated_attempt = await self.attempt_repo.get_by_id(attempt_id)
        return self._to_result_out(updated_attempt)

    async def get_attempt_result(self, attempt_id: str, user_id: str) -> AttemptResultOut:
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")
        if attempt["status"] != AttemptStatus.COMPLETED.value:
            raise ExamStateException("Test has not been submitted yet")
        return self._to_result_out(attempt)

    async def get_detailed_insights(self, attempt_id: str, user_id: str) -> DetailedInsightsOut:
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")
        if attempt["status"] != AttemptStatus.COMPLETED.value:
            raise ExamStateException("Test has not been submitted yet")

        test = await self.test_repo.get_by_id(attempt["test_id"])
        questions = await self.question_repo.get_by_ids(test.get("question_ids", []))
        q_map = {q["_id"]: q for q in questions}

        # Peer comparison: Rank & Percentile
        peer_stats = await self.attempt_repo.get_test_rank_and_percentile(
            attempt["test_id"], attempt.get("total_score", 0.0)
        )

        # Subject & Topic breakdowns
        topic_stats: Dict[str, Dict[str, Any]] = {}
        subject_stats: Dict[str, Dict[str, Any]] = {}
        questions_breakdown: List[QuestionResultDetail] = []

        total_q_time = 0
        ans_map = {a["question_id"]: a for a in attempt.get("detailed_answers", [])}

        for q in questions:
            qid = q["_id"]
            sub = q.get("subject", "General")
            top = q.get("topic", "General")
            ans_info = ans_map.get(qid, {})
            selected = ans_info.get("selected_option")
            is_corr = bool(ans_info.get("is_correct", False))
            time_taken = int(ans_info.get("time_taken_seconds", 0))
            marks = float(ans_info.get("marks_awarded", 0.0))
            is_att = selected is not None

            total_q_time += time_taken

            # Topic aggregation
            if top not in topic_stats:
                topic_stats[top] = {
                    "subject": sub,
                    "total": 0,
                    "attempted": 0,
                    "correct": 0,
                    "time": 0,
                }
            topic_stats[top]["total"] += 1
            if is_att:
                topic_stats[top]["attempted"] += 1
            if is_corr:
                topic_stats[top]["correct"] += 1
            topic_stats[top]["time"] += time_taken

            # Subject aggregation
            if sub not in subject_stats:
                subject_stats[sub] = {
                    "total": 0,
                    "attempted": 0,
                    "correct": 0,
                    "time": 0,
                }
            subject_stats[sub]["total"] += 1
            if is_att:
                subject_stats[sub]["attempted"] += 1
            if is_corr:
                subject_stats[sub]["correct"] += 1
            subject_stats[sub]["time"] += time_taken

            questions_breakdown.append(
                QuestionResultDetail(
                    question_id=qid,
                    subject=sub,
                    topic=top,
                    difficulty=Difficulty(q["difficulty"]),
                    question_text=q["question_text"],
                    options=[OptionItem(**opt) for opt in q["options"]],
                    correct_option=q["correct_option"],
                    selected_option=selected,
                    is_correct=is_corr,
                    is_attempted=is_att,
                    marks_awarded=marks,
                    time_taken_seconds=time_taken,
                    solution_explanation=q["solution_explanation"],
                )
            )

        # Build TopicAccuracy list
        topic_analysis: List[TopicAccuracy] = []
        strong_areas: List[str] = []
        weak_areas: List[str] = []

        for top, data in topic_stats.items():
            acc = round((data["correct"] / data["attempted"]) * 100, 2) if data["attempted"] > 0 else 0.0
            avg_t = round(data["time"] / data["total"], 2) if data["total"] > 0 else 0.0
            topic_analysis.append(
                TopicAccuracy(
                    topic=top,
                    subject=data["subject"],
                    total_questions=data["total"],
                    attempted=data["attempted"],
                    correct=data["correct"],
                    accuracy_percentage=acc,
                    avg_time_per_q_seconds=avg_t,
                )
            )
            if acc >= 75.0 and data["attempted"] > 0:
                strong_areas.append(f"{top} ({data['subject']})")
            elif acc < 50.0 and data["total"] > 0:
                weak_areas.append(f"{top} ({data['subject']})")

        # Build SubjectAccuracy list
        subject_analysis: List[SubjectAccuracy] = []
        for sub, data in subject_stats.items():
            acc = round((data["correct"] / data["attempted"]) * 100, 2) if data["attempted"] > 0 else 0.0
            avg_t = round(data["time"] / data["total"], 2) if data["total"] > 0 else 0.0
            subject_analysis.append(
                SubjectAccuracy(
                    subject=sub,
                    total_questions=data["total"],
                    attempted=data["attempted"],
                    correct=data["correct"],
                    accuracy_percentage=acc,
                    avg_time_per_q_seconds=avg_t,
                )
            )

        avg_time_per_q = round(total_q_time / len(questions), 2) if questions else 0.0

        return DetailedInsightsOut(
            attempt_id=attempt_id,
            test_id=attempt["test_id"],
            test_title=attempt.get("test_title", ""),
            total_score=attempt.get("total_score", 0.0),
            percentile=peer_stats["percentile"],
            rank=peer_stats["rank"],
            total_participants=peer_stats["total_participants"],
            overall_accuracy=attempt.get("accuracy_percentage", 0.0),
            avg_time_per_question=avg_time_per_q,
            subject_analysis=subject_analysis,
            topic_analysis=topic_analysis,
            strong_areas=strong_areas,
            weak_areas=weak_areas,
            questions_breakdown=questions_breakdown,
        )

    async def get_user_dashboard(self, user_id: str) -> UserDashboardStatsOut:
        """Aggregate lifetime metrics for student dashboard."""
        attempts = await self.attempt_repo.get_user_attempts(user_id, limit=50)
        completed = [a for a in attempts if a.get("status") == AttemptStatus.COMPLETED.value]

        # Upcoming tests mockup/active schedule
        upcoming = [
            {"id": "up-1", "title": "SSC CGL All-India Live National Mock #04", "date": "Tomorrow, 10:00 AM", "duration_minutes": 60, "subject": "Full Mock", "difficulty": "HARD"},
            {"id": "up-2", "title": "Quantitative Aptitude Advanced Speed Drill", "date": "Oct 5, 06:00 PM", "duration_minutes": 30, "subject": "Quantitative Aptitude", "difficulty": "MEDIUM"},
            {"id": "up-3", "title": "General Intelligence & Reasoning Sectional", "date": "Oct 7, 02:00 PM", "duration_minutes": 25, "subject": "Reasoning", "difficulty": "EASY"},
        ]

        # 7-day activity streak tracker
        activity = [
            {"day": "Mon", "date": "Sep 26", "active": True, "mocks": 2},
            {"day": "Tue", "date": "Sep 27", "active": True, "mocks": 1},
            {"day": "Wed", "date": "Sep 28", "active": True, "mocks": 3},
            {"day": "Thu", "date": "Sep 29", "active": False, "mocks": 0},
            {"day": "Fri", "date": "Sep 30", "active": True, "mocks": 2},
            {"day": "Sat", "date": "Oct 01", "active": True, "mocks": 4},
            {"day": "Sun", "date": "Today", "active": True, "mocks": 1},
        ]

        # Fetch user's profile for real coins and streak
        user_doc = await self.db["users"].find_one({"_id": user_id})
        profile = user_doc.get("profile", {}) if user_doc else {}
        user_coins = profile.get("coins_balance", 150)
        user_streak = profile.get("current_streak", 6)

        # Standard LeetCode-style difficulty breakdown
        difficulty_stats = {
            "easy": {
                "solved": 42,
                "total": 50,
                "accuracy": 91.5,
                "beats_percentage": 94.2,
            },
            "medium": {
                "solved": 31,
                "total": 40,
                "accuracy": 82.0,
                "beats_percentage": 88.6,
            },
            "hard": {
                "solved": 12,
                "total": 20,
                "accuracy": 65.0,
                "beats_percentage": 76.4,
            },
        }

        if not completed:
            return UserDashboardStatsOut(
                user_id=user_id,
                total_mocks_attempted=0,
                average_score=0.0,
                average_accuracy=0.0,
                best_score=0.0,
                overall_percentile=0.0,
                current_streak_days=user_streak,
                coins_balance=user_coins,
                global_rank=1420,
                total_solved_questions=85,
                total_available_questions=110,
                difficulty_stats=difficulty_stats,
                upcoming_tests_count=len(upcoming),
                upcoming_tests=upcoming,
                activity_history=activity,
                subject_performance={"Quantitative Aptitude": 88.0, "Reasoning": 92.5, "English": 78.0, "General Awareness": 71.0},
                recent_attempts=[],
                recommended_tests=[
                    {"id": "rec-1", "title": "SSC CGL Full Mock 01", "type": "FULL"},
                    {"id": "rec-2", "title": "Quantitative Aptitude Mini Test", "type": "TOPIC_MINI"},
                ],
            )

        scores = [a.get("total_score", 0.0) for a in completed]
        accuracies = [a.get("accuracy_percentage", 0.0) for a in completed]
        avg_score = round(sum(scores) / len(scores), 2)
        avg_accuracy = round(sum(accuracies) / len(accuracies), 2)
        best_score = max(scores)

        recent_results = [self._to_result_out(a) for a in completed[:5]]

        return UserDashboardStatsOut(
            user_id=user_id,
            total_mocks_attempted=len(completed),
            average_score=avg_score,
            average_accuracy=avg_accuracy,
            best_score=best_score,
            overall_percentile=84.5,
            current_streak_days=user_streak,
            coins_balance=user_coins,
            global_rank=1420,
            total_solved_questions=85,
            total_available_questions=110,
            difficulty_stats=difficulty_stats,
            upcoming_tests_count=len(upcoming),
            upcoming_tests=upcoming,
            activity_history=activity,
            subject_performance={"Quantitative Aptitude": 78.0, "Reasoning": 82.5, "English": 71.0, "General Awareness": 74.0},
            recent_attempts=recent_results,
            recommended_tests=[
                {"id": "rec-1", "title": "Speed Test: Geometry & Mensuration", "type": "TOPIC_MINI"},
                {"id": "rec-2", "title": "SSC CGL Tier-1 Full Length Mock 2", "type": "FULL"},
            ],
        )

    def _to_result_out(self, doc: Dict[str, Any]) -> AttemptResultOut:
        max_score = float(doc.get("max_possible_score", 100.0))
        total_score = float(doc.get("total_score", 0.0))
        pct = round((total_score / max_score) * 100, 2) if max_score > 0 else 0.0

        return AttemptResultOut(
            attempt_id=doc["_id"],
            user_id=doc["user_id"],
            test_id=doc["test_id"],
            test_title=doc.get("test_title", ""),
            status=AttemptStatus(doc["status"]),
            total_score=total_score,
            max_possible_score=max_score,
            percentage=pct,
            accuracy_percentage=float(doc.get("accuracy_percentage", 0.0)),
            correct_count=int(doc.get("correct_count", 0)),
            incorrect_count=int(doc.get("incorrect_count", 0)),
            unattempted_count=int(doc.get("unattempted_count", 0)),
            total_questions=int(doc.get("correct_count", 0) + doc.get("incorrect_count", 0) + doc.get("unattempted_count", 0)),
            total_time_taken_seconds=int(doc.get("total_time_taken_seconds", 0)),
            start_time=doc["start_time"],
            end_time=doc.get("end_time"),
            tab_switch_count=doc.get("tab_switch_count"),
            ended_reason=doc.get("ended_reason"),
        )
