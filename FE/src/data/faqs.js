/**
 * Centralized, SEO-optimized FAQ datasets for PrepMagnet routes.
 * Used by FAQSection to render themed UI and inject schema.org/FAQPage JSON-LD.
 */

export const HOME_FAQS = [
  {
    q: 'What competitive government examinations are covered on PrepMagnet?',
    a: 'PrepMagnet covers all premier national and state competitive examinations, including SSC CGL (Tier I & Tier II), SSC CHSL, Banking (IBPS PO, SBI PO, IBPS Clerk, RRB Officer), Railways (RRB NTPC, Group D), and State PSC exams. Each test series features full-length mock exams, subject-wise quizzes, and chapter-level speed drills.',
    category: 'Exams & Syllabus',
  },
  {
    q: 'How authentic is the PrepMagnet Computer-Based Test (CBT) interface?',
    a: 'Our CBT engine is calibrated 1:1 against official exam hall software (TCS iON / SSC CBT pattern). It includes official color-coded question palette states (Answered, Not Answered, Marked for Review, Visited), strict sectional countdown timers, official positive & negative marking, and full keyboard-lock simulation to eliminate exam-day surprises.',
    category: 'CBT Simulation',
  },
  {
    q: 'How is the All-India Percentile and Rank calculated?',
    a: 'Ranks and percentiles are computed in real time across authentic candidate attempts using official commission normalization formulas. Your scorecard provides section-wise accuracy, time spent per question, question difficulty breakdown, and pinpoint identification of negative mark leaks.',
    category: 'Ranking & Analytics',
  },
  {
    q: 'Does PrepMagnet enforce negative marking?',
    a: 'Yes. PrepMagnet strictly enforces official marking rules: -0.50 marks for SSC CGL Tier-I, -1.00 marks for Tier-II, and -0.25 marks for Banking exams. Practicing with real negative marking trains candidates to avoid blind guessing and develop calculated risk management.',
    category: 'Scoring Rules',
  },
  {
    q: 'Are all mock tests paid or can I take free tests?',
    a: 'PrepMagnet provides a comprehensive catalog of 100% Free Mock Tests and Topic Drills accessible immediately without requiring any credit card or payment. Premium Annual Passes and individual Course packages unlock our complete vault of advanced full-length mocks, live All-India tests, and deep diagnostic scorecards.',
    category: 'Passes & Access',
  },
  {
    q: 'Can I use PrepCoins to get discounts or free courses?',
    a: 'Yes! PrepMagnet rewards consistent study habits. Candidates earn PrepCoins by maintaining daily practice streaks, attempting mock tests, and achieving high percentiles. PrepCoins can be redeemed at checkout for up to 98% discount or even 100% free course enrollments.',
    category: 'PrepCoins & Rewards',
  },
];

export const COURSES_PAGE_FAQS = [
  {
    q: 'What is included in a PrepMagnet Course or Test Series package?',
    a: 'Every course package includes comprehensive full-length mock exams calibrated to the latest official notification, subject-wise topic quizzes, sectional speed tests, complete step-by-step mathematical and logical derivations for every question, and permanent All-India rank benchmarking.',
    category: 'Course Content',
  },
  {
    q: 'How long is my course enrollment and test series valid?',
    a: 'Standard courses include 12 months (365 days) of unlimited access from the moment of enrollment. All mock tests and quizzes within the package can be re-attempted anytime during this period, with prior attempt history saved in your student analytics dashboard.',
    category: 'Validity & Access',
  },
  {
    q: 'How do course packages differ from free mock tests?',
    a: 'While free mock tests provide introductory syllabus coverage, our full course packages contain curated tiered difficulty test series (Easy, Moderate, Hard, and Exam-Tough), previous year question (PYQ) replica sets, and targeted speed-enhancement quizzes designed by top-rank faculties.',
    category: 'Course Content',
  },
  {
    q: 'How are course test questions created and updated?',
    a: 'Our questions are engineered directly from official exam blueprints and recent TCS/NTA shifts. Content is regularly updated to reflect new question trends, changing weightages, and current affairs events. Every question passes double academic peer verification.',
    category: 'Quality & Syllabus',
  },
  {
    q: 'Can I re-attempt mock tests inside an enrolled course?',
    a: 'Yes! Candidates can re-attempt any test multiple times. Your latest attempt updates your active percentile, while your complete chronological score progression and accuracy curves remain accessible in your performance scorecard history.',
    category: 'Attempts & Scores',
  },
  {
    q: 'What payment methods are supported, and can I use PrepCoins?',
    a: 'All payments are processed through Razorpay using bank-grade 256-bit SSL encryption. We support UPI (Google Pay, PhonePe, Paytm), Net Banking from all major Indian banks, and Credit/Debit cards. You can also apply your earned PrepCoins for instant coin discounts at checkout.',
    category: 'Payments & Coins',
  },
];

export function getCourseDetailFaqs(course = {}) {
  const title = course.title || 'this test series';
  const exam = course.target_exam || 'this examination';
  const quizzesCount = course.total_quizzes || (course.quizzes ? course.quizzes.length : null) || 'all scheduled';

  return [
    {
      q: `What will I receive upon enrolling in ${title}?`,
      a: `You receive instant, unlimited 12-month access to ${quizzesCount} mock tests and quizzes included in this package, complete pedagogical explanations for every question, negative marking scorecards, and All-India percentile tracking calibrated for ${exam}.`,
      category: 'Enrollment',
    },
    {
      q: 'Can I preview quizzes and questions before purchasing?',
      a: 'Yes! Click the "Quick look" or "Preview" button on open quizzes in the syllabus outline above to examine questions, practice test-drive formats, and review detailed answer derivations before enrolling.',
      category: 'Preview & Syllabus',
    },
    {
      q: `Does this package strictly mirror the latest ${exam} notification?`,
      a: `Yes. The test blueprint for ${title} follows the exact subject weightage, question counts, negative marking ratio, and sectional timing mandated in the most recent official ${exam} examination notification.`,
      category: 'Exam Alignment',
    },
    {
      q: 'How soon can I start practicing after completing enrollment?',
      a: 'Access is instantaneous. As soon as checkout completes (or free enrollment via PrepCoins is confirmed), all quizzes and mock tests are immediately unlocked in your account with zero waiting period.',
      category: 'Instant Access',
    },
    {
      q: 'Can I attempt these mock tests on mobile or only on laptop/desktop?',
      a: 'PrepMagnet is fully responsive and optimized for both desktop and mobile web browsers. For authentic CBT exam-hall training, we recommend practicing full-length tests on laptop or desktop to get accustomed to keyboard locking and standard screen layouts.',
      category: 'Device Compatibility',
    },
  ];
}

export const TYPING_PAGE_FAQS = [
  {
    q: 'How is Net Typing Speed (WPM) calculated in the simulator?',
    a: 'Net WPM is calculated using the official commission formula: (Total Correct Keystrokes / 5 - Penalty for Errors) / Time in Minutes. This mirrors official SSC CGL, CHSL, and Railway evaluation standards so your practiced speed matches exam-day results.',
    category: 'Speed Formula',
  },
  {
    q: 'What is the qualifying typing speed for SSC CGL & CHSL?',
    a: 'For SSC CGL (DEST), the qualifying speed is 27 WPM (approx 2,000 key depressions in 15 minutes) with allowable error limit between 5% and 7%. For SSC CHSL, English typing requires 35 WPM (10,500 KDPH) and Hindi requires 30 WPM (9,000 KDPH).',
    category: 'Cutoff Criteria',
  },
  {
    q: 'Is backspace allowed in the typing test simulator?',
    a: 'Yes, backspace is allowed within the currently typed word, matching official CBT software behavior. The engine provides instant visual cues for correct, incorrect, and corrected keystrokes.',
    category: 'Keyboard Rules',
  },
];

