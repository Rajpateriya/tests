import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RazorpayModal } from '../components/RazorpayModal';
import {
  SparklesIcon,
  CheckCircleIcon,
  ShieldIcon,
  SearchIcon,
  ClockIcon,
  HelpCircleIcon,
  AwardIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BookOpenIcon,
  RefreshCwIcon,
} from '../components/Icons';

export const CoursesPage = ({ onNavigateToQuiz, onNavigateToDashboard, onStartTest }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoins, setUserCoins] = useState(150);
  const [useCoins, setUseCoins] = useState(true);

  // Expanded subject preview states: map courseId -> boolean / subjectId
  const [expandedQuizzes, setExpandedQuizzes] = useState({});
  const [previewQuiz, setPreviewQuiz] = useState(null); // When user wants to preview questions & explanation modal
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showAnswerExplanation, setShowAnswerExplanation] = useState(false);

  // Razorpay Checkout State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedCourseForCheckout, setSelectedCourseForCheckout] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchUserCoins();
  }, [selectedExam]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.courses.list(selectedExam);
      setCourses(data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCoins = async () => {
    try {
      const profile = await api.auth.getMe();
      if (profile?.profile?.coins_balance !== undefined) {
        setUserCoins(profile.profile.coins_balance);
      }
    } catch {
      // Guest or demo fallback
    }
  };

  // Real-time dynamic course details map (courseId -> CourseDetailOut)
  const [courseDetails, setCourseDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  const toggleExpandCourseQuizzes = async (courseId) => {
    const nextState = !expandedQuizzes[courseId];
    setExpandedQuizzes((prev) => ({
      ...prev,
      [courseId]: nextState,
    }));

    // If expanding, fetch fresh course detail dynamically to ensure real-time quizzes sync
    if (nextState) {
      setLoadingDetails((prev) => ({ ...prev, [courseId]: true }));
      try {
        const detail = await api.courses.getDetail(courseId);
        if (detail) {
          setCourseDetails((prev) => ({ ...prev, [courseId]: detail }));
        }
      } catch (err) {
        console.error('Failed to load dynamic course detail:', err);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [courseId]: false }));
      }
    }
  };

  const openQuizDetailModal = async (course, quiz) => {
    // If the quiz already has populated questions, open preview immediately
    if (quiz.questions && quiz.questions.length > 0) {
      setPreviewQuiz({ ...quiz, courseTitle: course.title });
      setActiveQuestionIndex(0);
      setShowAnswerExplanation(true);
      return;
    }

    // Fetch full course detail to retrieve the questions & solutions
    try {
      const detail = courseDetails[course.id] || (await api.courses.getDetail(course.id));
      if (detail && !courseDetails[course.id]) {
        setCourseDetails((prev) => ({ ...prev, [course.id]: detail }));
      }
      const foundQuiz = detail?.quizzes?.find((q) => q.id === quiz.id || q.title === quiz.title);
      if (foundQuiz && foundQuiz.questions && foundQuiz.questions.length > 0) {
        setPreviewQuiz({ ...foundQuiz, courseTitle: course.title });
      } else {
        setPreviewQuiz({ ...quiz, courseTitle: course.title, questions: foundQuiz?.questions || [] });
      }
      setActiveQuestionIndex(0);
      setShowAnswerExplanation(true);
    } catch (err) {
      setPreviewQuiz({ ...quiz, courseTitle: course.title, questions: [] });
      setActiveQuestionIndex(0);
      setShowAnswerExplanation(true);
    }
  };

  const handleStartCheckout = async (course) => {
    setSelectedCourseForCheckout(course);
    setOrderLoading(true);
    try {
      const order = await api.courses.createOrder(course.id, useCoins);
      setOrderData(order);
      setCheckoutModalOpen(true);
    } catch (err) {
      console.error('Failed to create order:', err);
      // Fallback order for testing
      const disc = course.discounted_price || 499;
      const coinDiscount = useCoins ? Math.min(userCoins, 50, disc - 1) : 0;
      setOrderData({
        order_id: `order_sim_${Date.now()}`,
        amount_rupees: Math.max(1, disc - coinDiscount),
        amount_paise: Math.max(100, (disc - coinDiscount) * 100),
        currency: 'INR',
        key_id: 'rzp_test_prepmagnet2026',
        course_id: course.id,
        course_title: course.title,
        coins_applied: coinDiscount,
        discount_amount: coinDiscount,
        user_coins_available: userCoins,
      });
      setCheckoutModalOpen(true);
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePaymentSuccess = (verifyResult) => {
    setCheckoutModalOpen(false);
    setEnrollSuccessMessage(`You have enrolled in ${selectedCourseForCheckout?.title}! You can now practice all subject-wise quizzes.`);
    // Refresh course list to update enrolled state
    fetchCourses();
    fetchUserCoins();
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.target_exam?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      (c.subjects && c.subjects.some((s) => s.toLowerCase().includes(q)))
    );
  });

  const examCategories = [
    { id: 'All', label: 'All Exams' },
    { id: 'SSC CGL', label: 'SSC CGL Tier 1 & 2' },
    { id: 'RRB NTPC', label: 'RRB NTPC & Railways' },
    { id: 'SSC CHSL', label: 'SSC CHSL (10+2)' },
    { id: 'Banking', label: 'Banking & Insurance' },
  ];

  return (
    <div className="min-h-screen bg-charcoal-50/60 dark:bg-charcoal-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 shadow-sm animate-fade-in">
            <SparklesIcon size={14} />
            <span>Targeted Exam Mastery Courses</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-charcoal-900 dark:text-white tracking-tight">
            Comprehensive Courses With <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Subject-Wise Quizzes</span>
          </h1>

          <p className="text-sm sm:text-base text-charcoal-600 dark:text-charcoal-300">
            Each exam course is custom engineered with subject-specific mock quizzes, complete answer keys, and step-by-step shortcut explanations to boost your score.
          </p>
        </div>

        {/* Success Alert Banner */}
        {enrollSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircleIcon size={20} className="text-emerald-600 dark:text-emerald-400" />
              <span>{enrollSuccessMessage}</span>
            </div>
            <button
              onClick={() => setEnrollSuccessMessage(null)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* GovCoins Discount Perks Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-300/60 dark:border-amber-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-2xl shadow-inner">
              🪙
            </div>
            <div>
              <div className="text-sm font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                <span>GovCoins Balance: <strong className="text-amber-600 dark:text-amber-400">{userCoins} Coins</strong></span>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold">1 Coin = ₹1</span>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                Redeem your daily streak coins for up to ₹100 instant discount on any exam course!
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer bg-white dark:bg-charcoal-900 px-4 py-2 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 shadow-sm text-xs font-bold text-charcoal-800 dark:text-charcoal-200 select-none">
            <input
              type="checkbox"
              checked={useCoins}
              onChange={(e) => setUseCoins(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-charcoal-300"
            />
            <span>Auto-Apply Coins Discount</span>
          </label>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {examCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedExam(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedExam === cat.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-white dark:bg-charcoal-900 text-charcoal-600 dark:text-charcoal-400 border border-charcoal-200 dark:border-charcoal-800 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input and Refresh Button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses or subjects..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCourseDetails({});
                fetchCourses();
              }}
              title="Refresh courses from server"
              className="p-2 rounded-xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-charcoal-600 dark:text-charcoal-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors shadow-sm shrink-0 flex items-center justify-center"
            >
              <RefreshCwIcon size={16} />
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-charcoal-200/50 dark:bg-charcoal-900/50 animate-pulse border border-charcoal-200 dark:border-charcoal-800" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-charcoal-900 rounded-3xl border border-charcoal-200 dark:border-charcoal-800 space-y-3">
            <BookOpenIcon size={40} className="mx-auto text-charcoal-400" />
            <h3 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">No courses found</h3>
            <p className="text-xs text-charcoal-500">Try changing the exam filter or search query</p>
          </div>
        )}

        {/* Courses Grid */}
        {!loading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCourses.map((course) => {
              const isEnrolled = course.is_enrolled;
              const isExpanded = !!expandedQuizzes[course.id];
              const discountAmt = Math.round(course.original_price - course.discounted_price);

              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden group"
                >
                  {/* Top Badge & Exam Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {course.target_exam}
                    </span>

                    {course.badge && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <SparklesIcon size={12} />
                        <span>{course.badge}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-charcoal-900 dark:text-white tracking-tight leading-snug">
                      {course.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-400 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Pricing and Discount Section */}
                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold">Course Price</div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl sm:text-3xl font-black text-charcoal-900 dark:text-white font-mono">
                          ₹{course.discounted_price}
                        </span>
                        <span className="text-sm font-semibold text-charcoal-400 line-through font-mono">
                          ₹{course.original_price}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500 text-white shadow-sm">
                        {course.discount_percent}% OFF
                      </span>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        Save ₹{discountAmt}
                      </div>
                    </div>
                  </div>

                  {/* Included Subjects List & Dynamic Quizzes Preview */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpenIcon size={14} className="text-blue-500" />
                        <span>
                          Subject Coverage & Quizzes (
                          {(courseDetails[course.id]?.quizzes || course.quizzes || []).length || course.total_quizzes} Quizzes Included
                          )
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleExpandCourseQuizzes(course.id)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Quizzes & Answers'}</span>
                        <ChevronDownIcon size={14} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Subject Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {course.subjects?.map((sub, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-1.5 pt-2">
                      {course.features?.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-charcoal-400">
                          <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Real-Time Quizzes & Mock Tests List */}
                  {isExpanded && (() => {
                    const activeQuizzes = courseDetails[course.id]?.quizzes || course.quizzes || [];
                    const drills = activeQuizzes.filter((q) => q.questions && q.questions.length > 0);
                    const mockTests = activeQuizzes.filter((q) => !(q.questions && q.questions.length > 0));
                    const isFetching = loadingDetails[course.id] && !activeQuizzes.length;

                    if (isFetching) {
                      return (
                        <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 animate-pulse text-center text-xs text-charcoal-500">
                          Loading latest quizzes & mock tests from database...
                        </div>
                      );
                    }

                    if (activeQuizzes.length === 0) {
                      return (
                        <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center text-xs text-charcoal-500">
                          No quizzes or mock tests currently assigned to this course.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {/* 1. Subject-wise Drills with Question-by-Question Explanations */}
                        {drills.length > 0 && (
                          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3 animate-fade-in">
                            <div className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                              <span>Subject-Wise Quizzes & Drills ({drills.length})</span>
                              <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-semibold">
                                Step-by-Step Solutions
                              </span>
                            </div>

                            <div className="space-y-2">
                              {drills.map((quiz, idx) => (
                                <div
                                  key={quiz.id || idx}
                                  className="p-3 rounded-xl bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-charcoal-900 dark:text-white truncate">
                                      {quiz.title}
                                    </div>
                                    <div className="text-[10px] text-charcoal-500 dark:text-charcoal-400">
                                      {quiz.subject} • {quiz.total_questions || quiz.questions?.length || 0} Questions • {quiz.duration_minutes || 15} min • Detailed Solutions Included
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openQuizDetailModal(course, quiz)}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors shrink-0 shadow-sm"
                                  >
                                    Preview Answers
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Exam-Room Mock Tests */}
                        {mockTests.length > 0 && (
                          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3 animate-fade-in">
                            <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                              <span>Mock Tests in this Course ({mockTests.length})</span>
                              <span className="text-[10px] bg-indigo-200/70 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-800 dark:text-indigo-200 font-semibold">
                                Full Exam Engine
                              </span>
                            </div>

                            <div className="space-y-2">
                              {mockTests.map((t, idx) => (
                                <div
                                  key={t.id || idx}
                                  className="p-3 rounded-xl bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-charcoal-900 dark:text-white truncate">{t.title}</div>
                                    <div className="text-[10px] text-charcoal-500 dark:text-charcoal-400">
                                      {t.subject || 'All Subjects'} • {t.total_questions} Questions • {t.duration_minutes} min • +{t.positive_marks} / -{t.negative_marks}
                                    </div>
                                  </div>

                                  {isEnrolled ? (
                                    <button
                                      type="button"
                                      onClick={() => onStartTest && onStartTest(t.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition-colors shrink-0 shadow-sm"
                                    >
                                      Start Test
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartCheckout(course)}
                                      className="px-2.5 py-1.5 rounded-lg bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 font-semibold text-[11px] hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 shrink-0 transition-colors"
                                    >
                                      Enroll to Unlock
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Action Buttons: Enroll or Enrolled */}
                  <div className="pt-2">
                    {isEnrolled ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 py-3 px-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                          <CheckCircleIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Enrolled in Course</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpandCourseQuizzes(course.id)}
                          className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>Open Quizzes</span>
                          <ArrowRightIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartCheckout(course)}
                        disabled={orderLoading}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <ShieldIcon size={16} />
                        <span>Enroll Now — ₹{useCoins && userCoins > 0 ? Math.max(1, course.discounted_price - Math.min(userCoins, 100)) : course.discounted_price}</span>
                        {useCoins && userCoins > 0 && (
                          <span className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">
                            -₹{Math.min(userCoins, 100)} Coins Applied
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Subject Quiz Preview with Detailed Answers & Solutions */}
        {previewQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-fade-in" onClick={() => setPreviewQuiz(null)}>
            <div
              className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-charcoal-200 dark:border-charcoal-800 pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {previewQuiz.courseTitle} • {previewQuiz.subject}
                  </div>
                  <h3 className="text-xl font-black text-charcoal-900 dark:text-white">
                    {previewQuiz.title}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewQuiz(null)}
                  className="p-1 text-charcoal-400 hover:text-charcoal-600 dark:hover:text-charcoal-200 text-lg rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Questions Carousel/Viewer */}
              {previewQuiz.questions && previewQuiz.questions.length > 0 ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs text-charcoal-500 font-semibold">
                    <span>Question {activeQuestionIndex + 1} of {previewQuiz.questions.length}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Solution Verified
                    </span>
                  </div>

                  {/* Question Text */}
                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-sm font-bold text-charcoal-900 dark:text-white leading-relaxed">
                    {previewQuiz.questions[activeQuestionIndex].question_text}
                  </div>

                  {/* Options */}
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
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
                            }`}>
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

                  {/* Step-by-Step Detailed Explanation */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
                    <div className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <HelpCircleIcon size={14} />
                      <span>Step-by-Step Detailed Explanation:</span>
                    </div>
                    <p className="text-xs text-charcoal-700 dark:text-charcoal-200 whitespace-pre-line leading-relaxed font-sans">
                      {previewQuiz.questions[activeQuestionIndex].solution_explanation || previewQuiz.questions[activeQuestionIndex].explanation || 'Detailed answer derivation provided in course.'}
                    </p>
                  </div>

                  {/* Pagination Controls */}
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

        {/* Razorpay Checkout Modal */}
        <RazorpayModal
          isOpen={checkoutModalOpen}
          course={selectedCourseForCheckout}
          order={orderData}
          onClose={() => setCheckoutModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />

      </div>
    </div>
  );
};
