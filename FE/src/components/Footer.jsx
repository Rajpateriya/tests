import React from 'react';
import {
  SparklesIcon,
  ShieldIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  BookOpenIcon,
  HelpCircleIcon,
} from './Icons';

export const Footer = ({ onNavigate }) => {
  const handleNav = (view, hash) => {
    if (onNavigate) {
      onNavigate(view);
      if (hash) {
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  };

  return (
    <footer className="bg-white dark:bg-charcoal-900 border-t border-charcoal-200 dark:border-charcoal-800 text-charcoal-600 dark:text-charcoal-400 font-sans text-xs transition-colors">
      {/* Upper Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info (2 Columns on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => handleNav('discovery')}
              className="flex items-center gap-2 cursor-pointer select-none group w-fit"
            >
              <div className="w-8 h-8 rounded-full bg-institutional-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                <SparklesIcon size={16} />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base tracking-tight text-charcoal-900 dark:text-charcoal-100">
                  PrepMagnet
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300 font-mono tracking-wider">
                  PRO
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed max-w-sm">
              India's premier high-trust mock examination platform. Built with 1:1 fidelity to official TCS iON examination physics, strict negative marking algorithms, and All-India percentile benchmarks.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engine Online • 99.98% Uptime</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-charcoal-500">
                <ShieldIcon size={12} className="text-institutional-600" />
                <span>Encrypted Submissions</span>
              </span>
            </div>
          </div>

          {/* Column 2: Target Examinations */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100">
              Exam Streams
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  SSC CGL Tier I & II
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  IBPS & SBI PO (Banking)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  RRB NTPC (Railways CBT)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  State PSC (General Studies)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  SSC CHSL & CPO Drills
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Tools */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100">
              Candidate Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  Mock Tests Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('subscription')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  Passes & Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery', 'mock-catalog')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  TCS iON Test-Drive Sandbox
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  Target Rank Predictor
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('discovery', 'contact-section')}
                  className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors text-left"
                >
                  Examination Guidelines
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Grievance */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-charcoal-900 dark:text-charcoal-100">
              Support Desk
            </h4>
            <div className="space-y-2 text-xs">
              <a
                href="mailto:support@prepmagnet.com"
                className="flex items-center gap-2 hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors"
              >
                <MailIcon size={14} className="text-institutional-600 shrink-0" />
                <span className="truncate">support@prepmagnet.com</span>
              </a>
              <div className="flex items-center gap-2">
                <PhoneIcon size={14} className="text-institutional-600 shrink-0" />
                <span>+91 (011) 4892-0190</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPinIcon size={14} className="text-institutional-600 shrink-0 mt-0.5" />
                <span>Pragati Maidan Complex, New Delhi 110001</span>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => handleNav('discovery', 'contact-section')}
                  className="px-3 py-1.5 rounded-lg bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 font-bold hover:bg-institutional-100 transition-colors border border-institutional-200 dark:border-institutional-800"
                >
                  Open Candidate Grievance Form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Legal Disclaimer & Copyright */}
      <div className="border-t border-charcoal-150 dark:border-charcoal-800/80 bg-charcoal-50/50 dark:bg-charcoal-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-charcoal-500">
          <p className="max-w-2xl text-center md:text-left leading-relaxed">
            <strong>Institutional Disclaimer:</strong> PrepMagnet is an independent academic testing and simulation system. SSC, IBPS, RRB, and State PSC examination names, schemes, and logos are properties of their respective conducting boards.
          </p>
          <div className="flex items-center gap-4 shrink-0 font-medium">
            <span>© 2026 PrepMagnet Educational Systems.</span>
            <span>All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
