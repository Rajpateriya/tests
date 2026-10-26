import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { RazorpayModal } from '../components/RazorpayModal';
import { ROUTES, useOpenCourse } from '../routes';
import { useSEO } from '../hooks/useSEO';
import { FAQSection } from '../components/FAQSection';
import { COURSES_PAGE_FAQS } from '../data/faqs';
import {
  SparklesIcon,
  CheckCircleIcon,
  ShieldIcon,
  SearchIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BookOpenIcon,
  RefreshCwIcon,
  LayersIcon,
  LockIcon,
  EyeIcon,
  PlayIcon,
  CartIcon,
} from '../components/Icons';

const COVER_GRID = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
};
const COVER_GLOW = {
  backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(37, 99, 235, 0.16), transparent 65%)',
};

export const CoursesPage = ({ onStartTest }) => {
  useSEO({
    title: 'Government Exam Courses, Test Series & Topic Quizzes',
    description: 'Browse comprehensive full-length mock test series and subject quizzes for SSC CGL, Banking (IBPS/SBI PO), and Railways (RRB NTPC). With detailed solutions and All-India ranks.',
  });

  const navigate = useNavigate();
  const openCourse = useOpenCourse();
  const { user } = useAuth();
  const { addToCart, isInCart, refreshCart } = useCart();
  const [addingCourseId, setAddingCourseId] = useState(null);
  const [cartNotice, setCartNotice] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examCategories, setExamCategories] = useState([{ id: 'All', label: 'All Exams' }]);
  const [selectedExam, setSelectedExam] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoins, setUserCoins] = useState(0);
  const [useCoins, setUseCoins] = useState(true);

  // Quick-look panel + answer preview
  const [expandedQuizzes, setExpandedQuizzes] = useState({});
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Razorpay Checkout State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedCourseForCheckout, setSelectedCourseForCheckout] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState(null);
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState(null);

  // Real-time dynamic course details map (courseId -> CourseDetailOut)
  const [courseDetails, setCourseDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await api.tests.getFilterOptions();
        const exams = res?.exams || [];
        if (exams.length > 0) {
          setExamCategories([
            { id: 'All', label: 'All Exams' },
            ...exams.map((e) => ({ id: e, label: e })),
          ]);
        }
      } catch (err) {
        console.warn('Failed to load filter options:', err);
      }
    };
    loadExams();
  }, []);

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

  const toggleExpandCourseQuizzes = async (courseId) => {
    const nextState = !expandedQuizzes[courseId];
    setExpandedQuizzes((prev) => ({ ...prev, [courseId]: nextState }));

    // Expanding fetches a fresh course detail so the quiz list is always in sync
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
    } catch {
      setPreviewQuiz({ ...quiz, courseTitle: course.title, questions: [] });
    }
    setActiveQuestionIndex(0);
  };

  const handleStartCheckout = async (course) => {
    setSelectedCourseForCheckout(course);
    setOrderLoading(true);
    setCheckoutErrorMessage(null);
    try {
      const order = await api.courses.createOrder(course.id, useCoins);
      setOrderData(order);
      setCheckoutModalOpen(true);
    } catch (err) {
      console.error('Failed to create course order:', err);
      const msg = err.status === 401
        ? 'Please sign in to enroll in this course.'
        : (err.message || 'Could not initiate Razorpay checkout order. Please check credentials or try again.');
      setCheckoutErrorMessage(msg);
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setCheckoutModalOpen(false);
    setEnrollSuccessMessage(`You have enrolled in ${selectedCourseForCheckout?.title}! You can now practice all subject-wise quizzes.`);
    // Refresh course list to update enrolled state and cart
    fetchCourses();
    fetchUserCoins();
    refreshCart();
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

  return (
    <div className="relative overflow-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 -mb-12 pb-12 font-sans text-charcoal-900 dark:text-charcoal-100">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-7">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 animate-fade-in">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-[1.18] sm:leading-[1.15]">
            Courses built around <span className="text-institutional-600 dark:text-institutional-400">subject-wise quizzes</span>
          </h1>

          <p className="text-xs sm:text-base text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            Pick your exam, preview the answer keys, and enroll — every course ships with full mock tests and step-by-step explanations.
          </p>
        </section>

        {/* Success banner */}
        {enrollSuccessMessage && (
          <div className="max-w-3xl mx-auto px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-subtle animate-fade-in">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <CheckCircleIcon size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{enrollSuccessMessage}</span>
            </div>
            <button
              onClick={() => setEnrollSuccessMessage(null)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Cart notice banner */}
        {cartNotice && (
          <div className="max-w-3xl mx-auto px-4 py-3 rounded-xl bg-institutional-50 dark:bg-institutional-950/50 border border-institutional-300 dark:border-institutional-800 text-institutional-900 dark:text-institutional-100 flex items-center justify-between gap-3 shadow-subtle animate-fade-in">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <CartIcon size={18} className="text-institutional-600 dark:text-institutional-400 shrink-0" />
              <span>{cartNotice}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(ROUTES.cart)}
                className="text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                View Cart →
              </button>
              <button
                onClick={() => setCartNotice(null)}
                className="text-xs font-bold text-charcoal-500 hover:text-charcoal-700 dark:hover:text-charcoal-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {checkoutErrorMessage && (
          <div className="max-w-3xl mx-auto px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between gap-3 shadow-subtle animate-fade-in">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="text-red-600 dark:text-red-400 font-bold shrink-0">✕</span>
              <span>{checkoutErrorMessage}</span>
            </div>
            <button
              onClick={() => setCheckoutErrorMessage(null)}
              className="text-xs font-bold text-red-700 dark:text-red-300 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar: exam tabs · search · refresh · coins */}
        <section className="bg-white/80 dark:bg-charcoal-900/80 backdrop-blur-sm border border-charcoal-200/80 dark:border-charcoal-800/80 rounded-2xl p-3 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold overflow-x-auto scrollbar-none max-w-full">
            {examCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedExam(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all ${selectedExam === cat.id
                  ? 'bg-white dark:bg-charcoal-900 text-institutional-700 dark:text-institutional-300 shadow-sm font-extrabold'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses or subjects..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCourseDetails({});
                  fetchCourses();
                }}
                title="Refresh courses from server"
                className="p-2 rounded-lg bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 hover:text-institutional-600 dark:hover:text-institutional-400 transition-colors shrink-0"
              >
                <RefreshCwIcon size={15} />
              </button>
            </div>

            {/* PrepCoins pill */}
            <label
              className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 pl-3 pr-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none"
              title="100 PrepCoins = ₹10 off. Applied automatically when you enroll."
            >
              <div className="flex items-center gap-1.5">
                <span>🪙</span>
                <span className="font-mono">{userCoins}</span>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">≈ ₹{Math.round(userCoins * 0.1)}</span>
              </div>
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={useCoins}
                  onChange={(e) => setUseCoins(e.target.checked)}
                  className="peer sr-only"
                  aria-label="Apply PrepCoins discount"
                />
                <span className="w-8 h-[18px] rounded-full bg-charcoal-300 dark:bg-charcoal-700 peer-checked:bg-amber-500 transition-colors" />
                <span className="absolute left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[14px]" />
              </span>
            </label>
          </div>
        </section>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-charcoal-200/60 dark:bg-charcoal-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-14 bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 space-y-2.5 shadow-subtle">
            <BookOpenIcon size={36} className="mx-auto text-charcoal-400" />
            <h3 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">No courses found</h3>
            <p className="text-xs text-charcoal-500">Try changing the exam filter or search query</p>
          </div>
        )}

        {/* Courses grid */}
        {!loading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 items-start">
            {filteredCourses.map((course) => {
              const isEnrolled = course.is_enrolled;
              const isExpanded = !!expandedQuizzes[course.id];
              const quizList = courseDetails[course.id]?.quizzes || course.quizzes || [];
              const quizCount = quizList.length || course.total_quizzes || 0;
              const subjects = course.subjects || [];
              const savings = Math.max(0, Math.round(course.original_price - course.discounted_price));

              const maxCoinsUsed = Math.min(userCoins, course.max_coins_discount || 500);
              const coinRupees = useCoins && userCoins > 0 ? Math.round(maxCoinsUsed * 0.1) : 0;
              const finalPrice = coinRupees > 0 ? Math.max(1, course.discounted_price - coinRupees) : course.discounted_price;

              const openDetails = () => openCourse(course.id);
              const isFetchingQuizzes = loadingDetails[course.id] && !quizList.length;

              return (
                <article
                  key={course.id}
                  className="group relative flex flex-col bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl sm:rounded-2xl shadow-subtle overflow-hidden hover:-translate-y-1 hover:shadow-card hover:border-institutional-300 dark:hover:border-institutional-700 transition-all duration-200"
                >
                  {/* Cover strip */}
                  <div className="relative h-12 sm:h-14 px-3 sm:px-4 flex items-center justify-between bg-gradient-to-r from-charcoal-900 via-charcoal-850 to-institutional-950 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-institutional-950 border-b border-charcoal-200/80 dark:border-charcoal-800 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none" style={COVER_GRID} />
                    <div className="absolute inset-0 pointer-events-none" style={COVER_GLOW} />

                    <div className="relative flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-institutional-500/15 text-institutional-200 border border-institutional-500/30 backdrop-blur-sm truncate shadow-2xs">
                        {course.target_exam}
                      </span>
                      {course.badge && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate shadow-2xs">
                          <SparklesIcon size={10} />
                          <span className="truncate">{course.badge}</span>
                        </span>
                      )}
                    </div>

                    {isEnrolled ? (
                      <span className="relative inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 shadow-2xs">
                        <CheckCircleIcon size={12} />
                        Enrolled
                      </span>
                    ) : (
                      <span className="relative text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 shadow-2xs">
                        -{course.discount_percent}%
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-3.5 sm:p-5 space-y-2.5 sm:space-y-3.5">
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="min-h-[2.5rem] sm:min-h-[2.75rem]">
                        <h3
                          onClick={openDetails}
                          className="text-sm sm:text-base font-extrabold tracking-tight leading-snug text-charcoal-900 dark:text-white line-clamp-2 group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors cursor-pointer"
                        >
                          {course.title}
                        </h3>
                      </div>
                      <div className="min-h-[2.25rem] sm:min-h-[2.5rem]">
                        <p className="text-[11px] sm:text-xs text-charcoal-500 dark:text-charcoal-400 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      </div>
                    </div>

                    {/* Stat strip */}
                    <div className="grid grid-cols-3 divide-x divide-charcoal-200 dark:divide-charcoal-800 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 py-2">
                      <div className="text-center px-1">
                        <div className="flex items-center justify-center gap-1 text-sm font-extrabold font-mono text-charcoal-900 dark:text-white">
                          <LayersIcon size={12} className="text-institutional-500" />
                          {quizCount}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500">Quizzes</div>
                      </div>
                      <div className="text-center px-1">
                        <div className="flex items-center justify-center gap-1 text-sm font-extrabold font-mono text-charcoal-900 dark:text-white">
                          <BookOpenIcon size={12} className="text-institutional-500" />
                          {subjects.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500">Subjects</div>
                      </div>
                      <div className="text-center px-1">
                        <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">₹{savings}</div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500">You save</div>
                      </div>
                    </div>

                    {/* Subject pills */}
                    {/* Always one row (long names are shortened, the rest fold into "+N"), so every card is the same height */}
                    <div className="flex flex-nowrap items-center gap-1.5 min-w-0 min-h-[1.625rem]">
                      {subjects.slice(0, 2).map((sub, i) => (
                        <span
                          key={i}
                          title={sub}
                          className="min-w-0 truncate text-[11px] font-semibold px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700"
                        >
                          {sub}
                        </span>
                      ))}
                      {subjects.length > 2 && (
                        <span
                          title={subjects.slice(2).join(', ')}
                          className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200/60 dark:border-institutional-800/40"
                        >
                          +{subjects.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Quick look toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpandCourseQuizzes(course.id)}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-charcoal-50 dark:bg-charcoal-850 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 border border-charcoal-150 dark:border-charcoal-800 text-[11px] font-bold text-institutional-600 dark:text-institutional-400 transition-all cursor-pointer group/ql"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <EyeIcon size={13} className="text-institutional-500" />
                        <span>{isExpanded ? 'Hide quick look' : 'Quick look · preview quizzes & answers'}</span>
                      </span>
                      <ChevronDownIcon size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'group-hover/ql:translate-y-0.5'}`} />
                    </button>

                    {/* Quick look panel — scrolls inside the card so it never grows tall */}
                    {isExpanded && (
                      <div className="rounded-xl border border-institutional-200/70 dark:border-institutional-900/60 bg-institutional-50/50 dark:bg-institutional-950/20 p-2 max-h-52 overflow-y-auto space-y-1.5 animate-fade-in">
                        {isFetchingQuizzes ? (
                          <div className="py-4 text-center text-xs text-charcoal-500 animate-pulse">Loading latest quizzes…</div>
                        ) : quizList.length === 0 ? (
                          <div className="py-4 text-center text-xs text-charcoal-500">No quizzes or mock tests assigned yet.</div>
                        ) : (
                          quizList.map((quiz, idx) => {
                            const isDrill = quiz.questions && quiz.questions.length > 0;
                            const qCount = quiz.total_questions || quiz.questions?.length || 0;
                            return (
                              <div
                                key={quiz.id || idx}
                                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-charcoal-900 dark:text-white truncate">{quiz.title}</div>
                                  <div className="text-[10px] text-charcoal-500 dark:text-charcoal-400 truncate">
                                    {isDrill ? 'Drill' : 'Mock'} · {quiz.subject || 'All subjects'} · {qCount} Qs · {quiz.duration_minutes || 15} min
                                  </div>
                                </div>

                                {isDrill ? (
                                  <button
                                    type="button"
                                    onClick={() => openQuizDetailModal(course, quiz)}
                                    className="px-2.5 py-1 rounded-md bg-institutional-600 hover:bg-institutional-700 text-white text-[11px] font-bold shrink-0 transition-colors"
                                  >
                                    Preview
                                  </button>
                                ) : isEnrolled ? (
                                  <button
                                    type="button"
                                    onClick={() => onStartTest && onStartTest(quiz)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                                  >
                                    <PlayIcon size={10} />
                                    Start
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleStartCheckout(course)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 text-[11px] font-semibold shrink-0 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 hover:text-institutional-700 transition-colors"
                                  >
                                    <LockIcon size={10} />
                                    Unlock
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer: price, details & actions */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-charcoal-150 dark:border-charcoal-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {isEnrolled ? (
                        <div className="min-w-0 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircleIcon size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate">
                            {course.access_source === 'PASS' ? `Included in ${course.pass_title || 'Active Pass'}` : 'You own this course'}
                          </span>
                        </div>
                      ) : (
                        <div className="font-mono leading-tight">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-charcoal-900 dark:text-white">₹{finalPrice}</span>
                            <span className="text-xs text-charcoal-400 line-through">₹{course.original_price}</span>
                          </div>
                          {coinRupees > 0 && (
                            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              incl. −₹{coinRupees} coins
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={openDetails}
                        className="inline-flex items-center gap-1 text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-300 transition-colors cursor-pointer group/link shrink-0 py-1"
                        title="View full course syllabus and test list"
                      >
                        <span>View Details</span>
                        <ChevronRightIcon size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {isEnrolled ? (
                      <button
                        type="button"
                        onClick={openDetails}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-institutional-600 hover:bg-institutional-700 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        <span>Open Course</span>
                        <ArrowRightIcon size={14} />
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {isInCart(course.id) ? (
                          <button
                            type="button"
                            onClick={() => navigate(ROUTES.cart)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Already in cart — Click to view cart"
                          >
                            <CheckCircleIcon size={14} className="text-emerald-600" />
                            <span>In Cart</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!user) {
                                navigate(ROUTES.cart);
                                return;
                              }
                              setAddingCourseId(course.id);
                              try {
                                await addToCart(course.id);
                                setCartNotice(`Added "${course.title}" to cart!`);
                              } catch (err) {
                                setCheckoutErrorMessage(err.message || 'Could not add to cart');
                              } finally {
                                setAddingCourseId(null);
                              }
                            }}
                            disabled={addingCourseId === course.id}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:border-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-850 transition-colors cursor-pointer"
                            title="Add to multi-course checkout cart"
                          >
                            <CartIcon size={14} />
                            <span>{addingCourseId === course.id ? 'Adding...' : 'Add to Cart'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartCheckout(course)}
                          disabled={orderLoading}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-institutional-600 hover:bg-institutional-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-70 cursor-pointer"
                        >
                          <ShieldIcon size={13} />
                          <span>Enroll Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Courses & Test Series FAQ Section */}
        <FAQSection
          id="courses-faq"
          title="Have questions about courses?"
          subtitle="Here are answers to the most commonly asked ones about test series packages, attempts, and derivations."
          tag="Courses FAQ"
          faqs={COURSES_PAGE_FAQS}
          className="mt-12 sm:mt-16"
        />
      </main>

      {/* Answer preview modal */}
      {previewQuiz && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewQuiz(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-charcoal-200 dark:border-charcoal-800 pb-4">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-institutional-600 dark:text-institutional-400 truncate">
                  {previewQuiz.courseTitle} • {previewQuiz.subject}
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-charcoal-900 dark:text-white">{previewQuiz.title}</h3>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-1 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 text-lg rounded-full shrink-0"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            {previewQuiz.questions && previewQuiz.questions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-charcoal-500 font-semibold">
                  <span>
                    Question {activeQuestionIndex + 1} of {previewQuiz.questions.length}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Solution Verified
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-sm font-bold text-charcoal-900 dark:text-white leading-relaxed">
                  {previewQuiz.questions[activeQuestionIndex].question_text}
                </div>

                <div className="space-y-2">
                  {previewQuiz.questions[activeQuestionIndex].options?.map((opt) => {
                    const isCorrect = opt.id === previewQuiz.questions[activeQuestionIndex].correct_option;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-charcoal-850 border-charcoal-200 dark:border-charcoal-800 text-charcoal-700 dark:text-charcoal-300'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
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

                <div className="p-4 rounded-xl bg-institutional-50/70 dark:bg-institutional-950/30 border border-institutional-200/70 dark:border-institutional-900 space-y-2">
                  <div className="text-xs font-extrabold text-institutional-800 dark:text-institutional-300 flex items-center gap-1.5">
                    <HelpCircleIcon size={14} />
                    <span>Step-by-step explanation</span>
                  </div>
                  <p className="text-xs text-charcoal-700 dark:text-charcoal-200 whitespace-pre-line leading-relaxed">
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
                    className="px-3.5 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 disabled:opacity-30 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIndex === previewQuiz.questions.length - 1}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min(previewQuiz.questions.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-institutional-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-institutional-700 transition-colors"
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

      {/* Razorpay checkout modal */}
      <RazorpayModal
        isOpen={checkoutModalOpen}
        course={selectedCourseForCheckout}
        order={orderData}
        onClose={() => setCheckoutModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
