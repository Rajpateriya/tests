import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ROUTES, DASHBOARD_TABS, useOpenCourse } from '../routes';
import {
  TrophyIcon,
  TargetIcon,
  BarChart3Icon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldIcon,
  FlameIcon,
  PlayIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FilterIcon,
  StarIcon,
  CameraIcon,
  ZapIcon,
  CrownIcon,
  LayersIcon,
  AwardIcon,
  HelpCircleIcon,
  RefreshCwIcon,
  MessageSquareIcon,
  LockIcon,
  SearchIcon,
  XIcon,
} from '../components/Icons';
import { AnalyticsDashboardView } from '../components/AnalyticsDashboardView';

/**
 * Competitive Mock Test Platform — Executive Student Dashboard & Learning Hub
 * Architected with:
 * 1. Streamlined Aspirant Command Header (no collision with floating navbar).
 * 2. Executive KPI Bento Grid (AIR, Net Accuracy, Avg Speed, Consistency Streak).
 * 3. Segmented Anti-Clutter Navigation Tabs:
 *    - 🎯 Today's Mission & Focus (Daily Challenge, Habit Tracker, Quick Drills)
 *    - 📊 Analytics & Mastery (Subject Accuracy, TCS iON Marking, Scorecards)
 *    - 📚 Enrolled Courses & Quizzes (Subject practice with derivations)
 *    - ⌨️ Typing Master (DEST & CHSL cutoff benchmarks)
 *    - 📝 Mock Test Library (Full tests, Sectionals, Topic drills)
 * 4. 30-Day Discipline Roadmap Modal (Full view on demand, keeping screen clutter-free).
 * 5. High-contrast typography & rock-solid theme fidelity in both Light & Dark modes.
 */
export const StudentDashboardPage = ({ onSelectAttempt, onStartTest }) => {
  const { user, updateCoins, updateProfile } = useAuth();
  const navigate = useNavigate();
  const openCourse = useOpenCourse();
  const { tab } = useParams();
  const [searchParams] = useSearchParams();

  // Active tab is the address itself: /dashboard/<tab> ('mission' | 'analytics' | 'courses' | 'typing' | 'mocks' | 'support').
  // Every switch is a history entry, so back/forward moves between tabs and a shared link opens that tab.
  const activeTab = DASHBOARD_TABS.includes(tab) ? tab : DASHBOARD_TABS[0];
  const setActiveTab = (next) => {
    if (next !== activeTab) navigate(`${ROUTES.dashboard}/${next}`);
  };

  // Avatar upload state & feedback
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarToast, setAvatarToast] = useState(null);

  // 30-Day Roadmap Modal State
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);

  // General Dashboard & Test Data
  const [dashboard, setDashboard] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [exploreCourses, setExploreCourses] = useState([]);
  const [typingStats, setTypingStats] = useState(null);
  const [activeCourseModal, setActiveCourseModal] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'RESOLVED'
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  // A ticket opened straight from a notification (?ticket=<id>): scrolled to and highlighted once loaded.
  const highlightTicketId = searchParams.get('ticket');
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(0);
  const [activeQuizQuestionIdx, setActiveQuizQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(true);

  // Pro User & Pass Status
  const isProUser = Boolean(
    user?.profile?.is_pro ||
    user?.profile?.tags?.includes('PRO USER') ||
    (user?.profile?.subscription_status === 'ACTIVE' && user?.profile?.subscription_plan && user?.profile?.subscription_plan !== 'FREE')
  );

  // Single Daily Question Challenge State
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isDailyCompleted, setIsDailyCompleted] = useState(false);
  const [dailyReward, setDailyReward] = useState(null);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [questionLoading, setQuestionLoading] = useState(false);

  // Free Practice On-Demand Question State
  const [isFreePracticeActive, setIsFreePracticeActive] = useState(false);
  const [practiceDifficulty, setPracticeDifficulty] = useState('Medium');
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState(null);
  const [practiceVerification, setPracticeVerification] = useState(null);

  // Only what every tab needs (the streak/coins header, shown no matter which tab is open) loads
  // up front. Each tab below loads its own data the first time it is opened.
  // Keyed on the user's id, not the whole user object: a profile photo or coins update replaces that
  // object, and re-running this would flash the full-page loading screen (and refetch) each time.
  useEffect(() => {
    loadStreakAndHeader();
  }, [user?.id]);

  // Question Timer
  useEffect(() => {
    let interval = null;
    if (!isDailyCompleted && !verificationResult && dailyQuestion) {
      interval = setInterval(() => {
        setQuestionTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDailyCompleted, verificationResult, dailyQuestion]);

  // The streak/coins header and the single daily question load once up front.
  // Exactly 1 question is permitted per day. If already attempted, isDailyCompleted is true and no question is loaded.
  const loadStreakAndHeader = async () => {
    setLoading(true);
    try {
      const [streakRes, dashRes] = await Promise.allSettled([
        api.streak.getStreak(),
        user?.id ? api.users.getDashboard(user.id) : Promise.resolve(null),
      ]);
      if (streakRes.status === 'fulfilled') setStreakData(streakRes.value);
      if (dashRes.status === 'fulfilled' && dashRes.value) setDashboard(dashRes.value);

      const streakVal = streakRes.status === 'fulfilled' ? streakRes.value : null;
      const todayStr = new Date().toISOString().slice(0, 10);
      const cacheKey = `prepmagnet_daily_${user?.id || 'user'}_${todayStr}`;
      const cachedToday = localStorage.getItem(cacheKey);

      if (streakVal?.today_completed || cachedToday) {
        setIsDailyCompleted(true);
        if (cachedToday) {
          try {
            const parsed = JSON.parse(cachedToday);
            if (parsed.question) setDailyQuestion(parsed.question);
            if (parsed.selectedOption) setSelectedOption(parsed.selectedOption);
            if (parsed.verificationResult) setVerificationResult(parsed.verificationResult);
            if (parsed.reward) setDailyReward(parsed.reward);
            if (parsed.questionTimer) setQuestionTimer(parsed.questionTimer);
          } catch (e) {}
        }
      } else {
        await loadDailyQuestion();
      }
    } catch (err) {
      console.warn('Dashboard header data fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    setEnrolledLoading(true);
    try {
      const res = await api.courses.getMyEnrollments();
      setEnrolledCourses(res || []);
    } catch (err) {
      console.warn('Failed to refresh enrolled courses:', err);
    } finally {
      setEnrolledLoading(false);
    }
  };

  // Each tab fetches its own data the first time it is opened, not when the dashboard loads.
  const analyticsLoaded = useRef(false);
  const coursesLoaded = useRef(false);
  const typingLoaded = useRef(false);
  const mocksLoaded = useRef(false);
  const supportLoaded = useRef(false);
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsLoaded.current && user?.id) {
      analyticsLoaded.current = true;
      api.users
        .getDashboard(user.id)
        .then(setDashboard)
        .catch((err) => console.warn('Failed to load analytics:', err));
      fetchEnrolledCourses();
    }
    if (activeTab === 'courses' && !coursesLoaded.current) {
      coursesLoaded.current = true;
      fetchEnrolledCourses();
      api.courses
        .list()
        .then((res) => setExploreCourses(res || []))
        .catch((err) => console.warn('Failed to load explore courses:', err));
    }
    if (activeTab === 'typing' && !typingLoaded.current) {
      typingLoaded.current = true;
      api.typing
        .getMyHistory()
        .then((res) => setTypingStats(res || null))
        .catch((err) => console.warn('Failed to load typing stats:', err));
    }
    if (activeTab === 'mocks' && !mocksLoaded.current) {
      mocksLoaded.current = true;
      api.tests
        .list({ is_free: true }) // this catalog only ever shows free tests
        .then((res) => setAvailableTests(res || []))
        .catch((err) => console.warn('Failed to load mock tests:', err));
    }
    if (activeTab === 'support' && !supportLoaded.current) {
      supportLoaded.current = true;
      fetchMyTickets();
    }
  }, [activeTab]);

  // Opened from a notification: once that ticket is in the loaded list, scroll it into view.
  useEffect(() => {
    if (activeTab !== 'support' || !highlightTicketId || myTickets.length === 0) return;
    const target = myTickets.find((t) => t.id === highlightTicketId);
    if (target) {
      const isResolved = target.status === 'RESOLVED' || target.status === 'CLOSED';
      if ((ticketStatusFilter === 'ACTIVE' && isResolved) || (ticketStatusFilter === 'RESOLVED' && !isResolved)) {
        setTicketStatusFilter('ALL');
      }
    }
    const timer = setTimeout(() => {
      const el = document.getElementById(`ticket-row-${highlightTicketId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab, highlightTicketId, myTickets]);

  const fetchMyTickets = async () => {
    setMyTicketsLoading(true);
    try {
      setMyTickets(await api.support.getMyTickets());
    } catch (err) {
      console.warn('Failed to load my tickets:', err);
    } finally {
      setMyTicketsLoading(false);
    }
  };

  const loadDailyQuestion = async () => {
    setQuestionLoading(true);
    try {
      const questions = await api.streak.getDailyBoosterQuestions({ count: 1 });
      if (questions && questions.length > 0) {
        setDailyQuestion(questions[0]);
        setSelectedOption(null);
        setVerificationResult(null);
        setQuestionTimer(0);
      }
    } catch (err) {
      console.error('Failed to load daily question:', err);
    } finally {
      setQuestionLoading(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarToast({ type: 'error', message: 'Image size should be less than 5MB.' });
      setTimeout(() => setAvatarToast(null), 3500);
      return;
    }

    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 256;
            let width = img.width;
            let height = img.height;

            const minDim = Math.min(width, height);
            const startX = (width - minDim) / 2;
            const startY = (height - minDim) / 2;

            canvas.width = maxDim;
            canvas.height = maxDim;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            await updateProfile({ avatar_url: compressedBase64 });
            setAvatarToast({ type: 'success', message: 'Profile photo updated!' });
            setTimeout(() => setAvatarToast(null), 3000);
          } catch (updateErr) {
            console.error('Failed to save profile picture:', updateErr);
            setAvatarToast({ type: 'error', message: 'Failed to save photo.' });
          } finally {
            setAvatarUploading(false);
          }
        };
        img.onerror = () => {
          setAvatarToast({ type: 'error', message: 'Failed to process image.' });
          setAvatarUploading(false);
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarToast({ type: 'error', message: 'Failed to upload photo.' });
      setAvatarUploading(false);
    }
  };

  // Submit & Verify the single daily question (Exactly 1 allowed per day)
  const handleVerifyAnswer = async () => {
    if (!selectedOption || !dailyQuestion || isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await api.streak.verifyQuizAnswer({
        question_id: dailyQuestion.id,
        selected_option: selectedOption,
      });
      setVerificationResult(res);

      const rewardRes = await api.streak.solveDailyQuiz({
        correct_count: res.is_correct ? 1 : 0,
        total_count: 1,
      });
      setDailyReward(rewardRes);

      if (rewardRes?.coins_balance !== undefined) {
        updateCoins(rewardRes.coins_balance);
      }
      const updatedStreak = await api.streak.getStreak();
      setStreakData(updatedStreak);
      setIsDailyCompleted(true);

      // Cache today's attempt so the review and permanent banner stay persistent across refreshes
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const cacheKey = `prepmagnet_daily_${user?.id || 'user'}_${todayStr}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          question: dailyQuestion,
          selectedOption,
          verificationResult: res,
          reward: rewardRes,
          questionTimer,
        }));
      } catch (e) {}
    } catch (err) {
      console.error('Daily answer verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Free Practice Handlers
  const handleStartFreePractice = async (diff = practiceDifficulty) => {
    setIsFreePracticeActive(true);
    setPracticeLoading(true);
    setPracticeSelectedOption(null);
    setPracticeVerification(null);
    try {
      const qs = await api.streak.getDailyBoosterQuestions({ count: 1, difficulty: diff });
      if (qs && qs.length > 0) {
        setPracticeQuestion(qs[0]);
      }
    } catch (err) {
      console.error('Free practice question fetch error:', err);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleVerifyPracticeAnswer = async () => {
    if (!practiceSelectedOption || !practiceQuestion) return;
    setPracticeLoading(true);
    try {
      const res = await api.streak.verifyQuizAnswer({
        question_id: practiceQuestion.id,
        selected_option: practiceSelectedOption,
      });
      setPracticeVerification(res);
    } catch (err) {
      console.error('Practice answer verification failed:', err);
    } finally {
      setPracticeLoading(false);
    }
  };

  // The server already sends only free tests (?is_free=true); this just narrows by type.
  const filteredTests = availableTests.filter((test) => {
    if (selectedFilter === 'ALL') return true;
    return test.test_type === selectedFilter;
  });

  const getDifficultyBadge = (difficulty = 'MEDIUM') => {
    const diff = (difficulty || 'MEDIUM').toUpperCase();
    if (diff === 'EASY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Easy
        </span>
      );
    }
    if (diff === 'HARD') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Hard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Medium
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-institutional-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100">
          Syncing Aspirant Command Center...
        </h2>
        <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
          Calibrating exam readiness scores and active question bank...
        </p>
      </div>
    );
  }

  const streakDays = streakData?.current_streak ?? user?.profile?.current_streak ?? 0;
  const coinsBalance = user?.profile?.coins_balance ?? streakData?.coins_balance ?? 0;

  // 30-Day Timeline Generator for Habit Roadmap
  const timelineList = (streakData?.timeline && streakData.timeline.length === 30)
    ? streakData.timeline
    : Array.from({ length: 30 }, (_, idx) => {
        const d = idx + 1;
        const isDone = d <= streakDays;
        const isToday = d === (streakDays + 1) && !isDailyCompleted;
        const isMilestone = [7, 15, 30].includes(d);
        const milestoneRewards = { 7: 20, 15: 40, 30: 100 };
        const milestoneTitles = {
          7: 'Week 1 Habit Champion (+20 Coins)',
          15: 'Fortnight Mastery (+40 Coins)',
          30: 'Monthly Exam Grand Master (+100 Coins)',
        };
        const milestoneBadges = {
          7: 'BRONZE',
          15: 'SILVER',
          30: 'GOLD',
        };
        return {
          day_number: d,
          label: `Day ${d}`,
          completed: isDone,
          is_current: isToday,
          coins_reward: isMilestone ? milestoneRewards[d] : 5,
          is_milestone: isMilestone,
          milestone_title: isMilestone ? milestoneTitles[d] : null,
          milestone_badge: isMilestone ? milestoneBadges[d] : null,
        };
      });

  const nextMilestone = timelineList.find((s) => s.is_milestone && !s.completed);
  const currentWeekDays = timelineList.slice(0, 7);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* =========================================================================
          1. ASPIRANT COMMAND HUB (Non-sticky, clean, executive elevation)
          ========================================================================= */}
      <section className="relative rounded-3xl border border-charcoal-200/80 dark:border-charcoal-800 bg-white dark:bg-charcoal-900/95 backdrop-blur-xl p-5 sm:p-6 shadow-sm overflow-hidden">
        {/* Subtle Ambient Decorative Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Aspirant Identity & Exam Goals */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            {/* Avatar with Camera Hover */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-institutional-600 via-indigo-600 to-amber-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-white dark:bg-charcoal-900 rounded-[14px] flex items-center justify-center font-extrabold text-2xl text-institutional-600 dark:text-institutional-400 overflow-hidden relative">
                  {user?.profile?.avatar_url ? (
                    <img
                      src={user.profile.avatar_url}
                      alt={user?.full_name || 'Aspirant Avatar'}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <span>{user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}</span>
                  )}

                  {/* Camera Hover Overlay */}
                  <label
                    htmlFor="aspirant-avatar-upload"
                    className="absolute inset-0 bg-charcoal-950/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer select-none"
                    title="Change Profile Photo"
                  >
                    <CameraIcon size={16} />
                    <span className="text-[10px] font-bold mt-0.5">Edit</span>
                  </label>

                  {/* Upload Spinner */}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-charcoal-950/80 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Camera Badge */}
              <label
                htmlFor="aspirant-avatar-upload"
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-institutional-600 hover:bg-institutional-700 text-white border-2 border-white dark:border-charcoal-900 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
                title="Upload Photo"
              >
                <CameraIcon size={11} />
              </label>

              <input
                id="aspirant-avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
            </div>

            {/* Candidate Metadata */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 dark:text-white tracking-tight break-words">
                  {user?.full_name || 'Alex Aspirant'}
                </h1>

                {/* Pro User Crown Badge */}
                {isProUser && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/50 shadow-xs animate-scale-in">
                    <CrownIcon size={13} className="text-amber-500 fill-amber-500" />
                    <span>PRO USER</span>
                  </span>
                )}

                {/* Verified Aspirant Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-institutional-50 text-institutional-700 dark:bg-institutional-950/80 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                  <ShieldIcon size={12} className="text-institutional-600" />
                  <span>{user?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED ASPIRANT'}</span>
                </span>
              </div>

              {/* Profile Tags Row */}
              {user?.profile?.tags && user.profile.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {user.profile.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        tag === 'PRO USER'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-400/60 shadow-2xs'
                          : 'bg-institutional-100 dark:bg-institutional-950/80 text-institutional-800 dark:text-institutional-300 border border-institutional-300/60 dark:border-institutional-800'
                      }`}
                    >
                      {tag === 'PRO USER' ? <CrownIcon size={11} className="text-amber-500 fill-amber-500" /> : <ShieldIcon size={11} />}
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Target Exam Chips & Countdown */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                {user?.profile?.target_exams && user.profile.target_exams.length > 0 ? (
                  user.profile.target_exams.map((exam) => (
                    <span
                      key={exam}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-semibold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700"
                    >
                      <TargetIcon size={12} className="text-amber-500" />
                      <span>{exam}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-semibold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700">
                    <TargetIcon size={12} className="text-institutional-500" />
                    <span>General Aspirant</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <ClockIcon size={12} className="text-amber-600" />
                  <span>Daily Practice Active</span>
                </span>
              </div>

              {/* Email & Feedback Toast */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400">
                <span className="truncate">{user?.email || ''}</span>
                {avatarToast && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      avatarToast.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {avatarToast.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Wallet & Quick Action Center */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* GovCoins Wallet Card */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-charcoal-900 dark:text-white shadow-xs">
              <span className="text-2xl shrink-0">🪙</span>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight leading-tight flex items-center gap-1.5">
                  <span className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">{coinsBalance}</span>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">GovCoins</span>
                </div>
                <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium truncate">
                  = ₹{(coinsBalance * 0.10).toFixed(1)} exam discount (100 coins = ₹10)
                </div>
              </div>
            </div>

            {/* Redeem CTA */}
            <button
              onClick={() => navigate(ROUTES.courses)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold rounded-2xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <SparklesIcon size={14} />
              <span>Redeem on Courses</span>
              <ArrowRightIcon size={12} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. EXECUTIVE KPI BENTO GRID (4 High-Impact Pillars) - Responsive 2x2 Mobile Grid
          ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: All India Rank */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col justify-between sm:flex-row sm:items-center gap-2 sm:gap-4 hover:border-institutional-400 transition-colors">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider truncate">
              Predicted AIR
            </div>
            {dashboard?.total_mocks_attempted > 0 && dashboard?.global_rank > 0 ? (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 flex items-baseline gap-1 font-mono">
                  <span>#{dashboard.global_rank}</span>
                  <span className="text-[10px] sm:text-xs font-normal text-charcoal-400 truncate">/ {(dashboard.total_candidates || 1).toLocaleString()}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 sm:mt-1 flex items-center gap-1 truncate">
                  <span>Top {Math.max(0.1, (100 - (dashboard.overall_percentile || 0))).toFixed(1)}%</span>
                  <span className="text-charcoal-400 font-normal hidden sm:inline">
                    {dashboard.overall_percentile >= 75 ? '(Safe Cutoff)' : '(Competitive)'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 flex items-baseline gap-1 font-mono">
                  <span className="text-charcoal-400">—</span>
                  <span className="text-[10px] sm:text-xs font-normal text-charcoal-400 truncate">
                    {dashboard?.total_candidates ? `/ ${dashboard.total_candidates.toLocaleString()}` : ''}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-charcoal-400 font-medium mt-0.5 sm:mt-1 truncate">
                  Take mock to rank
                </div>
              </>
            )}
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 self-end sm:self-center">
            <TrophyIcon size={16} className="sm:hidden" />
            <TrophyIcon size={20} className="hidden sm:block" />
          </div>
        </div>

        {/* Card 2: Net Mock Accuracy */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col justify-between sm:flex-row sm:items-center gap-2 sm:gap-4 hover:border-emerald-400 transition-colors">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider truncate">
              Net Accuracy
            </div>
            {dashboard?.total_mocks_attempted > 0 ? (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 font-mono">
                  {(dashboard.average_accuracy || 0).toFixed(1)}%
                </div>
                <div className="text-[10px] sm:text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium mt-0.5 sm:mt-1 truncate">
                  {dashboard.total_mocks_attempted} {dashboard.total_mocks_attempted === 1 ? 'mock' : 'mocks'} taken
                </div>
              </>
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 font-mono text-charcoal-400">
                  0.0%
                </div>
                <div className="text-[10px] sm:text-[11px] text-charcoal-400 font-medium mt-0.5 sm:mt-1 truncate">
                  No mocks taken yet
                </div>
              </>
            )}
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 self-end sm:self-center">
            <TargetIcon size={16} className="sm:hidden" />
            <TargetIcon size={20} className="hidden sm:block" />
          </div>
        </div>

        {/* Card 3: Avg Speed per Question */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col justify-between sm:flex-row sm:items-center gap-2 sm:gap-4 hover:border-amber-400 transition-colors">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider truncate">
              Avg Speed / Q
            </div>
            {dashboard?.total_mocks_attempted > 0 && dashboard?.avg_speed_seconds > 0 ? (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 font-mono truncate">
                  {Math.round(dashboard.avg_speed_seconds)}s <span className="text-[10px] sm:text-xs font-normal text-charcoal-400">/ Q</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 sm:mt-1 truncate">
                  {dashboard.avg_speed_seconds <= 60
                    ? `⚡ ${Math.round(60 - dashboard.avg_speed_seconds)}s fast`
                    : `⚠️ ${Math.round(dashboard.avg_speed_seconds - 60)}s slow`}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-black text-charcoal-900 dark:text-white mt-0.5 sm:mt-1 font-mono text-charcoal-400">
                  — <span className="text-[10px] sm:text-xs font-normal text-charcoal-400">/ Q</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-charcoal-400 font-medium mt-0.5 sm:mt-1 truncate">
                  Target: 60s / Q
                </div>
              </>
            )}
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 self-end sm:self-center">
            <ClockIcon size={16} className="sm:hidden" />
            <ClockIcon size={20} className="hidden sm:block" />
          </div>
        </div>

        {/* Card 4: Daily Discipline Streak */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col justify-between sm:flex-row sm:items-center gap-2 sm:gap-4 hover:border-orange-400 transition-colors">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider truncate">
              Streak
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 font-mono flex items-center gap-1">
              <span>{streakDays} Days</span>
              <span className="text-base sm:text-xl">🔥</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 truncate">
              {isDailyCompleted ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Goal done ✓</span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Solve daily ⚡</span>
              )}
            </div>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 self-end sm:self-center">
            <FlameIcon size={16} className="sm:hidden" />
            <FlameIcon size={20} className="hidden sm:block" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SEGMENTED ANTI-CLUTTER NAVIGATION TABS
          ========================================================================= */}
      <section className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 bg-charcoal-100/80 dark:bg-charcoal-900/80 border border-charcoal-200/60 dark:border-charcoal-800 rounded-2xl scrollbar-none">
        {[
          { id: 'mission', label: "Today's Mission", icon: TargetIcon, badge: isDailyCompleted ? 'Done ✓' : 'Active ⚡' },
          { id: 'analytics', label: 'Analytics & Mastery', icon: BarChart3Icon },
          // From the signed-in user's own profile (already in context), not the tab's lazy-loaded list.
          { id: 'courses', label: 'My Enrolled Courses', icon: BookOpenIcon, count: (user?.profile?.enrolled_courses || []).length },
          { id: 'typing', label: 'Typing Master', icon: ZapIcon },
          { id: 'mocks', label: 'Mock Test Catalog', icon: LayersIcon },
          { id: 'support', label: 'My Tickets', icon: MessageSquareIcon, count: myTickets.length || undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-charcoal-800 text-charcoal-950 dark:text-white shadow-sm ring-1 ring-charcoal-200 dark:ring-charcoal-700'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-white/50 dark:hover:bg-charcoal-800/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-institutional-600 dark:text-institutional-400' : ''} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isDailyCompleted
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* =========================================================================
          TAB 1: TODAY'S MISSION & DAILY PRACTICE ARENA
          ========================================================================= */}
      {activeTab === 'mission' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLS: THE STAR COMPONENT — TODAY'S DAILY PRACTICE CHALLENGE */}
            <div className="lg:col-span-2 bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
              {/* Challenge Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-institutional-600 text-white tracking-wider">
                      Daily Focus
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-charcoal-900 dark:text-white flex items-center gap-1.5">
                      <span>Today's Daily Practice Challenge</span>
                      <span className="text-amber-500">⚡</span>
                    </h2>
                  </div>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                    1 high-yield practice question auto-picked from the Question Bank. Solve to keep streak active and earn GovCoins!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {dailyQuestion && getDifficultyBadge(dailyQuestion.difficulty)}
                  {isDailyCompleted && (
                    <div
                      title="Today's Challenge Completed"
                      className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/80 shadow-xs animate-uplift-tick cursor-default"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 drop-shadow-xs">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Challenge Body */}
              {questionLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-institutional-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-charcoal-500">Auto-picking today's single practice question from Question Bank...</p>
                </div>
              ) : isDailyCompleted ? (
                /* PERMANENT FASCINATING BANNER: TODAY'S SINGLE QUESTION ATTEMPTED */
                <div className="space-y-6 animate-fade-in">
                  {/* Master Banner with Radiant Glow */}
                  <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-institutional-600/10 to-amber-500/10 dark:from-emerald-950/40 dark:via-institutional-950/40 dark:to-amber-950/40 border border-emerald-500/30 dark:border-emerald-600/40 shadow-xs">
                    {/* Atmospheric Glow Orbs */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 dark:bg-emerald-400/20 blur-2xl rounded-full pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-institutional-500/15 dark:bg-institutional-400/20 blur-2xl rounded-full pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                      {/* Status Pill & Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span>Daily Mission Conquered (1 / 1 Solved)</span>
                        </div>
                        <span className="text-[11px] font-mono text-charcoal-500 dark:text-charcoal-400 font-semibold">
                          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Main Title & Fascinating Words */}
                      <div className="space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black text-charcoal-950 dark:text-white tracking-tight flex items-center gap-2">
                          <span>Mission Accomplished for Today!</span>
                          <span className="text-2xl animate-bounce">🎯</span>
                        </h3>
                        <p className="hidden sm:block text-xs sm:text-sm text-charcoal-700 dark:text-charcoal-200 leading-relaxed font-normal">
                          {dailyReward?.milestone_title
                            ? `Triumph unlocked! You've claimed the ${dailyReward.milestone_title.toUpperCase()} milestone.`
                            : "Your daily discipline speaks louder than words. In the fierce arena of competitive exams, showing up every single day is the rare superpower that separates rankers from contenders."}
                        </p>
                        <p className="hidden sm:block text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed italic">
                          "One question mastered each morning builds the unshakeable foundation of an All-India Ranker. Your practice quota for today is 100% fulfilled."
                        </p>
                      </div>

                      {/* Achievement Matrix (4 Metric Cards) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-charcoal-900/80 border border-charcoal-200/80 dark:border-charcoal-750 backdrop-blur-sm shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1">
                            <span>🔥 Streak</span>
                          </div>
                          <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            {streakDays} Days
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Active & Protected
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-charcoal-900/80 border border-charcoal-200/80 dark:border-charcoal-750 backdrop-blur-sm shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1">
                            <span>🪙 Reward</span>
                          </div>
                          <div className="text-lg font-black text-institutional-600 dark:text-institutional-400 font-mono mt-0.5">
                            +{dailyReward?.coins_earned || 20} Coins
                          </div>
                          <div className="text-[10px] text-charcoal-500 font-semibold mt-0.5">
                            Added to Wallet
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-charcoal-900/80 border border-charcoal-200/80 dark:border-charcoal-750 backdrop-blur-sm shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1">
                            <span>🎯 Daily Quota</span>
                          </div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                            1 / 1 Solved
                          </div>
                          <div className="text-[10px] text-charcoal-500 font-semibold mt-0.5">
                            No More Qs Today
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-charcoal-900/80 border border-charcoal-200/80 dark:border-charcoal-750 backdrop-blur-sm shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1">
                            <span>⏳ Next Drop</span>
                          </div>
                          <div className="text-lg font-black text-charcoal-900 dark:text-charcoal-100 font-mono mt-0.5">
                            Tomorrow
                          </div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                            Unlocks 00:00 AM IST
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission & Solution Review Section (Persistent for Today's Question) */}
                  {verificationResult && dailyQuestion && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/80 dark:border-charcoal-750 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-charcoal-200/60 dark:border-charcoal-750">
                        <div className="flex items-center gap-2 text-xs font-bold text-charcoal-700 dark:text-charcoal-300">
                          <CheckCircleIcon size={16} className="text-emerald-600" />
                          <span>Today's Question Review & Official Derivation</span>
                        </div>
                        <span className="text-[11px] font-mono text-charcoal-500">
                          {dailyQuestion.subject} • {dailyQuestion.topic}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="text-xs sm:text-sm font-bold text-charcoal-900 dark:text-white leading-relaxed bg-white dark:bg-charcoal-800 p-4 rounded-xl border border-charcoal-200 dark:border-charcoal-700">
                        {dailyQuestion.question_text}
                      </div>

                      {/* Options Review */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(dailyQuestion.options || []).map((opt) => {
                          const isCorrect = verificationResult.correct_option === opt.id;
                          const isChosen = selectedOption === opt.id;
                          const isChosenWrong = isChosen && !verificationResult.is_correct;

                          let style = 'bg-white dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 opacity-60';
                          if (isCorrect) {
                            style = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 font-bold';
                          } else if (isChosenWrong) {
                            style = 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30 font-bold';
                          }

                          return (
                            <div key={opt.id} className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${style}`}>
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                isCorrect ? 'bg-emerald-600 text-white' : isChosenWrong ? 'bg-rose-600 text-white' : 'bg-charcoal-100 dark:bg-charcoal-700'
                              }`}>
                                {opt.id}
                              </span>
                              <span className="flex-1">{opt.text}</span>
                              {isCorrect && <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">✓ Correct</span>}
                              {isChosenWrong && <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-300">Your Choice</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Official Explanation */}
                      <div className="p-4 rounded-xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 text-xs space-y-1.5">
                        <div className="font-bold text-[11px] uppercase tracking-wider text-institutional-600 dark:text-institutional-400 flex items-center gap-1.5">
                          <SparklesIcon size={12} />
                          <span>Official PrepMagnet Derivation:</span>
                        </div>
                        <p className="text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-sans">
                          {verificationResult.solution_explanation}
                        </p>
                      </div>

                      {/* Lock Notice */}
                      <div className="text-center pt-2 text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium flex items-center justify-center gap-1.5">
                        <LockIcon size={12} className="text-charcoal-400" />
                        <span>Today's practice quota is locked. Only 1 question is permitted per day to build daily consistency.</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : dailyQuestion ? (
                /* Active Question Arena (Only Shown Before Attempting) */
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-charcoal-600 dark:text-charcoal-400">
                    <span>{dailyQuestion.subject} • {dailyQuestion.topic}</span>
                    <span className="flex items-center gap-1 font-mono text-charcoal-700 dark:text-charcoal-300 bg-charcoal-100 dark:bg-charcoal-800 px-2.5 py-0.5 rounded-lg">
                      <ClockIcon size={12} className="text-amber-500" />
                      {questionTimer}s spent
                    </span>
                  </div>

                  {/* Question Statement */}
                  <div className="text-sm sm:text-base font-bold text-charcoal-900 dark:text-white leading-relaxed bg-charcoal-50/80 dark:bg-charcoal-800/50 p-4 sm:p-5 rounded-2xl border border-charcoal-200/80 dark:border-charcoal-750">
                    {dailyQuestion.question_text}
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(dailyQuestion.options || []).map((opt) => {
                      const isSelected = selectedOption === opt.id;
                      let btnStyle = 'border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:border-institutional-500 hover:bg-institutional-50/30 dark:hover:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200';
                      let badgeStyle = 'bg-charcoal-100 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200';

                      if (isSelected) {
                        btnStyle = 'border-institutional-600 bg-institutional-50/70 dark:bg-institutional-950/70 ring-2 ring-institutional-500/30 text-institutional-950 dark:text-white';
                        badgeStyle = 'bg-institutional-600 text-white';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOption(opt.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${badgeStyle}`}>
                            {opt.id}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold flex-1 leading-snug pt-0.5">
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                    <div className="text-xs text-charcoal-500">
                      {selectedOption ? `Option ${selectedOption} chosen` : 'Select an option above'}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedOption || isVerifying}
                      onClick={handleVerifyAnswer}
                      className="px-6 py-2.5 text-xs font-extrabold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Answer</span>
                          <ArrowRightIcon size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* RIGHT 1 COL: 7-DAY HABIT STRIP & SMART NEXT ACTIONS */}
            <div className="space-y-6">
              {/* Weekly Habit Focus Strip */}
              <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      🔥
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-charcoal-900 dark:text-white">
                        Study Consistency Habit
                      </h3>
                      <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                        {streakDays} Days Active Streak
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRoadmapModalOpen(true)}
                    className="text-[11px] font-bold text-institutional-600 dark:text-institutional-400 hover:underline cursor-pointer"
                  >
                    View All 30 Days →
                  </button>
                </div>

                {/* 7-Day Mini Track */}
                <div className="grid grid-cols-7 gap-1.5 text-center pt-3.5">
                  {currentWeekDays.map((step) => {
                    const todayDayNum = isDailyCompleted ? (streakDays <= 7 ? streakDays : 7) : (streakDays + 1);
                    const isToday = step.day_number === todayDayNum || step.is_current;
                    const isDone = step.completed || step.day_number <= streakDays;
                    const isTodaySuccess = isToday && (isDone || isDailyCompleted);
                    const isJackpot = step.is_milestone;

                    return (
                      <div
                        key={step.day_number}
                        className={`group relative aspect-square p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-md ${
                          isTodaySuccess
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400 dark:border-teal-400 shadow-md ring-2 ring-emerald-400/50 scale-[1.03] hover:scale-[1.08] hover:shadow-emerald-500/30'
                            : isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/15'
                            : isToday
                            ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-200 shadow-xs animate-pulse hover:animate-none hover:border-amber-400'
                            : isJackpot
                            ? 'bg-amber-500/10 border-amber-300 text-charcoal-800 dark:text-charcoal-200 hover:border-amber-400 hover:bg-amber-500/20'
                            : 'bg-charcoal-50 dark:bg-charcoal-800/40 border-charcoal-200/60 dark:border-charcoal-800 text-charcoal-400 hover:border-charcoal-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800/80'
                        }`}
                      >
                        {/* Topup Floating Pill on Hover */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-150 z-30 whitespace-nowrap">
                          <div className="px-2 py-0.5 rounded-md bg-charcoal-900/95 dark:bg-charcoal-100/95 text-white dark:text-charcoal-950 text-[10px] font-mono font-black shadow-xl border border-charcoal-800 dark:border-charcoal-200 backdrop-blur-xs flex items-center justify-center">
                            +{step.coins_reward}
                          </div>
                          <div className="w-1.5 h-1.5 bg-charcoal-900/95 dark:bg-charcoal-100/95 rotate-45 mx-auto -mt-1 border-r border-b border-charcoal-800 dark:border-charcoal-200" />
                        </div>

                        {/* Resting State: Number 1, 2, 3... + Status Icon */}
                        <div className="flex flex-col items-center justify-center transition-all duration-200 group-hover:opacity-0 group-hover:scale-75">
                          <span className={`text-[11px] sm:text-xs font-black leading-none ${isTodaySuccess ? 'text-white' : ''}`}>
                            {step.day_number}
                          </span>
                          <div className={`text-xs sm:text-sm font-black leading-none mt-1 ${isTodaySuccess ? 'text-white' : ''}`}>
                            {isDone ? '✓' : isToday ? '🔥' : isJackpot ? '🎁' : '•'}
                          </div>
                        </div>

                        {/* Hover State: ONLY +5 or +20 (Clean, bold, centered, zero clutter) */}
                        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100 ${
                          isTodaySuccess ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          <span className="text-xs sm:text-sm font-black font-mono leading-none tracking-tight">
                            +{step.coins_reward}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {nextMilestone && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <span>🎁</span>
                    <span>Next Milestone: <strong>{nextMilestone.label} (+{nextMilestone.coins_reward} 🪙)</strong> in {Math.max(1, nextMilestone.day_number - streakDays)} days!</span>
                  </div>
                )}

                <div className="text-[10px] text-charcoal-500 dark:text-charcoal-400 flex items-center justify-between border-t border-charcoal-100 dark:border-charcoal-800 pt-2 font-medium">
                  <span>⚡ 7d: +20🪙 • 15d: +40🪙 • 30d: +100🪙</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Loose a day = Reset to 0</span>
                </div>
              </div>

              {/* Aspirant Diagnostic Callout */}
              <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-charcoal-500 tracking-wider">
                  <span>💡 Diagnostic Recommendation</span>
                </div>
                <p className="text-xs text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-medium">
                  Limiting blind guesses by <strong>10 questions</strong> in your next mock will immediately boost your predicted All-India Rank by over <strong>150 places</strong> under PrepMagnet negative marking.
                </p>
                <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Inspect Weak Sections</span>
                    <ArrowRightIcon size={12} />
                  </button>
                  <button
                    onClick={() => setActiveTab('mocks')}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white cursor-pointer shadow-xs"
                  >
                    Take a Speed Drill
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: ANALYTICS, SECTIONAL MASTERY & INTERACTIVE SCORECARDS
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <AnalyticsDashboardView
          dashboard={dashboard}
          enrolledCourses={enrolledCourses}
          onSelectAttempt={onSelectAttempt}
          onStartPractice={() => setActiveTab('mocks')}
          onOpenCourse={(courseId) => {
            if (courseId) openCourse(courseId);
            else setActiveTab('courses');
          }}
        />
      )}

      {/* =========================================================================
          TAB 3: MY ENROLLED COURSES & SUBJECT QUIZZES
          ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                  Active Enrolled Courses ({enrolledCourses.length})
                </h3>
                <p className="text-xs text-charcoal-500">
                  Step-by-step topic quizzes with official question derivations and shortcut formulas.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={fetchEnrolledCourses}
                  disabled={enrolledLoading}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-charcoal-100 hover:bg-charcoal-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Refresh enrolled courses from database"
                >
                  <RefreshCwIcon size={13} className={enrolledLoading ? "animate-spin text-institutional-600" : ""} />
                  <span>{enrolledLoading ? "Refreshing..." : "Refresh"}</span>
                </button>

                <button
                  onClick={() => navigate(ROUTES.courses)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 transition-colors cursor-pointer"
                >
                  Browse All Courses →
                </button>
              </div>
            </div>

            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.id || course.course_id}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/50 dark:bg-charcoal-800/40 hover:border-institutional-400 transition-all flex flex-col justify-between space-y-3.5 sm:space-y-4 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {course.status || 'Active Pass'}
                        </span>
                        <span className="text-[11px] text-charcoal-400 font-mono">
                          {course.enrolled_at ? new Date(course.enrolled_at).toLocaleDateString() : 'Enrolled'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border border-institutional-500/20">
                          {course.target_exam || 'Govt Exam'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-charcoal-900 dark:text-white line-clamp-1">
                        {course.course_title || course.title}
                      </h4>

                      {course.tagline && (
                        <p className="text-xs text-charcoal-500 dark:text-charcoal-400 line-clamp-2">
                          {course.tagline}
                        </p>
                      )}

                      {course.subjects && course.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {course.subjects.slice(0, 3).map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-white dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300"
                            >
                              {typeof sub === 'string' ? sub : sub.subject_name || 'Subject'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-charcoal-200 dark:border-charcoal-700 flex items-center justify-between">
                      <span className="text-xs font-semibold text-charcoal-500 flex items-center gap-1">
                        <BookOpenIcon size={13} className="text-institutional-600" />
                        <span>{course.total_quizzes ?? (course.quizzes ? course.quizzes.length : 0)} Quizzes</span>
                      </span>

                      <button
                        onClick={() => {
                          const courseId = course.id || course.course_id;
                          // The full course page (every quiz and mock test) is the one place for this now.
                          if (courseId) {
                            openCourse(courseId); // remembers this exact /dashboard/courses address to return to
                            return;
                          }
                          setActiveCourseModal(course);
                          setSelectedQuizIdx(0);
                          setActiveQuizQuestionIdx(0);
                          setSelectedAnswers({});
                          setShowExplanation(true);
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Practice Quizzes</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-charcoal-500 space-y-2">
                <p className="font-bold">No exam courses enrolled yet.</p>
                <p className="text-xs">Explore syllabus-calibrated courses with step-by-step video lessons and quizzes.</p>
                <button
                  onClick={() => navigate(ROUTES.courses)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-institutional-600 text-white cursor-pointer mt-2"
                >
                  Explore Course Catalog →
                </button>
              </div>
            )}
          </div>

          {/* Explore More Recommendations */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
              <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                Recommended Courses with GovCoins Discount
              </h3>
              <button
                onClick={() => navigate(ROUTES.courses)}
                className="text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline cursor-pointer"
              >
                View All Plans
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {exploreCourses.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-charcoal-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-800/30 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {c.target_exam}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-white">
                        {c.discount_percent}% OFF
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-charcoal-900 dark:text-white line-clamp-1">{c.title}</h4>
                    <p className="text-xs text-charcoal-500 line-clamp-2">{c.description}</p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-black text-charcoal-900 dark:text-white font-mono">₹{c.discounted_price}</span>
                      <span className="text-xs text-charcoal-400 line-through font-mono">₹{c.original_price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(ROUTES.courses)}
                    className="w-full py-1.5 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white cursor-pointer"
                  >
                    Enroll with Coins
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TYPING MASTER SPEED BENCHMARKS
          ========================================================================= */}
      {activeTab === 'typing' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-institutional-950 via-charcoal-900 to-institutional-900 border border-charcoal-800 rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-6">

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold border border-white/15">
                <span>⌨️ Government Exam Typing Master</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Typing Speed & Accuracy Benchmark
              </h3>
              <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
                Calibrate your key-depression velocity against official cutoffs for SSC CGL DEST (27 WPM), SSC CHSL (35 WPM), and RRB NTPC (30 WPM).
              </p>

              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center">
                  <div className="text-[10px] text-blue-200 uppercase font-semibold">Best Speed</div>
                  <div className="text-xl font-black font-mono mt-0.5 text-emerald-400">
                    {typingStats?.best_wpm ? `${typingStats.best_wpm} WPM` : '--'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center">
                  <div className="text-[10px] text-blue-200 uppercase font-semibold">Average Speed</div>
                  <div className="text-xl font-black font-mono mt-0.5 text-blue-300">
                    {typingStats?.average_wpm ? `${typingStats.average_wpm} WPM` : '--'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center">
                  <div className="text-[10px] text-blue-200 uppercase font-semibold">Tests Taken</div>
                  <div className="text-xl font-black font-mono mt-0.5 text-white">
                    {typingStats?.total_tests ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-center space-y-2">
              <button
                onClick={() => navigate(ROUTES.typing)}
                className="py-3 px-6 rounded-2xl bg-white hover:bg-blue-50 text-institutional-950 font-black text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Typing Master</span>
                <ArrowRightIcon size={16} />
              </button>
              <div className="text-[10px] text-blue-200">Includes real-time backspace error penalty analysis</div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: MOCK TEST LIBRARY & SPEED DRILLS
          ========================================================================= */}
      {activeTab === 'mocks' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                Free Mock Test Library ({filteredTests.length})
              </h3>
              <p className="text-xs text-charcoal-500">
                Full-Length Mocks, Sectionals, and Topic Drills.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
              {['ALL', 'FULL', 'SUBJECT', 'TOPIC_MINI'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setSelectedFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === filterKey
                      ? 'bg-institutional-600 text-white shadow-xs'
                      : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-400'
                  }`}
                >
                  {filterKey === 'ALL'
                    ? 'All'
                    : filterKey === 'FULL'
                    ? 'Full Tests'
                    : filterKey === 'SUBJECT'
                    ? 'Sectional'
                    : 'Topic Drills'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTests.map((test) => (
              <article
                key={test.id}
                className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-400 bg-white dark:bg-charcoal-800/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 sm:space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                        {test.test_type}
                      </span>
                      {test.is_free && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Free
                        </span>
                      )}
                    </div>
                    {getDifficultyBadge(test.difficulty)}
                  </div>
                  <h4 className="text-sm font-bold text-charcoal-900 dark:text-white mt-2 line-clamp-1">
                    {test.title}
                  </h4>
                  <p className="text-xs text-charcoal-500 line-clamp-2 mt-1">
                    {test.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-charcoal-200 dark:border-charcoal-700 flex items-center justify-between">
                  <div className="text-xs font-mono text-charcoal-500 flex items-center gap-2">
                    <span>⏱ {test.duration_minutes}m</span>
                    <span>•</span>
                    <span>📝 {test.total_questions} Qs</span>
                  </div>
                  <button
                    onClick={() => onStartTest(test)}
                    className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlayIcon size={11} />
                    <span>Start Test</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB: MY SUPPORT TICKETS (only what this account itself raised) */}
      {activeTab === 'support' && (() => {
        const activeTicketsCount = myTickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
        const resolvedTicketsCount = myTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
        const totalTicketsCount = myTickets.length;

        const filteredTickets = myTickets.filter((t) => {
          const isResolved = t.status === 'RESOLVED' || t.status === 'CLOSED';
          if (ticketStatusFilter === 'ACTIVE' && isResolved) return false;
          if (ticketStatusFilter === 'RESOLVED' && !isResolved) return false;
          if (ticketSearchQuery.trim()) {
            const q = ticketSearchQuery.trim().toLowerCase();
            const matchNum = (t.ticket_number || '').toLowerCase().includes(q);
            const matchSub = (t.subject || '').toLowerCase().includes(q);
            const matchMsg = (t.message || '').toLowerCase().includes(q);
            const matchRes = (t.resolution_note || '').toLowerCase().includes(q);
            if (!matchNum && !matchSub && !matchMsg && !matchRes) return false;
          }
          return true;
        });

        return (
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 animate-fade-in">
            {/* Header with Title, Telemetry & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-institutional-500/10 dark:bg-institutional-500/20 text-institutional-600 dark:text-institutional-400 flex items-center justify-center shrink-0 mt-0.5 border border-institutional-500/20">
                  <MessageSquareIcon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-charcoal-950 dark:text-white">
                      My Support Tickets
                    </h2>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-mono">
                      {totalTicketsCount} Total
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                    Real-time status, grievances & official resolutions submitted from your student account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={fetchMyTickets}
                  disabled={myTicketsLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-200 bg-white dark:bg-charcoal-850 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 cursor-pointer"
                  title="Check for newest replies or status updates"
                >
                  <RefreshCwIcon size={13} className={myTicketsLoading ? 'animate-spin text-institutional-600 dark:text-institutional-400' : ''} />
                  <span>{myTicketsLoading ? 'Refreshing...' : 'Refresh Status'}</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              {/* Segmented Filter Pills */}
              <div className="inline-flex items-center p-1 rounded-2xl bg-charcoal-100/80 dark:bg-charcoal-800/80 border border-charcoal-200/80 dark:border-charcoal-750 self-start">
                <button
                  type="button"
                  onClick={() => setTicketStatusFilter('ALL')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ticketStatusFilter === 'ALL'
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-950 dark:text-white shadow-2xs'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-950 dark:hover:text-white'
                  }`}
                >
                  <span>All Tickets</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    ticketStatusFilter === 'ALL'
                      ? 'bg-charcoal-150 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-200'
                      : 'bg-charcoal-200/60 dark:bg-charcoal-750 text-charcoal-600 dark:text-charcoal-400'
                  }`}>
                    {totalTicketsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketStatusFilter('ACTIVE')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ticketStatusFilter === 'ACTIVE'
                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 shadow-2xs'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Active & In Review</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    ticketStatusFilter === 'ACTIVE'
                      ? 'bg-amber-500/25 text-amber-900 dark:text-amber-100'
                      : 'bg-charcoal-200/60 dark:bg-charcoal-750 text-charcoal-600 dark:text-charcoal-400'
                  }`}>
                    {activeTicketsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketStatusFilter('RESOLVED')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ticketStatusFilter === 'RESOLVED'
                      ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 shadow-2xs'
                      : 'text-charcoal-600 dark:text-charcoal-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Resolved</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    ticketStatusFilter === 'RESOLVED'
                      ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-100'
                      : 'bg-charcoal-200/60 dark:bg-charcoal-750 text-charcoal-600 dark:text-charcoal-400'
                  }`}>
                    {resolvedTicketsCount}
                  </span>
                </button>
              </div>

              {/* Real-time Search Box */}
              <div className="relative w-full md:w-72">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
                <input
                  type="text"
                  value={ticketSearchQuery}
                  onChange={(e) => setTicketSearchQuery(e.target.value)}
                  placeholder="Search by ID, exam, keyword..."
                  className="w-full pl-8.5 pr-8 py-2 rounded-xl text-xs bg-charcoal-50 dark:bg-charcoal-850/80 border border-charcoal-200 dark:border-charcoal-750 text-charcoal-900 dark:text-white placeholder:text-charcoal-400 focus:outline-hidden focus:ring-2 focus:ring-institutional-500/30 focus:border-institutional-500 transition-all"
                />
                {ticketSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTicketSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-charcoal-200 dark:hover:bg-charcoal-700 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Bounded, Component-Only Scrollable Area */}
            {myTicketsLoading && myTickets.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-institutional-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-charcoal-500 dark:text-charcoal-400">Loading your support tickets...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30">
                <div className="w-12 h-12 rounded-2xl bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-400 mx-auto flex items-center justify-center">
                  <MessageSquareIcon size={24} />
                </div>
                <div className="space-y-1 max-w-sm mx-auto px-4">
                  <p className="font-extrabold text-sm text-charcoal-900 dark:text-white">No support tickets raised yet</p>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                    Encountered an issue with test scoring, typing certification, or account billing? You can submit an inquiry via the support portal anytime.
                  </p>
                </div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-14 text-center space-y-3 rounded-2xl border border-dashed border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30">
                <p className="font-extrabold text-sm text-charcoal-900 dark:text-white">
                  No {ticketStatusFilter !== 'ALL' ? ticketStatusFilter.toLowerCase() : ''} tickets match your criteria
                </p>
                {ticketSearchQuery && (
                  <p className="text-xs text-charcoal-400 font-mono">"{ticketSearchQuery}"</p>
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketStatusFilter('ALL');
                      setTicketSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              <div
                id="my-tickets-scroll-container"
                className="max-h-[540px] xl:max-h-[580px] overflow-y-auto pr-1.5 sm:pr-2 space-y-3.5 overscroll-contain"
                style={{ scrollbarGutter: 'stable' }}
              >
                {filteredTickets.map((t) => {
                  const isResolved = t.status === 'RESOLVED' || t.status === 'CLOSED';
                  const isHighlighted = t.id === highlightTicketId;
                  const formattedDate = new Date(t.created_at).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <article
                      key={t.id}
                      id={`ticket-row-${t.id}`}
                      className={`group relative p-4.5 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isHighlighted
                          ? 'border-institutional-500 bg-institutional-50/20 dark:bg-institutional-950/25 ring-2 ring-institutional-500/30 shadow-md'
                          : 'border-charcoal-200/90 dark:border-charcoal-800 bg-white dark:bg-charcoal-850/70 hover:border-charcoal-350 dark:hover:border-charcoal-700 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      {/* Top Meta Header: ID + Status + Date */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-extrabold tracking-wide px-2.5 py-1 rounded-lg bg-institutional-50 text-institutional-700 dark:bg-institutional-950/70 dark:text-institutional-300 border border-institutional-200/80 dark:border-institutional-800/80 shadow-2xs">
                            {t.ticket_number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
                              isResolved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
                                : 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isResolved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                              }`}
                            />
                            <span>{isResolved ? 'Resolved' : 'Active / In Review'}</span>
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-charcoal-400 dark:text-charcoal-400">
                          <ClockIcon size={12} className="text-charcoal-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Subject / Exam Title */}
                      {t.subject && (
                        <h3 className="text-sm sm:text-base font-extrabold text-charcoal-950 dark:text-white mt-2.5 tracking-tight">
                          {t.subject}
                        </h3>
                      )}

                      {/* Student's Raised Query / Message */}
                      <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-charcoal-50/70 dark:bg-charcoal-900/60 border border-charcoal-150 dark:border-charcoal-800">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500 mb-1">
                          Your Inquiry
                        </div>
                        <p className="text-xs sm:text-[13px] text-charcoal-800 dark:text-charcoal-200 whitespace-pre-wrap leading-relaxed">
                          {t.message}
                        </p>
                      </div>

                      {/* Official Support Response (if resolved) */}
                      {isResolved && t.resolution_note && (
                        <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-200/60 dark:border-emerald-800/50">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Official Support Resolution</span>
                            </div>
                            {t.resolved_at && (
                              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono">
                                {new Date(t.resolved_at).toLocaleDateString(undefined, {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-[13px] text-emerald-950 dark:text-emerald-100 font-medium whitespace-pre-wrap leading-relaxed pt-0.5">
                            {t.resolution_note}
                          </p>
                        </div>
                      )}

                      {/* Active Status Live Reassurance Banner */}
                      {!isResolved && (
                        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-850 dark:text-amber-300">
                          <ClockIcon size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="leading-snug">
                            Your inquiry is assigned to our academic & technical desk. Status updates and resolutions will automatically synchronize here.
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          4. 30-DAY HABIT ROADMAP MODAL (Clean, Non-Intrusive Drawer / Modal)
          ========================================================================= */}
      {isRoadmapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-750 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                    30-Day Study Discipline Roadmap
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Earn +20 coins daily and unlock progressive milestone jackpots (+100 to +500 🪙).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* 30-Day Grid */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {timelineList.map((step) => {
                  const isDone = step.completed;
                  const isToday = step.is_current;
                  const isJackpot = step.is_milestone;

                  return (
                    <div
                      key={step.day_number}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                          : isToday
                          ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-200 scale-105 shadow-sm'
                          : isJackpot
                          ? 'bg-gradient-to-b from-amber-500/10 to-institutional-500/10 border-amber-400/40 text-charcoal-800 dark:text-charcoal-200'
                          : 'bg-charcoal-50 dark:bg-charcoal-800/40 border-charcoal-200/60 dark:border-charcoal-800 text-charcoal-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{step.label}</span>
                      <div className="my-2">
                        {isDone ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                        ) : isToday ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs animate-pulse">
                            🔥
                          </div>
                        ) : isJackpot ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
                            🎁
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300 flex items-center justify-center font-mono text-[11px] font-bold">
                            {step.day_number}
                          </div>
                        )}
                      </div>
                      {step.milestone_title && (
                        <span className="text-[9px] font-extrabold truncate max-w-full text-amber-700 dark:text-amber-300">
                          {step.milestone_badge}
                        </span>
                      )}
                      <div className="text-[10px] font-mono font-bold mt-1">
                        +{step.coins_reward} 🪙
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-charcoal-200 dark:border-charcoal-800 flex justify-end bg-charcoal-50/50 dark:bg-charcoal-900/50">
              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-charcoal-200 dark:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200 cursor-pointer"
              >
                Close Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. ENROLLED COURSE SUBJECT QUIZZES & EXPLANATIONS MODAL
          ========================================================================= */}
      {activeCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-750 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between bg-charcoal-50/50 dark:bg-charcoal-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-institutional-100 dark:bg-institutional-950 text-institutional-600 dark:text-institutional-400 flex items-center justify-center font-bold text-lg">
                  📖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border border-institutional-500/20">
                      {activeCourseModal.target_exam || 'Exam Course'}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircleIcon size={12} />
                      Active Enrolled
                    </span>
                  </div>
                  <h3 className="text-base font-black text-charcoal-900 dark:text-white mt-0.5 line-clamp-1">
                    {activeCourseModal.title || activeCourseModal.course_title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveCourseModal(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-charcoal-400 hover:text-charcoal-600 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Subject Tabs */}
            {activeCourseModal.quizzes && activeCourseModal.quizzes.length > 0 ? (
              <>
                <div className="px-5 py-2.5 border-b border-charcoal-200 dark:border-charcoal-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-charcoal-900">
                  <span className="text-xs font-bold text-charcoal-500 mr-2 shrink-0">Subject Quizzes:</span>
                  {activeCourseModal.quizzes.map((quiz, idx) => (
                    <button
                      key={quiz.id || idx}
                      onClick={() => {
                        setSelectedQuizIdx(idx);
                        setActiveQuizQuestionIdx(0);
                        setSelectedAnswers({});
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                        selectedQuizIdx === idx
                          ? 'bg-institutional-600 text-white shadow-xs'
                          : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300'
                      }`}
                    >
                      <span>{quiz.subject || quiz.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                        {(quiz.questions || []).length} Qs
                      </span>
                    </button>
                  ))}
                </div>

                {/* Active Question Content Area */}
                {(() => {
                  const currentQuiz = activeCourseModal.quizzes[selectedQuizIdx] || activeCourseModal.quizzes[0];
                  const questions = currentQuiz?.questions || [];
                  const currentQ = questions[activeQuizQuestionIdx];

                  if (!currentQ) {
                    return (
                      <div className="p-12 text-center text-charcoal-500 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-institutional-100 dark:bg-institutional-950 text-institutional-600 dark:text-institutional-400 mx-auto flex items-center justify-center font-bold text-xl">
                          📝
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-charcoal-900 dark:text-white">
                            {currentQuiz?.title || 'Course Mock Test'}
                          </h4>
                          <p className="text-xs text-charcoal-500 mt-1">
                            {currentQuiz?.duration_minutes ? `${currentQuiz.duration_minutes} Minutes` : 'Timed Examination'}
                            {currentQuiz?.total_questions ? ` • ${currentQuiz.total_questions} Questions` : ''}
                          </p>
                        </div>
                        {onStartTest && currentQuiz?.id && (
                          <button
                            onClick={() => {
                              setActiveCourseModal(null);
                              onStartTest(currentQuiz);
                            }}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-institutional-600 hover:bg-institutional-700 text-white shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>Launch Exam Simulator</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  const selectedOpt = selectedAnswers[activeQuizQuestionIdx];
                  const isAnswered = selectedOpt !== undefined;

                  return (
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-bold text-institutional-600 dark:text-institutional-400 bg-institutional-50 dark:bg-institutional-950 px-2.5 py-1 rounded-lg">
                          {currentQuiz.subject || currentQuiz.title} {currentQ.topic ? `• ${currentQ.topic}` : ''}
                        </span>

                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-charcoal-500 mr-1">Q {activeQuizQuestionIdx + 1} of {questions.length}</span>
                          {questions.map((_, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => setActiveQuizQuestionIdx(qIdx)}
                              className={`w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeQuizQuestionIdx === qIdx
                                  ? 'bg-institutional-600 text-white'
                                  : selectedAnswers[qIdx] !== undefined
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500'
                              }`}
                            >
                              {qIdx + 1}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="p-5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-4">
                        <p className="text-sm sm:text-base font-bold text-charcoal-900 dark:text-white leading-relaxed">
                          {currentQ.question_text}
                        </p>

                        {/* Options */}
                        <div className="space-y-2 pt-1">
                          {currentQ.options && currentQ.options.map((opt, optIdx) => {
                            const optId = typeof opt === 'object' && opt !== null && opt.id ? opt.id : String.fromCharCode(65 + optIdx);
                            const optText = typeof opt === 'object' && opt !== null && opt.text ? opt.text : String(opt);
                            const isChosen = selectedOpt === optIdx;
                            const isCorrect = (
                              (currentQ.correct_option && String(currentQ.correct_option).trim().toUpperCase() === String(optId).trim().toUpperCase()) ||
                              (currentQ.correct_answer_index !== undefined && currentQ.correct_answer_index === optIdx)
                            );
                            let btnStyle = 'border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200';

                            if (isAnswered) {
                              if (isCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold';
                              } else if (isChosen && !isCorrect) {
                                btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 line-through';
                              } else {
                                btnStyle = 'opacity-40 border-charcoal-200 dark:border-charcoal-800';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => setSelectedAnswers(prev => ({ ...prev, [activeQuizQuestionIdx]: optIdx }))}
                                className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    isAnswered && isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : isAnswered && isChosen && !isCorrect
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300'
                                  }`}>
                                    {optId}
                                  </span>
                                  <span className="leading-snug">{optText}</span>
                                </div>
                                {isAnswered && isCorrect && (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 ml-2">
                                    <CheckCircleIcon size={13} /> Correct
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      {(isAnswered || showExplanation) && (
                        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
                            <span className="uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <SparklesIcon size={13} /> Step-by-Step Derivation
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Correct: Option {currentQ.correct_option || String.fromCharCode(65 + (currentQ.correct_answer_index ?? 0))}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-sans whitespace-pre-line">
                            {currentQ.solution_explanation || currentQ.explanation || 'Step-by-step solution derivation provided in course.'}
                          </p>
                        </div>
                      )}

                      {/* Navigation Controls */}
                      <div className="pt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveQuizQuestionIdx(Math.max(0, activeQuizQuestionIdx - 1))}
                          disabled={activeQuizQuestionIdx === 0}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-charcoal-200 dark:border-charcoal-700 disabled:opacity-30 cursor-pointer"
                        >
                          ← Previous
                        </button>
                        <button
                          onClick={() => setActiveQuizQuestionIdx(Math.min(questions.length - 1, activeQuizQuestionIdx + 1))}
                          disabled={activeQuizQuestionIdx === questions.length - 1}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-institutional-600 hover:bg-institutional-700 text-white disabled:opacity-30 cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="p-8 text-center text-charcoal-500">
                No quizzes available in this course.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
