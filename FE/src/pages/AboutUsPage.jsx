import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  SparklesIcon,
  ShieldIcon,
  CheckCircleIcon,
  LockIcon,
  ArrowRightIcon,
  BookOpenIcon,
  TrophyIcon,
  TargetIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  AwardIcon,
  BarChartIcon,
} from '../components/Icons';
import { ROUTES } from '../routes';
import { useSEO } from '../hooks/useSEO';

export const AboutUsPage = () => {
  useSEO({
    title: 'About PrepMagnet — Mission, Technology & Vision',
    description: "Learn how PrepMagnet is revolutionizing government competitive exam preparation with realistic Computer Based Test simulations, official scoring algorithms, and diagnostic percentiles.",
  });

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const stats = [
    { value: '50,000+', label: 'Mock Attempts Evaluated', icon: TrophyIcon, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
    { value: '99.98%', label: 'Engine Platform Uptime', icon: SparklesIcon, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
    { value: '35+', label: 'Official Exam Blueprints', icon: BookOpenIcon, color: 'text-institutional-600 dark:text-institutional-400 bg-institutional-50 dark:bg-institutional-950/50' },
    { value: '256-Bit', label: 'Razorpay PCI-DSS Security', icon: LockIcon, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' },
  ];

  const pillars = [
    {
      title: 'Authentic Exam Engine Physics',
      desc: 'We replicate the exact screen ergonomics, sectional timers, question palettes, and negative scoring models used by national examination conducting agencies.',
      tag: 'True-to-Life CBT',
    },
    {
      title: 'Typing Master Certification',
      desc: 'Our government-exam typing simulator tests 20-mark evaluations in 5 minutes (~200 words) with real-time Gross WPM, Net WPM, and stroke error deductions.',
      tag: 'Skill Test Simulator',
    },
    {
      title: 'AI Question Generation Pipeline',
      desc: 'State-of-the-art Bloom taxonomy calibration ensures each question tests conceptual depth rather than rote memorization.',
      tag: 'Academic Rigor',
    },
    {
      title: 'Democratized Accessibility',
      desc: 'Affordable Prep Passes that cost less than a cup of chai a day, removing economic barriers for every aspirational student in India.',
      tag: 'Students First',
    },
  ];

  return (
    <div className="relative overflow-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 pb-16 font-sans text-charcoal-900 dark:text-charcoal-100 min-h-screen">
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400 animate-fade-in">
          <button onClick={() => navigate(ROUTES.home)} className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors">
            Home
          </button>
          <span>/</span>
          <span className="text-institutional-600 dark:text-institutional-400 font-bold">About Us</span>
        </div>

        {/* Hero Section */}
        <section className="space-y-4 max-w-4xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-100 dark:bg-institutional-950/80 text-institutional-700 dark:text-institutional-300 border border-institutional-200/80 dark:border-institutional-800 text-xs font-bold uppercase tracking-wider font-mono">
            <SparklesIcon size={13} className="text-institutional-600 dark:text-institutional-400" />
            <span>Company Profile & Academic Mission</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-charcoal-950 dark:text-white leading-[1.15]">
            Engineering India's Highest-Trust <br className="hidden sm:inline" />
            <span className="text-institutional-600 dark:text-institutional-400">Mock Examination System</span>
          </h1>

          <p className="text-sm sm:text-base text-charcoal-600 dark:text-charcoal-300 leading-relaxed max-w-3xl">
            PrepMagnet is an ed-tech platform engineered by educators and engineers to provide authentic Computer-Based Test (CBT) simulations for millions of Indian aspirants appearing for SSC, Banking, Railways, and State PSC examinations.
          </p>
        </section>

        {/* Metric Stats Banner */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="p-5 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${st.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-950 dark:text-white">
                    {st.value}
                  </div>
                  <div className="text-xs text-charcoal-500 dark:text-charcoal-400 font-medium">
                    {st.label}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* The Problem & The Solution */}
        <section className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-card space-y-4">
            <div className="inline-block px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
              The Critical Challenge
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-charcoal-950 dark:text-white">
              Why Static PDFs & Generic Quiz Apps Fail Aspirants
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
              Every year, over 2.5 crore students appear for national examinations like SSC CGL, RRB NTPC, and IBPS PO. Yet, the vast majority practice on flat PDF worksheets or simplistic multiple-choice widgets that ignore actual exam-day realities: strict sectional timers, negative marking traps, and high-pressure keyboard test modules.
            </p>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
              Without muscle memory for the exact CBT interface, even well-prepared students lose critical minutes wrestling with screen navigation on exam day.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-institutional-600 text-white shadow-card space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="inline-block px-3 py-1 rounded-lg bg-white/20 text-white font-bold text-xs uppercase tracking-wider">
              The PrepMagnet Solution
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Authentic CBT Exam Physics in Your Browser
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              PrepMagnet bridges the gap between preparation and exam day. Our testing engine faithfully mirrors the official national CBT assessment interface, including candidate declaration modals, question status palettes (Answered, Marked for Review, Visited), and instantaneous AI-driven rank predictions.
            </p>
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={16} className="text-emerald-300 shrink-0" />
                <span>Exact 0.50 and 0.25 negative marking calculation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={16} className="text-emerald-300 shrink-0" />
                <span>Government-standard Typing Master DEST simulation (20 marks, 5 min)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={16} className="text-emerald-300 shrink-0" />
                <span>Detailed question solutions and All-India percentile percentiles</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-6">
          <div className="space-y-1 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-charcoal-950 dark:text-white">
              Built On Academic Rigor & Technical Precision
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Four pillars that guide every line of code and every question bank we curate.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300">
                    {p.tag}
                  </span>
                  <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                    {p.title}
                  </h3>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Corporate Entity & Razorpay Merchant Transparency Details */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-institutional-600 dark:text-institutional-400">
                Corporate & Merchant Information
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-charcoal-950 dark:text-white mt-0.5">
                PrepMagnet
              </h2>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold w-fit">
              <ShieldIcon size={14} />
              <span>Razorpay Verified Merchant</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 text-xs text-charcoal-600 dark:text-charcoal-300">
            <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/70 dark:border-charcoal-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-charcoal-900 dark:text-white text-sm">
                <MailIcon size={16} className="text-institutional-600 dark:text-institutional-400" />
                <span>Contact Channels</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>General & Support Enquiries: <strong className="text-charcoal-900 dark:text-white select-all">support.prepmagnet@gmail.com</strong></div>
                <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400">Response SLA: Within 24–48 business hours</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/70 dark:border-charcoal-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-charcoal-900 dark:text-white text-sm">
                <LockIcon size={16} className="text-institutional-600 dark:text-institutional-400" />
                <span>Payment & Compliance Standards</span>
              </div>
              <p className="leading-relaxed text-charcoal-500 dark:text-charcoal-400 text-xs">
                All subscriptions are billed in INR with full GST compliance (18%). Online payments are processed through Razorpay Software Private Ltd. under 256-bit SSL encryption.
              </p>
            </div>
          </div>

          {/* Quick Legal Links */}
          <div className="pt-4 border-t border-charcoal-150 dark:border-charcoal-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-charcoal-500">
              Review our policies for complete transparency:
            </div>
            <div className="flex items-center gap-4 font-semibold text-institutional-600 dark:text-institutional-400">
              <button onClick={() => navigate(ROUTES.terms)} className="hover:underline">
                Terms & Conditions
              </button>
              <span>•</span>
              <button onClick={() => navigate(ROUTES.privacy)} className="hover:underline">
                Privacy Policy
              </button>
              <span>•</span>
              <button onClick={() => navigate(ROUTES.terms + '#cancellation-refund')} className="hover:underline">
                Refund Policy
              </button>
            </div>
          </div>
        </section>

        {/* CTA Bar */}
        <section className="p-8 rounded-3xl bg-gradient-to-r from-institutional-900 via-institutional-800 to-institutional-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black">
              Ready to experience India's authentic CBT simulator?
            </h3>
            <p className="text-xs sm:text-sm text-institutional-100">
              Take a free full-length mock test today with live timers, negative scoring, and All-India percentile benchmarking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate(ROUTES.courses)}
              className="px-6 py-3 rounded-xl bg-white text-institutional-800 font-extrabold text-xs shadow-lg hover:bg-institutional-50 transition-all active:scale-95"
            >
              Explore Mock Packs
            </button>
            <button
              onClick={() => navigate(ROUTES.typing)}
              className="px-5 py-3 rounded-xl bg-institutional-500/40 hover:bg-institutional-500/60 text-white font-extrabold text-xs border border-white/20 transition-all active:scale-95"
            >
              Try Typing Master
            </button>
          </div>
        </section>

      </main>
    </div>
  );
};
