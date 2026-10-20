import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '../routes';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RazorpayModal } from './RazorpayModal';
import {
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldIcon,
  ZapIcon,
  LockIcon,
  ArrowRightIcon,
  XIcon,
  BookOpenIcon,
  ClockIcon,
  TargetIcon,
  LayersIcon,
} from './Icons';

export const PassDetailModal = ({
  isOpen,
  pass,
  onClose,
  onOpenAuthModal,
}) => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [applyCoins, setApplyCoins] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !pass) return null;

  const coinsBalance = user?.profile?.coins_balance ?? 0;
  const basePrice = pass.base_price || 0;
  const originalPrice = pass.original_price || basePrice;
  const maxCoinsAllowed = pass.max_coins_discount || 0;

  // Coin calculations: 100 coins = ₹10 (0.10 Rs per coin)
  // Max coins applied keeping at least ₹1 payable
  const maxCoinsForPrice = Math.max(0, Math.floor((basePrice - 1.0) / 0.10));
  const effectiveCoinCap = Math.min(maxCoinsAllowed, maxCoinsForPrice);
  const coinsToApply = applyCoins && user ? Math.min(coinsBalance, effectiveCoinCap) : 0;
  const discountFromCoins = Math.round(coinsToApply * 0.10);
  const finalPayable = Math.max(1, Math.round(basePrice - discountFromCoins));
  const totalSavings = originalPrice > finalPayable ? originalPrice - finalPayable : 0;

  const coveredCourses = pass.covered_courses || [];

  const handleStartCheckout = async () => {
    if (!user) {
      if (onOpenAuthModal) {
        onOpenAuthModal('login');
      } else {
        navigate(ROUTES.home);
      }
      return;
    }

    setOrderLoading(true);
    setErrorMessage('');

    try {
      // Create real order on backend via PassService
      const order = await api.subscriptions.createOrder(pass.id, applyCoins);
      setCreatedOrder(order);
      setIsRazorpayOpen(true);
    } catch (err) {
      console.warn('Backend order creation error:', err);
      setErrorMessage(
        err.status === 401
          ? 'Please sign in to complete your pass purchase.'
          : (err.message || 'Could not initiate Razorpay checkout order. Please try again.')
      );
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    setIsRazorpayOpen(false);
    setPurchaseSuccessData(result);
    // Refresh user profile so PRO USER badge & enrolled courses reflect immediately in context
    if (refreshProfile) {
      await refreshProfile();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-5 md:p-8 pt-4 sm:pt-8 md:pt-12 bg-charcoal-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-750 rounded-2xl sm:rounded-3xl max-w-3xl w-full mb-12 overflow-hidden shadow-2xl animate-scale-in text-charcoal-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Shimmer Accent */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-institutional-500 via-amber-400 to-indigo-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>

          {purchaseSuccessData ? (
            /* =========================================================================
               POST-PURCHASE PRO CELEBRATION VIEW
               ========================================================================= */
            <div className="p-6 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
                <CrownIcon size={36} className="text-white fill-white" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <span>👑 PRO STATUS ACTIVATED</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-charcoal-950 dark:text-white">
                  Welcome to PRO Aspirant! 🎉
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 max-w-lg mx-auto">
                  Your <strong>{pass.title}</strong> is active. You have been granted complete PRO privileges with all courses unlocked.
                </p>
              </div>

              {/* Profile Tags Showcase */}
              <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-750 max-w-md mx-auto space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                  Profile Tags Unlocked
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/50 shadow-xs">
                    <CrownIcon size={13} className="text-amber-500 fill-amber-500" />
                    <span>PRO USER</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-institutional-50 text-institutional-700 dark:bg-institutional-950 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                    <ShieldIcon size={12} className="text-institutional-600" />
                    <span>VERIFIED ASPIRANT</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircleIcon size={12} className="text-emerald-600" />
                    <span>ALL COURSES ENROLLED</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate(ROUTES.dashboard);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <TargetIcon size={16} />
                  <span>Go to Student Dashboard</span>
                  <ArrowRightIcon size={14} />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate(`${ROUTES.dashboard}/courses`);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-charcoal-200 dark:border-charcoal-700 hover:border-institutional-400 bg-white dark:bg-charcoal-800 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpenIcon size={16} className="text-institutional-600" />
                  <span>View Enrolled Courses</span>
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
               PASS SPECIFICATION & INCLUDED COURSES DETAIL VIEW
               ========================================================================= */
            <div className="p-5 sm:p-8 space-y-6">
              {/* Header Info */}
              <div className="space-y-2 pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  {pass.badge && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-institutional-600 to-indigo-600 text-white shadow-xs">
                      <SparklesIcon size={12} />
                      <span>{pass.badge}</span>
                    </span>
                  )}
                  <span className="text-xs font-bold text-charcoal-500 dark:text-charcoal-400 bg-charcoal-100 dark:bg-charcoal-800 px-2.5 py-0.5 rounded-full font-mono">
                    ⏱ {pass.duration_days} Days Full Access
                  </span>
                </div>

                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-charcoal-950 dark:text-white">
                  {pass.title}
                </h2>

                <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                  {pass.tagline || 'Full-length official simulations, deep error analytics, and All-India percentile tracking.'}
                </p>
              </div>

              {/* Pricing & Value Proposition Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-institutional-50/80 via-white to-blue-50/50 dark:from-charcoal-800/80 dark:via-charcoal-850 dark:to-charcoal-800 border border-institutional-200/60 dark:border-charcoal-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                    Transparent Membership Fee
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-institutional-950 dark:text-white">
                      ₹{finalPayable}
                    </span>
                    <span className="text-xs font-semibold text-charcoal-500">
                      / {pass.duration_days > 100 ? '365 Days' : `${pass.duration_days} Days`}
                    </span>
                    {originalPrice > finalPayable && (
                      <span className="text-sm text-charcoal-400 line-through font-mono">
                        ₹{originalPrice}
                      </span>
                    )}
                  </div>
                  {totalSavings > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓ You save ₹{totalSavings} ({Math.round((totalSavings / originalPrice) * 100)}% off official rates)</span>
                    </div>
                  )}
                </div>

                {/* PrepCoins Redemption Toggle Box */}
                <div className="p-3 rounded-xl bg-white/80 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700 min-w-[220px]">
                  {user ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                          <span>🪙</span>
                          <span>{coinsBalance} PrepCoins</span>
                        </span>
                        <span className="text-[10px] text-charcoal-500 font-mono">
                          = ₹{(coinsBalance * 0.10).toFixed(1)}
                        </span>
                      </div>

                      {coinsBalance > 0 && effectiveCoinCap > 0 ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-charcoal-150 dark:border-charcoal-700">
                          <input
                            type="checkbox"
                            checked={applyCoins}
                            onChange={(e) => setApplyCoins(e.target.checked)}
                            className="rounded text-institutional-600 focus:ring-institutional-500 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-semibold text-charcoal-700 dark:text-charcoal-300">
                            Apply -₹{discountFromCoins} discount
                          </span>
                        </label>
                      ) : (
                        <p className="text-[10px] text-charcoal-400">
                          Earn coins by solving daily practice tests!
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-charcoal-500">
                      <span className="font-semibold text-charcoal-700 dark:text-charcoal-300">PrepCoins Wallet:</span>
                      <p className="text-[10px] text-charcoal-400 mt-0.5">Sign in to redeem coins for instant discounts.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================================
                  N COURSES INCLUDED IN THIS PASS (Real Data from MongoDB)
                  ========================================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-charcoal-900 dark:text-white flex items-center gap-2">
                    <BookOpenIcon size={18} className="text-institutional-600" />
                    <span>Included Examination Courses ({coveredCourses.length})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Instant All-Access
                  </span>
                </div>

                {coveredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {coveredCourses.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-charcoal-50/60 dark:bg-charcoal-800/40 hover:border-institutional-400 transition-all space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-100 text-institutional-800 dark:bg-institutional-950 dark:text-institutional-300">
                              {c.target_exam || 'Govt Exam'}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircleIcon size={12} />
                              <span>Unlocked</span>
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-extrabold text-charcoal-900 dark:text-white leading-snug">
                            {c.title}
                          </h4>

                          {c.tagline && (
                            <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 line-clamp-2">
                              {c.tagline}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-charcoal-200/60 dark:border-charcoal-700/60 flex items-center justify-between text-[11px] text-charcoal-500">
                          <span className="flex items-center gap-1 font-semibold">
                            <LayersIcon size={12} className="text-institutional-500" />
                            <span>{c.total_quizzes ? `${c.total_quizzes} Quizzes & Mocks` : 'Full Test Series'}</span>
                          </span>
                          <span className="text-institutional-600 dark:text-institutional-400 font-bold">
                            ₹0 with Pass
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 text-center text-xs text-charcoal-500">
                    All current and upcoming courses are unlocked under this membership.
                  </div>
                )}
              </div>

              {/* =========================================================================
                  PLATFORM FEATURES & CBT PERKS
                  ========================================================================= */}
              {pass.features && pass.features.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1.5">
                    <ShieldIcon size={14} className="text-institutional-600" />
                    <span>Platform Engine Features Included</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {pass.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-150 dark:border-charcoal-800">
                        <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-charcoal-800 dark:text-charcoal-200 text-[11px] font-medium leading-tight">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert if any */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Checkout Action Footer */}
              <div className="pt-4 border-t border-charcoal-200 dark:border-charcoal-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-charcoal-500">
                  <LockIcon size={14} className="text-emerald-600" />
                  <span className="text-[11px]">256-Bit SSL Secured • Razorpay Instant Activation</span>
                </div>

                <button
                  type="button"
                  disabled={orderLoading}
                  onClick={handleStartCheckout}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 disabled:opacity-60 text-white font-black text-xs sm:text-sm shadow-lg shadow-institutional-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {orderLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Preparing Secure Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Purchase Pass — ₹{finalPayable}</span>
                      <ArrowRightIcon size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Razorpay Checkout Modal */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        plan={pass}
        order={createdOrder}
        onClose={() => setIsRazorpayOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
