/**
 * CartPage — Multi-Course Checkout & Enrollment Experience
 *
 * Clean In-Flow Viewport Layout (Non-scrollable single-screen checkout):
 * - Hides global footer dynamically while on /cart and restores on unmount
 * - Normal document flow without breaking stacking contexts (no fixed inset bugs)
 * - Dual Theme: Seamless Charcoal-50 / Charcoal-950 Dark & Light Mode
 * - Internal scrollbar strictly on cart items list if many courses are added
 * - Order Summary with PrepCoins discount toggle & Razorpay checkout
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { ROUTES } from '../routes';
import {
  CartIcon,
  TrashIcon,
  CheckCircleIcon,
  ShieldIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  LockIcon,
  CoinsIcon,
  CheckIcon,
  BookOpenIcon,
  LayersIcon,
  ZapIcon,
  ClockIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  TrophyIcon,
} from '../components/Icons';

// ── Razorpay SDK Loader ─────────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Exam Category Pill Color Mapping ──────────────────────────────────────────
function getExamBadgeStyle(exam = '') {
  const norm = String(exam).toUpperCase();
  if (norm.includes('SSC')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  }
  if (norm.includes('RRB') || norm.includes('RAIL')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
  if (norm.includes('BANK')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  if (norm.includes('UPSC') || norm.includes('PSC')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  }
  return 'bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border-institutional-500/20';
}

// ── CartItemCard (Compact Viewport Format) ─────────────────────────────────────
function CartItemCard({ item, onRemove, removing }) {
  const original = Number(item.original_price) || 0;
  const discounted = Number(item.discounted_price) || 0;
  const discountPercent =
    original > discounted && original > 0
      ? Math.round(((original - discounted) / original) * 100)
      : 0;

  return (
    <div
      className="group relative rounded-xl sm:rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800
                 p-3.5 sm:p-4 shadow-xs hover:border-institutional-300 dark:hover:border-institutional-700/70
                 transition-all duration-150"
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Thumbnail & Course Metadata */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Avatar / Subject Icon */}
          <div
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-institutional-500/15 to-indigo-500/15
                       dark:from-institutional-500/25 dark:to-indigo-500/25 border border-institutional-200/80 dark:border-institutional-800/80
                       flex items-center justify-center shrink-0 shadow-xs"
          >
            <SparklesIcon size={22} className="text-institutional-600 dark:text-institutional-400" />
          </div>

          {/* Details */}
          <div className="space-y-0.5 flex-1 min-w-0">
            {/* Exam Tag & Validity */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getExamBadgeStyle(
                  item.target_exam
                )}`}
              >
                {item.target_exam || 'Targeted Exam'}
              </span>

              <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-medium text-charcoal-500 dark:text-charcoal-400">
                <ClockIcon size={11} className="text-charcoal-400" />
                <span>365-Day Access</span>
              </span>

              {item.is_enrolled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircleIcon size={10} />
                  Enrolled
                </span>
              )}
            </div>

            {/* Course Title */}
            <h3
              className="text-xs sm:text-sm font-bold text-charcoal-900 dark:text-white leading-snug line-clamp-1 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors"
              title={item.course_title}
            >
              {item.course_title}
            </h3>

            {/* Inclusions pill strip */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-charcoal-500 dark:text-charcoal-400">
              <span className="inline-flex items-center gap-1">
                <LayersIcon size={10} className="text-institutional-500" />
                Full Mocks Included
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <ZapIcon size={10} className="text-amber-500" />
                AI Diagnostic Solutions
              </span>
            </div>
          </div>
        </div>

        {/* Right: Pricing & Removal action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-sm sm:text-base font-black font-mono text-charcoal-900 dark:text-white">
                ₹{discounted.toFixed(0)}
              </span>
              {original > discounted && (
                <span className="text-[10px] font-mono text-charcoal-400 dark:text-charcoal-500 line-through">
                  ₹{original.toFixed(0)}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1 py-0.2 rounded inline-block">
                Save {discountPercent}%
              </span>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.course_id)}
            disabled={removing === item.course_id}
            className="p-1.5 sm:p-2 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors disabled:opacity-40 cursor-pointer"
            title="Remove course from cart"
            aria-label={`Remove ${item.course_title}`}
          >
            {removing === item.course_id ? (
              <div className="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-600 rounded-full animate-spin" />
            ) : (
              <TrashIcon size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty Cart State ──────────────────────────────────────────────────────────
function CartEmptyState({ onBrowse }) {
  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-10">
      <div className="text-center py-8 sm:py-12 px-6 rounded-3xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 shadow-md max-w-lg w-full">
        {/* Animated Glowing Cart Graphic */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-institutional-500/15 dark:bg-institutional-500/20 blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-institutional-50 to-charcoal-100 dark:from-charcoal-800 dark:to-charcoal-850 border border-institutional-200/80 dark:border-charcoal-700 flex items-center justify-center shadow-inner">
            <CartIcon size={28} className="text-institutional-600 dark:text-institutional-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
            0
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-black text-charcoal-900 dark:text-white tracking-tight mb-1.5">
          Your Cart is Empty
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-400 max-w-sm mx-auto mb-6 leading-relaxed">
          You haven’t added any exam courses yet. Explore our targeted test series for SSC, Railway, Banking, and PSC exams.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto mb-6">
          <button
            onClick={onBrowse}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <span>Explore All Courses</span>
            <ArrowRightIcon size={14} />
          </button>

          <Link
            to={ROUTES.subscription}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800/80 text-charcoal-800 dark:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 font-semibold text-xs sm:text-sm transition-all"
          >
            <TrophyIcon size={14} className="text-amber-500" />
            <span>View Passes</span>
          </Link>
        </div>

        {/* 3-point feature row */}
        <div className="pt-4 border-t border-charcoal-200/60 dark:border-charcoal-800/80 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-[11px] text-charcoal-500 dark:text-charcoal-400">
          <div>⚡ Instant Digital Access</div>
          <div>🛡️ Official Exam Calibrated</div>
          <div>📊 AI Accuracy Matrix</div>
        </div>
      </div>
    </div>
  );
}

// ── Success State Screen ──────────────────────────────────────────────────────
function CartSuccessState({ success, onGoToCourses, onBrowseMore }) {
  const coursesCount = success?.enrolled_courses?.length || 0;

  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-10">
      <div className="rounded-3xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 p-6 sm:p-8 shadow-lg max-w-lg w-full text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-6 ring-emerald-500/10 animate-scale-in">
          <CheckIcon size={30} className="stroke-[3]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider mb-2">
          <SparklesIcon size={11} />
          <span>Payment Verified</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 dark:text-white tracking-tight mb-1.5">
          Enrollment Successful!
        </h1>

        <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 mb-5 leading-relaxed">
          You are now enrolled in <strong className="text-institutional-600 dark:text-institutional-400">{coursesCount} Course{coursesCount !== 1 ? 's' : ''}</strong>. Your full mock test series is active.
        </p>

        {/* Receipt Box */}
        <div className="rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 p-3 mb-5 text-left space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-charcoal-500">Payment ID:</span>
            <span className="font-mono font-bold text-charcoal-900 dark:text-white">
              {success.payment_id || 'pay_confirmed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-charcoal-500">Order ID:</span>
            <span className="font-mono font-medium text-charcoal-700 dark:text-charcoal-300 truncate max-w-[180px]">
              {success.order_id || 'order_cart'}
            </span>
          </div>
          {success.coins_deducted > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-charcoal-200 dark:border-charcoal-800 text-amber-600 dark:text-amber-400 font-semibold">
              <span>🪙 Coins Redeemed:</span>
              <span>-{success.coins_deducted}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onGoToCourses}
            className="flex-1 py-3 px-4 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Start Learning</span>
            <ArrowRightIcon size={14} />
          </button>
          <button
            onClick={onBrowseMore}
            className="flex-1 py-3 px-4 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-charcoal-50 dark:hover:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Browse More
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CartPage Component ───────────────────────────────────────────────────
export function CartPage() {
  const { user } = useAuth();
  const { cart, cartCount, removeFromCart, clearCart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [applyCoins, setApplyCoins] = useState(true);
  const [checkoutData, setCheckoutData] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ── Hide global footer while on Cart page and restore when navigating away ───
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }
    return () => {
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  // ── Redirect guest to home ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [user, navigate]);

  // ── Fetch checkout preview ──────────────────────────────────────────────────
  const fetchPreview = useCallback(async () => {
    if (!cart?.items?.length) {
      setCheckoutData(null);
      return;
    }
    try {
      setLoadingPreview(true);
      setError('');
      const data = await api.cart.checkout(applyCoins);
      setCheckoutData(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate order pricing.');
    } finally {
      setLoadingPreview(false);
    }
  }, [cart?.items, applyCoins]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // ── Remove single item ──────────────────────────────────────────────────────
  const handleRemove = async (courseId) => {
    setRemoving(courseId);
    setError('');
    try {
      await removeFromCart(courseId);
    } catch (err) {
      setError(err.message || 'Failed to remove course from cart.');
    } finally {
      setRemoving(null);
    }
  };

  // ── Clear entire cart ───────────────────────────────────────────────────────
  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to empty your entire cart?')) return;
    setClearing(true);
    setError('');
    try {
      await clearCart();
    } catch (err) {
      setError(err.message || 'Failed to clear cart.');
    } finally {
      setClearing(false);
    }
  };

  // ── Razorpay checkout ───────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!checkoutData) return;
    setError('');
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError('Could not connect to Razorpay payment gateway.');
      setPaying(false);
      return;
    }

    const options = {
      key: checkoutData.key_id,
      amount: checkoutData.amount_paise,
      currency: checkoutData.currency || 'INR',
      name: 'PrepMagnet',
      description: `${checkoutData.course_ids.length} Exam Course(s) — Full Access Enrollment`,
      order_id: checkoutData.order_id,
      prefill: {
        name: user?.full_name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#1E64B5' },
      modal: { backdropclose: false },
      handler: async (response) => {
        try {
          const result = await api.cart.verifyPayment({
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            coins_used: checkoutData.coins_applied,
            course_ids: checkoutData.course_ids,
          });
          setSuccess(result);
          await refreshCart();
        } catch (err) {
          setError(err.message || 'Payment verification failed.');
        } finally {
          setPaying(false);
        }
      },
      'modal.ondismiss': () => setPaying(false),
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (resp) => {
      setError(`Payment failed: ${resp.error?.description || 'Gateway error'}`);
      setPaying(false);
    });
    rzp.open();
  };

  const isEmpty = !cart?.items || cart.items.length === 0;

  // Pricing calculations
  const originalTotal =
    cart?.items?.reduce(
      (sum, item) => sum + (Number(item.original_price) || Number(item.discounted_price) || 0),
      0
    ) || 0;

  const currentSubtotal = checkoutData?.subtotal ?? cart?.subtotal ?? 0;
  const courseDiscount = Math.max(0, originalTotal - currentSubtotal);
  const coinsDiscount = checkoutData?.discount_amount || 0;
  const totalSavings = courseDiscount + coinsDiscount;
  const finalPayable = checkoutData?.final_amount ?? currentSubtotal;
  const availableCoins = cart?.coins_available ?? user?.profile?.coins_balance ?? 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-start px-3 sm:px-6 lg:px-8 py-2 min-h-[calc(100vh-10rem)]">
      {/* ── Compact Header Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pb-2.5 mb-3 border-b border-charcoal-200/80 dark:border-charcoal-800/80 shrink-0">
        {/* Breadcrumb + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={ROUTES.courses}
            className="p-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-800 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 transition-colors shrink-0"
            title="Back to Courses"
          >
            <ArrowLeftIcon size={14} />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-black text-charcoal-900 dark:text-white tracking-tight truncate">
              Shopping Cart
            </h1>
            {!isEmpty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-charcoal-200 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 shrink-0">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
        </div>

        {/* Stepper + Clear Cart action */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-institutional-500/10 border border-institutional-200 dark:border-institutional-800/60 text-institutional-700 dark:text-institutional-300 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-institutional-500 animate-pulse" />
            <span>Step 1 of 2: Cart Review & Discounts</span>
          </div>

          {!isEmpty && (
            <button
              onClick={handleClearCart}
              disabled={clearing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-charcoal-200 dark:border-charcoal-800 text-[11px] font-semibold text-charcoal-600 dark:text-charcoal-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              {clearing ? (
                <div className="w-3 h-3 border-2 border-rose-500/40 border-t-rose-500 rounded-full animate-spin" />
              ) : (
                <TrashIcon size={12} />
              )}
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0 animate-shake">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={14} className="text-rose-500 shrink-0" />
            <span className="font-medium line-clamp-1">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* ── Screen States ──────────────────────────────────────────────── */}
      {success ? (
        <CartSuccessState
          success={success}
          onGoToCourses={() => navigate(`${ROUTES.dashboard}/courses`)}
          onBrowseMore={() => navigate(ROUTES.courses)}
        />
      ) : isEmpty ? (
        <CartEmptyState onBrowse={() => navigate(ROUTES.courses)} />
      ) : (
        /* ── Main 2-Column Split ─────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          {/* ── Left Column: Course Items ─────────────────────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                Selected Courses ({cart.items.length})
              </span>
              <Link
                to={ROUTES.courses}
                className="text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline inline-flex items-center gap-1"
              >
                <span>+ Add More</span>
              </Link>
            </div>

            {/* Course Cards list with subtle max-height */}
            <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-charcoal-200 dark:[&::-webkit-scrollbar-thumb]:bg-charcoal-800 [&::-webkit-scrollbar-thumb]:rounded-full">
              {cart.items.map((item) => (
                <CartItemCard
                  key={item.course_id}
                  item={item}
                  onRemove={handleRemove}
                  removing={removing}
                />
              ))}
            </div>

            {/* Bottom Assurance Strip */}
            <div className="py-2.5 px-3.5 rounded-xl bg-white/60 dark:bg-charcoal-900/60 border border-charcoal-200/80 dark:border-charcoal-800/80 flex items-center justify-between text-[11px] text-charcoal-600 dark:text-charcoal-400">
              <span className="inline-flex items-center gap-1.5">
                <ZapIcon size={13} className="text-institutional-500" />
                Instant Activation
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldIcon size={13} className="text-emerald-500" />
                RBI & Razorpay 256-bit Safe
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpenIcon size={13} className="text-amber-500" />
                Full Exam Cycle Access
              </span>
            </div>
          </div>

          {/* ── Right Column: Order Summary ───────────────────────────── */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 p-4 sm:p-5 shadow-sm space-y-3.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-charcoal-150 dark:border-charcoal-800">
                <h2 className="text-sm sm:text-base font-extrabold text-charcoal-900 dark:text-white">
                  Order Summary
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  <LockIcon size={10} />
                  <span>SSL Secure</span>
                </span>
              </div>

              {/* PrepCoins Redemption Toggle */}
              {availableCoins > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-institutional-500/10 border border-amber-300 dark:border-amber-700/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">🪙</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-charcoal-900 dark:text-white truncate">
                          Redeem PrepCoins
                        </p>
                        <p className="text-[10px] text-charcoal-600 dark:text-charcoal-300 truncate">
                          {availableCoins} coins (100 coins = ₹10 off)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={applyCoins}
                      onClick={() => setApplyCoins((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${applyCoins ? 'bg-amber-500' : 'bg-charcoal-200 dark:bg-charcoal-700'
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${applyCoins ? 'translate-x-4' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  {applyCoins && checkoutData?.discount_amount > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-300/60 dark:border-amber-700/60 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Applied: {checkoutData.coins_applied} Coins</span>
                      <span>-₹{checkoutData.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              {loadingPreview ? (
                <div className="space-y-2 py-1">
                  <div className="h-3.5 bg-charcoal-100 dark:bg-charcoal-800 rounded animate-pulse" />
                  <div className="h-3.5 bg-charcoal-100 dark:bg-charcoal-800 rounded animate-pulse w-3/4" />
                  <div className="h-5 bg-charcoal-100 dark:bg-charcoal-800 rounded animate-pulse w-1/2" />
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-charcoal-600 dark:text-charcoal-400">
                    <span>Course MRP Total</span>
                    <span className="font-mono text-charcoal-800 dark:text-charcoal-200">
                      ₹{originalTotal.toFixed(2)}
                    </span>
                  </div>

                  {courseDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Course Special Discount</span>
                      <span className="font-mono">-₹{courseDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {coinsDiscount > 0 && (
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <span>🪙</span> PrepCoins Redeemed
                      </span>
                      <span className="font-mono">-₹{coinsDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-charcoal-600 dark:text-charcoal-400">
                    <span>Taxes & Access Fee</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold text-center">
                      🎉 You save ₹{totalSavings.toFixed(0)} on this order!
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Checkout Action */}
              <div className="pt-2.5 border-t border-charcoal-200 dark:border-charcoal-800 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold text-charcoal-900 dark:text-white">
                      Total Amount
                    </span>
                    <span className="block text-[9px] text-charcoal-400">
                      (Inclusive of all taxes)
                    </span>
                  </div>
                  <span className="font-mono font-black text-lg sm:text-xl text-institutional-600 dark:text-institutional-400">
                    ₹{finalPayable.toFixed(2)}
                  </span>
                </div>

                <button
                  id="cart-checkout-btn"
                  onClick={handleCheckout}
                  disabled={paying || !checkoutData || loadingPreview}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-institutional-600 to-institutional-700 hover:from-institutional-500 hover:to-institutional-600 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opening Secure Gateway…</span>
                    </>
                  ) : (
                    <>
                      <LockIcon size={14} />
                      <span>Proceed to Secure Payment</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-[10px] text-charcoal-400 dark:text-charcoal-500 flex items-center justify-center gap-1">
                    <ShieldIcon size={11} className="text-emerald-500" />
                    <span>UPI · RuPay · Cards · NetBanking · 256-bit SSL</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
