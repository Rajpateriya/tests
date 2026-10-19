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

        cid = attempt.get("course_id")
        c_title = None
        t_exam = None
        subj = None
        if not cid:
            cdoc = await self.db.courses.find_one({"quizzes.id": attempt["test_id"]})
            if cdoc:
                cid = cdoc["_id"]
                c_title = cdoc.get("title")
                attempt["course_id"] = cid
        elif cid:
            cdoc = await self.db.courses.find_one({"_id": cid}, {"title": 1, "target_exam": 1})
            if cdoc:
                c_title = cdoc.get("title")
                t_exam = cdoc.get("target_exam")

        test = await self.test_repo.get_by_id(attempt["test_id"])
        if test:
            if not t_exam:
                t_exam = test.get("target_exam")
            subj = test.get("subject")

        return self._to_result_out(
            attempt,
            course_id=cid,
            course_title=c_title,
            target_exam=t_exam,
            subject=subj,
        )

    async def get_detailed_insights(self, attempt_id: str, user_id: str) -> DetailedInsightsOut:
        attempt = await self.attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise NotFoundException("Attempt not found")
        if attempt["user_id"] != user_id:
            raise BadRequestException("You do not have access to this attempt")
        if attempt["status"] != AttemptStatus.COMPLETED.value:
            raise ExamStateException("Test has not been submitted yet")

        test = await self.test_repo.get_by_id(attempt["test_id"])
        # The test may have been deleted by an admin since; the attempt still remembers its questions.
        question_ids = test.get("question_ids", []) if test else list(attempt.get("palette_states", {}))
        questions = await self.question_repo.get_by_ids(question_ids)
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

    async def get_user_dashboard(self, user_id: str, course_id: Optional[str] = None) -> UserDashboardStatsOut:
        """Aggregate lifetime metrics for student dashboard.

        When `course_id` is provided, only attempts that belong to that course are
        included in the analytics — this powers the per-course view in the user profile.
        """
        attempts = await self.attempt_repo.get_user_attempts(user_id, limit=50)

        # 1. Resolve missing course_id for any attempts if not already persisted
        for a in attempts:
            if not a.get("course_id"):
                cdoc = await self.db.courses.find_one({"quizzes.id": a.get("test_id")}, {"_id": 1, "title": 1})
                if cdoc:
                    a["course_id"] = cdoc["_id"]
                    a["course_title"] = cdoc.get("title")
                    await self.attempt_repo.update(a["_id"], {"course_id": cdoc["_id"]})

        # 2. Filter by course when a course_id is requested
        course_title_resolved = None
        if course_id:
            cdoc = await self.db.courses.find_one({"_id": course_id}, {"title": 1})
            if cdoc:
                course_title_resolved = cdoc.get("title")
            attempts = [a for a in attempts if a.get("course_id") == course_id]

        completed = [a for a in attempts if a.get("status") == AttemptStatus.COMPLETED.value]

        # Fetch user's profile for real coins and streak
        user_doc = await self.db["users"].find_one({"_id": user_id})
        profile = user_doc.get("profile", {}) if user_doc else {}
        user_coins = profile.get("coins_balance", 0)
        user_streak = profile.get("current_streak", 0)

        # Active tests from DB for recommended/upcoming
        all_tests = await self.test_repo.find_filtered(limit=5)
        recommended = [
            {"id": t["_id"], "title": t.get("title", ""), "type": t.get("test_type", "FULL")}
            for t in all_tests[:2]
        ]
        upcoming = [
            {
                "id": t["_id"],
                "title": t.get("title", ""),
                "date": "Available Now",
                "duration_minutes": t.get("duration_minutes", 60),
                "subject": t.get("subject") or "Full Syllabus",
                "difficulty": "MEDIUM",
            }
            for t in all_tests[2:5]
        ]

        total_candidates = await self.db["users"].count_documents({"is_active": True})
        if total_candidates == 0:
            total_candidates = 1

        if not completed:
            empty_diff = {
                "easy": {"solved": 0, "total": 0, "accuracy": 0.0, "beats_percentage": 0.0},
                "medium": {"solved": 0, "total": 0, "accuracy": 0.0, "beats_percentage": 0.0},
                "hard": {"solved": 0, "total": 0, "accuracy": 0.0, "beats_percentage": 0.0},
            }
            return UserDashboardStatsOut(
                user_id=user_id,
                total_mocks_attempted=0,
                average_score=0.0,
                average_accuracy=0.0,
                best_score=0.0,
                overall_percentile=0.0,
                current_streak_days=user_streak,
                coins_balance=user_coins,
                global_rank=0,
                total_candidates=total_candidates,
                avg_speed_seconds=0.0,
                total_solved_questions=0,
                total_available_questions=0,
                difficulty_stats=empty_diff,
                upcoming_tests_count=len(upcoming),
                upcoming_tests=upcoming,
                activity_history=[],
                subject_performance={},
                recent_attempts=[],
                recommended_tests=recommended,
                course_id=course_id,
                course_title=course_title_resolved,
            )

        scores = [a.get("total_score", 0.0) for a in completed]
        accuracies = [a.get("accuracy_percentage", 0.0) for a in completed]
        avg_score = round(sum(scores) / len(scores), 2)
        avg_accuracy = round(sum(accuracies) / len(accuracies), 2)
        best_score = max(scores)

        total_solved = sum(int(a.get("correct_count", a.get("correct_answers_count", 0) or 0)) for a in completed)
        total_available = sum(
            int(
                a.get("total_questions")
                or len(a.get("detailed_answers", []))
                or (int(a.get("correct_count", 0) or 0) + int(a.get("incorrect_count", 0) or 0) + int(a.get("unattempted_count", 0) or 0))
            )
            for a in completed
        )

        total_time = sum(int(a.get("total_time_taken_seconds", 0)) for a in completed)
        total_q = sum(int(a.get("correct_count", 0) or 0) + int(a.get("incorrect_count", 0) or 0) for a in completed)
        avg_speed_seconds = round(total_time / total_q, 1) if total_q > 0 else 0.0

        higher_users = await self.db["attempts"].distinct(
            "user_id",
            {"status": AttemptStatus.COMPLETED.value, "total_score": {"$gt": best_score}}
        )
        global_rank = len(higher_users) + 1
        overall_pct = round(max(0.1, min(99.9, ((total_candidates - global_rank + 1) / total_candidates) * 100)), 1) if total_candidates > 0 else 0.0

        # Collect question IDs from detailed_answers to query question difficulty from DB
        all_qids = set()
        for a in completed:
            for ans in a.get("detailed_answers", []):
                qid = ans.get("question_id")
                if qid:
                    all_qids.add(str(qid))

        q_diff_map: Dict[str, str] = {}
        if all_qids:
            cursor = self.db["questions"].find(
                {"_id": {"$in": list(all_qids)}},
                {"_id": 1, "difficulty": 1}
            )
            async for qdoc in cursor:
                q_diff_map[str(qdoc["_id"])] = (qdoc.get("difficulty") or "MEDIUM").upper()

        easy_s, easy_t = 0, 0
        med_s, med_t = 0, 0
        hard_s, hard_t = 0, 0

        for a in completed:
            detailed = a.get("detailed_answers", [])
            if detailed:
                for ans in detailed:
                    qid = str(ans.get("question_id") or "")
                    diff = q_diff_map.get(qid, "MEDIUM")
                    is_correct = bool(ans.get("is_correct"))
                    if diff == "EASY":
                        easy_t += 1
                        if is_correct:
                            easy_s += 1
                    elif diff == "HARD":
                        hard_t += 1
                        if is_correct:
                            hard_s += 1
                    else:
                        med_t += 1
                        if is_correct:
                            med_s += 1
            else:
                for q in a.get("questions_breakdown", []):
                    diff = (q.get("difficulty") or "MEDIUM").upper()
                    is_correct = bool(q.get("is_correct"))
                    if diff == "EASY":
                        easy_t += 1
                        if is_correct:
                            easy_s += 1
                    elif diff == "HARD":
                        hard_t += 1
                        if is_correct:
                            hard_s += 1
                    else:
                        med_t += 1
                        if is_correct:
                            med_s += 1

        difficulty_stats = {
            "easy": {
                "solved": easy_s,
                "total": easy_t,
                "accuracy": round((easy_s / easy_t * 100), 1) if easy_t > 0 else 0.0,
                "beats_percentage": round(min(99.0, (easy_s / easy_t * 100)), 1) if easy_t > 0 else 0.0,
            },
            "medium": {
                "solved": med_s,
                "total": med_t,
                "accuracy": round((med_s / med_t * 100), 1) if med_t > 0 else 0.0,
                "beats_percentage": round(min(99.0, (med_s / med_t * 100)), 1) if med_t > 0 else 0.0,
            },
            "hard": {
                "solved": hard_s,
                "total": hard_t,
                "accuracy": round((hard_s / hard_t * 100), 1) if hard_t > 0 else 0.0,
                "beats_percentage": round(min(99.0, (hard_s / hard_t * 100)), 1) if hard_t > 0 else 0.0,
            },
        }

        # Batch-enrich completed attempts with course & exam details
        recent_slice = completed[:20]
        course_ids = [a.get("course_id") for a in completed if a.get("course_id")]
        test_ids = [a.get("test_id") for a in completed if a.get("test_id")]

        course_map: Dict[str, Any] = {}
        if course_ids:
            cursor = self.db.courses.find(
                {"_id": {"$in": list(set(course_ids))}},
                {"_id": 1, "title": 1, "target_exam": 1, "subjects": 1},
            )
            async for c in cursor:
                course_map[c["_id"]] = c

        test_map: Dict[str, Any] = {}
        if test_ids:
            cursor = self.db.tests.find(
                {"_id": {"$in": list(set(test_ids))}},
                {"_id": 1, "target_exam": 1, "subject": 1, "course_id": 1},
            )
            async for t in cursor:
                test_map[t["_id"]] = t

        subj_totals: Dict[str, list] = {}
        for a in completed:
            for s in a.get("section_scores", []) or []:
                sec = s.get("section_name")
                if sec and "accuracy_percentage" in s:
                    subj_totals.setdefault(sec, []).append(float(s["accuracy_percentage"]))

        if not subj_totals:
            for a in completed:
                t_info = test_map.get(a.get("test_id"), {})
                cid = a.get("course_id") or t_info.get("course_id")
                c_info = course_map.get(cid, {})
                c_subjs = c_info.get("subjects") or []
                sec = a.get("subject") or t_info.get("subject") or (c_subjs[0] if c_subjs else None) or c_info.get("title")
                if sec and "accuracy_percentage" in a:
                    subj_totals.setdefault(sec, []).append(float(a.get("accuracy_percentage", 0.0)))

        subject_perf = {k: round(sum(v) / len(v), 1) for k, v in subj_totals.items()}

        recent_results = []
        for a in recent_slice:
            cid = a.get("course_id") or test_map.get(a.get("test_id"), {}).get("course_id")
            c_info = course_map.get(cid, {})
            t_info = test_map.get(a.get("test_id"), {})
            c_title = a.get("course_title") or c_info.get("title")
            t_exam = a.get("target_exam") or t_info.get("target_exam") or c_info.get("target_exam")
            subj = a.get("subject") or t_info.get("subject")

            recent_results.append(
                self._to_result_out(
                    a,
                    course_id=cid,
                    course_title=c_title,
                    target_exam=t_exam,
                    subject=subj,
                )
            )

        return UserDashboardStatsOut(
            user_id=user_id,
            total_mocks_attempted=len(completed),
            average_score=avg_score,
            average_accuracy=avg_accuracy,
            best_score=best_score,
            overall_percentile=overall_pct,
            current_streak_days=user_streak,
            coins_balance=user_coins,
            global_rank=global_rank,
            total_candidates=total_candidates,
            avg_speed_seconds=avg_speed_seconds,
            total_solved_questions=total_solved,
            total_available_questions=total_available,
            difficulty_stats=difficulty_stats,
            upcoming_tests_count=len(upcoming),
            upcoming_tests=upcoming,
            activity_history=[],
            subject_performance=subject_perf,
            recent_attempts=recent_results,
            recommended_tests=recommended,
            course_id=course_id,
            course_title=course_title_resolved,
        )

    def _to_result_out(
        self,
        doc: Dict[str, Any],
        course_id: Optional[str] = None,
        course_title: Optional[str] = None,
        target_exam: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> AttemptResultOut:
        max_score = float(doc.get("max_possible_score", 100.0))
        total_score = float(doc.get("total_score", 0.0))
        pct = round((total_score / max_score) * 100, 2) if max_score > 0 else 0.0

        return AttemptResultOut(
            attempt_id=doc["_id"],
            user_id=doc["user_id"],
            test_id=doc["test_id"],
            test_title=doc.get("test_title", ""),
            course_id=course_id or doc.get("course_id"),
            course_title=course_title or doc.get("course_title"),
            target_exam=target_exam or doc.get("target_exam"),
            subject=subject or doc.get("subject"),
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
