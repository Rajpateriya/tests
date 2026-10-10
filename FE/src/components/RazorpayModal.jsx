/**
 * RazorpayModal.jsx
 *
 * Real Razorpay Checkout.js integration.
 *
 * Flow:
 *  1. Parent calls /subscriptions/create-order (backend) → gets a real Razorpay order_id.
 *  2. This component dynamically loads the Razorpay checkout.js script.
 *  3. Opens the Razorpay popup with the real order_id, amount, key_id, and pre-filled user info.
 *  4. On success Razorpay returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }.
 *  5. We send those three + plan_id + coins_used to /subscriptions/verify-payment (backend).
 *  6. Backend verifies HMAC-SHA256 and activates the subscription.
 *  7. onSuccess() is called with the backend verification result.
 */

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { ShieldIcon, CheckCircleIcon, SparklesIcon } from './Icons';
import { useAuth } from '../context/AuthContext';

// Load the Razorpay checkout.js script exactly once
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export const RazorpayModal = ({ isOpen, course, plan, order, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [state, setState] = useState('IDLE'); // IDLE | LOADING | PROCESSING | SUCCESS | ERROR
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const razorpayRef = useRef(null);

  // Course enrollment or subscription plan
  const item = course || plan;
  const isCourse = !!course;

  // ── Amount display ──────────────────────────────────────────────────────
  const finalAmount = order?.amount_rupees ?? order?.amount_paise / 100 ?? 0;
  const coinsApplied = order?.coins_applied ?? 0;
  const discountAmount = order?.discount_amount ?? 0;
  const title = item?.title || item?.name || 'PrepMagnet Pass';

  // ── Open Razorpay Checkout when modal becomes visible ───────────────────
  useEffect(() => {
    if (!isOpen || !order?.order_id) return;

    let cancelled = false;

    const openCheckout = async () => {
      setState('LOADING');
      setErrorMsg('');

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setState('ERROR');
        setErrorMsg('Failed to load Razorpay Checkout script. Check your internet connection.');
        return;
      }
      if (cancelled) return;

      // Use the key_id returned from the backend order-creation response
      // Subscription orders return `razorpay_key_id`; course orders return `key_id`
      const keyId = order.razorpay_key_id || order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;

      const options = {
        key: keyId,
        amount: order.amount_paise,           // in paise
        currency: order.currency || 'INR',
        name: 'PrepMagnet',
        description: title,
        image: '/logo.png',                   // optional brand logo
        order_id: order.order_id,             // Razorpay order id from backend

        // Pre-fill user data so checkout form is faster
        prefill: {
          name: user?.full_name || user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },

        notes: {
          plan_id: isCourse ? '' : (plan?.id || ''),
          course_id: isCourse ? (course?.id || '') : '',
          coins_applied: String(coinsApplied),
        },

        theme: {
          color: '#4F46E5',  // indigo-600 — matches platform brand
        },

        // ── Payment success handler ──────────────────────────────────────
        handler: async (response) => {
          // response = { razorpay_order_id, razorpay_payment_id, razorpay_signature }
          setState('PROCESSING');
          try {
            let result;
            if (isCourse) {
              result = await api.courses.verifyPayment(item.id, {
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                coins_used: coinsApplied,
              });
            } else {
              result = await api.subscriptions.verifyPayment({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan_id: plan?.id || order?.plan_id,
                coins_used: coinsApplied,
              });
            }
            setVerifyResult(result);
            setState('SUCCESS');
            setTimeout(() => onSuccess(result), 1800);
          } catch (err) {
            setState('ERROR');
            setErrorMsg(err.message || 'Payment verification failed. Please contact support.');
          }
        },

        // ── Modal dismissed by user ──────────────────────────────────────
        modal: {
          ondismiss: () => {
            if (state !== 'SUCCESS' && state !== 'PROCESSING') {
              onClose();
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      razorpayRef.current = rzp;

      rzp.on('payment.failed', (response) => {
        setState('ERROR');
        setErrorMsg(
          response?.error?.description ||
          response?.error?.reason ||
          'Payment failed. Please try again.'
        );
      });

      setState('IDLE');
      rzp.open();
    };

    openCheckout();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.order_id]);

  // Close Razorpay popup if parent closes modal
  useEffect(() => {
    if (!isOpen && razorpayRef.current) {
      try { razorpayRef.current.close(); } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  // ── When Razorpay popup is open we show a minimal backdrop with status ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        // Allow clicking backdrop to close only if not in critical state
        if (state !== 'PROCESSING' && state !== 'SUCCESS') onClose();
      }}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-in p-6 space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              ₹
            </div>
            <span className="font-extrabold text-charcoal-900 dark:text-white text-sm tracking-wide">
              Razorpay <span className="text-[10px] font-semibold text-blue-500">SECURE PAYMENT</span>
            </span>
          </div>
          {state !== 'PROCESSING' && state !== 'SUCCESS' && (
            <button
              onClick={onClose}
              className="text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 p-1 rounded-full hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* Order Summary */}
        <div className="p-3 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-xs space-y-1.5 text-left">
          <div className="font-extrabold text-charcoal-900 dark:text-white text-sm truncate">{title}</div>
          {coinsApplied > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-300 font-semibold">
              <span>🪙 GovCoins Applied ({coinsApplied})</span>
              <span>-₹{discountAmount}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-charcoal-900 dark:text-white border-t border-charcoal-200 dark:border-charcoal-700 pt-1.5 mt-1">
            <span>Amount Payable</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{finalAmount}</span>
          </div>
        </div>

        {/* State Panels */}
        {state === 'LOADING' && (
          <div className="space-y-2 py-2">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-charcoal-500">Loading secure checkout...</p>
          </div>
        )}

        {state === 'IDLE' && (
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              <SparklesIcon size={14} />
              <span>Razorpay popup is open — complete your payment there</span>
            </div>
            <p className="text-[11px] text-charcoal-400">
              Accept UPI, Cards, NetBanking, Wallets &amp; more
            </p>
          </div>
        )}

        {state === 'PROCESSING' && (
          <div className="space-y-2 py-2">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-200">
              Verifying payment with server…
            </p>
            <p className="text-[11px] text-charcoal-400">Please don't close this window</p>
          </div>
        )}

        {state === 'SUCCESS' && (
          <div className="space-y-3 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircleIcon size={34} />
            </div>
            <h4 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              Payment Successful! 🎉
            </h4>
            <p className="text-xs text-charcoal-600 dark:text-charcoal-300">
              <strong>{title}</strong> is now active on your account.
            </p>
            {coinsApplied > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                🪙 {coinsApplied} GovCoins redeemed (saved ₹{discountAmount})
              </div>
            )}
          </div>
        )}

        {state === 'ERROR' && (
          <div className="space-y-3 py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto text-2xl">
              ✕
            </div>
            <h4 className="text-base font-extrabold text-red-600 dark:text-red-400">Payment Failed</h4>
            <p className="text-xs text-charcoal-600 dark:text-charcoal-300">{errorMsg}</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-200 font-bold text-xs hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Trust Badges */}
        {(state === 'IDLE' || state === 'LOADING') && (
          <div className="text-center text-[10px] text-charcoal-400 flex items-center justify-center gap-1.5">
            <ShieldIcon size={12} />
            <span>256-bit TLS • PCI-DSS Compliant • Order #{order?.order_id?.slice(-8) || '—'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
