import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  SmartphoneIcon,
  BuildingIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
} from './Icons';

export const RazorpayModal = ({ isOpen, plan, billingCycle, onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiId, setUpiId] = useState('aspirant@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExp, setCardExp] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('321');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [processingState, setProcessingState] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'SUCCESS'
  const [statusText, setStatusText] = useState('Initiating secure transaction...');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProcessingState('IDLE');
      setTransactionId(`pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
    }
  }, [isOpen, plan]);

  if (!isOpen || !plan) return null;

  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  const handlePay = () => {
    setProcessingState('PROCESSING');
    setStatusText('Connecting to Razorpay Payment Gateway...');

    setTimeout(() => {
      setStatusText('Authorizing with banking network...');
    }, 900);

    setTimeout(() => {
      setStatusText('Payment verified successfully!');
      setProcessingState('SUCCESS');
      setTimeout(() => {
        onSuccess(transactionId, plan);
      }, 1200);
    }, 2200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-dialog-box"
        style={{
          maxWidth: '520px',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Razorpay Brand Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0C2340 0%, #1A365D 100%)',
            color: 'white',
            padding: '1.25rem 1.5rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  background: '#2B6CB0',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                ₹
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.02em' }}>
                Razorpay <span style={{ fontSize: '0.72rem', color: '#63B3ED', fontWeight: 600 }}>SECURE</span>
              </span>
            </div>

            <button
              onClick={onClose}
              disabled={processingState === 'PROCESSING'}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#A0AEC0', textTransform: 'uppercase' }}>
                GovExam Pro Subscription
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                {plan.name} Pass ({billingCycle === 'yearly' ? 'Annual' : 'Monthly'})
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#A0AEC0' }}>AMOUNT TO PAY</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#48BB78', fontFamily: 'var(--font-mono)' }}>
                ₹{price}
              </div>
            </div>
          </div>
        </div>

        {/* Processing State Overlay */}
        {processingState !== 'IDLE' ? (
          <div
            style={{
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: 'var(--bg-card)',
            }}
          >
            {processingState === 'PROCESSING' ? (
              <>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    border: '4px solid var(--border-light)',
                    borderTop: '4px solid var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '1.5rem',
                  }}
                />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  Processing Payment...
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{statusText}</p>
                <div
                  style={{
                    marginTop: '1.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <ShieldIcon size={14} />
                  <span>256-bit TLS Bank Grade Encryption</span>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <CheckCircleIcon size={38} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.4rem' }}>
                  Payment Successful!
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Your <strong>{plan.name} Pass</strong> has been activated instantly.
                </p>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    background: 'var(--bg-tertiary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Ref ID: {transactionId}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Payment Selection Body */
          <div style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, gap: '0.4rem' }}
                onClick={() => setSelectedMethod('upi')}
              >
                <SmartphoneIcon size={16} />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, gap: '0.4rem' }}
                onClick={() => setSelectedMethod('card')}
              >
                <CreditCardIcon size={16} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedMethod === 'netbanking' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, gap: '0.4rem' }}
                onClick={() => setSelectedMethod('netbanking')}
              >
                <BuildingIcon size={16} />
                <span>NetBanking</span>
              </button>
            </div>

            {/* UPI Tab */}
            {selectedMethod === 'upi' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Virtual Payment Address (VPA / UPI ID)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@okhdfcbank"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        background: 'white',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        color: '#1A365D',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      QR
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Scan QR Code</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Google Pay • PhonePe • Paytm
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-easy">Instant</span>
                </div>
              </div>
            )}

            {/* Card Tab */}
            {selectedMethod === 'card' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      className="form-input"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NetBanking Tab */}
            {selectedMethod === 'netbanking' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Select Your Bank</label>
                  <select
                    className="form-input"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                  >
                    <option value="SBI">State Bank of India (SBI)</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                    <option value="PNB">Punjab National Bank</option>
                  </select>
                </div>
              </div>
            )}

            {/* Pay Button */}
            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handlePay}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                }}
              >
                <span>Pay ₹{price} Securely</span>
              </button>
            </div>

            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <ShieldIcon size={14} />
              <span>Razorpay Sandbox Demo Mode • No real money deducted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
