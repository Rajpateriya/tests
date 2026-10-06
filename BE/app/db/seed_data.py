import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger
from app.core.security import hash_password

QUESTIONS_DATA = [
    # --- Quantitative Aptitude: Profit & Loss ---
    {
        "subject": "Quantitative Aptitude",
        "topic": "Profit & Loss",
        "difficulty": "Easy",
        "question_text": "A shopkeeper sells an article for ₹540, incurring a loss of 10%. At what price should he sell it to gain 20%?",
        "options": [
            {"id": "A", "text": "₹680"},
            {"id": "B", "text": "₹720"},
            {"id": "C", "text": "₹750"},
            {"id": "D", "text": "₹800"},
        ],
        "correct_option": "B",
        "solution_explanation": "Let Cost Price be CP. Loss = 10% => 0.90 * CP = 540 => CP = 540 / 0.90 = ₹600. For 20% gain, New SP = CP * 1.20 = 600 * 1.20 = ₹720.",
    },
    {
        "subject": "Quantitative Aptitude",
        "topic": "Profit & Loss",
        "difficulty": "Medium",
        "question_text": "A trader marks his goods 40% above the cost price and allows a discount of 25% on the marked price. His net profit percentage is:",
        "options": [
            {"id": "A", "text": "5%"},
            {"id": "B", "text": "10%"},
            {"id": "C", "text": "15%"},
            {"id": "D", "text": "12%"},
        ],
        "correct_option": "A",
        "solution_explanation": "Let CP = 100. Marked Price (MP) = 140. Discount = 25% of 140 = 35. Selling Price (SP) = 140 - 35 = 105. Net Profit = 105 - 100 = 5%.",
    },
    # --- Quantitative Aptitude: Geometry ---
    {
        "subject": "Quantitative Aptitude",
        "topic": "Geometry",
        "difficulty": "Medium",
        "question_text": "In a right-angled triangle ABC, right-angled at B, AB = 7 cm and BC = 24 cm. What is the radius of its incircle?",
        "options": [
            {"id": "A", "text": "2 cm"},
            {"id": "B", "text": "3 cm"},
            {"id": "C", "text": "4 cm"},
            {"id": "D", "text": "5 cm"},
        ],
        "correct_option": "B",
        "solution_explanation": "Hypotenuse AC = √(7² + 24²) = √(49 + 576) = √625 = 25 cm. For right triangle, inradius r = (AB + BC - AC) / 2 = (7 + 24 - 25) / 2 = 6 / 2 = 3 cm.",
    },
    {
        "subject": "Quantitative Aptitude",
        "topic": "Geometry",
        "difficulty": "Hard",
        "question_text": "The length of two parallel chords of a circle of radius 13 cm are 10 cm and 24 cm. If both chords are on the opposite sides of the center, the distance between them is:",
        "options": [
            {"id": "A", "text": "17 cm"},
            {"id": "B", "text": "19 cm"},
            {"id": "C", "text": "15 cm"},
            {"id": "D", "text": "21 cm"},
        ],
        "correct_option": "A",
        "solution_explanation": "Perpendicular distance from center to 10cm chord = √(13² - 5²) = √(169 - 25) = 12 cm. Distance to 24cm chord = √(13² - 12²) = 5 cm. Since they are on opposite sides, total distance = 12 + 5 = 17 cm.",
    },
    # --- Quantitative Aptitude: Time & Work ---
    {
        "subject": "Quantitative Aptitude",
        "topic": "Time & Work",
        "difficulty": "Easy",
        "question_text": "A can finish a work in 12 days and B can finish the same work in 18 days. If they work together, how many days will they take?",
        "options": [
            {"id": "A", "text": "6.2 days"},
            {"id": "B", "text": "7.2 days"},
            {"id": "C", "text": "8 days"},
            {"id": "D", "text": "7 days"},
        ],
        "correct_option": "B",
        "solution_explanation": "Combined 1-day work = (1/12) + (1/18) = (3 + 2)/36 = 5/36. Total days = 36/5 = 7.2 days.",
    },
    # --- Reasoning: Coding-Decoding ---
    {
        "subject": "General Intelligence & Reasoning",
        "topic": "Coding-Decoding",
        "difficulty": "Easy",
        "question_text": "If in a certain code language, 'ROSE' is written as 'TQWI', how will 'LEAF' be written in that code?",
        "options": [
            {"id": "A", "text": "NGCJ"},
            {"id": "B", "text": "MGCK"},
            {"id": "C", "text": "NGDI"},
            {"id": "D", "text": "NHDI"},
        ],
        "correct_option": "A",
        "solution_explanation": "Pattern: +2, +2, +4, +4? Let's check: R(+2)->T, O(+2)->Q, S(+4)->W, E(+4)->I. Applying same: L(+2)->N, E(+2)->G, A(+2)->C, F(+4)->J (Pattern is +2, +2, +2, +4 or +2 across: L+2=N, E+2=G, A+2=C, F+4=J -> NGCJ).",
    },
    {
        "subject": "General Intelligence & Reasoning",
        "topic": "Series",
        "difficulty": "Medium",
        "question_text": "Find the missing term in the sequence: 4, 9, 25, 49, 121, 169, ?",
        "options": [
            {"id": "A", "text": "225"},
            {"id": "B", "text": "256"},
            {"id": "C", "text": "289"},
            {"id": "D", "text": "361"},
        ],
        "correct_option": "C",
        "solution_explanation": "The terms are squares of consecutive prime numbers: 2²=4, 3²=9, 5²=25, 7²=49, 11²=121, 13²=169. Next prime is 17, so 17² = 289.",
    },
    {
        "subject": "General Intelligence & Reasoning",
        "topic": "Syllogism",
        "difficulty": "Medium",
        "question_text": "Statements: All cars are wheels. Some wheels are chairs. Conclusions: I. Some chairs are cars. II. Some wheels are cars.",
        "options": [
            {"id": "A", "text": "Only conclusion I follows"},
            {"id": "B", "text": "Only conclusion II follows"},
            {"id": "C", "text": "Both I and II follow"},
            {"id": "D", "text": "Neither I nor II follows"},
        ],
        "correct_option": "B",
        "solution_explanation": "All cars are wheels implies that some wheels are cars (immediate converse). Hence conclusion II follows. There is no definite intersection given between cars and chairs, so I does not necessarily follow.",
    },
    # --- English Language & Comprehension ---
    {
        "subject": "English Language",
        "topic": "Vocabulary",
        "difficulty": "Easy",
        "question_text": "Choose the most appropriate synonym for the word 'METICULOUS':",
        "options": [
            {"id": "A", "text": "Careless"},
            {"id": "B", "text": "Precise"},
            {"id": "C", "text": "Hesitant"},
            {"id": "D", "text": "Hasty"},
        ],
        "correct_option": "B",
        "solution_explanation": "'Meticulous' means showing great attention to detail; very careful and precise.",
    },
    {
        "subject": "English Language",
        "topic": "Grammar & Error Spotting",
        "difficulty": "Medium",
        "question_text": "Identify the part of the sentence containing an error: 'Neither the teacher (A) / nor the students (B) / was present in the auditorium (C) / No error (D)'",
        "options": [
            {"id": "A", "text": "Neither the teacher"},
            {"id": "B", "text": "nor the students"},
            {"id": "C", "text": "was present in the auditorium"},
            {"id": "D", "text": "No error"},
        ],
        "correct_option": "C",
        "solution_explanation": "When subjects are joined by 'neither... nor', the verb agrees with the nearer subject ('the students', plural). Therefore, 'was' should be replaced by 'were'.",
    },
    # --- General Awareness ---
    {
        "subject": "General Awareness",
        "topic": "Indian Polity",
        "difficulty": "Easy",
        "question_text": "Under which Article of the Indian Constitution is the 'Right to Equality before Law' guaranteed?",
        "options": [
            {"id": "A", "text": "Article 14"},
            {"id": "B", "text": "Article 19"},
            {"id": "C", "text": "Article 21"},
            {"id": "D", "text": "Article 32"},
        ],
        "correct_option": "A",
        "solution_explanation": "Article 14 of the Constitution of India provides that the State shall not deny to any person equality before the law or the equal protection of the laws.",
    },
    {
        "subject": "General Awareness",
        "topic": "Geography",
        "difficulty": "Medium",
        "question_text": "Which of the following mountain passes connects Srinagar with Leh?",
        "options": [
            {"id": "A", "text": "Rohtang Pass"},
            {"id": "B", "text": "Zoji La Pass"},
            {"id": "C", "text": "Nathu La Pass"},
            {"id": "D", "text": "Shipki La Pass"},
        ],
        "correct_option": "B",
        "solution_explanation": "Zoji La is a high mountain pass in the Himalayas in Ladakh, connecting the Kashmir Valley with the Dras and Suru valleys and Leh.",
    },
]


async def seed_database(db: AsyncIOMotorDatabase) -> None:
    """Populate database with default admin, student, questions, and test suites."""
    logger.info("Starting database seeding...")

    # 1. Seed Admin Users
    primary_admin_email = "admin@gmail.com"
    existing_primary_admin = await db.users.find_one({"email": primary_admin_email})
    if not existing_primary_admin:
        admin_doc = {
            "_id": str(uuid.uuid4()),
            "email": primary_admin_email,
            "full_name": "Platform Administrator",
            "hashed_password": hash_password("admin123"),
            "role": "admin",
            "is_active": True,
            "profile": {
                "target_exams": ["SSC CGL", "UPSC"],
                "preferred_subjects": [],
                "coins_balance": 500,
                "current_streak": 10,
                "longest_streak": 20,
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Created default admin user: {primary_admin_email} (password: admin123)")
    else:
        # Ensure password is admin123 and role is admin
        await db.users.update_one(
            {"email": primary_admin_email},
            {"$set": {"hashed_password": hash_password("admin123"), "role": "admin"}}
        )

    # Legacy mock admin
    legacy_admin_email = "admin@mockexam.com"
    existing_admin = await db.users.find_one({"email": legacy_admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "email": legacy_admin_email,
            "full_name": "Platform Administrator",
            "hashed_password": hash_password("Admin@123"),
            "role": "admin",
            "is_active": True,
            "profile": {"target_exams": ["SSC CGL"]},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })

    # 2. Seed Primary Student User (student@gmail.com / student123)
    primary_student_email = "student@gmail.com"
    existing_primary_student = await db.users.find_one({"email": primary_student_email})
    if not existing_primary_student:
        student_doc = {
            "_id": "student-primary-id",
            "email": primary_student_email,
            "full_name": "Alex Aspirant",
            "hashed_password": hash_password("student123"),
            "role": "student",
            "is_active": True,
            "profile": {
                "target_exams": ["SSC CGL", "SSC CHSL"],
                "preferred_subjects": ["Quantitative Aptitude", "General Intelligence & Reasoning"],
                "coins_balance": 150,
                "current_streak": 6,
                "longest_streak": 14,
                "last_quiz_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "streak_history": ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"],
                "subscription_plan": "FREE",
                "subscription_status": "INACTIVE",
                "enrolled_courses": [
                    {
                        "course_id": "course-ssc-cgl-2026",
                        "course_title": "SSC CGL 2026 Tier 1 & 2 Complete Mastery Batch",
                        "target_exam": "SSC CGL",
                        "tagline": "Full Syllabus Coverage + Topic Drills + PYQs",
                        "thumbnail_icon": "SparklesIcon",
                        "enrolled_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                        "amount_paid": 499.0,
                        "payment_id": "pay_seed_alex_001",
                        "order_id": "order_seed_alex_001",
                        "status": "ACTIVE",
                    }
                ],
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(student_doc)
        logger.info(f"Created default student user: {primary_student_email} (password: student123)")
    else:
        # Ensure password is student123 and role is student
        existing_doc = await db.users.find_one({"email": primary_student_email})
        existing_enrolled = (existing_doc.get("profile") or {}).get("enrolled_courses", []) if existing_doc else []
        set_payload = {
            "hashed_password": hash_password("student123"),
            "role": "student",
            "profile.current_streak": 6,
            "profile.last_quiz_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
        }
        if not existing_enrolled:
            set_payload["profile.enrolled_courses"] = [
                {
                    "course_id": "course-ssc-cgl-2026",
                    "course_title": "SSC CGL 2026 Tier 1 & 2 Complete Mastery Batch",
                    "target_exam": "SSC CGL",
                    "tagline": "Full Syllabus Coverage + Topic Drills + PYQs",
                    "thumbnail_icon": "SparklesIcon",
                    "enrolled_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                    "amount_paid": 499.0,
                    "payment_id": "pay_seed_alex_001",
                    "order_id": "order_seed_alex_001",
                    "status": "ACTIVE",
                }
            ]
        await db.users.update_one(
            {"email": primary_student_email},
            {"$set": set_payload}
        )

    # Legacy mock student
    legacy_student_email = "student@mockexam.com"
    existing_legacy_student = await db.users.find_one({"email": legacy_student_email})
    if not existing_legacy_student:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "email": legacy_student_email,
            "full_name": "Aspirant Rahul Sharma",
            "hashed_password": hash_password("Student@123"),
            "role": "student",
            "is_active": True,
            "profile": {
                "target_exams": ["SSC CGL"],
                "preferred_subjects": ["Quantitative Aptitude"],
                "coins_balance": 150,
                "current_streak": 6,
                "longest_streak": 14,
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })

    # Additional Aspirants for robust paginated dashboard testing
    additional_students = [
        {
            "email": "priya.sharma@gmail.com",
            "full_name": "Priya Sharma",
            "role": "student",
            "is_active": True,
            "target_exams": ["SSC CGL", "IBPS PO / Banking"],
            "preferred_subjects": ["Quantitative Aptitude", "English Comprehension"],
            "coins_balance": 350,
            "current_streak": 8,
            "longest_streak": 18,
            "subscription_plan": "PRO",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 98765 43210",
        },
        {
            "email": "rohan.verma@gmail.com",
            "full_name": "Rohan Verma",
            "role": "student",
            "is_active": True,
            "target_exams": ["SSC CGL", "SSC CHSL"],
            "preferred_subjects": ["General Intelligence & Reasoning"],
            "coins_balance": 120,
            "current_streak": 3,
            "longest_streak": 9,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
            "phone_number": "+91 98111 22334",
        },
        {
            "email": "ananya.sen@gmail.com",
            "full_name": "Ananya Sen",
            "role": "student",
            "is_active": True,
            "target_exams": ["UPSC CSAT", "State PSC"],
            "preferred_subjects": ["General Awareness", "English Comprehension"],
            "coins_balance": 800,
            "current_streak": 15,
            "longest_streak": 30,
            "subscription_plan": "ELITE",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 97222 33445",
        },
        {
            "email": "vikram.chauhan@gmail.com",
            "full_name": "Vikram Chauhan",
            "role": "student",
            "is_active": True,
            "target_exams": ["Defence / CDS"],
            "preferred_subjects": ["General Awareness"],
            "coins_balance": 210,
            "current_streak": 5,
            "longest_streak": 12,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
            "phone_number": "+91 99333 44556",
        },
        {
            "email": "neha.gupta@gmail.com",
            "full_name": "Neha Gupta",
            "role": "student",
            "is_active": True,
            "target_exams": ["IBPS PO / Banking"],
            "preferred_subjects": ["Quantitative Aptitude", "General Intelligence & Reasoning"],
            "coins_balance": 450,
            "current_streak": 11,
            "longest_streak": 22,
            "subscription_plan": "PRO",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 98444 55667",
        },
        {
            "email": "rajesh.kumar@gmail.com",
            "full_name": "Rajesh Kumar",
            "role": "student",
            "is_active": True,
            "target_exams": ["RRB NTPC"],
            "preferred_subjects": ["Quantitative Aptitude"],
            "coins_balance": 90,
            "current_streak": 2,
            "longest_streak": 6,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
            "phone_number": "+91 96555 66778",
        },
        {
            "email": "deepa.joshi@gmail.com",
            "full_name": "Deepa Joshi",
            "role": "student",
            "is_active": True,
            "target_exams": ["State PSC", "SSC CGL"],
            "preferred_subjects": ["General Awareness"],
            "coins_balance": 310,
            "current_streak": 7,
            "longest_streak": 14,
            "subscription_plan": "PRO",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 95666 77889",
        },
        {
            "email": "amit.patel@gmail.com",
            "full_name": "Amit Patel",
            "role": "student",
            "is_active": False,
            "target_exams": ["SSC CGL"],
            "preferred_subjects": ["Quantitative Aptitude"],
            "coins_balance": 50,
            "current_streak": 0,
            "longest_streak": 5,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
            "phone_number": "+91 94777 88990",
        },
        {
            "email": "pooja.meena@gmail.com",
            "full_name": "Pooja Meena",
            "role": "student",
            "is_active": True,
            "target_exams": ["SSC CGL", "IBPS PO / Banking"],
            "preferred_subjects": ["English Comprehension"],
            "coins_balance": 620,
            "current_streak": 14,
            "longest_streak": 28,
            "subscription_plan": "ELITE",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 93888 99001",
        },
        {
            "email": "suresh.yadav@gmail.com",
            "full_name": "Suresh Yadav",
            "role": "student",
            "is_active": True,
            "target_exams": ["RRB NTPC", "Defence / CDS"],
            "preferred_subjects": ["General Intelligence & Reasoning"],
            "coins_balance": 180,
            "current_streak": 4,
            "longest_streak": 10,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
            "phone_number": "+91 92999 00112",
        },
        {
            "email": "meera.iyer@gmail.com",
            "full_name": "Meera Iyer",
            "role": "student",
            "is_active": True,
            "target_exams": ["UPSC CSAT"],
            "preferred_subjects": ["General Awareness", "English Comprehension"],
            "coins_balance": 500,
            "current_streak": 9,
            "longest_streak": 21,
            "subscription_plan": "PRO",
            "subscription_status": "ACTIVE",
            "phone_number": "+91 91000 11223",
        },
    ]

    for s in additional_students:
        exists = await db.users.find_one({"email": s["email"]})
        if not exists:
            doc = {
                "_id": str(uuid.uuid4()),
                "email": s["email"],
                "full_name": s["full_name"],
                "hashed_password": hash_password("student123"),
                "role": s["role"],
                "is_active": s["is_active"],
                "profile": {
                    "target_exams": s["target_exams"],
                    "preferred_subjects": s["preferred_subjects"],
                    "phone_number": s["phone_number"],
                    "avatar_url": None,
                    "coins_balance": s["coins_balance"],
                    "current_streak": s["current_streak"],
                    "longest_streak": s["longest_streak"],
                    "subscription_plan": s["subscription_plan"],
                    "subscription_status": s["subscription_status"],
                },
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await db.users.insert_one(doc)

    # 3. Seed Questions
    existing_count = await db.questions.count_documents({})
    question_ids = []
    if existing_count == 0:
        docs = []
        for q in QUESTIONS_DATA:
            qid = str(uuid.uuid4())
            docs.append({
                "_id": qid,
                **q,
                "created_at": datetime.now(timezone.utc),
            })
            question_ids.append(qid)
        await db.questions.insert_many(docs)
        logger.info(f"Seeded {len(docs)} initial questions into the Question Bank.")
    else:
        cursor = db.questions.find({}, {"_id": 1})
        docs = await cursor.to_list(length=100)
        question_ids = [d["_id"] for d in docs]

    # 4. Seed Mock Tests (Full, Subject, Topic Mini)
    test_count = await db.tests.count_documents({})
    if test_count == 0 and len(question_ids) >= 4:
        now = datetime.now(timezone.utc)
        tests = [
            {
                "_id": str(uuid.uuid4()),
                "title": "SSC CGL Tier-1 All India Mock Test #1",
                "description": "Comprehensive full-length mock covering Quants, Reasoning, English, and General Awareness.",
                "test_type": "FULL",
                "target_exam": "SSC CGL",
                "duration_minutes": 60,
                "total_marks": len(question_ids) * 2.0,
                "positive_marks_per_q": 2.0,
                "negative_marks_per_q": 0.5,
                "question_ids": question_ids,
                "total_questions": len(question_ids),
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": str(uuid.uuid4()),
                "title": "Quantitative Aptitude Subject Drill",
                "description": "Subject-wise mock focused on Arithmetic and Advanced Mathematics.",
                "test_type": "SUBJECT",
                "subject": "Quantitative Aptitude",
                "target_exam": "SSC CGL",
                "duration_minutes": 25,
                "total_marks": 5 * 2.0,
                "positive_marks_per_q": 2.0,
                "negative_marks_per_q": 0.5,
                "question_ids": question_ids[:5],
                "total_questions": 5,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": str(uuid.uuid4()),
                "title": "Profit & Loss Rapid Fire Mini Mock",
                "description": "10-minute topic booster for profit, loss, and discount concepts.",
                "test_type": "TOPIC_MINI",
                "subject": "Quantitative Aptitude",
                "topic": "Profit & Loss",
                "target_exam": "SSC CGL",
                "duration_minutes": 10,
                "total_marks": 2 * 2.0,
                "positive_marks_per_q": 2.0,
                "negative_marks_per_q": 0.5,
                "question_ids": question_ids[:2],
                "total_questions": 2,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ]
        await db.tests.insert_many(tests)
        logger.info(f"Seeded {len(tests)} mock tests (Full, Subject, Topic-Mini).")

    # 5. Seed Exam-Oriented Courses (with Subject-wise Quizzes & Detailed Explanations)
    course_count = await db.courses.count_documents({})
    if course_count == 0:
        now = datetime.now(timezone.utc)
        courses_data = [
            {
                "_id": "course-ssc-cgl-2026",
                "title": "SSC CGL 2026 All-Rounder Rankers Course",
                "exam": "SSC CGL",
                "badge": "Bestseller",
                "description": "Comprehensive exam-focused preparation for SSC CGL Tier-1 and Tier-2. Covers all four subjects with intensive topic tests, subject-wise quizzes, and detailed question-by-question explanations with formula shortcuts.",
                "price": 3999,
                "discount_price": 1499,
                "discount_percentage": 62,
                "thumbnail": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
                "features": [
                    "Full syllabus coverage for Tier 1 & Tier 2",
                    "Subject-wise practice quizzes with step-by-step solutions",
                    "Detailed answer keys & shortcut derivation notes",
                    "Integrated with Typing Master Mock Engine",
                    "Unlimited re-attempts and analytics tracking"
                ],
                "subjects": [
                    {
                        "subject_name": "Quantitative Aptitude",
                        "quiz_title": "Quantitative Aptitude Rankers Drill",
                        "total_questions": 3,
                        "duration_minutes": 20,
                        "questions": [
                            {
                                "id": "qa-cgl-1",
                                "question_text": "A shopkeeper sells an article for ₹540, incurring a loss of 10%. At what price should he sell it to gain 20%?",
                                "options": [
                                    {"id": "A", "text": "₹680"},
                                    {"id": "B", "text": "₹720"},
                                    {"id": "C", "text": "₹750"},
                                    {"id": "D", "text": "₹800"}
                                ],
                                "correct_option": "B",
                                "explanation": "Step 1: Find Cost Price (CP). Since loss is 10%, Selling Price = 90% of CP => 0.90 * CP = 540 => CP = 540 / 0.9 = ₹600.\nStep 2: To gain 20%, required SP = 1.20 * CP = 1.20 * 600 = ₹720.\nTherefore, option B is correct."
                            },
                            {
                                "id": "qa-cgl-2",
                                "question_text": "A trader marks goods 40% above CP and allows a 25% discount on the marked price. His net gain percentage is:",
                                "options": [
                                    {"id": "A", "text": "5%"},
                                    {"id": "B", "text": "8%"},
                                    {"id": "C", "text": "10%"},
                                    {"id": "D", "text": "12%"}
                                ],
                                "correct_option": "A",
                                "explanation": "Assume CP = 100.\nMarked Price (MP) = 140.\nDiscount = 25% of 140 = 35.\nSelling Price (SP) = 140 - 35 = 105.\nProfit% = ((105 - 100) / 100) * 100 = 5%.\nCorrect option is A."
                            },
                            {
                                "id": "qa-cgl-3",
                                "question_text": "In a right triangle ABC with right angle at B, AB = 7 cm and BC = 24 cm. Find radius of incircle.",
                                "options": [
                                    {"id": "A", "text": "2 cm"},
                                    {"id": "B", "text": "3 cm"},
                                    {"id": "C", "text": "4 cm"},
                                    {"id": "D", "text": "5 cm"}
                                ],
                                "correct_option": "B",
                                "explanation": "In right triangle, hypotenuse AC = √(7² + 24²) = √(49 + 576) = 25 cm.\nInradius formula for right angled triangle: r = (a + b - c) / 2 = (7 + 24 - 25) / 2 = 6 / 2 = 3 cm.\nCorrect option is B."
                            }
                        ]
                    },
                    {
                        "subject_name": "General Intelligence & Reasoning",
                        "quiz_title": "Reasoning & Analytical Ability Quiz",
                        "total_questions": 2,
                        "duration_minutes": 15,
                        "questions": [
                            {
                                "id": "gi-cgl-1",
                                "question_text": "Select the related word pair: ARCHITECT : BUILDING :: ?",
                                "options": [
                                    {"id": "A", "text": "AUTHOR : BOOK"},
                                    {"id": "B", "text": "DOCTOR : HOSPITAL"},
                                    {"id": "C", "text": "SCULPTOR : CHISEL"},
                                    {"id": "D", "text": "TEACHER : CHALK"}
                                ],
                                "correct_option": "A",
                                "explanation": "An architect designs/creates a building. Similarly, an author creates a book. Doctor works in a hospital and sculptor uses a chisel (tool relationship, not creator-creation relationship). Hence A is the correct answer."
                            },
                            {
                                "id": "gi-cgl-2",
                                "question_text": "In a code language, TEACHER is coded as VGCEJGT. How is CHILDREN coded?",
                                "options": [
                                    {"id": "A", "text": "EJKNFTGP"},
                                    {"id": "B", "text": "EJKNFPGT"},
                                    {"id": "C", "text": "EJKTGPNF"},
                                    {"id": "D", "text": "EGKNETGP"}
                                ],
                                "correct_option": "A",
                                "explanation": "Pattern is +2 for each letter:\nT(+2)->V, E(+2)->G, A(+2)->C, C(+2)->E, H(+2)->J, E(+2)->G, R(+2)->T.\nApplying to CHILDREN:\nC(+2)->E, H(+2)->J, I(+2)->K, L(+2)->N, D(+2)->F, R(+2)->T, E(+2)->G, N(+2)->P => EJKNFTGP."
                            }
                        ]
                    },
                    {
                        "subject_name": "English Comprehension",
                        "quiz_title": "English Grammar & Vocabulary Booster",
                        "total_questions": 2,
                        "duration_minutes": 15,
                        "questions": [
                            {
                                "id": "eng-cgl-1",
                                "question_text": "Select the synonym of 'UBIQUITOUS':",
                                "options": [
                                    {"id": "A", "text": "Scarce"},
                                    {"id": "B", "text": "Omnipresent"},
                                    {"id": "C", "text": "Ancient"},
                                    {"id": "D", "text": "Mysterious"}
                                ],
                                "correct_option": "B",
                                "explanation": "Ubiquitous means present, appearing, or found everywhere; hence 'Omnipresent' is the exact synonym. 'Scarce' is the antonym."
                            },
                            {
                                "id": "eng-cgl-2",
                                "question_text": "Identify the segment containing a grammatical error: 'Neither the teacher nor the students was present in the classroom.'",
                                "options": [
                                    {"id": "A", "text": "Neither the teacher"},
                                    {"id": "B", "text": "nor the students"},
                                    {"id": "C", "text": "was present"},
                                    {"id": "D", "text": "in the classroom"}
                                ],
                                "correct_option": "C",
                                "explanation": "Rule of proximity with 'neither...nor': the verb agrees with the closer subject. Since 'students' is plural, the verb must be 'were present', not 'was present'."
                            }
                        ]
                    },
                    {
                        "subject_name": "General Awareness",
                        "quiz_title": "General Awareness & Static GK Quiz",
                        "total_questions": 2,
                        "duration_minutes": 10,
                        "questions": [
                            {
                                "id": "ga-cgl-1",
                                "question_text": "Which article of the Indian Constitution empowers the President to declare a National Emergency?",
                                "options": [
                                    {"id": "A", "text": "Article 352"},
                                    {"id": "B", "text": "Article 356"},
                                    {"id": "C", "text": "Article 360"},
                                    {"id": "D", "text": "Article 368"}
                                ],
                                "correct_option": "A",
                                "explanation": "Article 352 deals with National Emergency (threat to security by war, external aggression, or armed rebellion). Article 356 is President's Rule (State Emergency), Article 360 is Financial Emergency, and Article 368 relates to Constitutional Amendments."
                            },
                            {
                                "id": "ga-cgl-2",
                                "question_text": "Who was the founder of the Maurya Empire?",
                                "options": [
                                    {"id": "A", "text": "Ashoka"},
                                    {"id": "B", "text": "Chandragupta Maurya"},
                                    {"id": "C", "text": "Bindusara"},
                                    {"id": "D", "text": "Brihadratha"}
                                ],
                                "correct_option": "B",
                                "explanation": "Chandragupta Maurya founded the Maurya Empire in 322 BCE with the guidance and mentorship of Chanakya (Kautilya)."
                            }
                        ]
                    }
                ],
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": "course-rrb-ntpc-2026",
                "title": "RRB NTPC & Railway CBT 1 + 2 Super Course",
                "exam": "RRB NTPC",
                "badge": "High Demand",
                "description": "Targeted railway recruitment course focusing on high-scoring areas in General Science, Indian Railways GK, Arithmetic tricks, and Speed Reasoning drills with verified answer explanations.",
                "price": 2499,
                "discount_price": 899,
                "discount_percentage": 64,
                "thumbnail": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop&q=80",
                "features": [
                    "Specialized Railway General Science & Current Affairs",
                    "Rapid Arithmetic calculations with detailed steps",
                    "Non-verbal and spatial reasoning practice",
                    "Railway Junior Clerk & Station Master test patterns",
                    "Detailed explanations for every question"
                ],
                "subjects": [
                    {
                        "subject_name": "Mathematics",
                        "quiz_title": "RRB NTPC Speed Mathematics Quiz",
                        "total_questions": 2,
                        "duration_minutes": 15,
                        "questions": [
                            {
                                "id": "rrb-math-1",
                                "question_text": "A train 180 meters long is running at a speed of 72 km/h. How much time will it take to pass an electric pole?",
                                "options": [
                                    {"id": "A", "text": "7 seconds"},
                                    {"id": "B", "text": "9 seconds"},
                                    {"id": "C", "text": "12 seconds"},
                                    {"id": "D", "text": "15 seconds"}
                                ],
                                "correct_option": "B",
                                "explanation": "Speed = 72 * (5/18) = 20 m/s. Distance to cross a point object = length of the train = 180 m. Time = Distance / Speed = 180 / 20 = 9 seconds."
                            },
                            {
                                "id": "rrb-math-2",
                                "question_text": "If simple interest on a sum of money for 3 years at 5% per annum is ₹150, the principal is:",
                                "options": [
                                    {"id": "A", "text": "₹1,000"},
                                    {"id": "B", "text": "₹1,200"},
                                    {"id": "C", "text": "₹1,500"},
                                    {"id": "D", "text": "₹800"}
                                ],
                                "correct_option": "A",
                                "explanation": "SI = (P * R * T) / 100 => 150 = (P * 5 * 3) / 100 => 150 = 15P / 100 => P = (150 * 100) / 15 = ₹1,000."
                            }
                        ]
                    },
                    {
                        "subject_name": "General Science",
                        "quiz_title": "Physics, Chemistry & Biology Essentials",
                        "total_questions": 2,
                        "duration_minutes": 10,
                        "questions": [
                            {
                                "id": "rrb-sci-1",
                                "question_text": "What is the SI unit of electric resistance?",
                                "options": [
                                    {"id": "A", "text": "Volt"},
                                    {"id": "B", "text": "Ampere"},
                                    {"id": "C", "text": "Ohm"},
                                    {"id": "D", "text": "Joule"}
                                ],
                                "correct_option": "C",
                                "explanation": "The SI unit of electrical resistance is Ohm (Ω), named after Georg Simon Ohm."
                            },
                            {
                                "id": "rrb-sci-2",
                                "question_text": "Which organelle is famously known as the powerhouse of the cell?",
                                "options": [
                                    {"id": "A", "text": "Ribosome"},
                                    {"id": "B", "text": "Mitochondria"},
                                    {"id": "C", "text": "Golgi Apparatus"},
                                    {"id": "D", "text": "Nucleus"}
                                ],
                                "correct_option": "B",
                                "explanation": "Mitochondria generate most of the chemical energy needed by cell biochemical reactions in the form of ATP, hence referred to as the powerhouse of the cell."
                            }
                        ]
                    }
                ],
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": "course-ssc-chsl-2026",
                "title": "SSC CHSL (10+2) Foundation + Typing DEST Mastery",
                "exam": "SSC CHSL",
                "badge": "Popular",
                "description": "Complete foundation program for LDC, JSA, and DEO aspirants. Includes full syllabus subject-wise tests, detailed answers with solutions, and integrated typing practice modules meeting 35 WPM benchmark.",
                "price": 2999,
                "discount_price": 1199,
                "discount_percentage": 60,
                "thumbnail": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80",
                "features": [
                    "Complete CHSL Tier-1 & Tier-2 subject breakdown",
                    "Dedicated Typing Master DEST preparation modules",
                    "Subject-wise mock quizzes with step-by-step logic",
                    "Grammar rules, sentence improvement & reading comprehension",
                    "Speed calculation and correction review"
                ],
                "subjects": [
                    {
                        "subject_name": "English Language",
                        "quiz_title": "CHSL English Sentence Improvement & Vocab",
                        "total_questions": 2,
                        "duration_minutes": 12,
                        "questions": [
                            {
                                "id": "chsl-eng-1",
                                "question_text": "Choose the correct spelling:",
                                "options": [
                                    {"id": "A", "text": "Accomodate"},
                                    {"id": "B", "text": "Accommodate"},
                                    {"id": "C", "text": "Acommodate"},
                                    {"id": "D", "text": "Acomodate"}
                                ],
                                "correct_option": "B",
                                "explanation": "The correct spelling is 'Accommodate', with double 'c' and double 'm'."
                            },
                            {
                                "id": "chsl-eng-2",
                                "question_text": "Select the idiom that means 'to face a difficult situation with courage':",
                                "options": [
                                    {"id": "A", "text": "Bite the bullet"},
                                    {"id": "B", "text": "Cry over spilt milk"},
                                    {"id": "C", "text": "Burn the candle at both ends"},
                                    {"id": "D", "text": "Call it a day"}
                                ],
                                "correct_option": "A",
                                "explanation": "'Bite the bullet' means to face a grim or unavoidable situation with courage and fortitude."
                            }
                        ]
                    },
                    {
                        "subject_name": "Quantitative Aptitude",
                        "quiz_title": "CHSL Arithmetic & Algebra Drill",
                        "total_questions": 2,
                        "duration_minutes": 15,
                        "questions": [
                            {
                                "id": "chsl-math-1",
                                "question_text": "If x + 1/x = 4, then find the value of x² + 1/x²:",
                                "options": [
                                    {"id": "A", "text": "14"},
                                    {"id": "B", "text": "16"},
                                    {"id": "C", "text": "18"},
                                    {"id": "D", "text": "12"}
                                ],
                                "correct_option": "A",
                                "explanation": "Squaring both sides: (x + 1/x)² = 4² => x² + 2 + 1/x² = 16 => x² + 1/x² = 16 - 2 = 14."
                            },
                            {
                                "id": "chsl-math-2",
                                "question_text": "The ratio of the ages of A and B is 4:5. If the sum of their ages is 36 years, find A's age:",
                                "options": [
                                    {"id": "A", "text": "16 years"},
                                    {"id": "B", "text": "20 years"},
                                    {"id": "C", "text": "18 years"},
                                    {"id": "D", "text": "14 years"}
                                ],
                                "correct_option": "A",
                                "explanation": "Total parts = 4 + 5 = 9 parts. 9 parts = 36 years => 1 part = 4 years. A's age = 4 * 4 = 16 years."
                            }
                        ]
                    }
                ],
                "created_at": now,
                "updated_at": now,
            },
            {
                "_id": "course-banking-2026",
                "title": "Banking & Insurance (IBPS PO & SBI Clerk) Elite Course",
                "exam": "Banking",
                "badge": "Comprehensive",
                "description": "Complete mastery course for Bank PO & Clerk aspirants. High-level Data Interpretation, Circular & Linear Seating Arrangement, Syllogisms, and Financial Awareness with step-by-step visual solutions.",
                "price": 4499,
                "discount_price": 1799,
                "discount_percentage": 60,
                "thumbnail": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
                "features": [
                    "In-depth Mains level Data Interpretation",
                    "Advanced Floor & Seating arrangement puzzles",
                    "Banking, RBI Circulars & Economic Awareness updates",
                    "Quizzes with comprehensive step-by-step logic breakdown",
                    "Sectional speed drills & full score analysis"
                ],
                "subjects": [
                    {
                        "subject_name": "Data Interpretation & Quants",
                        "quiz_title": "High-Level DI & Arithmetic Mastery",
                        "total_questions": 2,
                        "duration_minutes": 15,
                        "questions": [
                            {
                                "id": "bank-di-1",
                                "question_text": "A sum of ₹8,000 invested at compound interest annually amounts to ₹9,261 in 3 years. The rate of interest per annum is:",
                                "options": [
                                    {"id": "A", "text": "4%"},
                                    {"id": "B", "text": "5%"},
                                    {"id": "C", "text": "6%"},
                                    {"id": "D", "text": "7.5%"}
                                ],
                                "correct_option": "B",
                                "explanation": "A = P(1 + R/100)³ => 9261 / 8000 = (1 + R/100)³ => (21/20)³ = (1 + R/100)³ => 1 + R/100 = 21/20 => R/100 = 1/20 => R = 5%."
                            },
                            {
                                "id": "bank-di-2",
                                "question_text": "Pipe A can fill a tank in 12 hours, while Pipe B can empty it in 18 hours. If both pipes are opened together, in how many hours will the tank be full?",
                                "options": [
                                    {"id": "A", "text": "36 hours"},
                                    {"id": "B", "text": "30 hours"},
                                    {"id": "C", "text": "24 hours"},
                                    {"id": "D", "text": "40 hours"}
                                ],
                                "correct_option": "A",
                                "explanation": "Work rate: Pipe A = +1/12, Pipe B = -1/18. Net fill rate per hour = 1/12 - 1/18 = (3 - 2)/36 = 1/36. Thus, tank is full in 36 hours."
                            }
                        ]
                    },
                    {
                        "subject_name": "Banking Awareness",
                        "quiz_title": "Monetary Policy & Financial Awareness",
                        "total_questions": 2,
                        "duration_minutes": 10,
                        "questions": [
                            {
                                "id": "bank-gk-1",
                                "question_text": "What does the abbreviation 'RTGS' stand for in banking terms?",
                                "options": [
                                    {"id": "A", "text": "Real Time Gross Settlement"},
                                    {"id": "B", "text": "Rapid Transfer General System"},
                                    {"id": "C", "text": "Real Transaction Guaranteed Service"},
                                    {"id": "D", "text": "Regular Trade Gross Settlement"}
                                ],
                                "correct_option": "A",
                                "explanation": "RTGS stands for Real Time Gross Settlement, used for high-value immediate fund transfers between banking accounts."
                            },
                            {
                                "id": "bank-gk-2",
                                "question_text": "Which body regulates the insurance sector in India?",
                                "options": [
                                    {"id": "A", "text": "SEBI"},
                                    {"id": "B", "text": "RBI"},
                                    {"id": "C", "text": "IRDAI"},
                                    {"id": "D", "text": "NABARD"}
                                ],
                                "correct_option": "C",
                                "explanation": "The Insurance Regulatory and Development Authority of India (IRDAI) is the statutory body regulating the insurance sector."
                            }
                        ]
                    }
                ],
                "created_at": now,
                "updated_at": now,
            }
        ]
        # Process courses: assign is_active, ensure target_exam and generate quizzes array
        for c in courses_data:
            c["is_active"] = True
            c["target_exam"] = c.get("exam", "SSC CGL")
            c["original_price"] = c.get("price", 3999)
            c["discounted_price"] = c.get("discount_price", 1499)
            c["tagline"] = c.get("tagline", "Exam-Oriented Syllabus + Quizzes + Detailed Explanations")
            raw_subjects = c.get("subjects", [])
            quizzes = []
            subject_names = []
            for s in raw_subjects:
                if isinstance(s, dict):
                    s_name = s.get("subject_name", "General")
                    subject_names.append(s_name)
                    quizzes.append({
                        "id": f"quiz-{s_name.lower().replace(' ', '-')[:24]}",
                        "title": s.get("quiz_title", f"{s_name} Drill"),
                        "subject": s_name,
                        "target_exam": c["target_exam"],
                        "duration_minutes": s.get("duration_minutes", 15),
                        "total_questions": len(s.get("questions", [])),
                        "positive_marks": 2.0,
                        "negative_marks": 0.5,
                        "questions": [
                            {
                                "id": q.get("id"),
                                "question_text": q.get("question_text"),
                                "options": q.get("options", []),
                                "correct_option": q.get("correct_option"),
                                "solution_explanation": q.get("explanation", ""),
                                "difficulty": "Medium",
                                "subject": s_name,
                            }
                            for q in s.get("questions", [])
                        ],
                    })
                elif isinstance(s, str):
                    subject_names.append(s)
            c["subjects"] = subject_names
            c["quizzes"] = quizzes

        await db.courses.insert_many(courses_data)
        logger.info(f"Seeded {len(courses_data)} exam-oriented courses with subject-wise quizzes.")
    else:
        # Backfill any existing course documents to ensure target_exam and prices are populated
        async for c in db.courses.find():
            updates = {}
            if "target_exam" not in c:
                updates["target_exam"] = c.get("exam", "All Exams")
            if "is_active" not in c:
                updates["is_active"] = True
            if "original_price" not in c:
                updates["original_price"] = c.get("price", 1999)
            if "discounted_price" not in c:
                updates["discounted_price"] = c.get("discount_price", 499)
            if updates:
                await db.courses.update_one({"_id": c["_id"]}, {"$set": updates})

    # 6. Seed Typing Master Mock Passages (Govt Exam Benchmark Standard)
    passage_count = await db.typing_passages.count_documents({})
    if passage_count == 0:
        passages_data = [
            {
                "_id": "passage-ssc-cgl-dest-01",
                "title": "SSC CGL DEST Mock Test #1 (Urban Development & Public Administration)",
                "exam_category": "SSC_CGL_DEST",
                "difficulty": "Medium",
                "language": "English",
                "target_wpm": 27,
                "time_limit_seconds": 900,
                "benchmark_keystrokes": 2000,
                "instructions": "Standard SSC CGL DEST format: Minimum benchmark is 2000 key depressions in 15 minutes (~27 WPM). Maximum allowed error rate is 5% for General Category and 7% for Reserved Categories.",
                "content": "Sustainable urban development requires strategic allocation of public finances and seamless coordination between federal and local municipal authorities. Over the last two decades, rapid urbanization has spurred unprecedented demand for robust transportation networks, clean water distribution mechanisms, and affordable housing frameworks. Smart cities leverage internet connected sensors and data driven algorithms to optimize electricity grids and prevent resource wastage. In addition, citizen centric administration demands absolute transparency in governance. When administrative procedures are digitized, bureaucratic delays decrease dramatically, fostering citizen trust and economic agility. Public private partnerships play a paramount role in financing large scale infrastructure projects, ensuring timely completion and adherence to international safety parameters. Civil servants must demonstrate dedication, analytical acumen, and prompt decision making when executing transformative welfare schemes across diverse geographical landscapes."
            },
            {
                "_id": "passage-ssc-chsl-01",
                "title": "SSC CHSL Data Entry Operator (DEO) Skill Test #1 (Economic Reforms)",
                "exam_category": "SSC_CHSL",
                "difficulty": "Hard",
                "language": "English",
                "target_wpm": 35,
                "time_limit_seconds": 600,
                "benchmark_keystrokes": 1750,
                "instructions": "Official SSC CHSL standard: 35 words per minute in English (10500 KDPH / ~1750 key depressions in 10 minutes). Errors are categorized into Full and Half mistakes as per SSC evaluation rules.",
                "content": "The agricultural sector constitutes the backbone of developing economies, supporting rural livelihoods and ensuring widespread food security. Technological interventions, including drip irrigation systems and solar powered cold storage units, have bolstered productivity while minimizing post-harvest losses. Moreover, the integration of electronic trading platforms enables farmers to connect directly with regional wholesale markets, eliminating predatory middlemen. Institutional credit disbursement has steadily increased, offering farmers flexible microfinance options with subsidized interest rates. Value addition through agro processing clusters generates substantial rural employment opportunities, encouraging youth to adopt sustainable agricultural entrepreneurship. Transparent supply chains and predictable export policies further insulate domestic cultivators from global commodity price volatility."
            },
            {
                "_id": "passage-rrb-ntpc-01",
                "title": "RRB NTPC Junior Accounts Assistant Typing Test #1 (Railway Modernization)",
                "exam_category": "RRB_NTPC",
                "difficulty": "Medium",
                "language": "English",
                "target_wpm": 30,
                "time_limit_seconds": 600,
                "benchmark_keystrokes": 1500,
                "instructions": "Railway Recruitment Board standard: 30 words per minute in English without editing or backspace aids. Allowed error limit is 5% of total words typed.",
                "content": "Modern railway infrastructure forms the lifeline of industrial commerce and passenger transit across the subcontinent. Dedicated freight corridors have radically reduced transit durations for bulk freight, boosting export competitiveness and reducing heavy carbon emissions. High-speed passenger trains featuring aerodynamic coaches, automatic doors, and regenerative braking technology reflect the technological leap undertaken by railway engineers. Safety enhancements such as indigenous train collision avoidance systems operate reliably in dense fog conditions, safeguarding valuable human lives. Station redevelopment initiatives emphasize passenger convenience through elevated concourses, barrier free access for differently abled passengers, and expansive solar energy installations atop station rooftops."
            },
            {
                "_id": "passage-speed-drill-01",
                "title": "Rapid Fire Speed & Precision Drill (5-Minute Sprint)",
                "exam_category": "GENERAL_PRACTICE",
                "difficulty": "Easy",
                "language": "English",
                "target_wpm": 40,
                "time_limit_seconds": 300,
                "benchmark_keystrokes": 1000,
                "instructions": "Quick 5-minute typing drill to calibrate finger speed, keystroke precision, and backspace discipline before taking the full-length exam mock test.",
                "content": "Consistency is the fundamental secret to acquiring superior typing velocity and flawless keystroke precision. Instead of looking down at the keyboard layout, train your fingers to rest naturally on the home row keys. Regular daily practice of ten to fifteen minutes produces noticeable improvements in cognitive rhythm and hand muscle memory. Minimize unnecessary backspaces by reading words ahead in the passage before committing your fingers to the keystroke."
            }
        ]
        # Calculate word_count and active fields for each passage
        for p in passages_data:
            p["word_count"] = len(p["content"].split())
            p["is_active"] = True
            p["duration_seconds"] = p.get("time_limit_seconds", 900)
            p["target_keystrokes"] = p.get("benchmark_keystrokes", 2000)

        await db.typing_passages.insert_many(passages_data)
        logger.info(f"Seeded {len(passages_data)} typing master mock test passages.")

    logger.info("Database seeding finished.")

