# GovExam Pro — Full Stack Mock Test & Analytics Platform

Production-ready, highly scalable mock test platform and deep analytics engine for Government Job Aspirants (SSC CGL, CHSL, RRB NTPC, Banking, State PSC). Built with an authentic TCS iON Exam Engine simulation, instant evaluation, negative marking, AI diagnostic insights, and premium subscription passes.

---

## 📁 Repository Structure

```
.
├── BE/               # Backend: Python FastAPI + MongoDB + Redis + Layered Architecture
└── FE/               # Frontend: React 19 + Vite + Vanilla CSS (Light & Dark Mode)
```

---

## ⚡ Quickstart

### 1. Backend Setup (`BE`)
```bash
cd BE
source .venv/bin/activate    # Or create virtual environment
pip install -r requirements.txt
./run_dev.sh
```
* **API Documentation:** `http://localhost:8000/docs`
* **Health Check:** `http://localhost:8000/api/v1/admin/health`

### 2. Frontend Setup (`FE`)
```bash
cd FE
npm install
npm run dev
```
* **Web Application:** `http://localhost:3000`

---

## 🌟 Key Capabilities
* **TCS iON Standard Exam Engine:** Authentic government exam UI, server-side countdown timer, question palette, anti-cheat tab-switch detection, and periodic auto-sync.
* **Instant Scorecards & Deep Analytics:** Negative marking, percentile ranking, strong/weak topic diagnostics, and complete question solution review.
* **Premium Subscriptions & Razorpay:** Basic, Pro, and Max aspirant passes with simulated Razorpay checkout (UPI, Cards, NetBanking).
* **Automated Mock Test Generator:** Admin tool to dynamically sample and compile tests from the question bank.
* **Adaptive Dark/Light Themes:** System-wide theme toggle with persistent storage.
