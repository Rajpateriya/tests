import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldIcon,
  StarIcon,
  ZapIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/Icons';
import { RazorpayModal } from '../components/RazorpayModal';
import { PassDetailModal } from '../components/PassDetailModal';

export const SubscriptionPage = ({ onGoToMocks }) => {
  const { subscription, user, upgradeSubscription, updateCoins } = useAuth();
  const [plans, setPlans] = useState([]);
  const [activeUserPass, setActiveUserPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyCoins, setApplyCoins] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPassForDetail, setSelectedPassForDetail] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const coinsBalance = user?.profile?.coins_balance ?? 0;

  useEffect(() => {
    loadPassesAndPlans();
  }, []);

  const loadPassesAndPlans = async () => {
    setLoading(true);
    try {
      const [passesData, myPassData] = await Promise.all([
        api.subscriptions.getPasses().catch(() => null),
        api.subscriptions.getMyPass().catch(() => null),
      ]);

      if (passesData && passesData.length > 0) {
        setPlans(passesData.map(p => ({
          ...p,
          id: p.id,
          name: p.title,
          title: p.title,
          badge: p.badge || (p.duration_days > 100 ? 'SAVE 40%' : 'POPULAR'),
          popular: !!p.badge || p.duration_days > 100,
          duration_days: p.duration_days,
          base_price: p.base_price,
          original_price: p.original_price,
          max_coins_discount: p.max_coins_discount,
          covered_course_ids: p.covered_course_ids || [],
          covered_courses: p.covered_courses || [],
          description: p.tagline || 'Targeted Pass Built for Exam Cycles',
          tagline: p.tagline || 'Targeted Pass Built for Exam Cycles',
          features: p.features || [
            'Full-length official simulations',
            'Deep error analytics & AI solutions',
            'All-India percentile tracking'
          ]
        })));
      } else {
        setPlans([]);
      }

      if (myPassData?.active_pass) {
        setActiveUserPass(myPassData.active_pass);
      }
    } catch (err) {
      console.warn('Passes fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    setOrderLoading(true);
    try {
      // Backend-driven order creation with pass_id and coin calculation (100 coins = ₹10)
      const order = await api.subscriptions.createOrder(plan.id, applyCoins);
      setCreatedOrder(order);
      setIsRazorpayOpen(true);
    } catch (err) {
      console.error('Order creation failed:', err);
      // Fallback order with 100 coins = 10 Rs formula
      const maxCoins = plan.max_coins_discount || 500;
      const coins = applyCoins ? Math.min(coinsBalance, maxCoins) : 0;
      const discountRupees = Math.round(coins * 0.10);
      setCreatedOrder({
        order_id: `order_${Date.now().toString(36)}`,
        amount_rupees: Math.max(1, plan.base_price - discountRupees),
        currency: 'INR',
        plan_id: plan.id,
        coins_applied: coins,
        discount_amount: discountRupees,
        user_coins_available: coinsBalance,
      });
      setIsRazorpayOpen(true);
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePaymentSuccess = (verifyResult) => {
    const planId = verifyResult.subscription?.plan || selectedPlan?.id;
    const durationDays = verifyResult.subscription?.duration_days || selectedPlan?.duration_days || 30;
    upgradeSubscription(planId, verifyResult.payment_id || `pay_${Date.now()}`, durationDays);

    if (verifyResult.coins_balance !== undefined) {
      updateCoins(verifyResult.coins_balance);
    }

    setIsRazorpayOpen(false);
    setSelectedPlan(null);
    setCreatedOrder(null);
    loadPassesAndPlans();
  };

  const currentPlanId = subscription?.status === 'ACTIVE' ? subscription.plan : (activeUserPass?.pass_id || 'FREE');

  const faqs = [
    {
      q: 'How do GovCoins work and how can I earn them?',
      a: 'You earn GovCoins automatically by solving practice quizzes every day! Daily quiz completion rewards 5 GovCoins, plus milestone rewards (20 coins on 7 days streak, 40 coins on 15 days streak, and 100 coins on a full 30-day month). 100 GovCoins equals ₹10 discount (1 coin = ₹0.10) on all courses and passes!',
    },
    {
      q: 'What happens if I miss a daily practice day?',
      a: 'Consistency is essential for civil exam pacing. If you miss a day, your habit streak resets to 0 so you are encouraged to rebuild discipline and re-unlock streak milestone rewards.',
    },
    {
      q: 'What does a Targeted Exam Pass include?',
      a: 'Passes (such as Monthly Pass and Annual Pass with SAVE 40%) give you dynamic all-access to all covered courses and official mock simulations for the duration of the pass without paying individually.',
    },
    {
      q: 'Can I access the mocks on both mobile and laptop?',
      a: 'Yes! The platform is fully responsive and optimized for both high-resolution desktop simulation (ideal for mock tests) and mobile devices for daily speed drills.',
    },
  ];

  return (
    <div className="relative overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-radial-glow">
      {/* Moving Ambient Glows */}
      <div className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-institutional-500/10 dark:bg-institutional-500/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -right-20 w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/15 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 relative z-10 animate-fade-in">

        {/* Active Pass Banner (if user has active pass) */}
        {activeUserPass && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-institutional-500/10 to-transparent border border-emerald-300 dark:border-emerald-700/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                👑
              </div>
              <div>
                <div className="text-sm font-black text-charcoal-950 dark:text-white flex items-center gap-2">
                  <span>{activeUserPass.title || 'Targeted Exam Pass'}</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Active Pass
                  </span>
                </div>
                <div className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-0.5">
                  Valid until {new Date(activeUserPass.expires_at).toLocaleDateString()} ({activeUserPass.days_remaining} days remaining) • Covers {activeUserPass.covered_course_ids?.length || 'all'} exam courses
                </div>
              </div>
            </div>
            <button
              onClick={onGoToMocks}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
            >
              Access Unlocked Courses →
            </button>
          </div>
        )}

        {/* Hero Banner */}
        <div className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center space-y-3 sm:space-y-4 shadow-subtle relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
            <CrownIcon size={14} />
            <span>TARGETED PASSES BUILT FOR EXAM CYCLES</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-tight">
            Full-Length Official Simulations &amp; All-India Tracking
          </h1>

          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 max-w-xl mx-auto leading-relaxed">
            Unlock unrestricted full mocks, deep AI topic diagnostics, peer percentiles, and instant step-by-step mathematical proofs across all covered exam courses.
          </p>

          {/* GovCoins Discount Feature Card */}
          <div className="max-w-md mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-institutional-500/10 border border-amber-300 dark:border-amber-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-left">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base sm:text-xl shadow-md shrink-0">
                🪙
              </div>
              <div>
                <div className="text-xs font-extrabold text-charcoal-900 dark:text-white flex items-center gap-1.5">
                  <span>Your Balance: {coinsBalance} GovCoins</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-charcoal-600 dark:text-charcoal-300">
                  Earned from streak challenges (100 Coins = ₹10 Discount)
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between sm:justify-start gap-2 cursor-pointer select-none shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 dark:border-amber-800/60">
              <span className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 sm:hidden">
                Use GovCoins for Discount
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyCoins}
                  onChange={(e) => setApplyCoins(e.target.checked)}
                  className="w-4 h-4 rounded text-institutional-600 focus:ring-institutional-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 hidden sm:inline">
                  Apply Coins
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4 rounded-2xl sm:rounded-3xl border border-charcoal-200 dark:border-charcoal-800 bg-white/50 dark:bg-charcoal-900/50 max-w-xl mx-auto">
            <p className="text-charcoal-600 dark:text-charcoal-400 text-sm font-semibold">
              No active subscription passes available at the moment.
            </p>
            <p className="text-charcoal-400 dark:text-charcoal-500 text-xs mt-1">
              Please check back later or explore our free mock tests.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch justify-center">
            {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const maxCoinDiscount = plan.max_coins_discount || 500;
            const coinsEligible = applyCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
            const discountRupees = Math.round(coinsEligible * 0.10);
            const finalPayable = Math.max(1, plan.base_price - discountRupees);
            const coveredCourses = plan.covered_courses || [];
            const coveredCount = coveredCourses.length || plan.covered_course_ids?.length || 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 border shadow-subtle ${
                  plan.popular
                    ? 'bg-white dark:bg-charcoal-900 border-2 border-institutional-600 dark:border-institutional-500 shadow-lifted md:-translate-y-1 ring-2 ring-institutional-500/20'
                    : 'bg-white dark:bg-charcoal-900 border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-400'
                }`}
              >
                {/* Popular Ribbon */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-institutional-600 to-indigo-600 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase px-3 py-1 rounded-bl-2xl shadow-sm flex items-center gap-1.5">
                      <SparklesIcon size={11} />
                      <span>{plan.badge}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 pr-16">
                    <h3 className="text-lg sm:text-xl font-black text-charcoal-900 dark:text-charcoal-100">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-charcoal-500 mb-4 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price Box with Coin Discount */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-charcoal-50 dark:bg-charcoal-850/80 border border-charcoal-200 dark:border-charcoal-800 mb-4 sm:mb-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-charcoal-500 font-semibold">Payable Price</span>
                      {discountRupees > 0 && (
                        <span className="text-xs text-charcoal-400 line-through font-mono">
                          ₹{plan.base_price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-charcoal-950 dark:text-white">
                        ₹{finalPayable}
                      </span>
                      <span className="text-xs text-charcoal-500 font-bold">
                        / {plan.duration_days > 100 ? '365 Days' : `${plan.duration_days} Days`}
                      </span>
                    </div>

                    {discountRupees > 0 ? (
                      <div className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span>🪙 Applied {coinsEligible} Coins (-₹{discountRupees} Off)</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-charcoal-400">
                        Eligible for up to ₹{(maxCoinDiscount * 0.1).toFixed(0)} off with GovCoins (100 coins = ₹10)
                      </div>
                    )}
                  </div>

                  {/* Dynamic Courses Unlocked Box */}
                  <div className="mb-4 p-3.5 rounded-xl sm:rounded-2xl bg-institutional-50/70 dark:bg-institutional-950/40 border border-institutional-200/60 dark:border-institutional-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-institutional-900 dark:text-institutional-200">
                      <span className="flex items-center gap-1.5">
                        <BookOpenIcon size={14} className="text-institutional-600 dark:text-institutional-400" />
                        <span>Includes {coveredCount} Prime Courses</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                        All-Access
                      </span>
                    </div>

                    {coveredCourses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {coveredCourses.map((c) => (
                          <span
                            key={c.id}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 border border-charcoal-200/80 dark:border-charcoal-700 shadow-2xs"
                          >
                            {c.target_exam || c.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 mb-6">
                    {plan.features?.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-charcoal-700 dark:text-charcoal-300 font-medium leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                      <CheckIcon size={14} />
                      <span>Active Pass</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPassForDetail(plan)}
                      className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer ${
                        plan.popular
                          ? 'bg-institutional-600 hover:bg-institutional-700 text-white shadow-institutional-600/25 ring-1 ring-institutional-500'
                          : 'border border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-500 text-charcoal-850 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800'
                      }`}
                    >
                      <span>Select {plan.name} & View Courses</span>
                      <ArrowRightIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Social Proof Banner */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-5 text-center">
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
          <p className="text-xs text-charcoal-500 max-w-lg mx-auto">
            Candidates who practiced daily and maintained streaks scored 28% higher in Tier-I & Tier-II exams.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-4">
          <h3 className="text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100 text-center">
            Frequently Asked Questions
          </h3>

          <div className="max-w-2xl mx-auto space-y-2.5 pt-2">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-charcoal-700 rounded-2xl overflow-hidden transition-all bg-white dark:bg-charcoal-850 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm flex items-center justify-between gap-4 bg-white hover:bg-blue-50/70 dark:bg-charcoal-850 dark:hover:bg-charcoal-800 transition-colors group cursor-pointer"
                  >
                    <span className="text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors font-extrabold">
                      {faq.q}
                    </span>
                    <span className="text-sm font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-charcoal-800 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-charcoal-700 shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed border-t border-slate-200 dark:border-charcoal-800 pt-3 bg-slate-50 dark:bg-charcoal-900/50 font-medium">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Razorpay Checkout Modal with Backend Order */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        plan={selectedPlan}
        order={createdOrder}
        onClose={() => {
          setIsRazorpayOpen(false);
          setSelectedPlan(null);
          setCreatedOrder(null);
        }}
        onSuccess={handlePaymentSuccess}
      />

      {/* Top-Down Interactive Pass Details & Courses Modal */}
      <PassDetailModal
        isOpen={!!selectedPassForDetail}
        pass={selectedPassForDetail}
        onClose={() => setSelectedPassForDetail(null)}
      />
    </div>
  );
};
