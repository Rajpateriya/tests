import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldIcon,
  StarIcon,
  ZapIcon,
  TargetIcon,
  TrophyIcon,
  ArrowRightIcon,
  HelpCircleIcon,
} from '../components/Icons';
import { RazorpayModal } from '../components/RazorpayModal';

export const SUBSCRIPTION_PLANS = [
  {
    id: 'BASIC',
    name: 'Basic Aspirant',
    badge: 'Starter',
    description: 'Essential mocks and speed drills for foundational revision and syllabus pacing.',
    monthlyPrice: 99,
    yearlyPrice: 299,
    features: [
      '15 Full-Length Tier-I Mock Tests',
      '50 Topic-wise Speed Drills',
      'Standard TCS iON Exam Engine UI',
      'Instant Scorecard & Negative Marking',
      'Standard Answer Key Review',
      'Mobile & Desktop Responsive Access',
    ],
    notIncluded: [
      'Deep Topic-wise Diagnostic Insights',
      'All-India Peer Percentile Benchmarking',
      'Unlimited Dynamic Auto Mock Generator',
      'Multi-exam coverage (Railways / Banking)',
    ],
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro Ranker',
    badge: 'MOST POPULAR',
    description: 'Full-spectrum analytics, peer rankings, and unlimited mocks for serious aspirants.',
    monthlyPrice: 199,
    yearlyPrice: 699,
    features: [
      'Unlimited Full, Subject & Topic Mocks',
      'Full TCS iON Exam Engine Simulation',
      'Deep Analytical Insights & Percentile Rank',
      'Strong vs. Weak Topic Diagnostics',
      'Step-by-Step Solutions & Short-Cut Notes',
      'Anti-Cheat Behavioral Audit Report',
      'Previous Year Questions (PYQs 2019-2025)',
      'Community Leaderboard & AIR Prediction',
    ],
    notIncluded: [
      'Multi-Exam Bundle (Railways / Banking)',
      '1-on-1 AI Study Strategy Mentor',
    ],
    popular: true,
  },
  {
    id: 'MAX',
    name: 'Max Ultimate',
    badge: 'ALL-ACCESS VIP',
    description: 'Comprehensive preparation across SSC, Banking, and Railways with personalized mentor strategy.',
    monthlyPrice: 299,
    yearlyPrice: 1299,
    features: [
      'Everything in Pro Ranker +',
      'Multi-Exam Access (SSC CGL, CHSL, RRB, Banking)',
      'Unlimited Dynamic Auto Mock Test Generation',
      'Personalized Study Strategy & Daily Schedule',
      'High-Yield Concept Compendiums (PDF)',
      'Priority Doubt Resolution Helpline',
      'Unlimited Test Attempts & Lifetime Re-attempts',
      'VIP Candidate Verification Badge',
    ],
    notIncluded: [],
    popular: false,
  },
];

export const SubscriptionPage = ({ onGoToMocks }) => {
  const { subscription, upgradeSubscription } = useAuth();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setIsRazorpayOpen(true);
  };

  const handlePaymentSuccess = (transactionId, plan) => {
    upgradeSubscription(plan.id, transactionId);
    setIsRazorpayOpen(false);
  };

  const currentPlanId = subscription?.status === 'ACTIVE' ? subscription.plan : 'FREE';

  const faqs = [
    {
      q: 'How does the TCS iON exam simulation help my real exam score?',
      a: 'Our exam engine meticulously replicates the TCS iON platform interface used by SSC, RRB, and Banking exams—from palette buttons, color legends, timers, and marking schemes down to navigation shortcuts. Practicing here eliminates test-day interface unfamiliarity.',
    },
    {
      q: 'What is the refund and cancellation policy?',
      a: 'We offer an unconditional 7-day money-back guarantee. If you are not completely satisfied with our question quality or detailed analytics, reach out to our team for a full refund.',
    },
    {
      q: 'Can I access the mocks on both mobile and laptop?',
      a: 'Yes! The entire GovExam Pro suite is responsive and optimized for both high-resolution desktop simulation (ideal for mock tests) and mobile devices for quick speed drills.',
    },
    {
      q: 'How are questions generated in the platform?',
      a: 'Our questions are curated by subject-matter experts and cross-verified with official previous years papers (PYQs), ensuring the latest pattern conformity and difficulty calibration.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 font-sans text-charcoal-900 dark:text-charcoal-100">
      {/* Hero Header */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-card relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-institutional-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
          <CrownIcon size={14} />
          <span>PREMIUM ASPIRANT MEMBERSHIP</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
          Accelerate Your Score to the 99th Percentile
        </h1>

        <p className="text-sm sm:text-base text-charcoal-600 dark:text-charcoal-300 max-w-2xl mx-auto leading-relaxed">
          Unlock unrestricted full mocks, deep AI topic diagnostics, peer percentiles, and instant solutions modeled precisely after official government examinations.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="inline-flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-full border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold gap-1 mt-2">
          <button
            type="button"
            className={`px-5 py-2 rounded-full transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            className={`px-5 py-2 rounded-full transition-all flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
            }`}
            onClick={() => setBillingCycle('yearly')}
          >
            <span>Annual Pass</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              SAVE 40%
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const period = billingCycle === 'yearly' ? '/year' : '/month';

          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-200 ${
                plan.popular
                  ? 'bg-white dark:bg-charcoal-900 border-2 border-institutional-600 dark:border-institutional-500 shadow-lifted md:-translate-y-2 ring-1 ring-institutional-500/20'
                  : 'bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle hover:border-charcoal-350 dark:hover:border-charcoal-700'
              }`}
            >
              {/* Popular Ribbon */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-institutional-600 text-white font-extrabold text-[11px] tracking-wider uppercase shadow-sm flex items-center gap-1.5">
                  <SparklesIcon size={12} />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2 mt-1">
                  <h3 className="text-xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
                    {plan.name}
                  </h3>
                  {!plan.popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mb-6 min-h-[32px] leading-relaxed">
                  {plan.description}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-1.5 pb-6 border-b border-charcoal-150 dark:border-charcoal-800 mb-6">
                  <span className="text-4xl font-extrabold font-mono text-charcoal-950 dark:text-white">
                    ₹{price}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-500">
                    {period}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                    What's Included:
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <CheckCircleIcon size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium">{feat}</span>
                    </div>
                  ))}

                  {plan.notIncluded.length > 0 && (
                    <div className="pt-2 space-y-2 opacity-50">
                      {plan.notIncluded.map((notFeat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-charcoal-400">
                          <span className="text-xs font-bold leading-none mt-0.5">✕</span>
                          <span>{notFeat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <span>✓ Currently Active Pass</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-institutional-600 hover:bg-institutional-700 text-white'
                        : 'border border-charcoal-300 dark:border-charcoal-700 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200'
                    }`}
                  >
                    <span>Upgrade to {plan.name}</span>
                    <ArrowRightIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Social Proof Banner */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-10 shadow-subtle space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex gap-1 text-amber-500">
            <StarIcon size={16} />
            <StarIcon size={16} />
            <StarIcon size={16} />
            <StarIcon size={16} />
            <StarIcon size={16} />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
            Trusted by 45,000+ Government Job Aspirants
          </h2>
          <p className="text-xs text-charcoal-500">
            Real results from candidates who converted their preparation into top selections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-3">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The weak area analytics identified my Geometry gap in Tier-I. Practiced 8 mini-mocks and jumped from 135 to 164 marks. Selected as ASO in MEA!"
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-7 h-7 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-xs">S</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Saurabh Mishra</div>
                <div className="text-[10px] text-charcoal-400 font-mono">AIR 142 • SSC CGL 2024</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-3">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The TCS iON exact exam room replica made my actual exam feel like just another practice test at home. Zero panic, 94.8% accuracy!"
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">A</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Ananya Deshmukh</div>
                <div className="text-[10px] text-charcoal-400 font-mono">Selected • IBPS PO & RRB NTPC</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-3">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The step-by-step solutions with short-cut tricks saved me at least 25 seconds per quant question. Worth 10x the subscription cost."
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">R</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Rohit Verma</div>
                <div className="text-[10px] text-charcoal-400 font-mono">Inspector (Central Excise)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-10 shadow-subtle space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-charcoal-500">Everything you need to know about the GovExam Pro membership.</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3 pt-2">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="border border-charcoal-200 dark:border-charcoal-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-charcoal-900 dark:text-charcoal-100 flex items-center justify-between gap-4 hover:bg-charcoal-50 dark:hover:bg-charcoal-850 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-institutional-600 font-mono font-bold">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed border-t border-charcoal-150 dark:border-charcoal-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Razorpay Modal */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        plan={selectedPlan}
        billingCycle={billingCycle}
        onClose={() => setIsRazorpayOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
