/**
 * CartPage — Multi-Course Checkout Page
 *
 * Features:
 * - Lists all cart items with pricing and remove button
 * - GovCoins toggle discount
 * - Razorpay checkout for full cart in one order
 * - Success state with enrolled course list
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { ROUTES } from '../routes';

// ── Icon helpers ──────────────────────────────────────────────────────────────
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const icons = {
    trash: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    coin: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" />
        <path d="M10 6a1 1 0 011 1v2.586l1.707 1.707a1 1 0 01-1.414 1.414l-2-2A1 1 0 019 10V7a1 1 0 011-1z" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    cart: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    sparkle: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4 2.4-7.3L2 9.2h7.6z" />
      </svg>
    ),
    back: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// ── Razorpay loader ───────────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── CartItemCard ──────────────────────────────────────────────────────────────
function CartItemCard({ item, onRemove, removing }) {
  const discount = item.original_price > item.discounted_price
    ? Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 dark:bg-white/3 border border-white/10 rounded-2xl
                    hover:border-indigo-500/30 transition-all duration-200 group">
      {/* Icon */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20
                      flex items-center justify-center text-2xl border border-indigo-500/20">
        <Icon name="sparkle" className="w-7 h-7 text-indigo-400" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate">{item.course_title}</p>
        <p className="text-xs text-white/50 mt-0.5">{item.target_exam}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-indigo-300 font-bold text-sm">₹{item.discounted_price.toFixed(0)}</span>
          {discount > 0 && (
            <>
              <span className="text-white/30 line-through text-xs">₹{item.original_price.toFixed(0)}</span>
              <span className="text-emerald-400 text-xs font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                -{discount}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.course_id)}
        disabled={removing === item.course_id}
        className="flex-shrink-0 p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10
                   transition-colors duration-150 disabled:opacity-40"
        title="Remove from cart"
        aria-label={`Remove ${item.course_title}`}
      >
        {removing === item.course_id
          ? <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
          : <Icon name="trash" className="w-4 h-4" />
        }
      </button>
    </div>
  );
}

// ── Main CartPage ─────────────────────────────────────────────────────────────
export function CartPage() {
  const { user } = useAuth();
  const { cart, cartCount, removeFromCart, clearCart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [applyCoins, setApplyCoins] = useState(true);
  const [checkoutData, setCheckoutData] = useState(null); // from /cart/checkout
  const [removing, setRemoving] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ── Redirect guest to home ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate(ROUTES.home, { replace: true });
  }, [user, navigate]);

  // ── Fetch checkout preview whenever cart or coins toggle changes ──────────
  const fetchPreview = useCallback(async () => {
    if (!cart.items?.length) { setCheckoutData(null); return; }
    try {
      setLoadingPreview(true);
      const data = await api.cart.checkout(applyCoins);
      setCheckoutData(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate order');
    } finally {
      setLoadingPreview(false);
    }
  }, [cart.items, applyCoins]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  // ── Remove item ───────────────────────────────────────────────────────────
  const handleRemove = async (courseId) => {
    setRemoving(courseId);
    try {
      await removeFromCart(courseId);
    } catch (err) {
      setError(err.message || 'Failed to remove item');
    } finally {
      setRemoving(null);
    }
  };

  // ── Razorpay checkout ─────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!checkoutData) return;
    setError('');
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError('Could not load payment gateway. Please check your internet connection.');
      setPaying(false);
      return;
    }

    const options = {
      key: checkoutData.key_id,
      amount: checkoutData.amount_paise,
      currency: checkoutData.currency || 'INR',
      name: 'PrepMagnet',
      description: `${checkoutData.course_ids.length} Course(s) — Bulk Enrollment`,
      order_id: checkoutData.order_id,
      prefill: {
        name: user?.full_name || '',
        email: user?.email || '',
      },
      theme: { color: '#6366f1' },
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
          setError(err.message || 'Payment verification failed. Please contact support.');
        } finally {
          setPaying(false);
        }
      },
      'modal.ondismiss': () => setPaying(false),
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (resp) => {
      setError(`Payment failed: ${resp.error?.description || 'Unknown error'}`);
      setPaying(false);
    });
    rzp.open();
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6
                          ring-4 ring-emerald-500/20 animate-pulse">
            <Icon name="check" className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Enrolled Successfully!</h1>
          <p className="text-white/60 mb-6 text-sm">
            You're now enrolled in <span className="text-indigo-300 font-semibold">
              {success.enrolled_courses?.length} course(s)
            </span>. Start learning now!
          </p>
          {success.coins_deducted > 0 && (
            <p className="text-amber-400 text-sm mb-4">
              🪙 {success.coins_deducted} GovCoins redeemed
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`${ROUTES.dashboard}/courses`)}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                         text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Go to My Courses
            </button>
            <button
              onClick={() => navigate(ROUTES.courses)}
              className="w-full py-3 px-6 rounded-xl border border-white/10 text-white/70
                         hover:border-white/20 hover:text-white transition-colors"
            >
              Browse More Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart.items?.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-white/10 text-white/60 hover:text-white
                     hover:border-white/20 transition-colors"
          aria-label="Go back"
        >
          <Icon name="back" className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Icon name="cart" className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">My Cart</h1>
            <p className="text-white/50 text-sm">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10
                        px-4 py-3 text-sm text-red-300">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-300/60 hover:text-red-300 font-bold">✕</button>
        </div>
      )}

      {isEmpty ? (
        /* Empty state */
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Icon name="cart" className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-xl font-semibold text-white/60 mb-2">Your cart is empty</h2>
          <p className="text-white/30 text-sm mb-8">Add courses to enroll in multiple at once</p>
          <button
            onClick={() => navigate(ROUTES.courses)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                       text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                Courses ({cart.items.length})
              </h2>
              <button
                onClick={async () => { await clearCart(); }}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            {cart.items.map((item) => (
              <CartItemCard
                key={item.course_id}
                item={item}
                onRemove={handleRemove}
                removing={removing}
              />
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-white">Order Summary</h2>

              {/* Coins toggle */}
              {cart.coins_available > 0 && (
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none
                                  p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Icon name="coin" className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-300">Use GovCoins</p>
                      <p className="text-xs text-amber-300/60">{cart.coins_available} coins available</p>
                    </div>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${applyCoins ? 'bg-amber-500' : 'bg-white/10'}`}
                    onClick={() => setApplyCoins((v) => !v)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                                     ${applyCoins ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              )}

              {/* Price breakdown */}
              {loadingPreview ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />
                  ))}
                </div>
              ) : checkoutData ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Subtotal</span>
                    <span className="text-white">₹{checkoutData.subtotal?.toFixed(2)}</span>
                  </div>
                  {checkoutData.coins_applied > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-400/80">GovCoins ({checkoutData.coins_applied})</span>
                      <span className="text-emerald-400">-₹{checkoutData.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-bold text-xl text-indigo-300">
                      ₹{checkoutData.final_amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                id="cart-checkout-btn"
                onClick={handleCheckout}
                disabled={paying || !checkoutData || loadingPreview}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                           text-white font-semibold text-sm hover:opacity-90 active:scale-95
                           transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Icon name="cart" className="w-4 h-4" />
                    Proceed to Payment
                  </>
                )}
              </button>

              <p className="text-center text-xs text-white/30">
                Secured by Razorpay · All prices in INR
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
