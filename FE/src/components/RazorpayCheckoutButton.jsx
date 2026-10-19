import React, { useState } from 'react';
import { api } from '../services/api';
import { ShieldIcon, CheckCircleIcon, SparklesIcon } from './Icons';

/**
 * Loads Razorpay Standard checkout.js script dynamically if not present.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Razorpay Standard Web Checkout Button
 * - Creates order via POST /api/create-order
 * - Opens Razorpay checkout modal
 * - Verifies payment signature via POST /api/verify-payment
 * - Handles modal dismiss and payment.failed events
 */
export const RazorpayCheckoutButton = ({
  amount = 100, // paise (100 paise = ₹1.00)
  currency = 'INR',
  title = 'PrepMagnet Standard Checkout',
  description = 'Test Transaction',
  receipt = null,
  notes = null,
  prefill = null,
  buttonText = null,
  className = '',
  onSuccess = null,
  onError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const displayAmountRupees = (amount / 100).toFixed(2);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage('');
    setPaymentSuccess(null);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Could not load Razorpay SDK. Please check your internet connection.');
      }

      // 2. Call backend endpoint to create order: POST /api/create-order
      const order = await api.payments.createOrder({
        amount,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || { source: 'standard_web_checkout' },
      });

      if (!order?.order_id) {
        throw new Error('Invalid order response from backend.');
      }

      const keyId = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        throw new Error('Razorpay Key ID is not configured.');
      }

      // 3. Configure Razorpay modal options
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: title,
        description: description || `Pay ₹${displayAmountRupees}`,
        order_id: order.order_id,
        image: '/logo.png',
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
          contact: prefill?.contact || prefill?.phone || '',
        },
        theme: {
          color: '#4F46E5', // Institutional Indigo
        },
        // Step 2 & 3: Success handler sends signature to /api/verify-payment
        handler: async (response) => {
          setLoading(true);
          try {
            const verification = await api.payments.verifyPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            setPaymentSuccess(verification);
            setLoading(false);
            if (onSuccess) {
              onSuccess(verification);
            }
          } catch (verifyErr) {
            const msg = verifyErr?.message || 'Payment signature verification failed';
            setErrorMessage(msg);
            setLoading(false);
            if (onError) onError(verifyErr);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setErrorMessage('Payment cancelled by user.');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (failResponse) => {
        setLoading(false);
        const reason =
          failResponse?.error?.description ||
          failResponse?.error?.reason ||
          'Payment processing failed.';
        setErrorMessage(reason);
        if (onError) onError(new Error(reason));
      });

      rzp.open();
    } catch (err) {
      setLoading(false);
      const msg = err?.message || 'Failed to initiate payment.';
      setErrorMessage(msg);
      if (onError) onError(err);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        id="razorpay-standard-checkout-btn"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-institutional-600 hover:bg-institutional-700 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer'
        }
      >
        <ShieldIcon size={16} />
        <span>
          {loading
            ? 'Processing Order...'
            : buttonText || `Pay ₹${displayAmountRupees} with Razorpay`}
        </span>
      </button>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Feedback */}
      {paymentSuccess && (
        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
          <CheckCircleIcon size={14} className="text-emerald-600" />
          <span>Payment Verified! ID: {paymentSuccess.payment_id}</span>
        </div>
      )}
    </div>
  );
};
