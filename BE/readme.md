# Product Specification & Architecture Document
## Project: Government Exam Mock Test & Analytics Platform

### 1. Project Overview
We are building a highly scalable, production-ready mock test platform aimed primarily at Government Job Aspirants. The platform allows students to attempt topic-wise mini mocks, subject-wise mocks, and full-length mocks. It provides instant results and deep analytical insights based on their attempts. 

**Note on Data Source:** An independent data pipeline handles the automated generation of questions (topic-wise and subject-wise). This pipeline stores the generated question sets into a database. The scope of this platform is to **read** from this database, dynamically generate tests, serve them to the users, evaluate the attempts, and generate performance insights.

---

### 2. Core User Roles
1. **Student:** Can browse available mocks, attempt tests (mini, subject-wise, full), view results, and analyze performance.
2. **Admin (Internal):** Can manage users, view platform analytics, configure test rules (e.g., duration, marking scheme), and monitor system health.

---

### 3. Core Features & Functionalities

#### 3.1. Authentication & User Management
* Secure JWT-based registration and login.
* Profile management (Target exams, preferred subjects).

#### 3.2. Test Discovery Dashboard
* Categorized listing of tests: 
  * **Full Mocks** (e.g., SSC CGL Full Test)
  * **Subject-wise Mocks** (e.g., Quantitative Aptitude)
  * **Topic-wise Mini Mocks** (e.g., Geometry, Profit & Loss)
* Progress tracker and recommended next tests.

#### 3.3. Test Execution Engine (The "Exam Room")
* Standardized UI similar to real government exams (e.g., TCS iON UI).
* Features: Server-side timer, Question Palette (Answered, Not Answered, Marked for Review), Save & Next functionality.
* Auto-submit on timer expiration.
* State persistence (if a user gets disconnected, they can resume from the exact second and question state).

#### 3.4. Results & Analytics Engine
* Instant score calculation (Correct, Incorrect, Unattempted).
* Application of Negative Marking (configurable per test).
* **Insights Generation:**
  * Subject/Topic-wise accuracy.
  * Time spent per question vs. average time.
  * Peer comparison (Percentile ranking).
  * Identification of Strong and Weak areas.

---

### 4. Technical Architecture

#### 4.1. Proposed Tech Stack
* **Frontend:** Next.js (React), Tailwind CSS (for fast, responsive, and SEO/performance-optimized UI), Zustand/Redux for state management.
* **Backend:** Node.js (Express/NestJS) OR Python (FastAPI/Django) - *Antigravity to decide based on best optimization framework.*
* **Database (Primary Relational):** PostgreSQL (To store users, test configs, user attempts).
* **Database (Existing Question DB):** MongoDB or PostgreSQL (Platform needs read access to extract pipeline-generated questions).
* **Caching:** Redis (For storing active test session states, timers, and leaderboard caching).

#### 4.2. Database Schema Design (Conceptual)

**1. Questions (Populated by existing external Data Pipeline)**
* `id` (UUID)
* `subject` (String)
* `topic` (String)
* `difficulty` (Enum: Easy, Medium, Hard)
* `question_text` (Text/HTML)
* `options` (JSON array)
* `correct_option` (String)
* `solution_explanation` (Text/HTML)

**2. Tests (Configurations created on the platform)**
* `id` (UUID)
* `title` (String)
* `test_type` (Enum: FULL, SUBJECT, TOPIC_MINI)
* `duration_minutes` (Int)
* `total_marks` (Float)
* `positive_marks_per_q` (Float)
* `negative_marks_per_q` (Float)
* `is_active` (Boolean)

**3. Test_Questions_Mapping**
* `test_id` (FK)
* `question_id` (FK)

**4. User_Attempts**
* `id` (UUID)
* `user_id` (FK)
* `test_id` (FK)
* `start_time` (Timestamp)
* `end_time` (Timestamp)
* `status` (Enum: IN_PROGRESS, COMPLETED, ABANDONED)
* `total_score` (Float)
* `accuracy_percentage` (Float)

**5. User_Attempt_Answers**
* `attempt_id` (FK)
* `question_id` (FK)
* `selected_option` (String)
* `time_taken_seconds` (Int)
* `is_correct` (Boolean)

---

### 5. API Endpoints Specification

#### Authentication Endpoints
* `POST /api/auth/register`
* `POST /api/auth/login`
* `GET /api/auth/me`

#### Test Endpoints
* `GET /api/tests` (List available tests with filters)
* `GET /api/tests/:testId` (Get test metadata)
* `POST /api/tests/:testId/start` (Initialize attempt, return session token)
* `GET /api/attempts/:attemptId/questions` (Fetch questions for the active test)
* `POST /api/attempts/:attemptId/sync` (Periodically save user answers and time taken to Redis to prevent data loss)
* `POST /api/attempts/:attemptId/submit` (Final submit and evaluate)

#### Analytics Endpoints
* `GET /api/results/:attemptId` (Get overall score, correct/incorrect count)
* `GET /api/results/:attemptId/insights` (Get topic-wise accuracy, time analytics)
* `GET /api/users/:userId/dashboard` (Aggregate lifetime stats, percentiles)

---

### 6. Production-Ready & Non-Functional Requirements (NFRs)

To ensure this system is production-ready for Antigravity, the following must be implemented:

1. **Security:** 
   * Implement rate limiting on API routes.
   * Prevent multiple logins from the same account during an active test.
   * Prevent inspecting elements/copy-pasting on the test screen (Anti-cheat basics).
2. **Performance:** 
   * Active test states MUST be stored in Redis and asynchronously synced to PostgreSQL to handle high concurrent users (e.g., thousands of students taking a mock test at 10 AM on Sunday).
   * Questions API payload must be compressed (GZIP/Brotli) as question banks can get large.
3. **Data Integrity:** 
   * Wrap test submission logic in Database Transactions (ACID compliance) so partial attempt data is never saved if an error occurs.
4. **Monitoring & Logging:** 
   * Integrate structured logging (Winston/Morgan).
   * Set up error tracking (Sentry).

---

### 7. Implementation Steps for Antigravity AI

**Phase 1: Foundation & Data Integration**
* Setup backend framework and configure DB connections.
* Build the connector to read from the existing Data Pipeline Question Database.
* Create internal CRUD APIs to compile a "Test" by fetching specific questions from the Question Database.

**Phase 2: Core Platform API & Logic**
* Build Auth module.
* Build Test Engine module (Start test, sync answers in Redis, submit test).
* Build Evaluation Engine (Grade answers, calculate negative marking).

<!-- **Phase 3: Frontend Development**
* Build Auth Pages & Dashboard.
* Build the Exam Simulation UI (Timer, Question Palette).
* Build the Analytics/Insights UI (Charts, tables).

**Phase 4: Optimization & Productionization**
* Implement Redis caching.
* Add rate limiters, error handling, and transaction blocks.
* Dockerize the application (create `Dockerfile` and `docker-compose.yml` for easy deployment). -->

---

## 8. Backend Implementation & Architecture

The backend has been fully implemented using **Python FastAPI** and **MongoDB (Motor async)** with **Redis caching** and clean layered domain architecture.

### Directory Structure
```
.
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # /api/v1/auth (register, login, me, refresh)
│   │   │   │   ├── users.py         # /api/v1/users (profile, target exams, dashboard)
│   │   │   │   ├── questions.py     # /api/v1/questions (pipeline bank ingestion & query)
│   │   │   │   ├── tests.py         # /api/v1/tests (discovery, metadata, start exam)
│   │   │   │   ├── attempts.py      # /api/v1/attempts (masked questions, sync, submit)
│   │   │   │   ├── results.py       # /api/v1/results (score cards, deep analytics, peer rank)
│   │   │   │   └── admin.py         # /api/v1/admin (test creator, auto mock generator, health)
│   │   │   ├── deps.py              # JWT authentication & role authorization dependencies
│   │   │   └── router.py            # API v1 central router
│   ├── core/
│   │   ├── config.py                # Pydantic v2 settings (.env, CORS, tokens)
│   │   ├── security.py              # Bcrypt password hashing & PyJWT tokens
│   │   ├── exceptions.py            # Custom domain exceptions & handlers
│   │   ├── logging.py               # Structured JSON logger
│   │   └── rate_limiter.py          # Sliding-window rate limiter
│   ├── db/
│   │   ├── mongodb.py               # Motor async client with connection pooling & mock fallback
│   │   ├── redis.py                 # Async Redis client with in-memory fallback
│   │   ├── indexes.py               # Automatic index creation for fast queries
│   │   └── seed_data.py             # Realistic SSC CGL questions & sample mock tests
│   ├── models/                      # MongoDB Document models & Enums
│   ├── schemas/                     # Pydantic v2 Request / Response DTOs
│   ├── repositories/                # Data access layer separating queries from logic
│   ├── services/                    # Business logic (Auth, Exam Engine, Evaluation, Tests)
│   ├── middlewares/                 # Request logging, X-Request-ID, latency tracking
│   └── main.py                      # FastAPI application factory, CORS, Gzip compression
├── scripts/
│   └── seed_db.py                   # Command-line seed runner
├── tests/                           # Pytest async test suite (Auth, Engine, Evaluation)
├── Dockerfile                       # Production container definition
├── docker-compose.yml               # FastAPI + MongoDB + Redis orchestration
├── requirements.txt                 # Pinned dependencies
├── run_dev.sh                       # Dev server launcher
└── .env.example                     # Environment template

```

### Quickstart Guide

#### 1. Running Locally (Direct Python)
```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Run the dev server
./run_dev.sh
# Server starts at http://localhost:8000
# Interactive Swagger UI: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

#### 2. Running with Docker Compose (Full Stack)
```bash
docker-compose up --build
```

#### 3. Running Test Suite
```bash
source .venv/bin/activate
pytest -v
```

### Pre-seeded Credentials
* **Admin User:** `admin@mockexam.com` / `Admin@123`
* **Student User:** `student@mockexam.com` / `Student@123`