# GovExam Pro — Frontend (React + Vite)

A modern, production-grade mock test & analytics platform engineered for Government Job Aspirants (SSC CGL, CHSL, RRB, Banking, State PSC). Built with standard TCS iON exam simulation, instant scoring, AI diagnostic insights, and premium subscription passes.

---

## 🚀 Quickstart

```bash
# 1. Enter FE folder
cd /Users/rajpateriya/Desktop/complete/FE

# 2. Install dependencies (if needed)
npm install

# 3. Start development server
npm run dev
# Running at: http://localhost:3000
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🌟 Key Features

### 1. 👑 Premium Subscription Plans & Razorpay Checkout
* **Plans Available:**
  * **Basic Aspirant Pass** (₹99/mo or ₹299/yr): 15 full mocks, 50 speed drills, standard TCS iON exam engine.
  * **Pro Ranker Pass (Most Popular)** (₹199/mo or ₹699/yr): Unlimited mocks, deep topic diagnostics, All-India peer percentiles, step-by-step solutions with shortcuts.
  * **Max Ultimate Pass** (₹299/mo or ₹1,299/yr): Multi-exam coverage (SSC, Railways, Banking), unlimited dynamic auto mock generator, personalized 1-on-1 AI study strategy.
* **Monthly / Annual Billing Switcher:** With 40% savings badge.
* **Simulated Razorpay Checkout Modal:**
  * Authentic Razorpay payment popup with UPI (Google Pay, PhonePe, Paytm QR), Debit/Credit Cards, and NetBanking.
  * Real-time payment processing animation, 256-bit encryption indicator, and instant success with unique transaction ID (`pay_xxx`).
  * Auto-activates premium perks across the entire app and updates the user's membership badge (`PRO PASS` / `MAX PASS`).
* **Navbar "Try Premium" Shortcut:** Glowing, animated button in the top header.

### 2. 📝 TCS iON Standard Exam Engine
* Standardized TCS iON UI matching real government exam halls.
* Server-side countdown timer with visual color alerts (`< 5m` amber, `< 1m` pulsing red) and auto-submit at `00:00`.
* Official Question Palette Legend:
  * 🟢 Answered
  * 🔴 Not Answered
  * ⚪ Not Visited
  * 🟣 Marked for Review
  * 🟣🟢 Answered & Marked for Review
* Controls: **Save & Next**, **Mark for Review & Next**, **Clear Response**, **Previous/Next**.
* **Anti-Cheat Deterrence:** Automatically tracks and flags tab switches or window unfocusing with an on-screen warning modal.
* **Auto-Sync Heartbeat:** Every 8 seconds persists answers and time spent to `/api/v1/attempts/:id/sync`.

### 3. 📊 Instant Results & Deep AI Analytics
* Instant negative marking calculations (+2.00 / -0.50).
* Celebratory particle confetti for qualifying scores.
* Score, accuracy %, percentile rank, and All-India estimated rank.
* Subject-wise accuracy progress bars.
* Strong vs. Weak topic recommendations.
* Comprehensive Solution Review: Filter by Correct, Incorrect, or Unattempted with complete question explanations.

### 4. 📈 Student Lifetime Performance Dashboard
* Cumulative mocks attempted, average score, average accuracy, highest score, overall percentile.
* Recent mock attempts history table with scorecard links.
* Recommended drills tailored to weak areas.

### 5. 🛡️ Admin Studio & Dynamic Test Generator
* Dynamic Auto Mock Test Generator: Instantly compiles custom mock tests by sampling from the automated pipeline question bank.
* Question Bank Explorer with difficulty and subject filters.
* Live System Health Monitor (MongoDB & Redis connectivity status).

### 6. 🎨 Design & Themes
* Dynamic **Light** and **Dark** theme switcher with persistent storage.
* High-DPI responsive layout for mobile and desktop.
* Accessible, zero-dependency SVG icon system.
