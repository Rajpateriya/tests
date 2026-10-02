import React, { useState, useEffect } from 'react';
import { api, DEMO_TESTS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClockIcon,
  SearchIcon,
  BookOpenIcon,
  SparklesIcon,
  PlayIcon,
  ArrowRightIcon,
  TrophyIcon,
  TargetIcon,
  ShieldIcon,
  ZapIcon,
  CheckCircleIcon,
  BarChart3Icon,
  FlameIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  CheckIcon,
  CrownIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  SendIcon,
  MessageSquareIcon,
} from '../components/Icons';
import { TestRulesModal } from '../components/TestRulesModal';

/**
 * TestDiscoveryPage — High-Conversion Academic Landing Page & Mock Test Catalog
 * Built with institutional rigor, inspiring copywriting, anti-AI aesthetics,
 * interactive hero test-drive sandbox, syllabus blueprint explorer, and percentile predictor.
 */
export const TestDiscoveryPage = ({ onStartTest, activeAttempt, onOpenAuthModal, onNavigate }) => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL'); // ALL | FULL | SUBJECT | TOPIC_MINI
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalTest, setModalTest] = useState(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState('engine'); // 'engine' | 'analytics' | 'solutions'

  // Interactive Blueprint Explorer State
  const [selectedExamBlueprint, setSelectedExamBlueprint] = useState('cgl'); // 'cgl' | 'banking' | 'rrb' | 'psc'

  // Interactive Target Score & Percentile Predictor Slider State
  const [targetScore, setTargetScore] = useState(148);

  // Interactive Hero Sandbox State (TCS iON Live Test-Drive)
  const [sandboxSelectedOption, setSandboxSelectedOption] = useState('A');
  const [sandboxPaletteState, setSandboxPaletteState] = useState('ANSWERED'); // 'ANSWERED' | 'REVIEW' | 'NOT_VISITED'
  const [showSandboxExplanation, setShowSandboxExplanation] = useState(false);

  // Interactive Passes Section State (Monthly vs Annual)
  const [landingBillingCycle, setLandingBillingCycle] = useState('yearly'); // 'yearly' | 'monthly'

  // Interactive Candidate Grievance & Helpdesk Form State
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactExam, setContactExam] = useState('SSC CGL (Tier I & II)');
  const [contactCategory, setContactCategory] = useState('Test Engine & Live Timers');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccessTicket, setContactSuccessTicket] = useState(null);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSubmitting(true);
    setTimeout(() => {
      const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
      setContactSuccessTicket(ticketId);
      setContactSubmitting(false);
    }, 750);
  };

  const handleResetContact = () => {
    setContactSuccessTicket(null);
    setContactMessage('');
  };

  useEffect(() => {
    loadTests();
  }, [selectedType, selectedSubject]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'ALL') params.test_type = selectedType;
      if (selectedSubject !== 'ALL') params.subject = selectedSubject;
      const res = await api.tests.list(params);
      setTests(res || DEMO_TESTS);
    } catch (err) {
      console.warn('Fallback to demo tests:', err);
      setTests(DEMO_TESTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.topic?.toLowerCase().includes(q)
    );
  });

  const getDifficultyBadge = (difficulty = 'MEDIUM') => {
    const diff = (difficulty || 'MEDIUM').toUpperCase();
    if (diff === 'EASY') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          Easy
        </span>
      );
    }
    if (diff === 'HARD') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          Hard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-charcoal-100 text-charcoal-700 border border-charcoal-300 dark:bg-charcoal-800 dark:text-charcoal-300 dark:border-charcoal-700">
        Medium
      </span>
    );
  };

  const handleTestCardClick = (test) => {
    if (!user && onOpenAuthModal) {
      onOpenAuthModal();
      return;
    }
    setModalTest(test);
  };

  // Percentile & Rank computation for the interactive predictor
  const calculatePercentile = (score) => {
    // Score range 80 to 200
    if (score < 90) return { percentile: 48.5, rank: '18,500+', tier: 'Below Tier-I Cutoff' };
    if (score < 115) return { percentile: 72.0, rank: '9,200 - 12,000', tier: 'Borderline Qualifying' };
    if (score < 135) return { percentile: 88.5, rank: '4,100 - 5,800', tier: 'Qualified for Non-Interview Posts' };
    if (score < 155) return { percentile: 97.4, rank: '850 - 1,450', tier: 'Strong Prospect: ASO in CSS / ITI' };
    if (score < 170) return { percentile: 99.2, rank: '180 - 450', tier: 'Top Tier: ASO in MEA / GST Inspector' };
    return { percentile: 99.8, rank: 'Top 50 Nationwide', tier: 'All-India Ranker Contender (AIR < 50)' };
  };

  const predictorResult = calculatePercentile(targetScore);

  // Exam Blueprint Data
  const EXAM_BLUEPRINTS = {
    cgl: {
      name: 'SSC CGL Tier-I (Combined Graduate Level)',
      targetRole: 'Assistant Section Officer (CSS/MEA), GST & Income Tax Inspector, Central Excise',
      totalQs: 100,
      totalMarks: 200,
      duration: '60 Minutes',
      negativeMark: '-0.50 per wrong response',
      safeScore: '142 - 158 Marks',
      sections: [
        { name: 'General Intelligence & Reasoning', qs: 25, marks: 50, time: '~14 mins' },
        { name: 'General Awareness & Static GK', qs: 25, marks: 50, time: '~8 mins' },
        { name: 'Quantitative Aptitude (Arithmetic + Adv)', qs: 25, marks: 50, time: '~24 mins' },
        { name: 'English Comprehension & Grammar', qs: 25, marks: 50, time: '~14 mins' },
      ],
    },
    banking: {
      name: 'IBPS / SBI PO Prelims Examination',
      targetRole: 'Probationary Officer (SBI, PNB, BoB, Canara Bank)',
      totalQs: 100,
      totalMarks: 100,
      duration: '60 Minutes (Strict 20-min Sectional Timers)',
      negativeMark: '-0.25 per wrong response',
      safeScore: '64 - 72 Marks',
      sections: [
        { name: 'English Language', qs: 30, marks: 30, time: 'Strict 20 mins' },
        { name: 'Quantitative Aptitude (DI Heavy)', qs: 35, marks: 35, time: 'Strict 20 mins' },
        { name: 'Reasoning Ability (Puzzles/Seating)', qs: 35, marks: 35, time: 'Strict 20 mins' },
      ],
    },
    rrb: {
      name: 'RRB NTPC CBT-1 (Non-Technical Popular Categories)',
      targetRole: 'Station Master, Commercial Apprentice, Goods Guard, Senior Clerk',
      totalQs: 100,
      totalMarks: 100,
      duration: '90 Minutes',
      negativeMark: '-0.33 per wrong response',
      safeScore: '78 - 86 Marks',
      sections: [
        { name: 'General Awareness & Science', qs: 40, marks: 40, time: '~25 mins' },
        { name: 'Mathematics (Speed & Arithmetic)', qs: 30, marks: 30, time: '~35 mins' },
        { name: 'General Intelligence & Reasoning', qs: 30, marks: 30, time: '~30 mins' },
      ],
    },
    psc: {
      name: 'State PSC Prelims (UPPSC / BPSC General Studies)',
      targetRole: 'Deputy Collector (SDM), Deputy SP, Assistant Commissioner (Revenue)',
      totalQs: 150,
      totalMarks: 200,
      duration: '120 Minutes',
      negativeMark: '-0.44 per wrong response',
      safeScore: '112 - 124 Marks',
      sections: [
        { name: 'Indian Polity & Governance', qs: 30, marks: 40, time: '~25 mins' },
        { name: 'History of India & National Movement', qs: 30, marks: 40, time: '~25 mins' },
        { name: 'General Science & Environment', qs: 30, marks: 40, time: '~25 mins' },
        { name: 'Geography & State Special GK', qs: 30, marks: 40, time: '~25 mins' },
        { name: 'Current Events & Economy', qs: 30, marks: 40, time: '~20 mins' },
      ],
    },
  };

  const activeBlueprint = EXAM_BLUEPRINTS[selectedExamBlueprint];

  return (
    <div className="relative overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-hero">
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-institutional-500/10 dark:bg-institutional-400/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-[680px] -left-36 w-[550px] h-[550px] bg-emerald-500/8 dark:bg-emerald-400/10 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[1500px] -right-36 w-[600px] h-[600px] bg-purple-500/8 dark:bg-purple-400/10 blur-[140px] rounded-full pointer-events-none animate-glow-pulse" />
      <div className="absolute top-[2300px] -left-20 w-[500px] h-[500px] bg-sky-500/8 dark:bg-sky-400/10 blur-[120px] rounded-full pointer-events-none animate-drift-slow" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-20 sm:space-y-28 relative z-10">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION: Inspiring, Authoritative Institutional Positioning       */}
        {/* ========================================================================= */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-6 animate-fade-in">
          {/* Live Activity & Pulse Indicator */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-xs font-bold shadow-subtle hover:border-institutional-400 transition-colors cursor-default select-none animate-float-slow">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
            </span>
            <span className="text-charcoal-600 dark:text-charcoal-300">
              1,420 Aspirants in Active Timed Simulation
            </span>
            <span className="text-institutional-700 dark:text-institutional-300 font-extrabold flex items-center">
              • All-India Mock #05 Live →
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-[1.12]">
            The Gold Standard in Mock Tests for Government Aspirants.
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-charcoal-600 dark:text-charcoal-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Calibrated strictly for <strong className="text-charcoal-900 dark:text-charcoal-100 font-bold">SSC CGL, Banking (IBPS/SBI PO), Railways (RRB NTPC)</strong>, and <strong className="text-charcoal-900 dark:text-charcoal-100 font-bold">State PSCs</strong>. Experience the exact TCS iON test interface, server-synchronized countdowns, official negative deduction rules, and deep diagnostic percentiles.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => {
                const el = document.getElementById('mock-catalog');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Explore Available Mocks (50+ Full Tests)</span>
              <ArrowRightIcon size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            {!user ? (
              <button
                onClick={onOpenAuthModal}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white dark:bg-charcoal-900 border border-charcoal-300 dark:border-charcoal-700 text-charcoal-800 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 font-bold text-sm transition-all shadow-subtle"
              >
                Sign In / Join Free
              </button>
            ) : (
              <button
                onClick={() => {
                  const firstTest = tests[0] || DEMO_TESTS[0];
                  onStartTest(firstTest);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-subtle flex items-center justify-center gap-2"
              >
                <PlayIcon size={14} />
                <span>Launch Quick Mock Exam</span>
              </button>
            )}
          </div>

          {/* Social Proof & Metrics Strip */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-charcoal-200/60 dark:border-charcoal-800/80">
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-100">
                48,500+
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Aspirants Evaluated</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                1:1
              </div>
              <div className="text-xs text-charcoal-500 font-medium">TCS iON Examination Engine</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-institutional-700 dark:text-institutional-300">
                -0.50
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Strict Negative Deduction</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-100">
                &lt; 200ms
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Server State Sync</div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ONGOING EXAM ALERT BANNER (If candidate left active test)              */}
        {/* ========================================================================= */}
        {activeAttempt && (
          <section className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lifted animate-pulse-subtle">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ClockIcon size={20} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                  Active Examination Session in Progress
                </span>
                <h3 className="font-extrabold text-base text-charcoal-900 dark:text-charcoal-100">
                  {activeAttempt.test_title}
                </h3>
              </div>
            </div>
            <button
              onClick={() => onStartTest(activeAttempt)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
            >
              <PlayIcon size={14} />
              <span>Resume Session Now</span>
            </button>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE HERO SANDBOX: "TCS iON Live Test-Drive"                    */}
        {/* Candidates can interactively experience the exam engine right on landing  */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl p-6 sm:p-8 shadow-card space-y-6 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200/90 dark:border-charcoal-800/90 overflow-hidden bg-terminal-pattern">
          {/* Moving Atmospheric Glows for Sandbox Lab */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-400/15 blur-3xl rounded-full pointer-events-none animate-blob" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-400/15 blur-3xl rounded-full pointer-events-none animate-blob-delayed" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 uppercase tracking-wider mb-1.5">
                <ZapIcon size={12} />
                <span>Interactive Live Preview</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-950 dark:text-white">
                Experience the Exam Room Sandbox
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
                Click any option below to test the TCS iON question palette states and see instant mathematical derivations.
              </p>
            </div>

            {/* Simulated Timer Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 font-mono text-xs font-bold text-charcoal-800 dark:text-charcoal-200 self-start md:self-auto">
              <ClockIcon size={14} className="text-institutional-600" />
              <span>Time Left: 48:15</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: The Live Question Card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-charcoal-500 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
                <span>Quantitative Aptitude • Section 2 of 4</span>
                <span className="text-institutional-600 dark:text-institutional-400 font-mono font-bold">+2.00 / -0.50 Marks</span>
              </div>

              <div className="text-sm sm:text-base font-semibold text-charcoal-900 dark:text-charcoal-100 leading-question">
                <strong>Q14.</strong> A person marks an article 35% above its cost price and allows a cash discount of 20% on the marked price. If the net profit earned by the merchant is ₹140, what is the original cost price (CP) of the article?
              </div>

              {/* Clickable Option Rows */}
              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'A', text: '₹1,750 (Correct)', value: 'A' },
                  { id: 'B', text: '₹1,650', value: 'B' },
                  { id: 'C', text: '₹1,800', value: 'C' },
                  { id: 'D', text: '₹1,500', value: 'D' },
                ].map((opt) => {
                  const isSelected = sandboxSelectedOption === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setSandboxSelectedOption(opt.id);
                        setSandboxPaletteState('ANSWERED');
                      }}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-institutional-500 bg-institutional-50/70 dark:bg-institutional-950/40 text-institutional-900 dark:text-institutional-100 shadow-sm ring-1 ring-institutional-500'
                          : 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/40 text-charcoal-800 dark:text-charcoal-200 hover:border-charcoal-350 dark:hover:border-charcoal-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-institutional-600 text-white'
                              : 'bg-white dark:bg-charcoal-800 border border-charcoal-300 dark:border-charcoal-600 text-charcoal-700 dark:text-charcoal-300'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isSelected && <CheckIcon size={16} className="text-institutional-600 dark:text-institutional-400" />}
                    </div>
                  );
                })}
              </div>

              {/* Sandbox Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSandboxPaletteState('REVIEW');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    Mark for Review
                  </button>
                  <button
                    onClick={() => {
                      setSandboxSelectedOption(null);
                      setSandboxPaletteState('NOT_VISITED');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 text-xs font-semibold hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
                  >
                    Clear Response
                  </button>
                </div>

                <button
                  onClick={() => setShowSandboxExplanation(!showSandboxExplanation)}
                  className="px-4 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <HelpCircleIcon size={14} />
                  <span>{showSandboxExplanation ? 'Hide Concept Derivation' : 'Show Step-by-Step Derivation'}</span>
                </button>
              </div>

              {/* Expandable Explanation Card */}
              {showSandboxExplanation && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs sm:text-sm text-charcoal-800 dark:text-charcoal-200 space-y-2 animate-slide-up">
                  <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircleIcon size={16} />
                    <span>Rigorous Mathematical Proof & Shortcut:</span>
                  </div>
                  <div className="font-mono text-xs bg-white dark:bg-charcoal-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 leading-relaxed">
                    Let Cost Price (CP) = 100x<br />
                    Marked Price (MP) = 100x + 35% of 100x = 135x<br />
                    Selling Price (SP) after 20% discount = 135x × (1 - 0.20) = 135x × 0.80 = 108x<br />
                    Profit = SP - CP = 108x - 100x = 8x<br />
                    Given: 8x = ₹140  =&gt;  x = 140 / 8 = 17.5<br />
                    Hence, Cost Price (CP) = 100 × 17.5 = <strong>₹1,750</strong>. (Correct: Option A)
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Live TCS iON Question Palette Demo */}
            <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-charcoal-200 dark:border-charcoal-750 text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-charcoal-300">
                  <span>Question Palette</span>
                  <span className="text-[11px] font-mono text-institutional-600">Q 14 of 25</span>
                </div>

                {/* 5-State Color Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-charcoal-600 dark:text-charcoal-400 py-3 border-b border-charcoal-200 dark:border-charcoal-750">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[8px]">✕</span>
                    <span>Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[8px]">●</span>
                    <span>Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300 flex items-center justify-center font-bold text-[8px]">-</span>
                    <span>Not Visited</span>
                  </div>
                </div>

                {/* 25 Question Tiles Grid */}
                <div className="grid grid-cols-5 gap-1.5 pt-3">
                  {Array.from({ length: 25 }, (_, i) => {
                    const qNum = i + 1;
                    const isCurrent = qNum === 14;

                    let bgClass = 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700';

                    if (isCurrent) {
                      if (sandboxPaletteState === 'ANSWERED') {
                        bgClass = 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400';
                      } else if (sandboxPaletteState === 'REVIEW') {
                        bgClass = 'bg-purple-600 text-white font-bold ring-2 ring-purple-400';
                      } else {
                        bgClass = 'bg-rose-600 text-white font-bold ring-2 ring-rose-400';
                      }
                    } else if (qNum < 14) {
                      // Some previously answered
                      if (qNum % 4 === 0) bgClass = 'bg-purple-600 text-white font-bold';
                      else if (qNum % 3 === 0) bgClass = 'bg-rose-600 text-white font-bold';
                      else bgClass = 'bg-emerald-600 text-white font-bold';
                    }

                    return (
                      <div
                        key={qNum}
                        className={`h-8 rounded flex items-center justify-center text-xs font-mono transition-transform hover:scale-105 select-none ${bgClass}`}
                      >
                        {qNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 text-center font-medium">
                Try clicking choices on the left to watch Q14 update automatically.
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. INTERACTIVE EXAM BLUEPRINT & SYLLABUS EXPLORER                         */}
        {/* Deep, authentic examination intelligence for aspirants                    */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl p-6 sm:p-10 shadow-subtle space-y-6 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 overflow-hidden bg-blueprint-pattern">
          {/* Moving Blueprint Technical Aura */}
          <div className="absolute top-1/4 -right-16 w-80 h-80 bg-institutional-500/10 dark:bg-institutional-400/15 blur-[100px] rounded-full pointer-events-none animate-drift-slow" />
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-indigo-500/8 dark:bg-indigo-400/12 blur-[90px] rounded-full pointer-events-none animate-blob-delayed" />

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-600 dark:text-institutional-400 uppercase tracking-wider mb-1">
                <BookOpenIcon size={14} />
                <span>Exam Pattern & Blueprint</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
                Official Examination Specifications
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
                Explore section weightages, negative penalties, and recommended timing splits.
              </p>
            </div>

            {/* Exam Selector Tabs */}
            <div className="inline-flex p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold gap-1 overflow-x-auto">
              {[
                { id: 'cgl', label: 'SSC CGL' },
                { id: 'banking', label: 'IBPS / SBI PO' },
                { id: 'rrb', label: 'RRB NTPC' },
                { id: 'psc', label: 'State PSC' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedExamBlueprint(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedExamBlueprint === tab.id
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint Detail Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-xs">
              <div>
                <span className="text-charcoal-400 uppercase font-bold text-[10px]">Total Questions</span>
                <div className="font-extrabold text-base text-charcoal-900 dark:text-charcoal-100 font-mono">{activeBlueprint.totalQs} Questions</div>
              </div>
              <div>
                <span className="text-charcoal-400 uppercase font-bold text-[10px]">Maximum Marks</span>
                <div className="font-extrabold text-base text-charcoal-900 dark:text-charcoal-100 font-mono">{activeBlueprint.totalMarks} Marks</div>
              </div>
              <div>
                <span className="text-charcoal-400 uppercase font-bold text-[10px]">Duration</span>
                <div className="font-extrabold text-base text-institutional-600 dark:text-institutional-400 font-mono">{activeBlueprint.duration}</div>
              </div>
              <div>
                <span className="text-charcoal-400 uppercase font-bold text-[10px]">Negative Penalty</span>
                <div className="font-extrabold text-base text-rose-600 dark:text-rose-400 font-mono">{activeBlueprint.negativeMark}</div>
              </div>
            </div>

            {/* Section Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 uppercase tracking-wider font-bold">
                    <th className="pb-3 pr-4">Syllabus Section</th>
                    <th className="pb-3 px-4">Questions</th>
                    <th className="pb-3 px-4">Maximum Marks</th>
                    <th className="pb-3 pl-4">Recommended Time Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                  {activeBlueprint.sections.map((sec, idx) => (
                    <tr key={idx} className="hover:bg-charcoal-50/50 dark:hover:bg-charcoal-850/40">
                      <td className="py-3 pr-4 font-bold text-charcoal-900 dark:text-charcoal-100">{sec.name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-charcoal-700 dark:text-charcoal-300">{sec.qs} Qs</td>
                      <td className="py-3 px-4 font-mono font-semibold text-charcoal-700 dark:text-charcoal-300">{sec.marks} Marks</td>
                      <td className="py-3 pl-4 font-mono font-semibold text-institutional-600 dark:text-institutional-400">{sec.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-institutional-50 dark:bg-institutional-950/40 border border-institutional-200 dark:border-institutional-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-institutional-900 dark:text-institutional-200">Target Role Scope: </span>
                <span className="text-institutional-700 dark:text-institutional-300">{activeBlueprint.targetRole}</span>
              </div>
              <div className="font-mono font-bold text-institutional-800 dark:text-institutional-200 shrink-0">
                Safe Target: {activeBlueprint.safeScore}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. INTERACTIVE TARGET SCORE & AIR PERCENTILE PREDICTOR                    */}
        {/* Engaging visual tool that calculates candidate standing in real time      */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-10 shadow-subtle space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <TargetIcon size={14} />
              <span>All-India Benchmark Calculator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
              Target Score & Rank Predictor
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Slide to your target raw score out of 200 to see your projected All-India standing and post eligibility.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6 pt-2">
            {/* Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-charcoal-500">Tier-I Raw Score (out of 200)</span>
                <span className="text-xl font-extrabold font-mono text-institutional-600 dark:text-institutional-400">
                  {targetScore} / 200 Marks
                </span>
              </div>
              <input
                type="range"
                min="80"
                max="195"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full h-2.5 bg-charcoal-200 dark:bg-charcoal-700 rounded-lg appearance-none cursor-pointer accent-institutional-600"
              />
              <div className="flex justify-between text-[11px] text-charcoal-400 font-mono">
                <span>80 (Cutoff baseline)</span>
                <span>135 (Qualified)</span>
                <span>165 (Top 500)</span>
                <span>195 (AIR 1 Territory)</span>
              </div>
            </div>

            {/* Real-time Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Predicted Percentile</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {predictorResult.percentile}%ile
                </div>
              </div>

              <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Projected All-India Rank</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-institutional-600 dark:text-institutional-400">
                  {predictorResult.rank}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Selection Assessment</span>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100 pt-1 leading-snug">
                  {predictorResult.tier}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. INSTITUTIONAL RIGOR: Real Engine vs Diagnostics vs Derivations          */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl p-6 sm:p-10 shadow-subtle space-y-8 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 overflow-hidden bg-nodes-pattern">
          {/* Moving Neural Analytics Glowing Core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 blur-[110px] rounded-full pointer-events-none animate-glow-pulse" />
          <div className="absolute top-0 right-10 w-64 h-64 bg-cyan-500/8 dark:bg-cyan-400/10 blur-[90px] rounded-full pointer-events-none animate-float-slow" />

          <div className="text-center max-w-2xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-charcoal-50">
              Engineered with Institutional Rigor
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Built specifically to eliminate exam-day friction and accurately predict your All-India Standing.
            </p>

            {/* Interactive Capability Tabs */}
            <div className="inline-flex p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-full text-xs font-bold gap-1 mt-4">
              <button
                onClick={() => setActiveFeatureTab('engine')}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeFeatureTab === 'engine'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                }`}
              >
                1. TCS iON Exam Engine
              </button>
              <button
                onClick={() => setActiveFeatureTab('analytics')}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeFeatureTab === 'analytics'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                }`}
              >
                2. Deep Percentile Analytics
              </button>
              <button
                onClick={() => setActiveFeatureTab('solutions')}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeFeatureTab === 'solutions'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                }`}
              >
                3. Mathematical Derivations
              </button>
            </div>
          </div>

          {/* Interactive Feature Display Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Box 1 */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                activeFeatureTab === 'engine'
                  ? 'border-institutional-500 bg-institutional-50/50 dark:bg-institutional-950/20 shadow-md ring-1 ring-institutional-500/20'
                  : 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300 flex items-center justify-center font-bold mb-4">
                <ClockIcon size={20} />
              </div>
              <h3 className="font-bold text-base text-charcoal-900 dark:text-charcoal-100 mb-2">
                Server-Synchronized Engine
              </h3>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed mb-4">
                Exact replica of the official examination layout. Countdown timers run on the server clock, preventing client tampering or timing drift.
              </p>
              <ul className="text-xs space-y-1.5 text-charcoal-700 dark:text-charcoal-300 font-medium">
                <li className="flex items-center gap-2">✓ Official 5-State Question Palette</li>
                <li className="flex items-center gap-2">✓ Strict -0.50 Mark Deduction Rules</li>
                <li className="flex items-center gap-2">✓ 8-Second Auto Heartbeat Sync</li>
              </ul>
            </div>

            {/* Box 2 */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                activeFeatureTab === 'analytics'
                  ? 'border-institutional-500 bg-institutional-50/50 dark:bg-institutional-950/20 shadow-md ring-1 ring-institutional-500/20'
                  : 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold mb-4">
                <BarChart3Icon size={20} />
              </div>
              <h3 className="font-bold text-base text-charcoal-900 dark:text-charcoal-100 mb-2">
                Percentile & Speed Diagnostics
              </h3>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed mb-4">
                Compare your dwell time against question difficulty. Identify whether wrong answers stemmed from conceptual confusion or hurried pacing.
              </p>
              <ul className="text-xs space-y-1.5 text-charcoal-700 dark:text-charcoal-300 font-medium">
                <li className="flex items-center gap-2">✓ All-India Standing Calibration</li>
                <li className="flex items-center gap-2">✓ Speed vs. Accuracy Tradeoff Curve</li>
                <li className="flex items-center gap-2">✓ Weak Syllabus Topic Isolator</li>
              </ul>
            </div>

            {/* Box 3 */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                activeFeatureTab === 'solutions'
                  ? 'border-institutional-500 bg-institutional-50/50 dark:bg-institutional-950/20 shadow-md ring-1 ring-institutional-500/20'
                  : 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold mb-4">
                <HelpCircleIcon size={20} />
              </div>
              <h3 className="font-bold text-base text-charcoal-900 dark:text-charcoal-100 mb-2">
                Rigorous Concept Derivations
              </h3>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed mb-4">
                Every single solution contains step-by-step mathematical reasoning, formula shortcuts, and official PYQ cross-references.
              </p>
              <ul className="text-xs space-y-1.5 text-charcoal-700 dark:text-charcoal-300 font-medium">
                <li className="flex items-center gap-2">✓ Multi-Method Shortcut Proofs</li>
                <li className="flex items-center gap-2">✓ Soft Red/Green Highlighting</li>
                <li className="flex items-center gap-2">✓ Bookmark for Weekly Revision</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. MOCK TEST CATALOG: Search, Filter Tabs & Interactive Cards             */}
        {/* ========================================================================= */}
        <section id="mock-catalog" className="relative rounded-3xl p-6 sm:p-8 space-y-6 pt-6 scroll-mt-24 bg-white/60 dark:bg-charcoal-900/60 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 overflow-hidden bg-dots-pattern shadow-subtle">
          {/* Moving Atmospheric Library Glows */}
          <div className="absolute -top-32 left-1/4 w-[500px] h-[350px] bg-institutional-500/10 dark:bg-institutional-500/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
          <div className="absolute top-1/2 -right-20 w-[450px] h-[450px] bg-sky-500/10 dark:bg-sky-500/15 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
          <div className="absolute -bottom-24 left-10 w-[400px] h-[400px] bg-emerald-500/8 dark:bg-emerald-500/12 blur-[100px] rounded-full pointer-events-none animate-drift-slow" />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-600 dark:text-institutional-400 uppercase tracking-wider mb-1">
                <BookOpenIcon size={14} />
                <span>Test Catalog</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
                Available Mock Examinations
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
                Filter by full syllabus papers, subject speed drills, or high-yield topic boosters.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Mocks' },
                { id: 'FULL', label: 'Full Mocks' },
                { id: 'SUBJECT', label: 'Subject Drills' },
                { id: 'TOPIC_MINI', label: 'Topic Mini Drills' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedType === tab.id
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Subject Bar */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl p-3 sm:p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ALL">All Subjects</option>
                <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                <option value="General Intelligence & Reasoning">General Intelligence</option>
                <option value="English Comprehension">English Comprehension</option>
                <option value="General Awareness">General Awareness</option>
              </select>

              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Search by topic (e.g. Geometry, Syllogisms)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>
            </div>

            <div className="text-xs text-charcoal-400 font-mono">
              Showing <strong>{filteredTests.length}</strong> configured exams
            </div>
          </div>

          {/* Test Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-56 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-12 text-center space-y-3">
              <BookOpenIcon size={36} className="text-charcoal-400 mx-auto" />
              <h3 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">
                No mock tests found matching criteria
              </h3>
              <p className="text-xs text-charcoal-500">
                Try clearing your search keyword or switching to 'All Mocks' tab above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => (
                <article
                  key={test.id}
                  className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 shadow-subtle hover:border-charcoal-350 dark:hover:border-charcoal-700 hover:-translate-y-1 hover:shadow-card transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Type Pill & Difficulty */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400 border border-charcoal-200 dark:border-charcoal-700">
                        {test.test_type === 'FULL' ? 'Full Mock' : test.test_type === 'SUBJECT' ? 'Subject Mock' : 'Topic Drill'}
                      </span>
                      {getDifficultyBadge(test.difficulty)}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-charcoal-900 dark:text-charcoal-100 mb-2 line-clamp-2 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                      {test.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400 line-clamp-2 mb-4 leading-relaxed font-normal">
                      {test.description || 'Full TCS iON test simulation with negative marking and instant scorecard.'}
                    </p>

                    {/* Subject Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200/60 dark:border-institutional-800/40">
                        {test.subject || 'Full Syllabus'}
                      </span>
                      {test.topic && (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700">
                          {test.topic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Metadata + Actions */}
                  <div className="pt-4 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs text-charcoal-500 font-mono">
                      <span className="flex items-center gap-1 font-semibold">
                        <ClockIcon size={13} className="text-charcoal-400" />
                        {test.duration_minutes}m
                      </span>
                      <span>•</span>
                      <span>{test.total_questions || 25} Qs</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestCardClick(test)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
                      >
                        Rules
                      </button>
                      <button
                        onClick={() => handleTestCardClick(test)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 rounded-lg transition-colors shadow-sm"
                      >
                        <span>Start</span>
                        <PlayIcon size={10} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 8. COMPARISON SECTION: Generic Mock Portals vs. GovExam Pro               */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl p-6 sm:p-10 shadow-subtle space-y-6 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 overflow-hidden bg-ledger-pattern">
          {/* Moving Atmospheric Audit Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/8 dark:bg-amber-400/12 blur-[100px] rounded-full pointer-events-none animate-blob" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-institutional-600/8 dark:bg-institutional-500/12 blur-[100px] rounded-full pointer-events-none animate-blob-delayed" />

          <div className="text-center max-w-xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-charcoal-900 dark:text-charcoal-100">
              Why Serious Rankers Choose GovExam Pro
            </h2>
            <p className="text-xs text-charcoal-500">
              Don't be fooled by inflated mock scores that give false confidence before the official exam.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Evaluation Metric</th>
                  <th className="pb-3 px-4 text-rose-700 dark:text-rose-400">Generic Test Series</th>
                  <th className="pb-3 px-4 text-emerald-700 dark:text-emerald-400 font-extrabold">GovExam Pro Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-charcoal-800 dark:text-charcoal-200">
                    Exam Room Simulation
                  </td>
                  <td className="py-3.5 px-4 text-charcoal-500">
                    Generic web forms with distracting popups and ads.
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-semibold">
                    1:1 Pixel-exact TCS iON examination room layout.
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-charcoal-800 dark:text-charcoal-200">
                    Marking & Penalties
                  </td>
                  <td className="py-3.5 px-4 text-charcoal-500">
                    Soft or optional negative deductions.
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-semibold">
                    Rigorous -0.50 marks deduction and unattempted tracking.
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-charcoal-800 dark:text-charcoal-200">
                    Percentile Benchmarking
                  </td>
                  <td className="py-3.5 px-4 text-charcoal-500">
                    Arbitrary percentage scores without peer ranking.
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-semibold">
                    Real percentile computed against 45,000+ serious aspirants.
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-charcoal-800 dark:text-charcoal-200">
                    Explanations & Concept Notes
                  </td>
                  <td className="py-3.5 px-4 text-charcoal-500">
                    1-line answers with skipped formulas.
                  </td>
                  <td className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-semibold">
                    Step-by-step mathematical proofs with formula shortcuts.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. TOPPER STRATEGY NOTES & TESTIMONIALS                                    */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl p-6 sm:p-8 space-y-6 bg-gradient-to-b from-amber-500/[0.04] to-transparent border border-amber-200/50 dark:border-amber-800/30 overflow-hidden">
          {/* Moving Gold Achievement Aura */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-amber-500/10 dark:bg-amber-400/15 blur-[110px] rounded-full pointer-events-none animate-glow-pulse" />
          <div className="absolute -bottom-20 right-10 w-72 h-72 bg-emerald-500/8 dark:bg-emerald-400/12 blur-[100px] rounded-full pointer-events-none animate-blob-delayed" />

          <div className="text-center max-w-xl mx-auto space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <TrophyIcon size={14} />
              <span>Verified Selections</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
              Topper Strategies & Scorecards
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Insights from candidates who converted their preparation into top All-India ranks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-4 hover:border-charcoal-350 dark:hover:border-charcoal-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  AIR 142 • SSC CGL 2024
                </span>
                <span className="text-xs font-mono font-bold text-charcoal-500">Tier-I: 168/200</span>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed italic">
                "The weak area analytics identified my Geometry gap in Tier-I. Practiced 8 mini-mocks and jumped from 135 to 168 marks. Selected as Assistant Section Officer in MEA!"
              </p>
              <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-xs">
                  S
                </div>
                <div>
                  <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Saurabh Mishra</div>
                  <div className="text-[11px] text-charcoal-400">ASO in Ministry of External Affairs</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-4 hover:border-charcoal-350 dark:hover:border-charcoal-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  Selected • IBPS PO XVI
                </span>
                <span className="text-xs font-mono font-bold text-charcoal-500">Prelims: 76.5/100</span>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed italic">
                "The strict 20-minute sectional timer simulation and the exact TCS iON palette made the actual exam day feel completely familiar. Zero exam anxiety!"
              </p>
              <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  A
                </div>
                <div>
                  <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Ananya Deshmukh</div>
                  <div className="text-[11px] text-charcoal-400">Probationary Officer (State Bank)</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-4 hover:border-charcoal-350 dark:hover:border-charcoal-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  Inspector (Central Excise)
                </span>
                <span className="text-xs font-mono font-bold text-charcoal-500">Quant: 48/50</span>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed italic">
                "The step-by-step solutions with short-cut tricks saved me at least 25 seconds per quant question. That extra 8 minutes in English secured my final post."
              </p>
              <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  R
                </div>
                <div>
                  <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Rohit Verma</div>
                  <div className="text-[11px] text-charcoal-400">Central Board of Indirect Taxes (CBIC)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. ASPIRANT PASSES & ALL-ACCESS MEMBERSHIP TIERS                         */}
        {/* Compact, Sleek, Animated Cards with Monthly/Annual Cycle & Hover Effects  */}
        {/* ========================================================================= */}
        <section id="passes-section" className="relative rounded-3xl p-6 sm:p-10 space-y-8 scroll-mt-24 bg-white/70 dark:bg-charcoal-900/70 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 overflow-hidden bg-mesh-passes shadow-card">
          {/* Moving Atmospheric Pass Glows */}
          <div className="absolute -top-24 -left-20 w-[450px] h-[450px] bg-institutional-500/15 dark:bg-institutional-400/20 blur-[130px] rounded-full pointer-events-none animate-blob" />
          <div className="absolute -bottom-24 -right-20 w-[500px] h-[500px] bg-indigo-500/15 dark:bg-indigo-400/20 blur-[140px] rounded-full pointer-events-none animate-blob-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/8 dark:bg-emerald-400/12 blur-[100px] rounded-full pointer-events-none animate-float-slow" />

          <div className="text-center max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
              <CrownIcon size={14} />
              <span>Aspirant Passes & Memberships</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
              Targeted Passes Built for Exam Cycles
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Full-length official simulations, deep error analytics, and All-India percentile tracking.
            </p>

            {/* Monthly vs Annual Toggle */}
            <div className="inline-flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-full border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold gap-1 mt-1 shadow-inner">
              <button
                type="button"
                className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                  landingBillingCycle === 'monthly'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                }`}
                onClick={() => setLandingBillingCycle('monthly')}
              >
                Monthly Pass
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                  landingBillingCycle === 'yearly'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                }`}
                onClick={() => setLandingBillingCycle('yearly')}
              >
                <span>Annual Pass</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  SAVE 40%
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid: Compact ~340px height with rich hover lift & glow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch max-w-5xl mx-auto">
            {/* Card 1: Basic Aspirant */}
            <div className="group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_35px_-10px_rgba(37,99,235,0.18)] dark:hover:shadow-[0_20px_35px_-10px_rgba(59,130,246,0.25)] bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle hover:border-institutional-400 dark:hover:border-institutional-500 overflow-hidden">
              <div className="absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-institutional-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                    Basic Aspirant
                  </h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400">
                    Starter
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mb-3 line-clamp-1 leading-normal">
                  Essential tier-1 mocks and sectional drills for syllabus pacing.
                </p>

                <div className="flex items-baseline gap-1.5 pb-3 border-b border-charcoal-150 dark:border-charcoal-800 mb-3">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-charcoal-950 dark:text-white tracking-tight">
                    ₹{landingBillingCycle === 'yearly' ? 299 : 99}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-500">
                    {landingBillingCycle === 'yearly' ? '/yr' : '/mo'}
                  </span>
                  {landingBillingCycle === 'yearly' && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ₹25/mo
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  {[
                    '15 Full-Length Tier-I Mock Tests',
                    '50 Topic-wise Speed Drills',
                    'Standard TCS iON Exam Engine UI',
                    'Instant Scorecard & Negative Marking',
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircleIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-charcoal-100 dark:border-charcoal-800/80">
                <button
                  onClick={() => onNavigate ? onNavigate('subscription') : onOpenAuthModal()}
                  className="w-full py-2 rounded-xl font-bold text-xs border border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-500 text-charcoal-800 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 group/btn active:scale-[0.98]"
                >
                  <span>Select Basic Pass</span>
                  <ArrowRightIcon size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Card 2: Pro Ranker (Featured) */}
            <div className="group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_35px_-10px_rgba(37,99,235,0.22)] dark:hover:shadow-[0_20px_35px_-10px_rgba(59,130,246,0.3)] bg-white dark:bg-charcoal-900 border-2 border-institutional-600 dark:border-institutional-500 shadow-lifted md:-translate-y-1 ring-1 ring-institutional-500/30 hover:border-institutional-500 overflow-hidden">
              <div className="absolute top-0 right-0">
                <div className="bg-gradient-to-r from-institutional-600 to-indigo-600 text-white font-extrabold text-[9px] tracking-wider uppercase px-2.5 py-0.5 rounded-bl-xl shadow-sm flex items-center gap-1">
                  <SparklesIcon size={10} className="animate-spin-slow" />
                  <span>MOST POPULAR</span>
                </div>
              </div>

              <div className="absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-institutional-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                    Pro Ranker
                  </h3>
                </div>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mb-3 line-clamp-1 leading-normal">
                  All-India percentile rankings, speed vs accuracy diagnostics.
                </p>

                <div className="flex items-baseline gap-1.5 pb-3 border-b border-charcoal-150 dark:border-charcoal-800 mb-3">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-charcoal-950 dark:text-white tracking-tight">
                    ₹{landingBillingCycle === 'yearly' ? 699 : 199}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-500">
                    {landingBillingCycle === 'yearly' ? '/yr' : '/mo'}
                  </span>
                  {landingBillingCycle === 'yearly' && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ₹58/mo
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  {[
                    'Unlimited Full, Subject & Topic Mocks',
                    'All-India Percentile & AIR Benchmark',
                    'Speed vs. Accuracy Tradeoff Diagnostics',
                    'Full Mathematical Proofs & Short-cuts',
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircleIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-charcoal-100 dark:border-charcoal-800/80">
                <button
                  onClick={() => onNavigate ? onNavigate('subscription') : onOpenAuthModal()}
                  className="w-full py-2 rounded-xl font-bold text-xs bg-institutional-600 hover:bg-institutional-700 text-white shadow-institutional-600/20 hover:shadow-md transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 group/btn active:scale-[0.98]"
                >
                  <span>Activate Pro Ranker</span>
                  <ArrowRightIcon size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Card 3: Max Ultimate */}
            <div className="group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_35px_-10px_rgba(37,99,235,0.18)] dark:hover:shadow-[0_20px_35px_-10px_rgba(59,130,246,0.25)] bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle hover:border-institutional-400 dark:hover:border-institutional-500 overflow-hidden">
              <div className="absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-institutional-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                    Max Ultimate
                  </h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400">
                    All-Access
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mb-3 line-clamp-1 leading-normal">
                  Multi-exam coverage across SSC, Banking, Railways & PSCs.
                </p>

                <div className="flex items-baseline gap-1.5 pb-3 border-b border-charcoal-150 dark:border-charcoal-800 mb-3">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-charcoal-950 dark:text-white tracking-tight">
                    ₹{landingBillingCycle === 'yearly' ? 1299 : 299}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-500">
                    {landingBillingCycle === 'yearly' ? '/yr' : '/mo'}
                  </span>
                  {landingBillingCycle === 'yearly' && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ₹108/mo
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  {[
                    'Multi-Exam Access (SSC, Banking, RRB, PSC)',
                    'Unlimited Dynamic Auto Mock Generator',
                    'High-Yield Theory Compendiums (PDF)',
                    'Priority Doubt Resolution Helpline',
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircleIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-charcoal-100 dark:border-charcoal-800/80">
                <button
                  onClick={() => onNavigate ? onNavigate('subscription') : onOpenAuthModal()}
                  className="w-full py-2 rounded-xl font-bold text-xs border border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-500 text-charcoal-800 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 group/btn active:scale-[0.98]"
                >
                  <span>Select Max Pass</span>
                  <ArrowRightIcon size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. CANDIDATE GRIEVANCE REDRESSAL & CONTACT SECTION                      */}
        {/* Transparent Institutional Support Desk & Interactive Ticket Form          */}
        {/* ========================================================================= */}
        <section id="contact-section" className="relative rounded-3xl p-6 sm:p-10 space-y-8 scroll-mt-24 bg-white/70 dark:bg-charcoal-900/70 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 overflow-hidden bg-mesh-contact shadow-card">
          {/* Moving Atmospheric Support Glows */}
          <div className="absolute -top-24 right-1/4 w-[450px] h-[450px] bg-emerald-500/12 dark:bg-emerald-400/18 blur-[120px] rounded-full pointer-events-none animate-blob" />
          <div className="absolute -bottom-24 left-1/4 w-[450px] h-[450px] bg-institutional-500/12 dark:bg-institutional-400/18 blur-[120px] rounded-full pointer-events-none animate-blob-delayed" />
          <div className="absolute top-1/3 left-10 w-64 h-64 bg-cyan-500/8 dark:bg-cyan-400/12 blur-[100px] rounded-full pointer-events-none animate-drift-slow" />

          <div className="text-center max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
              <MailIcon size={14} />
              <span>Aspirant Helpdesk & Grievance Redressal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
              Official Candidate Support Desk
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Have a dispute regarding an answer key, scoring formula, timer physics, or membership? We are committed to complete academic transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
            {/* Left Column: Direct Official Contact Directory (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
                  <div className="w-10 h-10 rounded-xl bg-institutional-50 dark:bg-institutional-950 text-institutional-600 dark:text-institutional-400 flex items-center justify-center font-bold">
                    <ShieldIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                      Direct Support Directory
                    </h3>
                    <p className="text-[11px] text-charcoal-400">
                      Guaranteed candidate service response
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Helpline */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 mt-0.5 text-institutional-600 dark:text-institutional-400">
                      <PhoneIcon size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                        Aspirant Toll-Free Helpline
                      </div>
                      <div className="font-extrabold text-charcoal-900 dark:text-charcoal-100 font-mono text-sm">
                        +91 (011) 4892-0190
                      </div>
                      <div className="text-[11px] text-charcoal-500">
                        Toll-Free: 1800-890-EXAM (3926)
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 mt-0.5 text-institutional-600 dark:text-institutional-400">
                      <MailIcon size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                        Academic Coordination Email
                      </div>
                      <a
                        href="mailto:support@govexampro.edu.in"
                        className="font-bold text-institutional-600 dark:text-institutional-400 hover:underline block"
                      >
                        support@govexampro.edu.in
                      </a>
                      <div className="text-[11px] text-charcoal-500">
                        Disputes reviewed by subject matter leads
                      </div>
                    </div>
                  </div>

                  {/* Physical Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 mt-0.5 text-institutional-600 dark:text-institutional-400">
                      <MapPinIcon size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                        Academic Headquarters
                      </div>
                      <div className="font-medium text-charcoal-700 dark:text-charcoal-300">
                        Pragati Maidan Complex, Institutional Area
                      </div>
                      <div className="text-[11px] text-charcoal-500">
                        New Delhi 110001, India
                      </div>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 mt-0.5 text-institutional-600 dark:text-institutional-400">
                      <ClockIcon size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                        Active Support Hours
                      </div>
                      <div className="font-medium text-charcoal-700 dark:text-charcoal-300">
                        07:00 AM – 11:00 PM IST
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        7 Days a Week • Active During Live Mocks
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response SLA Guarantee Badge */}
                <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800/60 border border-charcoal-200 dark:border-charcoal-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                    <CheckCircleIcon size={14} className="text-emerald-600" />
                    <span>Academic SLA Guarantee</span>
                  </div>
                  <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 leading-relaxed">
                    All question key challenges and test engine inquiries receive written analysis from verified faculty within <strong>2 hours</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Grievance & Contact Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-6">
                {contactSuccessTicket ? (
                  /* Success Confirmation Screen */
                  <div className="text-center py-6 space-y-4 animate-scale-in">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border-2 border-emerald-300 dark:border-emerald-700">
                      <CheckCircleIcon size={32} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
                        Candidate Grievance Lodged Successfully
                      </h3>
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400 max-w-md mx-auto">
                        Your inquiry has been encrypted and assigned to our subject review team. A confirmation dispatch has been logged.
                      </p>
                    </div>

                    {/* Ticket Badge */}
                    <div className="inline-block p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-center font-mono">
                      <div className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider">
                        Official Ticket Reference
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-institutional-600 dark:text-institutional-400 pt-0.5">
                        #{contactSuccessTicket}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto text-left space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ClockIcon size={13} />
                        <span>Expected Turnaround: Under 90 Minutes</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                        Updates will be dispatched directly to <strong>{contactEmail}</strong> regarding stream <strong>{contactExam}</strong>.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetContact}
                        className="px-5 py-2.5 rounded-xl bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold text-xs hover:bg-charcoal-800 transition-colors shadow-sm"
                      >
                        Submit Another Inquiry
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Submission Form */
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-charcoal-900 dark:text-charcoal-100 flex items-center gap-2">
                        <MessageSquareIcon size={18} className="text-institutional-600" />
                        <span>Submit Academic Inquiry or Grievance</span>
                      </h3>
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                        Fill out the details below for prioritized support from our educational panel.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="contact-name"
                          className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300"
                        >
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-3.5 py-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 text-xs focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all placeholder-charcoal-400"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="contact-email"
                          className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300"
                        >
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="rahul.aspirant@gmail.com"
                          className="w-full px-3.5 py-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 text-xs focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all placeholder-charcoal-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Target Exam */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="contact-exam"
                          className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300"
                        >
                          Target Examination
                        </label>
                        <select
                          id="contact-exam"
                          value={contactExam}
                          onChange={(e) => setContactExam(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 text-xs focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all"
                        >
                          <option value="SSC CGL (Tier I & II)">SSC CGL (Tier I & II)</option>
                          <option value="IBPS & SBI PO (Banking)">IBPS & SBI PO (Banking)</option>
                          <option value="RRB NTPC (Railways CBT)">RRB NTPC (Railways CBT)</option>
                          <option value="State PSC (General Studies)">State PSC (General Studies)</option>
                          <option value="SSC CHSL / CPO Drills">SSC CHSL / CPO Drills</option>
                          <option value="General Inquiry">Other Government Exam</option>
                        </select>
                      </div>

                      {/* Issue Category */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="contact-category"
                          className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300"
                        >
                          Grievance Category
                        </label>
                        <select
                          id="contact-category"
                          value={contactCategory}
                          onChange={(e) => setContactCategory(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 text-xs focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all"
                        >
                          <option value="Test Engine & Live Timers">Test Engine & Live Timers</option>
                          <option value="Marking & Answer Key Dispute">Marking & Answer Key Dispute</option>
                          <option value="Pass Activation & Billing">Pass Activation & Billing</option>
                          <option value="Question Quality & Mathematical Proofs">Question Quality & Mathematical Proofs</option>
                          <option value="Account & General Assistance">Account & General Assistance</option>
                        </select>
                      </div>
                    </div>

                    {/* Message Area */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300"
                      >
                        Detailed Description / Question Reference <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Please describe your question or issue in detail. If disputing an answer key, include question title or test number..."
                        className="w-full p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 text-xs focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all placeholder-charcoal-400 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-charcoal-500">
                        <ShieldIcon size={13} className="text-institutional-600 shrink-0" />
                        <span>Ticket dispatched with 256-bit encryption</span>
                      </div>

                      <button
                        type="submit"
                        disabled={contactSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs shadow-md shadow-institutional-600/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-70"
                      >
                        {contactSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating Official Ticket...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Grievance Ticket</span>
                            <SendIcon size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 12. BOTTOM HIGH-CONVERTING CTA BANNER                                     */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-r from-institutional-800 via-institutional-900 to-charcoal-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-lifted relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-institutional-300">
              Your Exam Date is Non-Negotiable. Your Preparation is.
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Start Benchmarking Your Speed & Accuracy Today.
            </h2>
            <p className="text-xs sm:text-sm text-institutional-200 leading-relaxed max-w-xl mx-auto">
              Join thousands of serious government exam aspirants practicing on GovExam Pro every morning.
            </p>
            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  const firstTest = tests[0] || DEMO_TESTS[0];
                  onStartTest(firstTest);
                }}
                className="px-7 py-3.5 rounded-full bg-white text-charcoal-900 font-extrabold text-xs shadow-md hover:bg-charcoal-100 transition-colors flex items-center gap-2"
              >
                <PlayIcon size={14} />
                <span>Attempt Free All-India Mock 01</span>
              </button>
              {!user && (
                <button
                  onClick={onOpenAuthModal}
                  className="px-6 py-3.5 rounded-full bg-institutional-700/80 border border-institutional-500 text-white font-bold text-xs hover:bg-institutional-700 transition-colors"
                >
                  Create Aspirant Account
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Rules Modal */}
      <TestRulesModal
        test={modalTest}
        isOpen={!!modalTest}
        onClose={() => setModalTest(null)}
        onStartExam={(test) => onStartTest(test)}
      />
    </div>
  );
};
