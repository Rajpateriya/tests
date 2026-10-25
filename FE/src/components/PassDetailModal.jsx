import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  CoinsIcon,
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

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
  const savingsPercent = originalPrice > 0 ? Math.round((totalSavings / originalPrice) * 100) : 0;

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

  const defaultFeatures = [
    'Full-Length Official Simulations (TCS iON Interface & Physics)',
    'Deep Error Analytics & AI Weak-Area Drills',
    'Real-Time All-India Percentile & Rank Benchmarking',
    'All Covered Exam Courses & Blueprints Included',
  ];
  const displayFeatures = pass.features && pass.features.length > 0 ? pass.features : defaultFeatures;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 bg-charcoal-950/80 dark:bg-black/85 backdrop-blur-md animate-fade-in overscroll-contain select-none-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-modal-title"
    >
      <div
        className="relative bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-750 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl animate-scale-in text-charcoal-900 dark:text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Shimmer Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-institutional-500 via-amber-400 to-indigo-500 shrink-0" />

        {/* Modal Top Bar (Sticky) */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-charcoal-150 dark:border-charcoal-800/80 shrink-0 relative bg-white dark:bg-charcoal-900 flex items-start justify-between gap-4">
          <div className="space-y-1.5 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              {pass.badge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-institutional-600 to-indigo-600 text-white shadow-xs">
                  <SparklesIcon size={12} />
                  <span>{pass.badge}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-charcoal-600 dark:text-charcoal-300 bg-charcoal-100 dark:bg-charcoal-800 px-3 py-0.5 rounded-full font-mono">
                <ClockIcon size={12} className="text-institutional-600 dark:text-institutional-400" />
                <span>{pass.duration_days > 100 ? '365 Days' : `${pass.duration_days} Days`} Full Access</span>
              </span>
              {coveredCourses.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                  <CheckCircleIcon size={12} />
                  <span>{coveredCourses.length} Courses Unlocked</span>
                </span>
              )}
            </div>

            <h2 id="pass-modal-title" className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-charcoal-950 dark:text-white">
              {pass.title}
            </h2>

            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-400 leading-relaxed line-clamp-2">
              {pass.tagline || 'Full-length official simulations, deep error analytics, and All-India percentile tracking.'}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-charcoal-100 hover:bg-charcoal-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
            aria-label="Close modal"
          >
            <XIcon size={18} />
          </button>
        </div>

        {purchaseSuccessData ? (
          /* =========================================================================
             POST-PURCHASE PRO CELEBRATION VIEW
             ========================================================================= */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-center space-y-6">
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
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 md:p-8 space-y-6">
              {/* 1. Bento Pricing & PrepCoins Discount Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Pricing Details (7 cols on lg) */}
                <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-institutional-50/90 via-white to-blue-50/40 dark:from-charcoal-800/90 dark:via-charcoal-850 dark:to-charcoal-800 border border-institutional-200/70 dark:border-charcoal-700 flex flex-col justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1.5">
                      <SparklesIcon size={13} className="text-institutional-600 dark:text-institutional-400" />
                      <span>Transparent Membership Fee</span>
                    </div>

                    <div className="flex items-baseline flex-wrap gap-2.5 pt-1">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-institutional-950 dark:text-white">
                        ₹{finalPayable}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-charcoal-500 dark:text-charcoal-400">
                        / {pass.duration_days > 100 ? '365 Days' : `${pass.duration_days} Days`}
                      </span>
                      {originalPrice > finalPayable && (
                        <span className="text-sm text-charcoal-400 line-through font-mono">
                          ₹{originalPrice}
                        </span>
                      )}
                    </div>

                    {totalSavings > 0 && (
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                        <CheckCircleIcon size={13} />
                        <span>You save ₹{totalSavings} ({savingsPercent}% off official rates)</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-institutional-200/50 dark:border-charcoal-700/60 text-[11px] text-charcoal-500 dark:text-charcoal-400 flex items-center gap-3">
                    <span>✓ Zero hidden fees</span>
                    <span>✓ Instant activation</span>
                    <span>✓ Official TCS iON engine</span>
                  </div>
                </div>

                {/* Right: PrepCoins Reward Wallet (5 cols on lg) */}
                <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/60 border border-charcoal-200/80 dark:border-charcoal-700 flex flex-col justify-between gap-3 shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1.5">
                        <CoinsIcon size={13} className="text-amber-500" />
                        <span>PrepCoins Wallet</span>
                      </span>
                      {user && (
                        <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300 font-mono bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                          🪙 {coinsBalance} Coins
                        </span>
                      )}
                    </div>

                    {user ? (
                      <div className="space-y-2 text-xs">
                        <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-snug">
                          {coinsBalance > 0
                            ? `You have ${coinsBalance} coins available (100 coins = ₹10 discount).`
                            : 'Solve daily drills and practice sets to earn PrepCoins for fee discounts!'}
                        </p>

                        {coinsBalance > 0 && effectiveCoinCap > 0 && (
                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-700 cursor-pointer select-none hover:border-institutional-400 transition-all shadow-2xs">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={applyCoins}
                                onChange={(e) => setApplyCoins(e.target.checked)}
                                className="rounded text-institutional-600 focus:ring-institutional-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                                Apply Coin Discount
                              </span>
                            </div>
                            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              -₹{discountFromCoins}
                            </span>
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 leading-snug">
                          Sign in to redeem your candidate PrepCoins balance for instant discounts.
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpenAuthModal?.('login')}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-charcoal-850 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 border border-charcoal-200 dark:border-charcoal-700 text-institutional-600 dark:text-institutional-400 text-xs font-bold transition-all text-center cursor-pointer"
                        >
                          Sign In & Apply Coins →
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-charcoal-400 dark:text-charcoal-500 font-medium">
                    100 PrepCoins = ₹10 direct fee discount
                  </div>
                </div>
              </div>

              {/* 2. INCLUDED EXAMINATION COURSES (Broad 3-Column Responsive Grid) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-charcoal-900 dark:text-white flex items-center gap-2">
                    <BookOpenIcon size={18} className="text-institutional-600 dark:text-institutional-400" />
                    <span>Included Examination Courses ({coveredCourses.length})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Instant All-Access
                  </span>
                </div>

                {coveredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                    {coveredCourses.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-charcoal-200/90 dark:border-charcoal-750 bg-charcoal-50/60 dark:bg-charcoal-850/60 hover:border-institutional-400 dark:hover:border-institutional-500 hover:shadow-subtle transition-all space-y-2 flex flex-col justify-between group"
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

                          <h4 className="text-xs sm:text-sm font-extrabold text-charcoal-900 dark:text-white leading-snug group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors line-clamp-2">
                            {c.title}
                          </h4>

                          {c.tagline && (
                            <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400 line-clamp-2 leading-relaxed">
                              {c.tagline}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-charcoal-200/70 dark:border-charcoal-700/60 flex items-center justify-between text-[11px] text-charcoal-500 dark:text-charcoal-400">
                          <span className="flex items-center gap-1 font-semibold">
                            <LayersIcon size={12} className="text-institutional-500" />
                            <span>{c.total_quizzes ? `${c.total_quizzes} Quizzes & Mocks` : 'Full Test Series'}</span>
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            ₹0 with Pass
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center text-xs text-charcoal-600 dark:text-charcoal-300">
                    All current and upcoming CBT mock test series and full-length exams are 100% unlocked with this pass.
                  </div>
                )}
              </div>

              {/* 3. PLATFORM FEATURES & CBT ENGINE PERKS */}
              <div className="space-y-2.5">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1.5">
                  <ShieldIcon size={14} className="text-institutional-600 dark:text-institutional-400" />
                  <span>Platform Engine Features Included</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {displayFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-150 dark:border-charcoal-800"
                    >
                      <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-charcoal-800 dark:text-charcoal-200 text-[11px] font-medium leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Alert if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                  <span>{errorMessage}</span>
                  <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700 font-bold">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Modal Bottom Sticky Action Bar */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 bg-charcoal-50/95 dark:bg-charcoal-850/95 backdrop-blur-md border-t border-charcoal-200/90 dark:border-charcoal-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400">
                <LockIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs">
                  256-Bit SSL Secured • Razorpay Instant Activation • Full Validity
                </span>
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}

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
