import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldIcon,
  CheckCircleIcon,
  LockIcon,
  ArrowRightIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronRightIcon,
  FileTextIcon,
} from '../components/Icons';
import { ROUTES } from '../routes';

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('scope');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'scope', title: '1. Introduction & Scope' },
    { id: 'collection', title: '2. Information We Collect' },
    { id: 'usage', title: '3. Purpose of Processing' },
    { id: 'razorpay-payments', title: '4. Payment Processing (Razorpay)' },
    { id: 'cookies', title: '5. Cookies & Local Storage' },
    { id: 'sharing', title: '6. Disclosure & Third-Party Sharing' },
    { id: 'security', title: '7. Data Security & Encryption' },
    { id: 'retention', title: '8. Data Retention & Deletion' },
    { id: 'user-rights', title: '9. Your Legal Rights (DPDPA 2023)' },
    { id: 'children', title: '10. Protection of Minors' },
    { id: 'grievance', title: '11. Grievance Redressal & DPO' },
  ];

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative overflow-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 pb-16 font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-hero min-h-screen">
      {/* Ambient background glows */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-institutional-500/10 dark:bg-institutional-400/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[600px] -left-36 w-[520px] h-[520px] bg-emerald-500/8 dark:bg-emerald-400/10 blur-[130px] rounded-full pointer-events-none" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400 animate-fade-in">
          <button onClick={() => navigate(ROUTES.home)} className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors">
            Home
          </button>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-charcoal-200 font-semibold">Legal</span>
          <span>/</span>
          <span className="text-institutional-600 dark:text-institutional-400 font-bold">Privacy Policy</span>
        </div>

        {/* Hero Header */}
        <section className="space-y-4 max-w-4xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider font-mono">
            <LockIcon size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Data Protection & Privacy Policy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-charcoal-950 dark:text-white leading-[1.15]">
            Privacy <span className="text-institutional-600 dark:text-institutional-400">Policy</span>
          </h1>

          <p className="text-sm sm:text-base text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            At <strong className="text-charcoal-900 dark:text-white">PrepMagnet</strong>, we hold candidate trust and data confidentiality to the highest standards. This Privacy Policy details our practices concerning the collection, storage, and processing of your personal data in accordance with Indian data protection laws.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-charcoal-500 dark:text-charcoal-400">
            <span className="flex items-center gap-1.5">
              <ClockIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
              Effective Date: <strong>October 15, 2026</strong>
            </span>
            <span>•</span>
            <span>Framework: <strong>DPDPA 2023 & IT Act 2000</strong></span>
            <span>•</span>
            <a
              href="https://unstop.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-institutional-600 dark:text-institutional-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Reference Standard (Unstop Privacy)</span>
              <ChevronRightIcon size={12} />
            </a>
          </div>
        </section>

        {/* Layout Grid: Sidebar Navigation + Content Body */}
        <div className="grid lg:grid-cols-4 gap-8 items-start">

          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-1 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-card lg:sticky lg:top-24 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
              <FileTextIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900 dark:text-white">
                Privacy Chapters
              </h2>
            </div>

            <nav className="space-y-1 text-xs">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollTo(sec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate block ${activeSection === sec.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-50 dark:hover:bg-charcoal-800'
                    }`}
                >
                  {sec.title}
                </button>
              ))}
            </nav>

            <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 space-y-2">
              <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">Related Legal Links</div>
              <div className="space-y-1 text-xs font-semibold">
                <button
                  onClick={() => navigate(ROUTES.terms)}
                  className="text-institutional-600 dark:text-institutional-400 hover:underline block text-left"
                >
                  → Terms & Conditions
                </button>
                <button
                  onClick={() => navigate(ROUTES.about)}
                  className="text-institutional-600 dark:text-institutional-400 hover:underline block text-left"
                >
                  → About Us & Company Profile
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Body */}
          <section className="lg:col-span-3 space-y-6">

            {/* Highlights Banner */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                <ShieldIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Zero Compromise Privacy Commitment</span>
              </div>
              <p className="text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                We believe your educational progress and test data belong solely to you. PrepMagnet does <strong>not sell, lease, or monetize candidate data</strong> to third-party marketing companies, coaching centers, or data brokers. All financial transactions are securely processed through RBI-authorized payment partner <strong>Razorpay</strong>.
              </p>
            </div>

            {/* Section 1 */}
            <article id="scope" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                1. Introduction & Scope
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  This Privacy Policy applies to all users, candidates, and subscribers accessing the PrepMagnet web application, API services, and associated domains. It describes how <strong>PrepMagnet </strong> ("PrepMagnet", "we", "us", or "our") collects, uses, shares, and protects your information.
                </p>
                <p>
                  This document is compiled in compliance with Section 43A of the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act (DPDPA), 2023.
                </p>
              </div>
            </article>

            {/* Section 2 */}
            <article id="collection" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                2. Information We Collect
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-3 leading-relaxed">
                <p>
                  We collect information strictly necessary to deliver high-fidelity exam simulations, compute All-India percentiles, and process subscription orders:
                </p>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-150 dark:border-charcoal-700">
                    <strong className="text-charcoal-900 dark:text-white">A. Account & Profile Information:</strong>
                    <div className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                      Full name, email address, password hash (salted using bcrypt; never plaintext), contact phone number, and chosen target exam category (e.g. SSC CGL, IBPS PO, RRB NTPC).
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-150 dark:border-charcoal-700">
                    <strong className="text-charcoal-900 dark:text-white">B. Examination & Performance Telemetry:</strong>
                    <div className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                      Per-question response choices, time elapsed per question, sectional switches, overall test scores, accuracy percentages, Typing Master keystroke telemetry (net WPM, gross WPM, word errors, backspaces), and calculated percentiles.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-150 dark:border-charcoal-700">
                    <strong className="text-charcoal-900 dark:text-white">C. Payment Transaction Metadata:</strong>
                    <div className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                      Order ID, Razorpay payment ID, subscription pass purchased, amount paid, timestamp, and status (Captured / Failed). <em>Note: Card numbers, PINs, and UPI passwords are never handled or stored on PrepMagnet servers.</em>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-150 dark:border-charcoal-700">
                    <strong className="text-charcoal-900 dark:text-white">D. Technical & Device Logs:</strong>
                    <div className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                      IP address, device type, operating system, browser user-agent, and session identifiers for fraud-prevention and anti-cheating enforcement.
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Section 3 */}
            <article id="usage" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                3. Purpose of Data Processing
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>We process your data for lawful purposes including:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <li><strong>Authenticating Sessions:</strong> Granting secure access to student dashboards, test papers, and typing mock arenas.</li>
                  <li><strong>Scoring & Psychometrics:</strong> Computing accurate negative marking, sectional cutoffs, and comparative percentile ranks across thousands of candidate attempts.</li>
                  <li><strong>Payment Verification & Entitlement:</strong> Verifying Razorpay payment signatures to instantly unlock PRO student passes.</li>
                  <li><strong>Customer Service:</strong> Resolving candidate queries, billing issues, and technical support tickets.</li>
                  <li><strong>Platform Integrity:</strong> Detecting fraudulent multiple logins or automated bot activity to protect honest students.</li>
                </ul>
              </div>
            </article>

            {/* Section 4 */}
            <article id="razorpay-payments" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  Payment Security
                </span>
                <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                  4. Payment Processing with Razorpay
                </h3>
              </div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  When you purchase a PrepMagnet Annual Pass, Course Pack, or Mock Test Series, your payment transaction is facilitated by our payment gateway partner, <strong>Razorpay Software Private Limited</strong>.
                </p>
                <p>
                  Razorpay is certified under <strong>PCI-DSS (Payment Card Industry Data Security Standard) Level 1</strong>, the highest tier of security for payment aggregators worldwide.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Payment details you input (Credit/Debit Card numbers, CVVs, Netbanking credentials, UPI PINs) are processed directly within Razorpay's encrypted iframe/modal.</li>
                  <li>PrepMagnet receives only an encrypted confirmation token and transaction ID (e.g. <code>pay_XXXXXXXXXX</code>) to mark your purchase as complete.</li>
                  <li>For more information on Razorpay's privacy and data governance, you may review <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-institutional-600 dark:text-institutional-400 hover:underline font-semibold">Razorpay's Privacy Policy</a>.</li>
                </ul>
              </div>
            </article>

            {/* Section 5 */}
            <article id="cookies" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                5. Cookies & Local Storage
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  We utilize lightweight browser cookies and HTML5 local storage strictly for essential platform functionality:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Authentication Tokens:</strong> Maintaining your signed-in session securely across screen transitions.</li>
                  <li><strong>Interface Preferences:</strong> Preserving your preferred Dark / Light mode visual appearance.</li>
                  <li><strong>Exam Continuity:</strong> Temporarily caching test responses during active examinations so a brief WiFi interruption does not erase your answered questions.</li>
                </ul>
                <p className="text-xs text-charcoal-500">
                  We do not use intrusive third-party cross-site advertising cookies.
                </p>
              </div>
            </article>

            {/* Section 6 */}
            <article id="sharing" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                6. Disclosure & Third-Party Sharing
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  We share your data only with verified service providers under strict data processing agreements and when compelled by law:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Infrastructure Providers:</strong> Cloud servers (AWS / DigitalOcean) and MongoDB Atlas (encrypted database storage).</li>
                  <li><strong>Payment Aggregators:</strong> Razorpay for clearing financial orders.</li>
                  <li><strong>Legal Obligations:</strong> If ordered by a court of competent jurisdiction or authorized government enforcement agency pursuant to Indian law.</li>
                </ul>
              </div>
            </article>

            {/* Section 7 */}
            <article id="security" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                7. Data Security & Encryption
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  We implement robust technical and organizational security safeguards, including:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>256-bit SSL/TLS end-to-end encryption for all browser-to-server communications (HTTPS).</li>
                  <li>Salted cryptographic hashing (bcrypt) for candidate account passwords.</li>
                  <li>Encrypted database storage at rest using AES-256 on MongoDB Atlas.</li>
                  <li>Restricted internal access controls with automated audit logging.</li>
                </ul>
              </div>
            </article>

            {/* Section 8 */}
            <article id="retention" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                8. Data Retention & Deletion
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  We retain candidate account and exam historical records for as long as your account remains active, so you can track your speed improvements and performance graphs over time.
                </p>
                <p>
                  You may request permanent deletion of your account and associated scorecards at any time by writing to <strong>support.prepmagnet@gmail.com</strong>. Upon receiving a verified request, your personal identifiers will be purged within 30 days, except where transaction invoices must be archived to comply with Indian tax (GST) and audit statutes.
                </p>
              </div>
            </article>

            {/* Section 9 */}
            <article id="user-rights" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                9. Your Rights under the DPDPA 2023
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>Under the Digital Personal Data Protection Act, 2023, you are entitled to:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Right to Access:</strong> Request a summary of personal data held about you.</li>
                  <li><strong>Right to Correction:</strong> Request correction or updating of inaccurate or outdated details.</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your data when no longer necessary.</li>
                  <li><strong>Right of Grievance Redressal:</strong> Avail of an expeditious grievance mechanism before contacting regulatory authorities.</li>
                </ul>
              </div>
            </article>

            {/* Section 10 */}
            <article id="children" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                10. Protection of Minors
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  While our mock tests cater to competitive exams requiring secondary, higher-secondary, or collegiate education, we do not knowingly solicit personal data from children under 18 without parental consent. If we learn that personal data of a minor has been collected without parental authorization, we will promptly delete it.
                </p>
              </div>
            </article>

            {/* Section 11 */}
            <article id="grievance" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-4">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                11. Grievance Redressal Officer & Contact
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                For questions, concerns, or requests regarding this Privacy Policy or the handling of your personal information, please contact our designated Grievance Officer:
              </p>

              <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* <div>
                  <div className="font-bold text-charcoal-900 dark:text-white">Data Protection Officer:</div>
                  <div className="text-charcoal-600 dark:text-charcoal-300">Ms. Sneha Mukherjee (Legal & Compliance)</div>
                  <div className="text-charcoal-600 dark:text-charcoal-300 mt-1">PrepMagnet</div>
                  <div className="text-charcoal-500 dark:text-charcoal-400 mt-1">Pragati Maidan Academic Complex, New Delhi 110001, India</div>
                </div> */}

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-charcoal-600 dark:text-charcoal-300">
                    <MailIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Email: <strong className="text-charcoal-900 dark:text-white select-all">support.prepmagnet@gmail.com</strong></span>
                  </div>
                  <div className="text-[11px] text-charcoal-500 mt-2">
                    Response SLA: Acknowledged within 48 hours; resolved within 15 business days.
                  </div>
                </div>
              </div>
            </article>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800">
              <div className="text-xs text-charcoal-500">
                Want to review our commercial and platform conditions?
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(ROUTES.terms)}
                  className="px-4 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
                >
                  View Terms & Conditions
                </button>
                <button
                  onClick={() => navigate(ROUTES.home)}
                  className="px-4 py-2 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
};
