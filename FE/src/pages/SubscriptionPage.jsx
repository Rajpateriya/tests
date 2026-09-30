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
    description: 'Essential mocks and speed drills for foundational revision and syllabus pacing.',
    monthlyPrice: 99,
    yearlyPrice: 299,
    features: [
      '15 Full-Length Tier-I Mock Tests',
      '50 Topic-wise Speed Drills',
      'Standard TCS iON Exam Engine UI',
      'Instant Scorecard & Negative Marking',
      'Standard Answer Key Review',
      'Mobile & Desktop Responsive Access',
    ],
    notIncluded: [
      'Deep Topic-wise AI Diagnostic Insights',
      'All-India Peer Percentile Benchmarking',
      'Unlimited Dynamic Auto Mock Generator',
      'Multi-exam coverage (Railways / Banking)',
    ],
    color: 'var(--text-primary)',
    bgGradient: 'transparent',
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro Ranker',
    badge: 'MOST POPULAR',
    description: 'Full-spectrum analytics, peer rankings, and unlimited mocks for serious aspirants.',
    monthlyPrice: 199,
    yearlyPrice: 699,
    features: [
      'Unlimited Full, Subject & Topic Mocks',
      'Full TCS iON Exam Engine Simulation',
      'Deep AI Analytical Insights & Percentile Rank',
      'Strong vs. Weak Topic Diagnostics',
      'Step-by-Step Solutions & Short-Cut Notes',
      'Anti-Cheat Behavioral Audit Report',
      'Previous Year Questions (PYQs 2019-2025)',
      'Community Leaderboard & Air Prediction',
    ],
    notIncluded: [
      'Multi-Exam Bundle (Railways / Banking)',
      '1-on-1 AI Study Strategy Mentor',
    ],
    color: 'var(--primary)',
    bgGradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
    popular: true,
  },
  {
    id: 'MAX',
    name: 'Max Ultimate',
    badge: 'ALL-ACCESS VIP',
    description: 'Comprehensive preparation across SSC, Banking, and Railways with personalized mentor strategy.',
    monthlyPrice: 299,
    yearlyPrice: 1299,
    features: [
      'Everything in Pro Ranker +',
      'Multi-Exam Access (SSC CGL, CHSL, RRB, Banking)',
      'Unlimited Dynamic Auto Mock Test Generation',
      'Personalized AI Study Strategy & Daily Schedule',
      'High-Yield Concept Compendiums (PDF)',
      'Priority Doubt Resolution Helpline',
      'Unlimited Test Attempts & Lifetime Re-attempts',
      'VIP Candidate Verification Badge',
    ],
    notIncluded: [],
    color: 'var(--purple)',
    bgGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%)',
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
    <div className="main-content">
      {/* Hero Header */}
      <div className="hero-banner" style={{ textAlign: 'center', flexDirection: 'column', padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.85rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          <CrownIcon size={16} />
          <span>PREMIUM ASPIRANT MEMBERSHIP</span>
        </div>

        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Accelerate Your Score to the 99th Percentile
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto 1.75rem' }}>
          Unlock unrestricted full mocks, deep AI topic diagnostics, peer percentiles, and instant solutions modeled precisely after official government examinations.
        </p>

        {/* Billing Cycle Toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            gap: '0.4rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            type="button"
            className={`tab-pill ${billingCycle === 'monthly' ? 'active' : ''}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.25rem' }}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            className={`tab-pill ${billingCycle === 'yearly' ? 'active' : ''}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => setBillingCycle('yearly')}
          >
            <span>Annual Pass</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                background: 'var(--success-bg)',
                color: 'var(--success)',
                padding: '0.15rem 0.45rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              SAVE 40%
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Tier Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.75rem',
          marginBottom: '3rem',
          alignItems: 'stretch',
        }}
      >
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const period = billingCycle === 'yearly' ? '/year' : '/month';

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                background: plan.bgGradient !== 'transparent' ? plan.bgGradient : 'var(--bg-card)',
                boxShadow: plan.popular ? '0 12px 30px var(--primary-glow)' : 'var(--shadow-md)',
                transform: plan.popular ? 'scale(1.02)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Popular Ribbon */}
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, var(--primary), #8B5CF6)',
                    color: 'white',
                    padding: '0.3rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    boxShadow: '0 4px 12px var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <SparklesIcon size={13} />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', marginTop: plan.popular ? '0.5rem' : '0' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {plan.name}
                  </h3>
                  {!plan.popular && (
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '40px' }}>
                  {plan.description}
                </p>

                {/* Price Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{price}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {period}
                  </span>
                </div>

                {/* Features List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    What's Included:
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem' }}>
                      <CheckCircleIcon size={16} className="text-primary" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--success)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                    </div>
                  ))}

                  {plan.notIncluded.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {plan.notIncluded.map((notFeat, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', opacity: 0.65 }}>
                          <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>✕</span>
                          <span>{notFeat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 800, border: '2px solid var(--success)', color: 'var(--success)' }}
                  >
                    ✓ Currently Active
                  </button>
                ) : (
                  <button
                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                    style={{ width: '100%', padding: '0.8rem', fontWeight: 800 }}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    <span>Upgrade to {plan.name}</span>
                    <ArrowRightIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Social Proof / Student Testimonials Banner */}
      <div className="card" style={{ marginBottom: '3rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', gap: '0.2rem', color: '#F59E0B', marginBottom: '0.5rem' }}>
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
            <StarIcon size={18} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Trusted by 45,000+ Government Job Aspirants</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real results from candidates who converted their preparation into top selections.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              "The weak area analytics identified my Geometry gap in Tier-I. Practiced 8 mini-mocks and jumped from 135 to 164 marks. Selected as ASO in MEA!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="user-avatar">S</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Saurabh Mishra</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AIR 142 • SSC CGL 2025</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              "The TCS iON exact exam room replica made my actual exam feel like just another practice test at home. Zero panic, 94.8% accuracy!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="user-avatar">A</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Ananya Deshmukh</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selected • IBPS PO & RRB NTPC</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              "The step-by-step solutions with short-cut tricks saved me at least 25 seconds per quant question. Worth 10x the subscription cost."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="user-avatar">R</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Rohit Verma</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspector (Central Excise)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>Frequently Asked Questions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Everything you need to know about the GovExam Pro membership.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '780px', margin: '0 auto' }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 1.25rem 1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Razorpay Simulated Checkout Modal */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        plan={selectedPlan}
        billingCycle={billingCycle}
        onClose={() => setIsRazorpayOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
