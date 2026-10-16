import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { RazorpayModal } from '../components/RazorpayModal';
import {
  ChevronRightIcon,
  CheckCircleIcon,
  ShieldIcon,
  ClockIcon,
  HelpCircleIcon,
  BookOpenIcon,
  LayersIcon,
  ArrowRightIcon,
  LockIcon,
  EyeIcon,
  PlayIcon,
  SparklesIcon,
} from '../components/Icons';

// A course's quizzes split into the two kinds Admin Studio can tag/create:
// drills (embedded questions, answers previewable here) and mock tests (started in the exam room).
const splitQuizzes = (quizzes = []) => ({
  drills: quizzes.filter((q) => q.questions && q.questions.length > 0),
  mockTests: quizzes.filter((q) => !(q.questions && q.questions.length > 0)),
});

const COVER_GRID = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
};
const COVER_GLOW = {
  backgroundImage: 'radial-gradient(circle at 90% -20%, rgba(255,255,255,0.38), transparent 55%)',
};

const Backdrop = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] max-w-[140vw] h-[420px] bg-institutional-500/10 dark:bg-institutional-400/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
    <div className="absolute top-[520px] -left-36 w-[520px] max-w-[140vw] h-[520px] bg-emerald-500/8 dark:bg-emerald-400/10 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
    <div className="absolute top-[900px] -right-36 w-[560px] max-w-[140vw] h-[560px] bg-purple-500/8 dark:bg-purple-400/10 blur-[140px] rounded-full pointer-events-none animate-glow-pulse" />
  </div>
);

// The -mt/-mb + pt/pb pairs cancel the app shell's navbar/footer padding so the backdrop reaches the very top and bottom.
const PAGE_SHELL = 'relative w-full max-w-full overflow-x-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 -mb-12 pb-12 font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-hero';
const PAGE_MAIN = 'relative w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-10 min-w-0';

export const CourseDetailPage = ({ courseId, onBackToCourses, onStartTest, backLabel = 'Courses' }) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [userCoins, setUserCoins] = useState(0);
  const [useCoins, setUseCoins] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState(null);

  const [quizFilter, setQuizFilter] = useState('all'); // 'all' | 'drill' | 'mock'
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCourse(await api.courses.getDetail(courseId));
    } catch (err) {
      setError(err.message || 'Could not load this course.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.auth
      .getMe()
      .then((profile) => {
        if (profile?.profile?.coins_balance !== undefined) setUserCoins(profile.profile.coins_balance);
      })
      .catch(() => { });
  }, [courseId]);

  const openPreview = (quiz) => {
    setPreviewQuiz(quiz);
    setActiveQuestionIndex(0);
  };

  const handleStartCheckout = async () => {
    setOrderLoading(true);
    try {
      setOrderData(await api.courses.createOrder(course.id, useCoins));
      setCheckoutOpen(true);
    } catch (err) {
      setError(err.message || 'Could not start checkout.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setCheckoutOpen(false);
    setEnrollMessage(`You have enrolled in ${course.title}! You can now take every quiz and mock test below.`);
    load();
  };

  if (loading) {
    return (
      <div className={PAGE_SHELL}>
        <Backdrop />
        <div className={`${PAGE_MAIN} space-y-5`}>
          <div className="h-4 w-40 rounded bg-charcoal-200/60 dark:bg-charcoal-800 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 w-full min-w-0">
            <div className="space-y-5 min-w-0">
              <div className="h-64 rounded-2xl bg-charcoal-200/60 dark:bg-charcoal-800/60 animate-pulse" />
              <div className="h-56 rounded-2xl bg-charcoal-200/60 dark:bg-charcoal-800/60 animate-pulse" />
            </div>
            <div className="h-80 rounded-2xl bg-charcoal-200/60 dark:bg-charcoal-800/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className={PAGE_SHELL}>
        <Backdrop />
        <div className={PAGE_MAIN}>
          <div className="max-w-xl mx-auto text-center py-14 bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 shadow-subtle space-y-2.5">
            <BookOpenIcon size={36} className="mx-auto text-charcoal-400" />
            <h3 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">Could not open this course</h3>
            <p className="text-xs text-charcoal-500">{error}</p>
            <button
              type="button"
              onClick={onBackToCourses}
              className="mt-2 px-4 py-2 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Back to {backLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { drills, mockTests } = splitQuizzes(course.quizzes);
  const isEnrolled = course.is_enrolled;
  const subjects = course.subjects || [];
  const savings = Math.max(0, Math.round(course.original_price - course.discounted_price));
  const maxCoinsUsable = Math.min(userCoins, course.max_coins_discount || 500);
  const coinDiscount = useCoins && userCoins > 0 ? Math.round(maxCoinsUsable * 0.1) : 0;
  const finalPrice = Math.max(1, course.discounted_price - coinDiscount);
  const features = (course.features || []).slice(0, 6);

  const quizzes = [...drills, ...mockTests];
  const visibleQuizzes = quizFilter === 'drill' ? drills : quizFilter === 'mock' ? mockTests : quizzes;
  const filterTabs = [
    { id: 'all', label: 'All', count: quizzes.length },
    { id: 'drill', label: 'Drills', count: drills.length },
    { id: 'mock', label: 'Mock tests', count: mockTests.length },
  ];

  return (
    <div className={PAGE_SHELL}>
      <Backdrop />

      <main className={`${PAGE_MAIN} space-y-5`}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="w-full min-w-0 flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 dark:text-charcoal-400 overflow-hidden">
          <button
            type="button"
            onClick={onBackToCourses}
            className="shrink-0 hover:text-institutional-600 dark:hover:text-institutional-400 hover:underline transition-colors cursor-pointer"
          >
            {backLabel}
          </button>
          <ChevronRightIcon size={12} className="text-charcoal-300 dark:text-charcoal-600 shrink-0" />
          <span className="text-charcoal-900 dark:text-charcoal-100 truncate min-w-0 flex-1 max-w-full" aria-current="page">
            {course.title}
          </span>
        </nav>

        {enrollMessage && (
          <div className="w-full min-w-0 px-3.5 sm:px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold min-w-0">
              <CheckCircleIcon size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="break-words">{enrollMessage}</span>
            </div>
            <button
              onClick={() => setEnrollMessage(null)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 self-end sm:self-auto cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 sm:gap-6">
          {/* Course header */}
          <section className="w-full min-w-0 lg:col-start-1 lg:row-start-1 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-subtle overflow-hidden">
            <div className="relative min-h-[3.5rem] py-2.5 px-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-institutional-800 via-institutional-600 to-sky-500 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={COVER_GRID} />
              <div className="absolute inset-0 pointer-events-none" style={COVER_GLOW} />

              <div className="relative flex items-center flex-wrap gap-1.5 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/25 backdrop-blur-sm max-w-[200px] truncate">
                  {course.target_exam}
                </span>
                {course.badge && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-300/90 text-amber-950 max-w-[160px] truncate">
                    <SparklesIcon size={10} className="shrink-0" />
                    <span className="truncate">{course.badge}</span>
                  </span>
                )}
              </div>

              {isEnrolled && (
                <span className="relative inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-400 text-emerald-950 max-w-full truncate shrink-0">
                  <CheckCircleIcon size={12} className="shrink-0" />
                  <span className="truncate">{course.access_source === 'PASS' ? `Included in ${course.pass_title || 'Active Pass'}` : 'Enrolled'}</span>
                </span>
              )}
            </div>

            <div className="p-4 sm:p-6 space-y-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug sm:leading-tight text-charcoal-950 dark:text-white break-words">
                  {course.title}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-400 leading-relaxed break-words whitespace-pre-line">
                  {course.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 w-full min-w-0">
                <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-charcoal-900/60 border border-charcoal-200/50 dark:border-charcoal-800/50 min-w-0">
                  <div className="text-sm sm:text-base font-extrabold font-mono text-charcoal-900 dark:text-white truncate">{drills.length}</div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500 truncate">Drills</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-charcoal-900/60 border border-charcoal-200/50 dark:border-charcoal-800/50 min-w-0">
                  <div className="text-sm sm:text-base font-extrabold font-mono text-charcoal-900 dark:text-white truncate">{mockTests.length}</div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500 truncate">Mock tests</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-charcoal-900/60 border border-charcoal-200/50 dark:border-charcoal-800/50 min-w-0">
                  <div className="text-sm sm:text-base font-extrabold font-mono text-charcoal-900 dark:text-white truncate">{subjects.length}</div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500 truncate">Subjects</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-charcoal-900/60 border border-charcoal-200/50 dark:border-charcoal-800/50 min-w-0">
                  <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 truncate">₹{savings}</div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500 truncate">You save</div>
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  {subjects.map((sub, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700 max-w-full break-words"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Enroll panel */}
          <aside className="w-full min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-28 self-start bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-institutional-800 via-institutional-600 to-sky-500" />
            <div className="p-4 sm:p-5 space-y-4 min-w-0">
              {isEnrolled ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                    <CheckCircleIcon size={18} className="shrink-0" />
                    <span className="break-words">{course.access_source === 'PASS' ? `Included in ${course.pass_title || 'Active Pass'}` : "You're enrolled"}</span>
                  </div>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed">
                    Every quiz and mock test in this course is unlocked.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2 font-mono flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-charcoal-900 dark:text-white">₹{finalPrice}</span>
                      <span className="text-xs sm:text-sm text-charcoal-400 line-through">₹{course.original_price}</span>
                      <span className="text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white">{course.discount_percent}% OFF</span>
                    </div>
                    {coinDiscount > 0 && (
                      <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        incl. −₹{coinDiscount} from {maxCoinsUsable} GovCoins
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCheckout}
                    disabled={orderLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    <ShieldIcon size={16} />
                    <span>{orderLoading ? 'Preparing checkout...' : 'Enroll now'}</span>
                  </button>

                  {userCoins > 0 && (
                    <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none">
                      <span className="inline-flex items-center gap-1.5">
                        <span>🪙</span>
                        <span>
                          Use GovCoins <span className="font-mono">({userCoins})</span>
                        </span>
                      </span>
                      <span className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={useCoins}
                          onChange={(e) => setUseCoins(e.target.checked)}
                          className="peer sr-only"
                          aria-label="Apply GovCoins discount"
                        />
                        <span className="w-8 h-[18px] rounded-full bg-charcoal-300 dark:bg-charcoal-700 peer-checked:bg-amber-500 transition-colors" />
                        <span className="absolute left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[14px]" />
                      </span>
                    </label>
                  )}
                </>
              )}

              {error && (
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {features.length > 0 && (
                <ul className="space-y-2 pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-charcoal-600 dark:text-charcoal-300">
                      <CheckCircleIcon size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="break-words">{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              {!isEnrolled && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal-500 dark:text-charcoal-400">
                  <ShieldIcon size={12} className="text-institutional-600 shrink-0" />
                  <span>Secure checkout via Razorpay</span>
                </div>
              )}
            </div>
          </aside>

          {/* Quizzes & mock tests */}
          <section className="w-full min-w-0 lg:col-start-1 lg:row-start-2 bg-white/80 dark:bg-charcoal-900/80 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 rounded-2xl shadow-subtle p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-charcoal-950 dark:text-white flex items-center gap-2">
                <BookOpenIcon size={18} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
                <span>Quizzes &amp; mock tests</span>
              </h2>

              {drills.length > 0 && mockTests.length > 0 && (
                <div className="flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold self-start sm:self-auto max-w-full overflow-x-auto">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setQuizFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${quizFilter === tab.id
                          ? 'bg-white dark:bg-charcoal-900 text-institutional-700 dark:text-institutional-300 shadow-sm font-extrabold'
                          : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
                        }`}
                    >
                      {tab.label} <span className="font-mono opacity-70">({tab.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {quizzes.length === 0 ? (
              <div className="py-8 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center text-xs text-charcoal-500">
                No quizzes or mock tests are assigned to this course yet.
              </div>
            ) : (
              <div className="space-y-2.5 min-w-0">
                {visibleQuizzes.map((quiz, idx) => {
                  const isDrill = quiz.questions && quiz.questions.length > 0;
                  const qCount = quiz.total_questions || quiz.questions?.length || 0;
                  return (
                    <div
                      key={quiz.id || idx}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-3 rounded-xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-300 dark:hover:border-institutional-700 hover:shadow-card transition-all min-w-0"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${isDrill
                              ? 'bg-institutional-50 dark:bg-institutional-950/50 text-institutional-600 dark:text-institutional-300'
                              : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300'
                            }`}
                        >
                          {isDrill ? <BookOpenIcon size={16} /> : <LayersIcon size={16} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-bold text-xs sm:text-sm text-charcoal-900 dark:text-white break-words">
                              {quiz.title}
                            </div>
                            <span
                              className={`inline-flex text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${isDrill
                                  ? 'bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300'
                                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                                }`}
                            >
                              {isDrill ? 'Drill' : 'Mock'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-charcoal-500 dark:text-charcoal-400 mt-1">
                            <span className="font-semibold text-institutional-600 dark:text-institutional-400 truncate max-w-[140px] sm:max-w-none">
                              {quiz.subject || 'All Subjects'}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <BookOpenIcon size={11} />
                              {qCount} Qs
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <ClockIcon size={11} />
                              {quiz.duration_minutes || 15} min
                            </span>
                            {!isDrill && quiz.positive_marks !== undefined && (
                              <span className="font-mono shrink-0">
                                <span className="text-emerald-600 dark:text-emerald-400">+{quiz.positive_marks}</span>/
                                <span className="text-rose-600 dark:text-rose-400">-{quiz.negative_marks}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:justify-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-charcoal-100 dark:border-charcoal-800">
                        {isDrill ? (
                          <button
                            type="button"
                            onClick={() => openPreview(quiz)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                          >
                            <EyeIcon size={13} />
                            <span>Preview</span>
                          </button>
                        ) : isEnrolled ? (
                          <button
                            type="button"
                            onClick={() => onStartTest && onStartTest(quiz)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                          >
                            <PlayIcon size={11} />
                            <span>Start</span>
                            <ArrowRightIcon size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartCheckout}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-300 font-bold text-xs hover:bg-institutional-50 dark:hover:bg-institutional-950/40 hover:text-institutional-700 hover:border-institutional-300 dark:hover:border-institutional-800 transition-colors cursor-pointer"
                          >
                            <LockIcon size={12} />
                            <span>Unlock</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Quiz preview modal (answers + explanation) */}
      {previewQuiz && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewQuiz(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-charcoal-200 dark:border-charcoal-800 pb-3 sm:pb-4 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-institutional-600 dark:text-institutional-400 truncate">
                  {course.title} • {previewQuiz.subject}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-charcoal-900 dark:text-white break-words">{previewQuiz.title}</h3>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-1 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 text-lg rounded-full shrink-0 cursor-pointer"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            {previewQuiz.questions && previewQuiz.questions.length > 0 ? (
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-500 font-semibold">
                  <span>
                    Question {activeQuestionIndex + 1} of {previewQuiz.questions.length}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-[11px]">
                    Solution Verified
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-xs sm:text-sm font-bold text-charcoal-900 dark:text-white leading-relaxed break-words">
                  {previewQuiz.questions[activeQuestionIndex].question_text}
                </div>

                <div className="space-y-2">
                  {previewQuiz.questions[activeQuestionIndex].options?.map((opt) => {
                    const isCorrect = opt.id === previewQuiz.questions[activeQuestionIndex].correct_option;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-start sm:items-center justify-between gap-2.5 ${isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-charcoal-850 border-charcoal-200 dark:border-charcoal-800 text-charcoal-700 dark:text-charcoal-300'
                          }`}
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
                              }`}
                          >
                            {opt.id}
                          </span>
                          <span className="break-words min-w-0 flex-1">{opt.text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircleIcon size={14} /> <span className="hidden xs:inline">Correct</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-institutional-50/70 dark:bg-institutional-950/30 border border-institutional-200/70 dark:border-institutional-900 space-y-2 min-w-0">
                  <div className="text-xs font-extrabold text-institutional-800 dark:text-institutional-300 flex items-center gap-1.5">
                    <HelpCircleIcon size={14} className="shrink-0" />
                    <span>Step-by-step explanation</span>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-charcoal-200 whitespace-pre-line leading-relaxed break-words">
                    {previewQuiz.questions[activeQuestionIndex].solution_explanation ||
                      previewQuiz.questions[activeQuestionIndex].explanation ||
                      'Detailed answer derivation provided in course.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-charcoal-200 dark:border-charcoal-800 gap-2">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 disabled:opacity-30 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeQuestionIndex === previewQuiz.questions.length - 1}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min(previewQuiz.questions.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-institutional-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-institutional-700 transition-colors cursor-pointer"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-charcoal-500">
                Full question set with explanations will be loaded upon course activation.
              </div>
            )}
          </div>
        </div>
      )}

      <RazorpayModal isOpen={checkoutOpen} course={course} order={orderData} onClose={() => setCheckoutOpen(false)} onSuccess={handlePaymentSuccess} />
    </div>
  );
};
