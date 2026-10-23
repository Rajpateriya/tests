import React, { useState, useEffect } from 'react';
import {
  HelpCircleIcon,
  PlusIcon,
  TelegramIcon,
  SparklesIcon,
  CheckCircleIcon,
} from './Icons';

/**
 * FAQSection — Concise, Modern, Compact Theme-Aligned FAQ Component
 * Form-fitted concise vertical footprint:
 * - Clean, non-bloated padding & sleek card heights
 * - Monospace numbered badges (01, 02...)
 * - Compact animated rotational plus/minus micro-button
 * - Left accent indicator on open
 * - All questions closed by default for minimal vertical footprint
 * - Dynamic Google FAQPage JSON-LD schema injection
 */
export const FAQSection = ({
  title = 'Have any questions?',
  subtitle = 'Here are answers to the most commonly asked ones regarding PrepMagnet CBT examinations and scoring.',
  tag = 'FAQ',
  faqs = [],
  defaultOpenIndex = null,
  className = '',
  id = 'faq',
}) => {
  const [activeIdx, setActiveIdx] = useState(defaultOpenIndex);

  // Dynamically inject & synchronize Google-compliant FAQPage JSON-LD structured data
  useEffect(() => {
    if (!faqs || faqs.length === 0) return;

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a,
        },
      })),
    };

    let script = document.getElementById('dynamic-faq-schema');
    if (!script) {
      script = document.createElement('script');
      script.id = 'dynamic-faq-schema';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);

    return () => {
      const s = document.getElementById('dynamic-faq-schema');
      if (s) s.remove();
    };
  }, [faqs]);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 bg-gradient-to-b from-slate-50/70 via-white to-white dark:from-charcoal-900/90 dark:via-charcoal-900/90 dark:to-charcoal-950/90 backdrop-blur-md border border-charcoal-200/90 dark:border-charcoal-800 shadow-card overflow-hidden w-full ${className}`}
    >
      {/* Subtle Atmospheric Radial Glows */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-gradient-to-b from-institutional-500/12 dark:from-institutional-500/15 to-transparent blur-[100px] rounded-full pointer-events-none" />

      {/* Concise Header */}
      <div className="text-center max-w-lg mx-auto space-y-1.5 relative z-10 mb-4 sm:mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950/70 text-institutional-700 dark:text-institutional-300 border border-institutional-200/70 dark:border-institutional-800/60 shadow-2xs">
          <HelpCircleIcon size={11} className="text-institutional-600 dark:text-institutional-400" />
          <span>{tag}</span>
        </div>
        <h2
          id={`${id}-heading`}
          className="text-lg sm:text-2xl font-black tracking-tight text-charcoal-950 dark:text-white"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-charcoal-500 dark:text-charcoal-400 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Tight, Concise Accordion Stack */}
      <div className="max-w-2xl sm:max-w-[720px] mx-auto space-y-2 sm:space-y-2.5 relative z-10">
        {faqs.map((faq, idx) => {
          const isOpen = activeIdx === idx;
          const itemId = `${id}-item-${idx}`;
          const answerId = `${id}-answer-${idx}`;

          return (
            <div
              key={idx}
              className={`group relative rounded-xl transition-all duration-150 overflow-hidden border ${
                isOpen
                  ? 'bg-white dark:bg-gradient-to-b dark:from-charcoal-850 dark:to-charcoal-900 border-institutional-400/80 dark:border-institutional-500/50 shadow-sm'
                  : 'bg-white/80 hover:bg-white dark:bg-charcoal-850/60 dark:hover:bg-charcoal-850/90 border-charcoal-200/70 hover:border-charcoal-350 dark:border-charcoal-800 dark:hover:border-charcoal-700 shadow-2xs'
              }`}
            >
              {/* Active Left Gradient Accent Strip */}
              {isOpen && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-institutional-500 via-sky-500 to-institutional-600 rounded-l-xl" />
              )}

              <button
                type="button"
                id={itemId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setActiveIdx(isOpen ? null : idx)}
                className="w-full py-2.5 px-3.5 sm:py-3 sm:px-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pl-0.5">
                  {/* Monospace Numbered Index */}
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 transition-all ${
                      isOpen
                        ? 'bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-300/60 dark:border-institutional-800'
                        : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 dark:text-charcoal-400 group-hover:text-charcoal-700 dark:group-hover:text-charcoal-200 border border-charcoal-200/50 dark:border-charcoal-750/50'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <span
                    className={`text-xs sm:text-[13px] leading-snug transition-colors ${
                      isOpen
                        ? 'text-institutional-900 dark:text-white font-bold'
                        : 'text-charcoal-800 dark:text-charcoal-100 group-hover:text-institutional-700 dark:group-hover:text-white font-semibold'
                    }`}
                  >
                    {faq.q}
                  </span>
                </div>

                {/* Compact Rotational Plus Button */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 select-none ${
                    isOpen
                      ? 'bg-institutional-600 text-white rotate-45 shadow-2xs'
                      : 'bg-charcoal-100 hover:bg-charcoal-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 text-charcoal-500 dark:text-charcoal-400 border border-charcoal-200/70 dark:border-charcoal-700/60'
                  }`}
                  aria-hidden="true"
                >
                  <PlusIcon size={12} className="transition-transform duration-200" />
                </span>
              </button>

              {isOpen && (
                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={itemId}
                  className="px-3.5 pb-3 sm:px-4 sm:pb-3.5 pl-9 sm:pl-10 text-xs text-charcoal-600 dark:text-charcoal-300 leading-relaxed font-normal border-t border-charcoal-150/70 dark:border-charcoal-800/70 pt-2 animate-fade-in"
                >
                  <p>{faq.a}</p>

                  <div className="mt-2.5 pt-2 border-t border-charcoal-100/60 dark:border-charcoal-800/60 flex items-center justify-between text-[10px]">
                    {faq.category ? (
                      <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 dark:text-charcoal-400">
                        {faq.category}
                      </span>
                    ) : (
                      <span className="text-charcoal-400">Official Exam Policy</span>
                    )}

                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircleIcon size={10} />
                      <span>Verified Solution</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Compact Single-Line Mentor Prompt */}
        <div className="pt-2.5 border-t border-charcoal-150/80 dark:border-charcoal-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-charcoal-500 dark:text-charcoal-400 text-center sm:text-left">
          <span className="flex items-center gap-1.5">
            <SparklesIcon size={12} className="text-institutional-500 shrink-0" />
            <span>Have a specific exam query? Mentors respond on Telegram.</span>
          </span>
          <a
            href="https://t.me/prepmagnet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-institutional-600/10 hover:bg-institutional-600/20 text-institutional-600 dark:text-institutional-400 font-bold border border-institutional-200/60 dark:border-institutional-800/60 transition-colors shrink-0 cursor-pointer"
          >
            <TelegramIcon size={11} className="text-[#24A1DE]" />
            <span>Ask Mentors</span>
          </a>
        </div>
      </div>
    </section>
  );
};
