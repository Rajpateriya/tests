import uuid
from datetime import datetime, timezone
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

    # 1. Seed Admin User
    admin_email = "admin@mockexam.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_doc = {
            "_id": str(uuid.uuid4()),
            "email": admin_email,
            "full_name": "Platform Administrator",
            "hashed_password": hash_password("Admin@123"),
            "role": "admin",
            "is_active": True,
            "profile": {
                "target_exams": ["SSC CGL", "UPSC"],
                "preferred_subjects": [],
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Created default admin user: {admin_email} (password: Admin@123)")

    # 2. Seed Sample Student User
    student_email = "student@mockexam.com"
    existing_student = await db.users.find_one({"email": student_email})
    if not existing_student:
        student_doc = {
            "_id": str(uuid.uuid4()),
            "email": student_email,
            "full_name": "Aspirant Rahul Sharma",
            "hashed_password": hash_password("Student@123"),
            "role": "student",
            "is_active": True,
            "profile": {
                "target_exams": ["SSC CGL"],
                "preferred_subjects": ["Quantitative Aptitude", "General Awareness"],
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(student_doc)
        logger.info(f"Created default student user: {student_email} (password: Student@123)")

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

    logger.info("Database seeding finished.")
