"""Test-only fixtures for unit test execution with in-memory mongomock.
This file is strictly scoped to BE/tests/ and never executes in production.
"""
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import hash_password


async def seed_test_database(db: AsyncIOMotorDatabase) -> None:
    """Populate isolated in-memory test DB with fixture records for pytest."""
    now = datetime.now(timezone.utc)

    # 1. Test Users (At least 10 for pagination tests)
    users = [
        {
            "_id": "user_admin_1",
            "email": "admin@gmail.com",
            "hashed_password": hash_password("admin123"),
            "full_name": "Admin Test User",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "coins_balance": 1000,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": "user_admin_2",
            "email": "admin@mockexam.com",
            "hashed_password": hash_password("Admin@123"),
            "full_name": "Mock Admin",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "coins_balance": 1000,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": "user_student_1",
            "email": "student@gmail.com",
            "hashed_password": hash_password("student123"),
            "full_name": "Student Test User",
            "role": "student",
            "is_active": True,
            "is_verified": True,
            "coins_balance": 250,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": "user_student_2",
            "email": "student@mockexam.com",
            "hashed_password": hash_password("Student@123"),
            "full_name": "Mock Student",
            "role": "student",
            "is_active": True,
            "is_verified": True,
            "coins_balance": 150,
            "created_at": now,
            "updated_at": now,
        },
    ]

    for idx in range(5, 15):
        users.append({
            "_id": f"user_test_{idx}",
            "email": f"test_user_{idx}@test.com",
            "hashed_password": hash_password("Password@123"),
            "full_name": f"Test Aspirant {idx}",
            "role": "student",
            "is_active": True,
            "is_verified": True,
            "coins_balance": 50,
            "created_at": now,
            "updated_at": now,
        })

    for u in users:
        await db["users"].replace_one({"_id": u["_id"]}, u, upsert=True)

    # 2. Test Questions (Easy, Medium, Hard)
    questions = [
        {
            "_id": "q-1",
            "id": "q-1",
            "subject": "Quantitative Aptitude",
            "topic": "Geometry",
            "difficulty": "Medium",
            "question_text": "In triangle ABC, AB = 12 cm, AC = 15 cm. Find length of BD.",
            "options": [
                {"id": "A", "text": "8 cm"},
                {"id": "B", "text": "10 cm"},
                {"id": "C", "text": "7.5 cm"},
                {"id": "D", "text": "9 cm"},
            ],
            "correct_option": "A",
            "solution_explanation": "Angle Bisector Theorem derivation.",
            "positive_marks": 2.0,
            "negative_marks": 0.5,
            "created_at": now,
        },
        {
            "_id": "q-2",
            "id": "q-2",
            "subject": "General Awareness",
            "topic": "Indian Polity",
            "difficulty": "Easy",
            "question_text": "Which Article provides Right to Constitutional Remedies?",
            "options": [
                {"id": "A", "text": "Article 21"},
                {"id": "B", "text": "Article 19"},
                {"id": "C", "text": "Article 32"},
                {"id": "D", "text": "Article 370"},
            ],
            "correct_option": "C",
            "solution_explanation": "Article 32 is Heart and Soul of Constitution.",
            "positive_marks": 2.0,
            "negative_marks": 0.5,
            "created_at": now,
        },
        {
            "_id": "q-3",
            "id": "q-3",
            "subject": "General Intelligence & Reasoning",
            "topic": "Syllogisms",
            "difficulty": "Hard",
            "question_text": "Statements: All stars are planets. Some planets are moons.",
            "options": [
                {"id": "A", "text": "Only Conclusion I follows"},
                {"id": "B", "text": "Only Conclusion II follows"},
                {"id": "C", "text": "Both follow"},
                {"id": "D", "text": "Neither follows"},
            ],
            "correct_option": "B",
            "solution_explanation": "Direct logical deduction from premises.",
            "positive_marks": 2.0,
            "negative_marks": 0.5,
            "created_at": now,
        },
    ]
    for q in questions:
        await db["questions"].replace_one({"_id": q["_id"]}, q, upsert=True)

    # 3. Test Tests (FULL and TOPIC_MINI)
    tests = [
        {
            "_id": "mock-cgl-tier1-full",
            "title": "SSC CGL 2026 Tier-I Comprehensive Full Mock 01",
            "description": "Complete Tier-I test covering Quantitative Aptitude and General Awareness.",
            "test_type": "FULL",
            "target_exam": "SSC CGL",
            "subject": "Full Syllabus",
            "topic": "Mixed Tier-I",
            "difficulty": "Medium",
            "duration_minutes": 60,
            "total_marks": 200,
            "positive_marks_per_q": 2.0,
            "negative_marks_per_q": 0.5,
            "question_ids": ["q-1", "q-2", "q-3"],
            "total_questions": 3,
            "is_active": True,
            "is_free": True,
            "created_at": now,
        },
        {
            "_id": "mock-cgl-topic-mini",
            "title": "Quantitative Aptitude: Geometry Mini Drill",
            "description": "Specialized speed drill on Triangle properties.",
            "test_type": "TOPIC_MINI",
            "target_exam": "SSC CGL",
            "subject": "Quantitative Aptitude",
            "topic": "Geometry",
            "difficulty": "Medium",
            "duration_minutes": 15,
            "total_marks": 30,
            "positive_marks_per_q": 2.0,
            "negative_marks_per_q": 0.5,
            "question_ids": ["q-1", "q-2"],
            "total_questions": 2,
            "is_active": True,
            "is_free": True,
            "created_at": now,
        },
    ]
    for t in tests:
        await db["tests"].replace_one({"_id": t["_id"]}, t, upsert=True)

    # 4. Course Quiz questions formatted for CourseSummaryOut
    course_quiz_questions = [
        {
            "id": q["_id"],
            "question_text": q["question_text"],
            "options": q["options"],
            "correct_option": q["correct_option"],
            "solution_explanation": q["solution_explanation"],
            "difficulty": q["difficulty"],
            "subject": q["subject"],
            "topic": q["topic"],
        }
        for q in questions
    ]

    # 5. Test Courses
    courses = [
        {
            "_id": "course-ssc-cgl-2026",
            "title": "SSC CGL 2026 Target Selection Batch",
            "slug": "ssc-cgl-2026",
            "target_exam": "SSC CGL",
            "description": "Comprehensive course covering Tier-I & Tier-II.",
            "original_price": 1999.0,
            "discounted_price": 499.0,
            "max_coins_discount": 100,
            "rating": 4.9,
            "reviews_count": 120,
            "enrolled_count": 500,
            "is_active": True,
            "is_published": True,
            "thumbnail_url": "",
            "subjects": ["Quantitative Aptitude", "General Awareness"],
            "total_quizzes": 1,
            "quizzes": [
                {
                    "id": "quiz-1",
                    "title": "Quantitative Aptitude Foundation",
                    "subject": "Quantitative Aptitude",
                    "duration_minutes": 30,
                    "questions": course_quiz_questions,
                }
            ],
            "enrolled_user_ids": [],
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": "course-rrb-ntpc-2026",
            "title": "RRB NTPC CBT-1 & 2 Crash Course",
            "slug": "rrb-ntpc-2026",
            "target_exam": "RRB NTPC",
            "description": "Dedicated Indian Railways recruitment preparation.",
            "original_price": 1499.0,
            "discounted_price": 399.0,
            "max_coins_discount": 50,
            "rating": 4.8,
            "reviews_count": 80,
            "enrolled_count": 300,
            "is_active": True,
            "is_published": True,
            "thumbnail_url": "",
            "subjects": ["General Awareness"],
            "total_quizzes": 1,
            "quizzes": [
                {
                    "id": "quiz-2",
                    "title": "Railways General Knowledge",
                    "subject": "General Awareness",
                    "duration_minutes": 20,
                    "questions": course_quiz_questions,
                }
            ],
            "enrolled_user_ids": [],
            "created_at": now,
            "updated_at": now,
        },
    ]
    for c in courses:
        await db["courses"].replace_one({"_id": c["_id"]}, c, upsert=True)

    # 6. Test Passes: dynamic and unseeded; created by admin through tests if needed

    # 7. Test Typing Passages
    typing = [
        {
            "_id": "typing-1",
            "title": "SSC CGL DEST Standard Practice Passage 01",
            "exam_category": "SSC CGL",
            "content": "The rapid advancement of technology has transformed administrative functioning across government departments in India.",
            "duration_seconds": 900,
            "target_wpm": 27.0,
            "target_keystrokes": 2000,
            "difficulty": "Medium",
            "is_active": True,
            "created_at": now,
        }
    ]
    for ty in typing:
        await db["typing_passages"].replace_one({"_id": ty["_id"]}, ty, upsert=True)
