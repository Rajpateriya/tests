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
import { CustomSelect } from './CustomSelect';

/**
 * TestRulesModal — Official Pre-Exam Instructions & Candidate Declaration Page
 * Implements real government CBT (TCS iON / SSC / Railway) examination protocols:
 * 1. General Instructions & Question Palette Legend.
 * 2. Step 2: Declarative Page with legal undertaking, mandatory declaration checkbox,
 *    and candidate name placeholder signature that enables the "I am ready to begin" button.
 *
 * Mobile-Optimized:
 * - Ultra-compact 4-column metric strip (fits in 1 line on mobile).
 * - Responsive stepper and language selector in a single clean row.
 * - Concise, wrap-free button labels on mobile.
 * - Slim padding and spacing preventing oversized/clunky dialog on phone screens.
 */
const INSTRUCTIONS_DATA = {
  English: {
    instructionsTitle: 'Important Examination Instructions:',
    rules: [
      'The examination countdown timer at the top-right displays time remaining in real time synchronized with the server.',
      'Click question numbers in the palette to navigate directly to any question.',
      'To select an answer, click one of the options. To deselect, click Clear Response.',
      'Click Save & Next to save your answer and move to the next question.',
      'Switching browser tabs or exiting fullscreen will trigger an examination integrity alert.',
    ],
    undertakingTitle: 'Official Candidate Undertaking:',
    undertaking: [
      '1. I have read, understood and agree to strictly comply with all the instructions given regarding this Computer-Based Examination.',
      '2. I hereby declare that the computer workstation, display monitor, mouse and keyboard provided to me are in proper operational order.',
      '3. I declare that I am not in possession of, carrying, or consulting any prohibited items such as mobile phones, smartwatches, calculators, electronic gadgets, or written paper chits.',
      '4. I understand that attempting window switching, developer tools inspection, or unauthorized keyboard combinations will register integrity violations.',
      '5. I agree that in case of not adhering to the examination code of conduct, I shall be liable for immediate disqualification and debarment from the platform.',
    ],
    declarationLabel: 'I have read and understood all the instructions above and I agree to the candidate declaration terms.',
    readyMsg: 'Declaration accepted. You may now commence the exam.',
    proceedBtn: 'Begin Mock Exam (Declaration)',
    proceedBtnMobile: 'Next: Declaration',
    startBtn: 'I am ready to begin',
  },
  Hindi: {
    instructionsTitle: 'महत्वपूर्ण परीक्षा निर्देश (Examination Instructions):',
    rules: [
      'ऊपरी दाएं कोने में परीक्षा उलटी गिनती घड़ी (टाइमर) सर्वर के साथ वास्तविक समय में समन्वित शेष समय प्रदर्शित करती है।',
      'किसी भी प्रश्न पर सीधे जाने के लिए प्रश्न पैलेट (Question Palette) में प्रश्न संख्या पर क्लिक करें।',
      'अपना उत्तर चुनने के लिए विकल्प बटन पर क्लिक करें। चयन हटाने के लिए Clear Response बटन पर क्लिक करें।',
      'उत्तर सुरक्षित करने और अगले प्रश्न पर जाने के लिए Save & Next पर क्लिक करें।',
      'ब्राउज़र टैब बदलना या फ़ुलस्क्रीन से बाहर निकलना परीक्षा अखंडता उल्लंघन (Integrity Alert) दर्ज करेगा।',
    ],
    undertakingTitle: 'उम्मीदवार का आधिकारिक वचनपत्र (Official Candidate Undertaking):',
    undertaking: [
      '1. मैंने इस कंप्यूटर आधारित परीक्षा (CBT) के संबंध में दिए गए सभी निर्देशों को पढ़ और समझ लिया है तथा मैं इनका कड़ाई से पालन करने के लिए सहमत हूँ।',
      '2. मैं घोषित करता/करती हूँ कि मुझे प्रदान किया गया कंप्यूटर वर्कस्टेशन, मॉनिटर, माउस और कीबोर्ड सही ढंग से काम कर रहे हैं।',
      '3. मैं घोषित करता/करती हूँ कि मेरे पास कोई भी प्रतिबंधित वस्तु जैसे मोबाइल, स्मार्टवॉच, कैलकुलेटर या कागज़ की पर्चियां नहीं हैं।',
      '4. मैं समझता/समझती हूँ कि विंडो बदलना या अनधिकृत कीबोर्ड शॉर्टकट का प्रयास करना अखंडता उल्लंघन के रूप में दर्ज होगा।',
      '5. परीक्षा आचार संहिता का उल्लंघन करने पर मुझे तत्काल अयोग्य घोषित किया जा सकता है।',
    ],
    declarationLabel: 'मैंने ऊपर दिए गए सभी निर्देशों को पढ़ और समझ लिया है तथा मैं घोषणा की शर्तों से सहमत हूँ।',
    readyMsg: 'घोषणा स्वीकार कर ली गई है। अब आप परीक्षा शुरू कर सकते हैं।',
    proceedBtn: 'निर्देश आगे बढ़ाएं (घोषणा पत्र)',
    proceedBtnMobile: 'अगला: घोषणा पत्र',
    startBtn: 'मैं परीक्षा शुरू करने के लिए तैयार हूँ',
  },
};

export const TestRulesModal = ({ test, isOpen, onClose, onStartExam, onOpenAuthModal }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('instructions'); // 'instructions' | 'declaration'
  const [isDeclared, setIsDeclared] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Reset state whenever modal opens for a test
  useEffect(() => {
    if (isOpen) {
      setStep('instructions');
      setIsDeclared(false);
    }
  }, [isOpen, test, user]);

  if (!isOpen || !test) return null;

  const currentText = INSTRUCTIONS_DATA[selectedLanguage] || INSTRUCTIONS_DATA.English;
  const isStartButtonEnabled = isDeclared;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-750 rounded-2xl sm:rounded-3xl max-w-2xl sm:max-w-3xl w-full p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 animate-scale-in max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-2.5 sm:pb-3 border-b border-charcoal-150 dark:border-charcoal-800 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-institutional-100 dark:bg-institutional-950/80 text-institutional-600 dark:text-institutional-400 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
              <ShieldIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border border-institutional-500/20">
                  {test.test_type || 'MOCK'} EXAM
                </span>
                <span className="text-[11px] sm:text-xs text-charcoal-500 dark:text-charcoal-400 font-semibold truncate">
                  • {test.target_exam || 'Competitive Exam'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-charcoal-900 dark:text-white line-clamp-1 leading-tight">
                {test.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <XCircleIcon size={18} />
          </button>
        </div>

        {/* Modal Stepper & Language Switcher (Single Clean Row) */}
        <div className="flex items-center justify-between gap-2 px-0.5 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all shrink-0 ${
                step === 'instructions'
                  ? 'bg-institutional-600 text-white shadow-xs'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 'declaration' ? '✓' : '1'}
            </span>
            <span
              className={`text-[11px] sm:text-xs font-extrabold ${
                step === 'instructions'
                  ? 'text-institutional-600 dark:text-institutional-400'
                  : 'text-charcoal-500'
              }`}
            >
              Guidelines
            </span>

            <span className="text-charcoal-300 dark:text-charcoal-700 text-xs">─</span>

            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all shrink-0 ${
                step === 'declaration'
                  ? 'bg-institutional-600 text-white shadow-xs'
                  : 'bg-charcoal-200 dark:bg-charcoal-800 text-charcoal-500'
              }`}
            >
              2
            </span>
            <span
              className={`text-[11px] sm:text-xs font-extrabold ${
                step === 'declaration'
                  ? 'text-institutional-600 dark:text-institutional-400'
                  : 'text-charcoal-500'
              }`}
            >
              Declaration
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-charcoal-500 font-medium shrink-0">
            <span className="hidden sm:inline">Language:</span>
            <CustomSelect
              align="right"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-[11px] sm:text-xs font-bold rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
            </CustomSelect>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-3.5 text-charcoal-700 dark:text-charcoal-300 scrollbar-thin">
          {/* STEP 1: INSTRUCTIONS & EXAM SCHEME */}
          {step === 'instructions' && (
            <div className="space-y-3 sm:space-y-3.5 animate-fade-in">
              {/* Key Metrics Grid (1 Row on mobile, 4 columns) */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-charcoal-50 dark:bg-charcoal-800/60 rounded-xl sm:rounded-2xl border border-charcoal-200 dark:border-charcoal-700 text-center font-mono">
                <div className="p-1">
                  <div className="text-[9px] sm:text-[10px] text-charcoal-500 uppercase font-semibold">Duration</div>
                  <div className="text-xs sm:text-sm font-black text-charcoal-900 dark:text-charcoal-100 mt-0.5">
                    ⏱ {test.duration_minutes || 60}m
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[9px] sm:text-[10px] text-charcoal-500 uppercase font-semibold">Questions</div>
                  <div className="text-xs sm:text-sm font-black text-charcoal-900 dark:text-charcoal-100 mt-0.5">
                    📝 {test.total_questions || test.questions?.length || 25}
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Correct</div>
                  <div className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                    +{test.positive_marks_per_q || 2.0}
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[9px] sm:text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Penalty</div>
                  <div className="text-xs sm:text-sm font-black text-rose-800 dark:text-rose-300 mt-0.5">
                    -{test.negative_marks_per_q || 0.5}
                  </div>
                </div>
              </div>

              {/* TCS iON Standard Question Palette Legend (Compact) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800/40 border border-charcoal-200 dark:border-charcoal-750 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-charcoal-600 dark:text-charcoal-300 block">
                  Question Palette Status Legend:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[10px] sm:text-[11px] truncate">Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[10px] sm:text-[11px] truncate">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[10px] sm:text-[11px] truncate">Marked Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                      4
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-[10px] sm:text-[11px] truncate">Not Visited</span>
                  </div>
                </div>
              </div>

              {/* Instructions List */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-extrabold text-charcoal-900 dark:text-white uppercase text-[10px] sm:text-[11px] tracking-wider">
                  {currentText.instructionsTitle}
                </h4>
                <ul className="space-y-1 list-disc pl-4 text-charcoal-600 dark:text-charcoal-400 text-[11px] sm:text-xs leading-normal sm:leading-relaxed">
                  {currentText.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>

              {/* Guest Login Callout Banner */}
              {!user && (
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2">
                  <AlertTriangleIcon size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                    <p className="font-bold">Authentication Required to Attempt Test:</p>
                    <p className="opacity-90">
                      Please sign in so your scorecard, percentile, and rank can be officially certified.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DECLARATIVE PAGE */}
          {step === 'declaration' && (
            <div className="space-y-3 animate-fade-in">
              {/* Candidate Identity Box */}
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-charcoal-800/80 border border-slate-200 dark:border-charcoal-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <UserIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-charcoal-400">
                      Candidate Roll / Identification
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-charcoal-900 dark:text-white truncate">
                      {user ? user.full_name : 'Guest Aspirant (Sign-in required)'}
                    </h4>
                    <p className="text-[10px] text-charcoal-500 font-mono truncate">
                      {user ? user.email : 'Unauthenticated Session'}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[10px] sm:text-xs font-mono text-charcoal-500 shrink-0">
                  <div className="font-bold text-charcoal-800 dark:text-charcoal-200">
                    NODE-CBT-01
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ● Calibrated & Ready
                  </div>
                </div>
              </div>

              {/* Official Declaration Text Box */}
              <div className="p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-750 space-y-1.5">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-charcoal-800 dark:text-charcoal-200 flex items-center gap-1.5">
                  <ShieldIcon size={13} className="text-institutional-600" />
                  {currentText.undertakingTitle}
                </span>
                <div className="text-[11px] sm:text-xs text-charcoal-600 dark:text-charcoal-400 space-y-1.5 leading-relaxed max-h-36 sm:max-h-44 overflow-y-auto pr-1 border-y border-charcoal-200/60 dark:border-charcoal-750 py-1.5">
                  {currentText.undertaking.map((item, idx) => (
                    <p key={idx}>{item}</p>
                  ))}
                </div>

                {/* THE DECLARATION CHECKBOX */}
                <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    id="candidate-declaration-checkbox"
                    checked={isDeclared}
                    onChange={(e) => setIsDeclared(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-charcoal-300 dark:border-charcoal-600 text-institutional-600 focus:ring-institutional-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] sm:text-xs font-bold text-charcoal-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors leading-snug">
                    {currentText.declarationLabel}
                  </span>
                </label>
              </div>

              {/* Dynamic Status Helper */}
              {!isStartButtonEnabled ? (
                <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangleIcon size={13} className="shrink-0" />
                  <span>
                    Please check the declaration checkbox to acknowledge the examination rules.
                  </span>
                </div>
              ) : (
                <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircleIcon size={13} className="shrink-0 text-emerald-600" />
                  <span>{currentText.readyMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-2.5 sm:pt-3 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between shrink-0 gap-2 sm:gap-3">
          {step === 'instructions' ? (
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setStep('instructions')}
              className="px-3 sm:px-4 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeftIcon size={13} />
              <span className="hidden sm:inline">Back to Instructions</span>
              <span className="sm:hidden">Back</span>
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
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-extrabold text-white bg-institutional-600 hover:bg-institutional-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="hidden sm:inline">
                {!user ? 'Sign In to Begin Mock Exam' : currentText.proceedBtn}
              </span>
              <span className="sm:hidden">
                {!user ? 'Sign In' : currentText.proceedBtnMobile || 'Next: Declaration'}
              </span>
              <ArrowRightIcon size={13} />
            </button>
          ) : (
            <button
              id="start-exam-ready-btn"
              disabled={!isStartButtonEnabled}
              onClick={handleStartExamClick}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 ${
                !isStartButtonEnabled
                  ? 'opacity-40 cursor-not-allowed bg-charcoal-300 dark:bg-charcoal-700 text-charcoal-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <PlayIcon size={12} />
              <span>{currentText.startBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
