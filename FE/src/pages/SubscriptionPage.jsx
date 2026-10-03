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

export const SubscriptionPage = ({ onGoToMocks }) => {
  const { subscription, user, upgradeSubscription, updateCoins } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyCoins, setApplyCoins] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const coinsBalance = user?.profile?.coins_balance ?? 150;

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.subscriptions.getPlans();
      setPlans(data || []);
    } catch (err) {
      console.warn('Plans fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    setOrderLoading(true);
    try {
      // Backend-driven order creation
      const order = await api.subscriptions.createOrder(plan.id, applyCoins);
      setCreatedOrder(order);
      setIsRazorpayOpen(true);
    } catch (err) {
      console.error('Order creation failed:', err);
      // Fallback order
      const coins = applyCoins ? Math.min(coinsBalance, plan.max_coins_discount || 25) : 0;
      setCreatedOrder({
        order_id: `order_${Date.now().toString(36)}`,
        amount_rupees: Math.max(1, plan.base_price - coins),
        currency: 'INR',
        plan_id: plan.id,
        coins_applied: coins,
        discount_amount: coins,
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
  };

  const currentPlanId = subscription?.status === 'ACTIVE' ? subscription.plan : 'FREE';

  const faqs = [
    {
      q: 'How do GovCoins work and how can I earn them?',
      a: 'You earn GovCoins automatically by solving practice quizzes every day! Daily quiz completion rewards 20 GovCoins, and maintaining a 7-day streak awards a massive 100 Bonus GovCoins. Every GovCoin equals ₹1 discount on any subscription pass.',
    },
    {
      q: 'How does the TCS iON exam simulation help my real exam score?',
      a: 'Our exam engine meticulously replicates the official TCS iON platform used by SSC, RRB, and Banking exams—palette buttons, color legends, timers, and marking schemes. Practicing here eliminates test-day interface unfamiliarity.',
    },
    {
      q: 'What is the difference between 7-Day Sprint and Monthly Pro passes?',
      a: 'The 7-Day Sprint Pass is ideal for last-minute revision right before exam day, while the Monthly Pro Pass provides comprehensive syllabus analytics, All-India percentiles, and AI weak-area auto-drills.',
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

        {/* Hero Banner */}
        <div className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-subtle relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
            <CrownIcon size={14} />
            <span>PREMIUM ASPIRANT PASSES</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-tight">
            Accelerate Your Score to the 99th Percentile
          </h1>

          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 max-w-xl mx-auto leading-relaxed">
            Unlock unrestricted full mocks, deep AI topic diagnostics, peer percentiles, and instant step-by-step mathematical proofs.
          </p>

          {/* GovCoins Discount Feature Card */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-institutional-500/10 border border-amber-300 dark:border-amber-700/80 shadow-sm flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                🪙
              </div>
              <div>
                <div className="text-xs font-extrabold text-charcoal-900 dark:text-white flex items-center gap-1.5">
                  <span>Your Balance: {coinsBalance} GovCoins</span>
                </div>
                <div className="text-[11px] text-charcoal-600 dark:text-charcoal-300">
                  Earned from daily practice & 7-day streaks (1 Coin = ₹1)
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={applyCoins}
                onChange={(e) => setApplyCoins(e.target.checked)}
                className="w-4 h-4 rounded text-institutional-600 focus:ring-institutional-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                Apply Coins
              </span>
            </label>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const maxCoinDiscount = plan.max_coins_discount || 25;
            const coinsEligible = applyCoins ? Math.min(coinsBalance, maxCoinDiscount, plan.base_price - 1) : 0;
            const finalPayable = Math.max(1, plan.base_price - coinsEligible);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 border shadow-subtle ${
                  plan.popular
                    ? 'bg-white dark:bg-charcoal-900 border-2 border-institutional-600 dark:border-institutional-500 shadow-lifted md:-translate-y-1'
                    : 'bg-white dark:bg-charcoal-900 border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-400'
                }`}
              >
                {/* Popular Ribbon */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-institutional-600 to-indigo-600 text-white font-extrabold text-[9px] tracking-wider uppercase px-3 py-1 rounded-bl-2xl shadow-sm flex items-center gap-1">
                      <SparklesIcon size={10} />
                      <span>{plan.badge}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100">
                      {plan.name}
                    </h3>
                    {!plan.popular && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400 font-mono">
                        {plan.duration_days} Days
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-charcoal-500 mb-4 leading-relaxed line-clamp-2">
                    {plan.description}
                  </p>

                  {/* Price Box with Coin Discount */}
                  <div className="p-3.5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850/80 border border-charcoal-200 dark:border-charcoal-800 mb-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-charcoal-500 font-semibold">Payable Price</span>
                      {coinsEligible > 0 && (
                        <span className="text-xs text-charcoal-400 line-through font-mono">
                          ₹{plan.base_price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-extrabold font-mono text-charcoal-950 dark:text-white">
                        ₹{finalPayable}
                      </span>
                      <span className="text-xs text-charcoal-500 font-medium">
                        / {plan.duration_days} days
                      </span>
                    </div>

                    {coinsEligible > 0 ? (
                      <div className="mt-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span>🪙 Applied {coinsEligible} Coins (-₹{coinsEligible} Discount)</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-charcoal-400">
                        Eligible for up to ₹{maxCoinDiscount} off using GovCoins
                      </div>
                    )}
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 mb-6">
                    {plan.features?.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-charcoal-700 dark:text-charcoal-300 font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                      <CheckIcon size={14} />
                      <span>Active Pass</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={orderLoading}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        plan.popular
                          ? 'bg-institutional-600 hover:bg-institutional-700 text-white shadow-institutional-600/20'
                          : 'border border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-500 text-charcoal-850 dark:text-charcoal-200 hover:bg-charcoal-50 dark:hover:bg-charcoal-800'
                      }`}
                    >
                      <span>{orderLoading && selectedPlan?.id === plan.id ? 'Preparing...' : `Get ${plan.name}`}</span>
                      <ArrowRightIcon size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
                  className="border border-charcoal-200 dark:border-charcoal-800 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left font-bold text-xs sm:text-sm text-charcoal-900 dark:text-charcoal-100 flex items-center justify-between gap-4 hover:bg-charcoal-50 dark:hover:bg-charcoal-850"
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
    </div>
  );
};
