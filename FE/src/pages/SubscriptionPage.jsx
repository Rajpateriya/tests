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
    description: 'Essential mocks and speed drills for foundational syllabus pacing.',
    monthlyPrice: 99,
    yearlyPrice: 299,
    features: [
      '15 Full-Length Tier-I Mock Tests',
      '50 Topic-wise Speed Drills',
      'Standard TCS iON Exam Engine UI',
      'Instant Scorecard & Negative Marking',
      'Step-by-Step Answer Key Review',
    ],
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro Ranker',
    badge: 'MOST POPULAR',
    description: 'Full-spectrum analytics, peer rankings, and unlimited mocks for serious rankers.',
    monthlyPrice: 199,
    yearlyPrice: 699,
    features: [
      'Unlimited Full, Subject & Topic Mocks',
      'All-India Percentile & AIR Benchmark',
      'Speed vs. Accuracy Tradeoff Diagnostics',
      'Full Mathematical Proofs & Short-cuts',
      'Previous Year Papers (PYQs 2019-2025)',
    ],
    popular: true,
  },
  {
    id: 'MAX',
    name: 'Max Ultimate',
    badge: 'ALL-ACCESS VIP',
    description: 'Comprehensive preparation across SSC, Banking, and Railways with mentor strategy.',
    monthlyPrice: 299,
    yearlyPrice: 1299,
    features: [
      'Everything in Pro Ranker +',
      'Multi-Exam Access (SSC, Banking, RRB, PSC)',
      'Unlimited Dynamic Auto Mock Generator',
      'High-Yield Theory Compendiums (PDF)',
      'Priority Doubt Resolution Helpline',
    ],
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
    <div className="relative overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-passes">
      {/* Moving Ambient Glows */}
      <div className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-institutional-500/12 dark:bg-institutional-400/18 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-96 -right-20 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-400/15 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-emerald-500/8 dark:bg-emerald-400/12 blur-[100px] rounded-full pointer-events-none animate-drift-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 relative z-10 animate-fade-in">
        {/* Compact Hero Header */}
        <div className="bg-white/85 dark:bg-charcoal-900/85 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 rounded-3xl p-6 sm:p-8 text-center space-y-3.5 shadow-subtle relative overflow-hidden">
          {/* Inner Glow backdrop */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-institutional-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 relative z-10">
            <CrownIcon size={14} />
            <span>PREMIUM ASPIRANT MEMBERSHIP</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-tight relative z-10">
            Accelerate Your Score to the 99th Percentile
          </h1>

          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 max-w-xl mx-auto leading-relaxed relative z-10">
            Unlock unrestricted full mocks, deep AI topic diagnostics, peer percentiles, and instant step-by-step mathematical proofs.
          </p>

          {/* Animated Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-full border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold gap-1 mt-1 shadow-inner relative z-10">
            <button
              type="button"
              className={`px-5 py-1.5 rounded-full transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`px-5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-extrabold'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              <span>Annual Pass</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 animate-pulse-subtle">
                SAVE 40%
              </span>
            </button>
          </div>
        </div>

      {/* Compact, Sleek, Animated Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch max-w-5xl mx-auto">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const period = billingCycle === 'yearly' ? '/yr' : '/mo';

          return (
            <div
              key={plan.id}
              className={`group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_35px_-10px_rgba(37,99,235,0.18)] dark:hover:shadow-[0_20px_35px_-10px_rgba(59,130,246,0.25)] overflow-hidden ${
                plan.popular
                  ? 'bg-white dark:bg-charcoal-900 border-2 border-institutional-600 dark:border-institutional-500 shadow-lifted md:-translate-y-1 ring-1 ring-institutional-500/30 hover:border-institutional-500'
                  : 'bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle hover:border-institutional-400 dark:hover:border-institutional-500'
              }`}
            >
              {/* Light beam shimmer effect on hover */}
              <div className="absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />

              {/* Ambient Hover Gradient Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-institutional-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Popular Ribbon */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-institutional-600 to-indigo-600 text-white font-extrabold text-[9px] tracking-wider uppercase px-2.5 py-0.5 rounded-bl-xl shadow-sm flex items-center gap-1">
                    <SparklesIcon size={10} className="animate-spin-slow" />
                    <span>{plan.badge}</span>
                  </div>
                </div>
              )}

              <div className="relative z-10">
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                    {plan.name}
                  </h3>
                  {!plan.popular && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mb-3 line-clamp-1 leading-normal">
                  {plan.description}
                </p>

                {/* Price Display (Ultra-Clean & Compact) */}
                <div className="flex items-baseline gap-1.5 pb-3 border-b border-charcoal-150 dark:border-charcoal-800 mb-3">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-charcoal-950 dark:text-white tracking-tight">
                    ₹{price}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-500">
                    {period}
                  </span>
                  {billingCycle === 'yearly' && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ₹{Math.round(price / 12)}/mo
                    </span>
                  )}
                </div>

                {/* Compact Feature Bullet Points (4 high-value lines) */}
                <div className="space-y-1.5 mb-4">
                  {plan.features.slice(0, 4).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircleIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button with Hover Elevation & Arrow Translate */}
              <div className="relative z-10 pt-2 border-t border-charcoal-100 dark:border-charcoal-800/80">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <span>✓ Active Membership</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-2 rounded-xl font-bold text-xs transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 group/btn active:scale-[0.98] ${
                      plan.popular
                        ? 'bg-institutional-600 hover:bg-institutional-700 text-white shadow-institutional-600/20 hover:shadow-md'
                        : 'border border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-500 text-charcoal-800 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <span>Activate {plan.name}</span>
                    <ArrowRightIcon size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Social Proof Banner */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="text-center space-y-1.5">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-2.5">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The weak area analytics identified my Geometry gap in Tier-I. Practiced 8 mini-mocks and jumped from 135 to 164 marks. Selected as ASO in MEA!"
            </p>
            <div className="flex items-center gap-2.5 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-6 h-6 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-[10px]">S</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Saurabh Mishra</div>
                <div className="text-[10px] text-charcoal-400 font-mono">AIR 142 • SSC CGL 2024</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-2.5">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The TCS iON exact exam room replica made my actual exam feel like just another practice test at home. Zero panic, 94.8% accuracy!"
            </p>
            <div className="flex items-center gap-2.5 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">A</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Ananya Deshmukh</div>
                <div className="text-[10px] text-charcoal-400 font-mono">Selected • IBPS PO & RRB NTPC</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-2.5">
            <p className="text-xs italic text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
              "The step-by-step solutions with short-cut tricks saved me at least 25 seconds per quant question. Worth 10x the subscription cost."
            </p>
            <div className="flex items-center gap-2.5 pt-1 border-t border-charcoal-200 dark:border-charcoal-750">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">R</div>
              <div>
                <div className="text-xs font-bold text-charcoal-900 dark:text-charcoal-100">Rohit Verma</div>
                <div className="text-[10px] text-charcoal-400 font-mono">Inspector (Central Excise)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-8 shadow-subtle space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-charcoal-500">Everything you need to know about the GovExam Pro membership.</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-2.5 pt-2">
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
                  className="w-full p-3.5 text-left font-bold text-xs sm:text-sm text-charcoal-900 dark:text-charcoal-100 flex items-center justify-between gap-4 hover:bg-charcoal-50 dark:hover:bg-charcoal-850 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-sm text-institutional-600 font-mono font-bold">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 text-xs text-charcoal-600 dark:text-charcoal-400 leading-relaxed border-t border-charcoal-150 dark:border-charcoal-800/60 pt-2.5">
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
    </div>
  );
};
