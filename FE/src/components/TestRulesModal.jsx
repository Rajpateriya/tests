import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ClockIcon,
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XCircleIcon,
  ChevronLeftIcon,
  PlayIcon,
  UserIcon,
  AlertTriangleIcon,
  SparklesIcon,
} from './Icons';

/**
 * TestRulesModal — Official Pre-Exam Instructions & Candidate Declaration Page
 * Implements real government CBT (TCS iON / SSC / Railway) examination protocols:
 * 1. General Instructions & Question Palette Legend.
 * 2. Step 2: Declarative Page with legal undertaking, mandatory declaration checkbox,
 *    and candidate name placeholder signature that enables the "I am ready to begin" button.
 */
export const TestRulesModal = ({ test, isOpen, onClose, onStartExam, onOpenAuthModal }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('instructions'); // 'instructions' | 'declaration'
  const [isDeclared, setIsDeclared] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Reset state whenever modal opens for a test
  useEffect(() => {
    if (isOpen) {
      setStep('instructions');
      setIsDeclared(false);
      setCandidateName(user?.full_name || '');
    }
  }, [isOpen, test, user]);

  if (!isOpen || !test) return null;

  const isStartButtonEnabled = isDeclared && candidateName.trim().length > 0;

  const handleStartExamClick = () => {
    if (!user) {
      onClose();
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    if (!isStartButtonEnabled) return;
    onClose();
    onStartExam(test);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-750 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-charcoal-150 dark:border-charcoal-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-institutional-100 dark:bg-institutional-950/80 text-institutional-600 dark:text-institutional-400 flex items-center justify-center font-bold text-lg shrink-0">
              <ShieldIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border border-institutional-500/20">
                  {test.test_type || 'MOCK'} EXAM
                </span>
                <span className="text-xs text-charcoal-500 dark:text-charcoal-400 font-semibold">
                  • {test.target_exam || 'All-India Competitive Exam'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-charcoal-900 dark:text-white line-clamp-1">
                {test.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
            title="Close"
          >
            <XCircleIcon size={20} />
          </button>
        </div>

        {/* Modal Stepper Indicator */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step === 'instructions'
                  ? 'bg-institutional-600 text-white shadow-xs'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 'declaration' ? '✓' : '1'}
            </span>
            <span
              className={`text-xs font-extrabold ${
                step === 'instructions'
                  ? 'text-institutional-600 dark:text-institutional-400'
                  : 'text-charcoal-500'
              }`}
            >
              1. Exam Guidelines
            </span>

            <span className="text-charcoal-300 dark:text-charcoal-700 mx-1">──</span>

            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step === 'declaration'
                  ? 'bg-institutional-600 text-white shadow-xs'
                  : 'bg-charcoal-200 dark:bg-charcoal-800 text-charcoal-500'
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-extrabold ${
                step === 'declaration'
                  ? 'text-institutional-600 dark:text-institutional-400'
                  : 'text-charcoal-500'
              }`}
            >
              2. Candidate Declaration
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-charcoal-500 font-medium">
            <span>Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs font-bold rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-charcoal-700 dark:text-charcoal-300">
          {/* STEP 1: INSTRUCTIONS & EXAM SCHEME */}
          {step === 'instructions' && (
            <div className="space-y-4 animate-fade-in">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-charcoal-50 dark:bg-charcoal-800/60 rounded-2xl border border-charcoal-200 dark:border-charcoal-700 text-center font-mono">
                <div>
                  <div className="text-[10px] text-charcoal-500 uppercase font-semibold">Duration</div>
                  <div className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100 mt-0.5">
                    ⏱ {test.duration_minutes || 60}m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-500 uppercase font-semibold">Questions</div>
                  <div className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100 mt-0.5">
                    📝 {test.total_questions || 25}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Correct</div>
                  <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                    +{test.positive_marks_per_q || 2.0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Penalty</div>
                  <div className="text-sm font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                    -{test.negative_marks_per_q || 0.5}
                  </div>
                </div>
              </div>

              {/* TCS iON Standard Question Palette Legend */}
              <div className="p-3.5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-800/40 border border-charcoal-200 dark:border-charcoal-750 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-charcoal-600 dark:text-charcoal-300 block">
                  Question Palette Status Legend:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                      1
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[11px]">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center">
                      2
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[11px]">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                      3
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[11px]">Marked Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300 font-bold text-[10px] flex items-center justify-center">
                      4
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[11px]">Not Visited</span>
                  </div>
                </div>
              </div>

              {/* Institutional Instructions */}
              <div className="space-y-2 text-xs leading-relaxed">
                <h4 className="font-extrabold text-charcoal-900 dark:text-white uppercase text-[11px] tracking-wider">
                  Important Examination Instructions:
                </h4>
                <ul className="space-y-1.5 list-disc pl-4 text-charcoal-600 dark:text-charcoal-400">
                  <li>
                    The examination countdown timer at the top-right corner displays time remaining in real time synchronized with the server.
                  </li>
                  <li>
                    Click on question numbers in the Question Palette to navigate directly to any question.
                  </li>
                  <li>
                    To select your answer, click on one of the option buttons. To deselect, click on the Clear Response button.
                  </li>
                  <li>
                    Click <strong>Save & Next</strong> to save your answer and move to the next question.
                  </li>
                  <li>
                    Switching browser tabs or exiting fullscreen will trigger an examination integrity alert.
                  </li>
                </ul>
              </div>

              {/* Guest Login Callout Banner if unauthenticated */}
              {!user && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5">
                  <AlertTriangleIcon size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-bold">Authentication Required to Attempt Test:</p>
                    <p className="text-[11px] opacity-90">
                      You are previewing this mock exam as a guest. Please sign in or register so your scorecard, percentile, and rank can be recorded.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DECLARATIVE PAGE (REAL EXAM STANDARD) */}
          {step === 'declaration' && (
            <div className="space-y-4 animate-fade-in">
              {/* Candidate Identity Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-800/80 border border-slate-200 dark:border-charcoal-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-charcoal-400">
                      Candidate Roll / Identification
                    </span>
                    <h4 className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                      {user ? user.full_name : 'Guest Aspirant (Sign-in required)'}
                    </h4>
                    <p className="text-[11px] text-charcoal-500 font-mono">
                      {user ? user.email : 'Unauthenticated Session'}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs font-mono text-charcoal-500">
                  <div className="font-bold text-charcoal-800 dark:text-charcoal-200">
                    Terminal: NODE-CBT-01
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ● System Calibrated & Ready
                  </div>
                </div>
              </div>

              {/* Official Declaration Text Box */}
              <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-750 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-charcoal-800 dark:text-charcoal-200 flex items-center gap-1.5">
                  <ShieldIcon size={14} className="text-institutional-600" />
                  Official Candidate Undertaking:
                </span>
                <div className="text-xs text-charcoal-600 dark:text-charcoal-400 space-y-2 leading-relaxed max-h-40 overflow-y-auto pr-2 border-y border-charcoal-200/60 dark:border-charcoal-750 py-2 text-justify">
                  <p>
                    1. I have read, understood and agree to strictly comply with all the instructions given regarding this Computer-Based Examination.
                  </p>
                  <p>
                    2. I hereby declare that the computer workstation, display monitor, mouse and keyboard provided to me are in proper operational order.
                  </p>
                  <p>
                    3. I declare that I am not in possession of, carrying, or consulting any prohibited items such as mobile phones, smartwatches, calculators, electronic gadgets, or written paper chits.
                  </p>
                  <p>
                    4. I understand that attempting window switching, developer tools inspection, or unauthorized keyboard combinations will register integrity violations.
                  </p>
                  <p>
                    5. I agree that in case of not adhering to the examination code of conduct, I shall be liable for immediate disqualification and debarment from the platform.
                  </p>
                </div>

                {/* THE DECLARATION CHECKBOX */}
                <label className="flex items-start gap-3 pt-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    id="candidate-declaration-checkbox"
                    checked={isDeclared}
                    onChange={(e) => setIsDeclared(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-charcoal-300 dark:border-charcoal-600 text-institutional-600 focus:ring-institutional-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-charcoal-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                    I have read and understood all the instructions above and I agree to the candidate declaration terms.
                  </span>
                </label>
              </div>

              {/* CANDIDATE NAME INPUT (PLACEHOLDER SIGNATURE) */}
              <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-750 space-y-2">
                <label
                  htmlFor="candidate-name-signature"
                  className="block text-xs font-black uppercase tracking-wider text-charcoal-800 dark:text-charcoal-200"
                >
                  Candidate Digital Signature Confirmation:
                </label>
                <p className="text-[11px] text-charcoal-500">
                  Please type your full name in the placeholder field below to acknowledge and enable the start button.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    id="candidate-name-signature"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder={user?.full_name ? `Enter your name (e.g. ${user.full_name})` : "Enter your full name to enable start (e.g. Rahul Sharma)"}
                    className="w-full px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 text-sm font-semibold text-charcoal-900 dark:text-white placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all"
                  />
                  {candidateName.trim().length > 0 && (
                    <span className="absolute right-3 top-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <CheckCircleIcon size={14} /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Validation Status Helper */}
              {!isStartButtonEnabled && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangleIcon size={14} className="shrink-0" />
                  <span>
                    {!isDeclared && !candidateName.trim()
                      ? 'Please check the declaration checkbox AND enter your name in the placeholder to enable the start button.'
                      : !isDeclared
                        ? 'Please check the declaration checkbox to proceed.'
                        : 'Please enter your full name in the signature field above.'}
                  </span>
                </div>
              )}

              {isStartButtonEnabled && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircleIcon size={14} className="shrink-0 text-emerald-600" />
                  <span>Declaration accepted and identity confirmed. You may now commence the exam.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between shrink-0 gap-3">
          {step === 'instructions' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setStep('instructions')}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeftIcon size={14} />
              <span>Back to Instructions</span>
            </button>
          )}

          {step === 'instructions' ? (
            <button
              id="begin-mock-exam-btn"
              onClick={() => {
                if (!user && onOpenAuthModal) {
                  onClose();
                  onOpenAuthModal('login');
                } else {
                  setStep('declaration');
                }
              }}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-institutional-600 hover:bg-institutional-700 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>{!user ? 'Sign In to Begin Mock Exam' : 'Begin Mock Exam (Declaration)'}</span>
              <ArrowRightIcon size={14} />
            </button>
          ) : (
            <button
              id="start-exam-ready-btn"
              disabled={!isStartButtonEnabled}
              onClick={handleStartExamClick}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                !isStartButtonEnabled
                  ? 'opacity-40 cursor-not-allowed bg-charcoal-300 dark:bg-charcoal-700 text-charcoal-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <PlayIcon size={13} />
              <span>I am ready to begin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
