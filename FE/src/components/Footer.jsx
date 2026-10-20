import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import {
  SparklesIcon,
  ShieldIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  TargetIcon,
  ClockIcon,
  ZapIcon,
  LockIcon,
  XIcon,
  ArrowRightIcon,
  InstagramIcon,
  LinkedinIcon,
  KeyboardIcon,
} from './Icons';

// Modal content for legal & institutional documents
const LEGAL_DOCS = {
  privacy: {
    title: 'Privacy Policy & Data Security',
    badge: 'Confidentiality & Compliance',
    lastUpdated: 'October 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        content:
          'PrepMagnet collects minimal student information necessary for accurate All-India percentile calculations, exam benchmarking, and account recovery. This includes your name, email address, chosen examination streams, and timestamped question response telemetry.',
      },
      {
        heading: '2. Examination Physics & Telemetry',
        content:
          'During live CBT simulations, the platform logs per-question dwell times, option revision timestamps, and mark-for-review state toggles. This telemetric data is used strictly for generating your diagnostic speed-vs-accuracy analysis and percentile ranks.',
      },
      {
        heading: '3. Data Security & Encryption',
        content:
          'All test submissions and payment interactions are encrypted in transit using industry-standard TLS 1.3 and stored with AES-256 rest-encryption. We never sell, rent, or trade candidate personal information to third-party telemarketers or coaching aggregators.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service & Candidate Agreement',
    badge: 'Institutional Terms',
    lastUpdated: 'October 2026',
    sections: [
      {
        heading: '1. Academic Integrity & Acceptable Use',
        content:
          'PrepMagnet provides high-fidelity simulations for academic training. Candidates agree to undertake mocks under authentic examination conditions and refrain from automated scraping, reverse engineering test banks, or distributing proprietary question derivations.',
      },
      {
        heading: '2. Subscription & Access Entitlement',
        content:
          'PrepMagnet Pass subscriptions grant non-transferable personal access to full-length test series, topic-wise sectional drills, and solution keys for the stated validity duration. One account may be active on one session at any given time.',
      },
      {
        heading: '3. Platform Availability & Maintenance',
        content:
          'We maintain a 99.98% platform availability SLA. Scheduled maintenance is performed during non-peak hours (02:00 AM - 04:00 AM IST) with prior candidate dashboard notification.',
      },
    ],
  },
  refund: {
    title: 'Pass Refund & Cancellation Policy',
    badge: 'Billing Transparency',
    lastUpdated: 'October 2026',
    sections: [
      {
        heading: '1. Instant Digital Activation',
        content:
          'Passes and course subscriptions are activated immediately upon successful payment verification through Razorpay. Because test keys and blueprint derivation algorithms are unlocked instantly, standard digital non-consumable rules apply.',
      },
      {
        heading: '2. Duplicate Transactions & Gateway Failures',
        content:
          'If an account is debited twice for a single order due to gateway latency or network drops, the duplicate transaction will be refunded automatically to the original payment source within 3–5 working days.',
      },
      {
        heading: '3. Technical Grievance Window',
        content:
          'If technical faults on our platform prevent you from attempting scheduled mocks within the first 48 hours of pass activation, contact support@prepmagnet.inwith your Order ID for immediate resolution or credit reversal.',
      },
    ],
  },
  honor: {
    title: 'Candidate Honor Code & Fair Testing',
    badge: 'Examination Integrity',
    lastUpdated: 'October 2026',
    sections: [
      {
        heading: '1. 1:1 Examination Fidelity',
        content:
          'To ensure All-India Percentiles reflect real exam cutoffs, aspirants are urged to attempt mocks strictly without external aid, calculators, or unauthorized tab switching.',
      },
      {
        heading: '2. Anti-Malpractice Telemetry',
        content:
          'Suspicious attempt velocities (e.g. solving 100 quantitative aptitude questions in under 3 minutes) are flagged by our psychometric audit system to protect the percentile benchmark validity for all aspirants.',
      },
    ],
  },
};

export const Footer = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeLegalModal, setActiveLegalModal] = useState(null); // 'privacy' | 'terms' | 'refund' | 'honor' | null
  const currentYear = new Date().getFullYear();

  // Close legal modal with ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveLegalModal(null);
      }
    };
    if (activeLegalModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeLegalModal]);

  /**
   * Unified Navigation Orchestrator:
   * Handles page switches, smooth anchor rolling/scrolling, blueprint selector dispatches,
   * and catalog tab state activations gracefully from any page in the application.
   */
  const handleNav = ({ to = ROUTES.home, hash = null, blueprint = null, catalogTab = null, focusInputId = null }) => {
    // If target is another page entirely (courses, typing, dashboard, terms, privacy, about, refund, etc.)
    if (to !== ROUTES.home) {
      navigate(to);
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    // Target is on the landing page (or a section within it)
    if (pathname !== ROUTES.home) {
      // Transition to home with state & hash so TestDiscoveryPage smoothly rolls to it upon mounting!
      navigate(
        { pathname: ROUTES.home, hash: hash ? `#${hash}` : '' },
        { state: { targetHash: hash, blueprint, catalogTab, focusInputId } }
      );
      return;
    }

    // Already on the landing page: execute rolling scroll and sub-states directly
    if (blueprint) {
      window.dispatchEvent(new CustomEvent('prepmagnet:blueprint', { detail: blueprint }));
    }
    if (catalogTab) {
      window.dispatchEvent(new CustomEvent('prepmagnet:catalog-tab', { detail: catalogTab }));
    }

    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (focusInputId) {
          setTimeout(() => {
            document.getElementById(focusInputId)?.focus();
          }, 350);
        }
      } else {
        setTimeout(() => {
          const retryEl = document.getElementById(hash);
          if (retryEl) {
            retryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="relative bg-white dark:bg-charcoal-900 border-t border-charcoal-200/90 dark:border-charcoal-800 text-charcoal-600 dark:text-charcoal-400 font-sans text-xs transition-colors overflow-hidden">
        {/* Subtle Animated Shimmer Accent Border at Top */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-institutional-500/80 dark:via-institutional-400/80 to-transparent animate-pulse-subtle pointer-events-none" />

        {/* Atmospheric Ambient Glow in the background */}
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-institutional-500/5 dark:bg-institutional-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Upper Main Footer Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 items-start">

            {/* Column 1: Brand & Academic Engine (Desktop: 3 cols, Tablet & Mobile: 2 cols / full width) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-3.5 sm:space-y-4">
              <div
                onClick={() => handleNav({ to: ROUTES.home })}
                className="flex items-center gap-3 cursor-pointer select-none group w-fit"
                title="Go to PrepMagnet Home"
              >
                <img
                  src="/prepmagnet.png"
                  alt="PrepMagnet Logo"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-xs"
                />
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-charcoal-950 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                  PrepMagnet
                </span>
              </div>

              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed max-w-sm">
                India’s trusted CBT mock exam platform with real exam simulations, strict negative marking, and All-India percentile rankings.
              </p>

              {/* Engine Status & Security Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-bold shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Engine Online • 99.98% SLA</span>
                </div>

                {/* <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal-100/80 dark:bg-charcoal-800/80 text-charcoal-600 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700/80 text-[11px] font-semibold">
                  <LockIcon size={12} className="text-institutional-600 dark:text-institutional-400" />
                  <span>256-Bit Encrypted</span>
                </div> */}
              </div>

              {/* <div className="pt-1 text-[11px] text-charcoal-500 dark:text-charcoal-400 flex items-center gap-2">
                <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>PrepMagnet Authentic National CBT Simulator</span>
              </div> */}
            </div>

            {/* Horizontal 3-Section Container: One line horizontally on mobile (grid-cols-3), exactly 6 columns on desktop */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 py-3.5 sm:py-4 lg:py-0 border-y lg:border-y-0 border-charcoal-200/70 dark:border-charcoal-800/70">

              {/* Column 2: Exam Blueprints */}
              <div className="space-y-2.5 sm:space-y-3 min-w-0">
                <h4 className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100 flex items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap">
                  <BookOpenIcon size={13} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                  <span>Exam Blueprints</span>
                </h4>
                <ul className="space-y-2 sm:space-y-2.5 text-[11px] sm:text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'exam-blueprints', blueprint: 'cgl' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>SSC CGL <span className="hidden md:inline">(Tier I & II)</span></span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'exam-blueprints', blueprint: 'banking' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>IBPS / SBI <span className="hidden md:inline">PO</span></span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'exam-blueprints', blueprint: 'rrb' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>RRB NTPC</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'exam-blueprints', blueprint: 'psc' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>State PSC</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.courses })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Practice Packs</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 3: Simulation Tools */}
              <div className="space-y-2.5 sm:space-y-3 min-w-0">
                <h4 className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100 flex items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap">
                  <ZapIcon size={13} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                  <span>Simulation Tools</span>
                </h4>
                <ul className="space-y-2 sm:space-y-2.5 text-[11px] sm:text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'mock-catalog', catalogTab: 'mocks' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Mock Catalog</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'hero-sandbox' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Test Sandbox</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'rank-predictor' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Rank Predictor</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.typing })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer font-medium leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <KeyboardIcon size={12} className="shrink-0 text-institutional-600 dark:text-institutional-400" />
                      <span>Typing Master</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.home, hash: 'passes-section' })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Passes & Plans</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 4: Legal & Governance */}
              <div className="space-y-2.5 sm:space-y-3 min-w-0">
                <h4 className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100 flex items-center gap-1 sm:gap-1.5 sm:whitespace-nowrap">
                  <ShieldIcon size={13} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                  <span>Legal & Governance</span>
                </h4>
                <ul className="space-y-2 sm:space-y-2.5 text-[11px] sm:text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.terms })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                      title="View Terms & Conditions"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Terms <span className="hidden md:inline">& Conditions</span></span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.privacy })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                      title="View Privacy Policy"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Privacy <span className="hidden md:inline">Policy</span></span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.about })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                      title="About PrepMagnet"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>About Us</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNav({ to: ROUTES.refund })}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                      title="Cancellation & Refund Policy"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Refund <span className="hidden md:inline">Policy</span></span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveLegalModal('honor')}
                      className="group flex items-center gap-1 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors text-left cursor-pointer leading-tight sm:leading-normal"
                    >
                      <ChevronRightIcon size={12} className="hidden sm:inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-institutional-600 dark:text-institutional-400 shrink-0" />
                      <span>Honor Code</span>
                    </button>
                  </li>
                </ul>
              </div>

            </div>

            {/* Column 5: Support Desk & Community (Desktop: 3 cols, Tablet/Mobile: 2 cols / full width card) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100 flex items-center gap-1.5">
                <MailIcon size={14} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                <span>Candidate Support Desk</span>
              </h4>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-charcoal-50/80 dark:bg-charcoal-850/80 border border-charcoal-200/90 dark:border-charcoal-800/90 shadow-subtle space-y-3">
                {/* Email row with full visibility */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                    Academic Helpdesk Email
                  </div>
                  <a
                    href="mailto:support.prepmagnet@gmail.com"
                    className="inline-flex items-center gap-2 text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-institutional-100 dark:bg-institutional-950 flex items-center justify-center text-institutional-600 dark:text-institutional-400 shrink-0">
                      <MailIcon size={13} />
                    </div>
                    <span className="select-all">support.prepmagnet@gmail.com</span>
                  </a>
                </div>

                {/* Ticket Button */}
                <button
                  type="button"
                  onClick={() =>
                    handleNav({
                      to: ROUTES.home,
                      hash: 'contact-section',
                      focusInputId: 'contact-name',
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-xs transition-all duration-200 shadow-sm active:scale-95 group cursor-pointer"
                >
                  <span>Raise Candidate Ticket</span>
                  <ArrowRightIcon size={13} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Social Media Community */}
                <div className="pt-2 border-t border-charcoal-200/60 dark:border-charcoal-800/60 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                    Official Social Community
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="https://www.instagram.com/prepmagnet.official/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 text-charcoal-700 dark:text-charcoal-200 hover:text-white border border-charcoal-200 dark:border-charcoal-700 transition-all duration-200 shadow-2xs text-[11px] font-bold group cursor-pointer"
                      title="Follow PrepMagnet on Instagram"
                    >
                      <InstagramIcon size={13} className="text-pink-600 dark:text-pink-400 group-hover:text-white transition-colors" />
                      <span>Instagram</span>
                    </a>
                    <a
                      href="https://www.linkedin.com/company/simplbyte/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 hover:bg-[#0077b5] text-charcoal-700 dark:text-charcoal-200 hover:text-white border border-charcoal-200 dark:border-charcoal-700 transition-all duration-200 shadow-2xs text-[11px] font-bold group cursor-pointer"
                      title="Follow SimplByte on LinkedIn"
                    >
                      <LinkedinIcon size={13} className="text-[#0077b5] dark:text-[#38bdf8] group-hover:text-white transition-colors" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Legal Disclaimer, Policies & Dynamic Copyright */}
        <div className="border-t border-charcoal-200/80 dark:border-charcoal-800/80 bg-charcoal-50/70 dark:bg-charcoal-950/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-[11px] text-charcoal-500 dark:text-charcoal-400">

              {/* Disclaimer */}
              <p className="max-w-2xl text-center lg:text-left leading-relaxed">
                <strong className="text-charcoal-700 dark:text-charcoal-300 font-semibold">Institutional Disclaimer:</strong>{' '}
                PrepMagnet is an independent academic testing and simulation system. SSC, UPSC, IBPS, RRB, and State PSC examination names, test schemes, and acronyms belong to their respective conducting authorities.
              </p>

              {/* Back to Top Button */}
              <button
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-200 font-bold text-[11px] hover:text-institutional-600 dark:hover:text-institutional-300 hover:border-institutional-300 dark:hover:border-institutional-700 hover:-translate-y-0.5 transition-all shadow-xs shrink-0 group"
                aria-label="Back to Top"
              >
                <span>Back to Top</span>
                <ChevronUpIcon size={13} className="group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            {/* Copyright & Interactive Legal Links */}
            <div className="mt-4 pt-4 border-t border-charcoal-200/60 dark:border-charcoal-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 text-charcoal-500 dark:text-charcoal-400 text-center sm:text-left">
                <span>© {currentYear} PrepMagnet </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">All rights reserved.</span>
              </div>

              {/* Dedicated Legal Links */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-charcoal-500 dark:text-charcoal-400 font-medium">
                <button
                  onClick={() => handleNav({ to: ROUTES.terms })}
                  className="hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors underline-offset-4 hover:underline"
                >
                  Terms & Conditions
                </button>
                <span>•</span>
                <button
                  onClick={() => handleNav({ to: ROUTES.privacy })}
                  className="hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  onClick={() => handleNav({ to: ROUTES.about })}
                  className="hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors underline-offset-4 hover:underline"
                >
                  About Us
                </button>
                <span>•</span>
                <button
                  onClick={() => handleNav({ to: ROUTES.refund })}
                  className="hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors underline-offset-4 hover:underline"
                >
                  Refund Policy
                </button>
                <span>•</span>
                <button
                  onClick={() => setActiveLegalModal('honor')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-300 transition-colors underline-offset-4 hover:underline"
                >
                  Honor Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Institutional Legal Policy Modal */}
      {activeLegalModal && LEGAL_DOCS[activeLegalModal] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-charcoal-150 dark:border-charcoal-800 flex items-start justify-between gap-3 bg-charcoal-50/50 dark:bg-charcoal-950/50">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 uppercase tracking-wider font-mono">
                  <ShieldIcon size={11} className="shrink-0" />
                  <span className="truncate">{LEGAL_DOCS[activeLegalModal].badge}</span>
                </div>
                <h3 id="legal-modal-title" className="text-base sm:text-xl font-extrabold text-charcoal-950 dark:text-white leading-tight">
                  {LEGAL_DOCS[activeLegalModal].title}
                </h3>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                  Last Updated: {LEGAL_DOCS[activeLegalModal].lastUpdated} • Official Document
                </p>
              </div>

              <button
                onClick={() => setActiveLegalModal(null)}
                className="w-8 h-8 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Close modal"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-4 sm:space-y-5 text-xs text-charcoal-600 dark:text-charcoal-300 leading-relaxed scrollbar-thin">
              {LEGAL_DOCS[activeLegalModal].sections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                    {sec.heading}
                  </h4>
                  <p className="text-charcoal-500 dark:text-charcoal-400">
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-charcoal-150 dark:border-charcoal-800 bg-charcoal-50/50 dark:bg-charcoal-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-charcoal-500 dark:text-charcoal-400 text-[11px]">
                Governing Law: Republic of India
              </span>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-charcoal-900 dark:bg-charcoal-100 text-white dark:text-charcoal-900 font-bold hover:bg-charcoal-800 dark:hover:bg-white transition-colors shadow-sm cursor-pointer text-center"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
