import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldIcon,
  CheckCircleIcon,
  LockIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronRightIcon,
  FileTextIcon,
} from '../components/Icons';
import { ROUTES } from '../routes';
import { useSEO } from '../hooks/useSEO';

export const TermsPage = () => {
  useSEO({
    title: 'Terms of Use & Candidate Agreement',
    description: 'Official terms of service, platform rules, pass subscriptions, cancellation policies, and candidate user agreement for PrepMagnet.',
  });

  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('acceptance');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'eligibility', title: '2. User Eligibility & Accounts' },
    { id: 'services', title: '3. Scope of PrepMagnet Services' },
    { id: 'pricing-payment', title: '4. Pricing, Billing & Razorpay Integration' },
    { id: 'delivery-policy', title: '5. Digital Delivery & Access Policy' },
    { id: 'cancellation-refund', title: '6. Cancellation & Refund Policy' },
    { id: 'intellectual-property', title: '7. Intellectual Property & License' },
    { id: 'user-conduct', title: '8. User Conduct & Honor Code' },
    { id: 'disclaimers', title: '9. Warranties & Disclaimers' },
    { id: 'limitation-liability', title: '10. Limitation of Liability' },
    { id: 'termination', title: '11. Suspension & Termination' },
    { id: 'governing-law', title: '12. Governing Law & Jurisdiction' },
    { id: 'grievance', title: '13. Grievance Officer & Contact' },
  ];

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative overflow-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 pb-16 font-sans text-charcoal-900 dark:text-charcoal-100 min-h-screen">
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

        {/* Breadcrumb / Top Tag */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400 animate-fade-in">
          <button onClick={() => navigate(ROUTES.home)} className="hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors">
            Home
          </button>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-charcoal-200 font-semibold">Legal</span>
          <span>/</span>
          <span className="text-institutional-600 dark:text-institutional-400 font-bold">Terms & Conditions</span>
        </div>

        {/* Hero Header */}
        <section className="space-y-4 max-w-4xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-100 dark:bg-institutional-950/80 text-institutional-700 dark:text-institutional-300 border border-institutional-200/80 dark:border-institutional-800 text-xs font-bold uppercase tracking-wider font-mono">
            <ShieldIcon size={13} className="text-institutional-600 dark:text-institutional-400" />
            <span>Official Legal Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-charcoal-950 dark:text-white leading-[1.15]">
            Terms and Conditions of <span className="text-institutional-600 dark:text-institutional-400">Use</span>
          </h1>

          <p className="text-sm sm:text-base text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            Welcome to <strong className="text-charcoal-900 dark:text-white">PrepMagnet</strong> (operated by <strong>PrepMagnet</strong>). Please read these Terms carefully before using our computer-based testing (CBT) simulators, mock test series, courses, and typing master modules.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-charcoal-500 dark:text-charcoal-400">
            <span className="flex items-center gap-1.5">
              <ClockIcon size={14} className="text-institutional-600 dark:text-institutional-400" />
              Effective Date: <strong>October 15, 2026</strong>
            </span>
            <span>•</span>
            <span>Last Updated: <strong>October 2026</strong></span>
            {/* <span>•</span> */}
            {/* <a
              href="https://unstop.com/legal/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-institutional-600 dark:text-institutional-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Reference Standard (Unstop Legal)</span>
              <ChevronRightIcon size={12} />
            </a> */}
          </div>
        </section>

        {/* Layout Grid: Sidebar Navigation + Content Body */}
        <div className="grid lg:grid-cols-4 gap-8 items-start">

          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-1 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-card lg:sticky lg:top-24 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
              <FileTextIcon size={16} className="text-institutional-600 dark:text-institutional-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900 dark:text-white">
                Contents
              </h2>
            </div>

            <nav className="space-y-1 text-xs">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollTo(sec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate block ${activeSection === sec.id
                    ? 'bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 font-extrabold shadow-xs'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-50 dark:hover:bg-charcoal-800'
                    }`}
                >
                  {sec.title}
                </button>
              ))}
            </nav>

            <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 space-y-2">
              <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">Related Documents</div>
              <div className="space-y-1 text-xs font-semibold">
                <button
                  onClick={() => navigate(ROUTES.privacy)}
                  className="text-institutional-600 dark:text-institutional-400 hover:underline block text-left"
                >
                  → Privacy Policy
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

          {/* Main Legal Sections Body */}
          <section className="lg:col-span-3 space-y-6">

            {/* Quick Compliance Notice Box for Razorpay & Merchants */}
            <div className="p-5 rounded-2xl bg-institutional-50/70 dark:bg-institutional-950/40 border border-institutional-200 dark:border-institutional-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-institutional-800 dark:text-institutional-200 font-bold text-sm">
                <LockIcon size={16} className="text-institutional-600 dark:text-institutional-400" />
                <span>Commercial & Payment Integration Declaration</span>
              </div>
              <p className="text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                This document is a legally binding contract published in accordance with the provisions of Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. All online payments, subscriptions, and Annual Passes purchased on PrepMagnet are processed through <strong>Razorpay Software Private Limited</strong>, an RBI-authorized payment aggregator, using 256-bit PCI-DSS Level 1 compliant secure channels.
              </p>
            </div>

            {/* Section 1 */}
            <article id="acceptance" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                1. Acceptance of Terms
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  By accessing, browsing, registering on, or using the website located at <strong>prepmagnet.in</strong> and any related mobile application or subdomains (collectively, the "Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"), together with our <strong className="text-institutional-600 dark:text-institutional-400 cursor-pointer hover:underline" onClick={() => navigate(ROUTES.privacy)}>Privacy Policy</strong>.
                </p>
                <p>
                  If you do not agree with any part of these Terms, you must immediately discontinue accessing or using the Platform. PrepMagnet reserves the right to revise or modify these Terms at any time without prior individual notice. Any such revisions will be effective immediately upon being posted on this page with an updated "Last Updated" timestamp.
                </p>
              </div>
            </article>

            {/* Section 2 */}
            <article id="eligibility" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                2. User Eligibility & Account Registration
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  You represent and warrant that you are at least 18 years of age and legally competent to enter into a binding contract under the Indian Contract Act, 1872. If you are under 18 years of age, you may use the Platform only under the supervision of a parent or legal guardian who agrees to be bound by these Terms.
                </p>
                <p>
                  To access certain features (such as taking full-length mock examinations, reviewing detailed result analytics, or purchasing Annual Passes), you must create an account by providing an authentic email address and contact details. You agree to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <li>Provide true, accurate, current, and complete registration details.</li>
                  <li>Maintain and promptly update your profile information.</li>
                  <li>Keep your login credentials strictly confidential. You are solely responsible for all activities that occur under your account.</li>
                  <li>Immediately notify PrepMagnet at <strong>support.prepmagnet@gmail.com</strong> of any unauthorized use or security breach.</li>
                </ul>
              </div>
            </article>

            {/* Section 3 */}
            <article id="services" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                3. Scope of PrepMagnet Services
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  PrepMagnet is an ed-tech platform engineered to simulate national-level Computer-Based Tests (CBT) for competitive examinations in India, including but not limited to:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700">
                    <strong>• Staff Selection Commission (SSC):</strong> CGL Tier I & II, CHSL, CPO, MTS, GD Constable.
                  </div>
                  <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700">
                    <strong>• Banking & Insurance:</strong> IBPS PO & Clerk, SBI PO & Clerk, RBI Grade B.
                  </div>
                  <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700">
                    <strong>• Indian Railways (RRB):</strong> RRB NTPC (CBT-1 & CBT-2), Group D, ALP.
                  </div>
                  <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700">
                    <strong>• Skill Modules:</strong> Typing Master Exam Simulator with 20-mark evaluation and live WPM analysis.
                  </div>
                </div>
                <p className="text-xs text-charcoal-500">
                  <em>Note: PrepMagnet is an independent academic assessment company and is not officially affiliated with, endorsed by, or representing any government body (such as SSC, NTA, UPSC, IBPS, or Ministry of Railways).</em>
                </p>
              </div>
            </article>

            {/* Section 4 */}
            <article id="pricing-payment" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Payment Compliance
                </span>
                <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                  4. Pricing, Billing & Payment Processing (Razorpay)
                </h3>
              </div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  <strong>Currencies and Taxes:</strong> All fees for PrepMagnet passes, course enrollments, and test packages are stated in Indian Rupees (INR) and are inclusive or clearly delineated with applicable Goods and Services Tax (GST @ 18%).
                </p>
                <p>
                  <strong>Payment Aggregator:</strong> We have partnered with <strong>Razorpay Software Private Limited</strong> to facilitate seamless and secure transactions across UPI (Google Pay, PhonePe, Paytm), Credit Cards, Debit Cards, Netbanking (50+ Indian banks), and Wallets.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <li>PrepMagnet does NOT collect, store, or process full credit card numbers, CVV codes, or netbanking passwords on its internal servers. All sensitive financial data is tokenized and transmitted directly to Razorpay under PCI-DSS Level 1 certification.</li>
                  <li>Upon successful completion of payment, Razorpay transmits an encrypted callback to our server, following which your account is immediately upgraded to <strong>PRO</strong> status with instant access to the enrolled courses and mock tests.</li>
                  <li>In the event of an unexpected payment failure where money is deducted from your bank account without account activation (due to bank gateway timeouts), the amount is typically auto-refunded by Razorpay within 3 to 5 business days. You may also contact <strong>support.prepmagnet@gmail.com</strong> with your Razorpay Payment ID for immediate reconciliation.</li>
                </ul>
              </div>
            </article>

            {/* Section 5 */}
            <article id="delivery-policy" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                5. Digital Delivery & Access Policy
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  PrepMagnet provides purely <strong>digital educational software and electronic assessments</strong>. No physical materials, textbooks, or CDs are shipped to your physical address.
                </p>
                <p>
                  <strong>Instant Delivery Mechanism:</strong> Immediately upon Razorpay transaction authorization (usually within 2 to 10 seconds), your user account is provisioned with:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <li>PRO Student profile badge and unconstrained test attempts.</li>
                  <li>Full unlock of all included mock tests and sectional practice modules.</li>
                  <li>Comprehensive question explanations and All-India percentile leaderboards.</li>
                </ul>
                <p>
                  Access remains valid for the exact duration of the purchased subscription (e.g., 365 days for Annual Pass, or lifetime for designated permanent course packs).
                </p>
              </div>
            </article>

            {/* Section 6 */}
            <article id="cancellation-refund" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                  Razorpay Mandate
                </span>
                <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                  6. Cancellation and Refund Policy
                </h3>
              </div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  Because PrepMagnet delivers instantaneous digital access to intellectual property, mock tests, and answer keys, our refund terms are outlined as follows:
                </p>
                <div className="space-y-2 p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700 text-xs">
                  <p><strong>• Technical Glitches / Non-Provisioning:</strong> If you were debited by Razorpay but your account was not activated within 24 hours due to server or network faults, you are entitled to a full 100% refund, provided you notify our support team within 48 hours of transaction.</p>
                  <p><strong>• Double Billing:</strong> In case of duplicate debits for the same subscription, the duplicate amount will be credited back in full through Razorpay within 5 to 7 working days.</p>
                  <p><strong>• General Subscriptions:</strong> Once a user has initiated, taken, or submitted mock examinations under an active pass, the subscription cannot be cancelled or refunded, as the digital goods have been substantially consumed.</p>
                </div>
                <p className="text-xs">
                  To request a refund under the eligible criteria above, please email <strong>support.prepmagnet@gmail.com</strong> with your registered email, mobile number, and Razorpay Transaction ID.
                </p>
              </div>
            </article>

            {/* Section 7 */}
            <article id="intellectual-property" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                7. Intellectual Property & Limited License
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  All content included on the Platform, including questions, answer explanations, mock blueprints, examination graphics, user interface designs, algorithms, code, and trademarks, is the exclusive proprietary intellectual property of <strong>PrepMagnet</strong> and is protected under the Indian Copyright Act, 1957, and relevant international treaties.
                </p>
                <p>
                  You are granted a non-exclusive, non-transferable, revocable license to access and practice test materials strictly for your personal, non-commercial examination preparation. You must not:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Copy, reproduce, distribute, republish, sell, or mirror any question bank content.</li>
                  <li>Use automated web crawlers, scrapers, or bots to harvest data from PrepMagnet.</li>
                  <li>Circulate screenshots or solutions on social media channels without express written consent.</li>
                </ul>
              </div>
            </article>

            {/* Section 8 */}
            <article id="user-conduct" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                8. User Conduct & Academic Honor Code
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  PrepMagnet is built to foster merit and authentic preparation. In using the platform, candidates pledge to adhere to academic integrity:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <li>No account sharing or reselling of login credentials across multiple individuals.</li>
                  <li>No tampering with client-side JavaScript, timer clocks, or scorecard requests to spoof percentiles or mock ranks.</li>
                  <li>No uploading of malicious software, worms, or trojans designed to interrupt platform availability.</li>
                </ul>
                <p className="text-xs">
                  Violations will lead to immediate account termination without refund and may be reported to appropriate legal bodies.
                </p>
              </div>
            </article>

            {/* Section 9 */}
            <article id="disclaimers" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                9. Warranties & Disclaimers
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  The Platform and all test series, question banks, typing master passages, and scorecards are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied.
                </p>
                <p>
                  While our academic team diligently creates high-quality questions matching official exam patterns, PrepMagnet does NOT guarantee that identical questions will appear in the actual government examination, nor does it guarantee guaranteed selection or qualification in any competitive exam.
                </p>
              </div>
            </article>

            {/* Section 10 */}
            <article id="limitation-liability" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                10. Limitation of Liability
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2.5 leading-relaxed">
                <p>
                  To the maximum extent permitted by applicable Indian law, in no event shall PrepMagnet, its directors, employees, or affiliates be liable for any indirect, punitive, incidental, special, or consequential damages arising out of your use of the platform.
                </p>
                <p>
                  Our total cumulative liability to you for any claim arising out of these Terms shall not exceed the amount actually paid by you to PrepMagnet for the specific subscription pass in dispute during the prior twelve (12) months.
                </p>
              </div>
            </article>

            {/* Section 11 */}
            <article id="termination" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                11. Suspension & Termination
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  We reserve the right to suspend or terminate your account and refuse current or future use of the Platform at our sole discretion, without liability, if we determine that you have violated these Terms, committed fraudulent activity, or compromised the security of other users.
                </p>
              </div>
            </article>

            {/* Section 12 */}
            <article id="governing-law" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                12. Governing Law & Dispute Resolution
              </h3>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 space-y-2 leading-relaxed">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the Republic of India. In the event of any controversy, claim, or dispute arising out of or in connection with these Terms, the parties agree to submit to the exclusive jurisdiction of the competent courts located in <strong>New Delhi, India</strong>.
                </p>
              </div>
            </article>

            {/* Section 13 */}
            <article id="grievance" className="p-6 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-4">
              <h3 className="text-base sm:text-lg font-black text-charcoal-950 dark:text-white">
                13. Grievance Officer & Official Communications
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                In accordance with the Information Technology Act 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the contact details of our Grievance Redressal Officer are provided below:
              </p>

              <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200/80 dark:border-charcoal-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-charcoal-600 dark:text-charcoal-300">
                    <MailIcon size={14} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                    <span>Email: <strong className="text-charcoal-900 dark:text-white select-all">support.prepmagnet@gmail.com</strong></span>
                  </div>
                  <div className="text-[11px] text-charcoal-500 mt-2">
                    Support Hours: Monday – Saturday, 10:00 AM to 6:00 PM IST (Excluding Public Holidays). Grievances are acknowledged within 48 hours and resolved within 15 days.
                  </div>
                </div>
              </div>
            </article>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800">
              <div className="text-xs text-charcoal-500">
                Have questions about these terms or razorpay billing?
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(ROUTES.privacy)}
                  className="px-4 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
                >
                  View Privacy Policy
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
