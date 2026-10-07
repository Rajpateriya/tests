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
} from '../components/Icons';

// A course's quizzes split into the two kinds Admin Studio can tag/create:
// drills (embedded questions, answers previewable here) and mock tests (started in the exam room).
const splitQuizzes = (quizzes = []) => ({
  drills: quizzes.filter((q) => q.questions && q.questions.length > 0),
  mockTests: quizzes.filter((q) => !(q.questions && q.questions.length > 0)),
});

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
      .catch(() => {});
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
      <div className="min-h-screen bg-charcoal-50/60 dark:bg-charcoal-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-5 w-40 rounded bg-charcoal-200/60 dark:bg-charcoal-800 animate-pulse" />
          <div className="h-56 rounded-3xl bg-charcoal-200/50 dark:bg-charcoal-900/50 animate-pulse border border-charcoal-200 dark:border-charcoal-800" />
          <div className="h-40 rounded-3xl bg-charcoal-200/50 dark:bg-charcoal-900/50 animate-pulse border border-charcoal-200 dark:border-charcoal-800" />
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-charcoal-50/60 dark:bg-charcoal-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center py-16 bg-white dark:bg-charcoal-900 rounded-3xl border border-charcoal-200 dark:border-charcoal-800 space-y-3">
          <BookOpenIcon size={40} className="mx-auto text-charcoal-400" />
          <h3 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">Could not open this course</h3>
          <p className="text-xs text-charcoal-500">{error}</p>
          <button
            type="button"
            onClick={onBackToCourses}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            Back to {backLabel}
          </button>
        </div>
      </div>
    );
  }

  const { drills, mockTests } = splitQuizzes(course.quizzes);
  const isEnrolled = course.is_enrolled;
  const discountAmt = Math.round(course.original_price - course.discounted_price);
  const coinDiscount = useCoins && userCoins > 0 ? Math.min(userCoins, 100) : 0;

  return (
    <div className="min-h-screen bg-charcoal-50/60 dark:bg-charcoal-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 dark:text-charcoal-400">
          <button
            type="button"
            onClick={onBackToCourses}
            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
          >
            {backLabel}
          </button>
          <ChevronRightIcon size={12} className="text-charcoal-300 dark:text-charcoal-600 shrink-0" />
          <span className="text-charcoal-900 dark:text-charcoal-100 truncate max-w-[24rem]" aria-current="page">
            {course.title}
          </span>
        </nav>

        {enrollMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircleIcon size={20} className="text-emerald-600 dark:text-emerald-400" />
              <span>{enrollMessage}</span>
            </div>
            <button onClick={() => setEnrollMessage(null)} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {course.target_exam}
            </span>
            {course.badge && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {course.badge}
              </span>
            )}
            {isEnrolled && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircleIcon size={12} /> Enrolled
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900 dark:text-white tracking-tight">{course.title}</h1>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-400 mt-1.5">{course.description}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {course.subjects?.map((sub, i) => (
              <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300">
                {sub}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-black text-charcoal-900 dark:text-white font-mono">₹{course.discounted_price}</span>
              <span className="text-sm font-semibold text-charcoal-400 line-through font-mono">₹{course.original_price}</span>
              <span className="text-xs font-black px-2 py-1 rounded-lg bg-emerald-500 text-white">{course.discount_percent}% OFF</span>
            </div>

            {isEnrolled ? (
              <div className="py-2.5 px-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircleIcon size={16} /> Enrolled in Course
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartCheckout}
                disabled={orderLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShieldIcon size={16} />
                <span>{orderLoading ? 'Preparing checkout...' : `Enroll Now — ₹${Math.max(1, course.discounted_price - coinDiscount)}`}</span>
                {coinDiscount > 0 && (
                  <span className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">-₹{coinDiscount} Coins</span>
                )}
              </button>
            )}
          </div>

          {!isEnrolled && userCoins > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-charcoal-700 dark:text-charcoal-300 select-none">
              <input
                type="checkbox"
                checked={useCoins}
                onChange={(e) => setUseCoins(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-charcoal-300"
              />
              <span>Apply GovCoins discount ({userCoins} coins available)</span>
            </label>
          )}
        </div>

        {/* Quizzes */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
            <BookOpenIcon size={18} className="text-blue-500" />
            <span>All Quizzes &amp; Mock Tests ({drills.length + mockTests.length})</span>
          </h2>

          {drills.length === 0 && mockTests.length === 0 && (
            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center text-xs text-charcoal-500">
              No quizzes or mock tests are assigned to this course yet.
            </div>
          )}

          {drills.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
              <div className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span>Subject-Wise Quizzes &amp; Drills ({drills.length})</span>
                <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-semibold">
                  Step-by-Step Solutions
                </span>
              </div>
              <div className="space-y-2">
                {drills.map((quiz, idx) => (
                  <div
                    key={quiz.id || idx}
                    className="group flex items-center gap-4 p-3.5 rounded-xl bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                      <BookOpenIcon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-charcoal-900 dark:text-white truncate">{quiz.title}</div>
                      <div className="flex items-center gap-2.5 text-[11px] text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{quiz.subject}</span>
                        <span className="w-1 h-1 rounded-full bg-charcoal-300 dark:bg-charcoal-700" />
                        <span className="flex items-center gap-1"><BookOpenIcon size={11} />{quiz.total_questions || quiz.questions?.length || 0} Qs</span>
                        <span className="w-1 h-1 rounded-full bg-charcoal-300 dark:bg-charcoal-700" />
                        <span className="flex items-center gap-1"><ClockIcon size={11} />{quiz.duration_minutes || 15} min</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openPreview(quiz)}
                      className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <EyeIcon size={13} />
                      <span>Preview</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mockTests.length > 0 && (
            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 space-y-3">
              <div className="text-xs font-extrabold text-sky-900 dark:text-sky-200 flex items-center justify-between">
                <span>Mock Tests in this Course ({mockTests.length})</span>
                <span className="text-[10px] bg-sky-200/70 dark:bg-sky-900 px-2 py-0.5 rounded text-sky-800 dark:text-sky-200 font-semibold">
                  Full Exam Engine
                </span>
              </div>
              <div className="space-y-2">
                {mockTests.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="group flex items-center gap-4 p-3.5 rounded-xl bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                      <LayersIcon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-charcoal-900 dark:text-white truncate">{t.title}</div>
                      <div className="flex items-center gap-2.5 text-[11px] text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                        <span className="font-semibold text-sky-600 dark:text-sky-400">{t.subject || 'All Subjects'}</span>
                        <span className="w-1 h-1 rounded-full bg-charcoal-300 dark:bg-charcoal-700" />
                        <span className="flex items-center gap-1"><BookOpenIcon size={11} />{t.total_questions} Qs</span>
                        <span className="w-1 h-1 rounded-full bg-charcoal-300 dark:bg-charcoal-700" />
                        <span className="flex items-center gap-1"><ClockIcon size={11} />{t.duration_minutes} min</span>
                        <span className="w-1 h-1 rounded-full bg-charcoal-300 dark:bg-charcoal-700" />
                        <span className="font-mono">
                          <span className="text-emerald-600 dark:text-emerald-400">+{t.positive_marks}</span>/
                          <span className="text-rose-600 dark:text-rose-400">-{t.negative_marks}</span>
                        </span>
                      </div>
                    </div>

                    {isEnrolled ? (
                      <button
                        type="button"
                        onClick={() => onStartTest && onStartTest(t.id)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <span>Start Test</span>
                        <ArrowRightIcon size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartCheckout}
                        className="shrink-0 px-4 py-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex items-center gap-1.5"
                      >
                        <LockIcon size={12} />
                        <span>Enroll to Unlock</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz preview modal (answers + explanation) */}
      {previewQuiz && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewQuiz(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-charcoal-200 dark:border-charcoal-800 pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {course.title} • {previewQuiz.subject}
                </div>
                <h3 className="text-xl font-black text-charcoal-900 dark:text-white">{previewQuiz.title}</h3>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-1 text-charcoal-400 hover:text-charcoal-600 dark:hover:text-charcoal-200 text-lg rounded-full"
              >
                ✕
              </button>
            </div>

            {previewQuiz.questions && previewQuiz.questions.length > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs text-charcoal-500 font-semibold">
                  <span>Question {activeQuestionIndex + 1} of {previewQuiz.questions.length}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Solution Verified
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-sm font-bold text-charcoal-900 dark:text-white leading-relaxed">
                  {previewQuiz.questions[activeQuestionIndex].question_text}
                </div>

                <div className="space-y-2">
                  {previewQuiz.questions[activeQuestionIndex].options?.map((opt) => {
                    const isCorrect = opt.id === previewQuiz.questions[activeQuestionIndex].correct_option;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-charcoal-850 border-charcoal-200 dark:border-charcoal-800 text-charcoal-700 dark:text-charcoal-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircleIcon size={14} /> Correct Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
                  <div className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <HelpCircleIcon size={14} />
                    <span>Step-by-Step Detailed Explanation:</span>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-charcoal-200 whitespace-pre-line leading-relaxed font-sans">
                    {previewQuiz.questions[activeQuestionIndex].solution_explanation ||
                      previewQuiz.questions[activeQuestionIndex].explanation ||
                      'Detailed answer derivation provided in course.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-charcoal-200 dark:border-charcoal-800">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 disabled:opacity-30 hover:bg-charcoal-100 dark:hover:bg-charcoal-800"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeQuestionIndex === previewQuiz.questions.length - 1}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min(previewQuiz.questions.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-blue-700"
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
