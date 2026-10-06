import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
} from '../components/Icons';
import { TestRulesModal } from '../components/TestRulesModal';

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
export const StudentDashboardPage = ({ onSelectAttempt, onStartTest, onNavigate }) => {
  const { user, updateCoins, updateProfile } = useAuth();

  // Active Tab View: 'mission' | 'analytics' | 'courses' | 'typing' | 'mocks'
  const [activeTab, setActiveTab] = useState('mission');

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

  // Enrolled Courses, Explore Courses & Typing Master States
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [exploreCourses, setExploreCourses] = useState([]);
  const [typingStats, setTypingStats] = useState(null);
  const [activeCourseModal, setActiveCourseModal] = useState(null);
  const [dashboardRulesModalTest, setDashboardRulesModalTest] = useState(null);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(0);
  const [activeQuizQuestionIdx, setActiveQuizQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(true);

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

  useEffect(() => {
    loadAllData();
  }, [user]);

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

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dashData, testsData, streakRes] = await Promise.all([
        api.users.getDashboard(user?.id || 'student-primary-id'),
        api.tests.list(),
        api.streak.getStreak(),
      ]);
      setDashboard(dashData);
      setAvailableTests(testsData || []);
      setStreakData(streakRes);

      if (streakRes?.today_completed) {
        setIsDailyCompleted(true);
      }

      try {
        const [enrolledRes, exploreRes, typingRes] = await Promise.all([
          api.courses.getMyEnrollments(),
          api.courses.list(),
          api.typing.getMyHistory(),
        ]);
        setEnrolledCourses(enrolledRes || []);
        setExploreCourses(exploreRes || []);
        setTypingStats(typingRes || null);
      } catch (courseErr) {
        console.warn('Courses and typing load fallback:', courseErr);
      }

      await loadDailyQuestion();
    } catch (err) {
      console.warn('Dashboard data fallback:', err);
    } finally {
      setLoading(false);
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

  // Submit & Verify the single daily question
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

  const streakDays = streakData?.current_streak ?? 6;
  const coinsBalance = user?.profile?.coins_balance ?? streakData?.coins_balance ?? 150;

  // 30-Day Timeline Generator for Habit Roadmap
  const timelineList = (streakData?.timeline && streakData.timeline.length === 30)
    ? streakData.timeline
    : Array.from({ length: 30 }, (_, idx) => {
        const d = idx + 1;
        const isDone = d <= streakDays;
        const isToday = d === (streakDays + 1) && !isDailyCompleted;
        const isMilestone = [7, 14, 21, 28, 30].includes(d);
        const milestoneRewards = { 7: 120, 14: 170, 21: 220, 28: 320, 30: 520 };
        const milestoneTitles = {
          7: 'Week 1 Bronze',
          14: 'Fortnight Silver',
          21: 'Discipline Gold',
          28: 'Focus Diamond',
          30: 'Platinum Grand Master',
        };
        const milestoneBadges = {
          7: 'BRONZE',
          14: 'SILVER',
          21: 'GOLD',
          28: 'DIAMOND',
          30: 'PLATINUM',
        };
        return {
          day_number: d,
          label: `Day ${d}`,
          completed: isDone,
          is_current: isToday,
          coins_reward: isMilestone ? milestoneRewards[d] : 20,
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
          <div className="flex items-center gap-4">
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
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 dark:text-white tracking-tight">
                  {user?.full_name || 'Alex Aspirant'}
                </h1>

                {/* Verified Aspirant Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-institutional-50 text-institutional-700 dark:bg-institutional-950/80 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                  <ShieldIcon size={12} className="text-institutional-600" />
                  <span>{user?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED ASPIRANT'}</span>
                </span>
              </div>

              {/* Target Exam Chips & Countdown */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(user?.profile?.target_exams && user.profile.target_exams.length > 0
                  ? user.profile.target_exams
                  : ['SSC CGL Tier-1 2026']
                ).map((exam) => (
                  <span
                    key={exam}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-semibold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700"
                  >
                    <TargetIcon size={12} className="text-amber-500" />
                    <span>{exam}</span>
                  </span>
                ))}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <ClockIcon size={12} className="text-amber-600" />
                  <span>Target Exam in 42 Days</span>
                </span>
              </div>

              {/* Email & Feedback Toast */}
              <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400">
                <span>{user?.email || 'student@gmail.com'}</span>
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
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* GovCoins Wallet Card */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-charcoal-900 dark:text-white shadow-xs">
              <span className="text-2xl">🪙</span>
              <div>
                <div className="text-xs font-black tracking-tight leading-tight flex items-center gap-1.5">
                  <span className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">{coinsBalance}</span>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">GovCoins</span>
                </div>
                <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium">
                  = ₹{coinsBalance} exam discount
                </div>
              </div>
            </div>

            {/* Redeem CTA */}
            <button
              onClick={() => onNavigate && onNavigate('courses')}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold rounded-2xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <SparklesIcon size={14} />
              <span>Redeem on Courses</span>
              <ArrowRightIcon size={12} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. EXECUTIVE KPI BENTO GRID (4 High-Impact Pillars)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: All India Rank */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:border-institutional-400 transition-colors">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider">
              Predicted All-India Rank
            </div>
            <div className="text-2xl font-black text-charcoal-900 dark:text-white mt-1 flex items-baseline gap-1.5 font-mono">
              <span>#420</span>
              <span className="text-xs font-normal text-charcoal-400">/ 12,450</span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <span>↑ Top 3.4% Percentile</span>
              <span className="text-charcoal-400 font-normal">(Safe Cutoff)</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrophyIcon size={20} />
          </div>
        </div>

        {/* Card 2: Net Mock Accuracy */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:border-emerald-400 transition-colors">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider">
              Net Mock Accuracy
            </div>
            <div className="text-2xl font-black text-charcoal-900 dark:text-white mt-1 font-mono">
              79.4%
            </div>
            <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 font-medium mt-1">
              TCS iON Formula: +2.0 / -0.5
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TargetIcon size={20} />
          </div>
        </div>

        {/* Card 3: Avg Speed per Question */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:border-amber-400 transition-colors">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider">
              Avg Speed / Question
            </div>
            <div className="text-2xl font-black text-charcoal-900 dark:text-white mt-1 font-mono">
              48s <span className="text-xs font-normal text-charcoal-400">/ Q</span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
              ⚡ 12s faster than cutoff pace
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClockIcon size={20} />
          </div>
        </div>

        {/* Card 4: Daily Discipline Streak */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:border-orange-400 transition-colors">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider">
              Discipline Streak
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center gap-1.5">
              <span>{streakDays} Days</span>
              <span className="text-xl">🔥</span>
            </div>
            <div className="text-[11px] font-semibold mt-1">
              {isDailyCompleted ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Today's goal completed! ✓</span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Solve daily challenge for bonus</span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <FlameIcon size={20} />
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
          { id: 'courses', label: 'My Enrolled Courses', icon: BookOpenIcon, count: enrolledCourses.length },
          { id: 'typing', label: 'Typing Master', icon: ZapIcon },
          { id: 'mocks', label: 'Mock Test Catalog', icon: LayersIcon, count: filteredTests.length },
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
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Completed ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Challenge Body */}
              {questionLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-institutional-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-charcoal-500">Auto-picking today's daily question from DB...</p>
                </div>
              ) : isDailyCompleted && !dailyQuestion ? (
                /* Celebration State */
                <div className="py-8 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-institutional-600 text-white flex items-center justify-center text-2xl mx-auto shadow-md">
                    🎉
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-charcoal-900 dark:text-white">
                      {dailyReward?.milestone_title
                        ? `🎉 ${dailyReward.milestone_title.toUpperCase()} UNLOCKED!`
                        : "Today's Daily Challenge Solved!"}
                    </h3>
                    <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-1">
                      {dailyReward?.message || `You solved today's practice challenge! +${dailyReward?.coins_earned || 20} GovCoins added to your wallet.`}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => handleStartFreePractice('Medium')}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white transition-all cursor-pointer shadow-sm"
                    >
                      Practice Another Question (Free Practice)
                    </button>
                  </div>
                </div>
              ) : dailyQuestion ? (
                /* Active Question Arena */
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
                      const isVerified = verificationResult !== null;
                      const isCorrect = verificationResult?.correct_option === opt.id;
                      const isChosenWrong = isVerified && isSelected && !verificationResult?.is_correct;

                      let btnStyle = 'border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:border-institutional-500 hover:bg-institutional-50/30 dark:hover:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200';
                      let badgeStyle = 'bg-charcoal-100 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200';

                      if (isSelected && !isVerified) {
                        btnStyle = 'border-institutional-600 bg-institutional-50/70 dark:bg-institutional-950/70 ring-2 ring-institutional-500/30 text-institutional-950 dark:text-white';
                        badgeStyle = 'bg-institutional-600 text-white';
                      } else if (isVerified) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100';
                          badgeStyle = 'bg-emerald-600 text-white';
                        } else if (isChosenWrong) {
                          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 ring-2 ring-rose-500/30 text-rose-950 dark:text-rose-100';
                          badgeStyle = 'bg-rose-600 text-white';
                        } else {
                          btnStyle = 'opacity-40 border-charcoal-200 dark:border-charcoal-800';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isVerified}
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

                  {/* Solution Panel */}
                  {verificationResult && (
                    <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 ${
                      verificationResult.is_correct
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {verificationResult.is_correct ? (
                          <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircleIcon size={16} /> Correct! (+20 GovCoins added)
                          </span>
                        ) : (
                          <span className="text-rose-800 dark:text-rose-300 flex items-center gap-1">
                            <XCircleIcon size={16} /> Incorrect • Option {verificationResult.selected_option} chosen | Correct: Option {verificationResult.correct_option}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-600 dark:text-charcoal-400">
                        Official TCS iON Solution:
                      </div>
                      <p className="text-xs text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-sans">
                        {verificationResult.solution_explanation}
                      </p>
                    </div>
                  )}

                  {/* Submit Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                    <div className="text-xs text-charcoal-500">
                      {!verificationResult ? (
                        selectedOption ? `Option ${selectedOption} chosen` : 'Select an option above'
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Daily challenge completed</span>
                      )}
                    </div>

                    {!verificationResult ? (
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartFreePractice('Medium')}
                        className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <SparklesIcon size={12} />
                        <span>Practice Another Question</span>
                      </button>
                    )}
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
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {currentWeekDays.map((step) => {
                    const isDone = step.completed;
                    const isToday = step.is_current;
                    const isJackpot = step.is_milestone;

                    return (
                      <div
                        key={step.day_number}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-between transition-all ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : isToday
                            ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-200'
                            : isJackpot
                            ? 'bg-amber-500/10 border-amber-300 text-charcoal-800 dark:text-charcoal-200'
                            : 'bg-charcoal-50 dark:bg-charcoal-800/40 border-charcoal-200/60 dark:border-charcoal-800 text-charcoal-400'
                        }`}
                      >
                        <span className="text-[9px] font-bold">D{step.day_number}</span>
                        <div className="my-1 text-xs">
                          {isDone ? '✓' : isToday ? '🔥' : isJackpot ? '🎁' : '•'}
                        </div>
                        <span className="text-[8px] font-mono font-bold">+{step.coins_reward}</span>
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
              </div>

              {/* Aspirant Diagnostic Callout */}
              <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-charcoal-500 tracking-wider">
                  <span>💡 Diagnostic Recommendation</span>
                </div>
                <p className="text-xs text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-medium">
                  Limiting blind guesses by <strong>10 questions</strong> in your next mock will immediately boost your predicted All-India Rank by over <strong>150 places</strong> under TCS iON negative marking.
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

          {/* FREE PRACTICE MODE (ON-DEMAND INFINITE ACCORDION) */}
          {isFreePracticeActive && (
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
                <div>
                  <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                    <span>Free Practice Arena</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-institutional-50 text-institutional-700 dark:bg-institutional-950 dark:text-institutional-300 font-bold">Infinite Qs</span>
                  </h3>
                  <p className="text-xs text-charcoal-500">Pick any difficulty and practice questions one-by-one with immediate verification.</p>
                </div>

                <div className="flex items-center gap-2">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        setPracticeDifficulty(diff);
                        handleStartFreePractice(diff);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        practiceDifficulty === diff
                          ? 'bg-institutional-600 text-white shadow-xs'
                          : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsFreePracticeActive(false)}
                    className="px-2 py-1 text-xs text-charcoal-400 hover:text-charcoal-700 dark:hover:text-white ml-2 font-bold cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              {practiceLoading ? (
                <div className="py-6 text-center text-xs text-charcoal-500 font-semibold">
                  Fetching random {practiceDifficulty} question...
                </div>
              ) : practiceQuestion ? (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-charcoal-600 dark:text-charcoal-400">
                    {practiceQuestion.subject} • {practiceQuestion.topic}
                  </div>
                  <div className="text-sm font-bold text-charcoal-900 dark:text-white">
                    {practiceQuestion.question_text}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(practiceQuestion.options || []).map((opt) => {
                      const isSelected = practiceSelectedOption === opt.id;
                      const isVerified = practiceVerification !== null;
                      const isCorrect = practiceVerification?.correct_option === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isVerified}
                          onClick={() => setPracticeSelectedOption(opt.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                            isSelected && !isVerified
                              ? 'border-institutional-600 bg-institutional-50/70 dark:bg-institutional-950/70 text-institutional-950 dark:text-white ring-2 ring-institutional-500/30'
                              : isVerified && isCorrect
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100'
                              : 'border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-charcoal-100 dark:bg-charcoal-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {opt.id}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {practiceVerification && (
                    <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-xs space-y-1">
                      <div className="font-bold text-charcoal-900 dark:text-white">
                        {practiceVerification.is_correct ? '✓ Correct Answer!' : `✗ Incorrect (Correct: Option ${practiceVerification.correct_option})`}
                      </div>
                      <p className="text-charcoal-700 dark:text-charcoal-300">{practiceVerification.solution_explanation}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    {!practiceVerification ? (
                      <button
                        type="button"
                        disabled={!practiceSelectedOption}
                        onClick={handleVerifyPracticeAnswer}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartFreePractice(practiceDifficulty)}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white cursor-pointer shadow-xs"
                      >
                        Next Random Question →
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ANALYTICS, SECTIONAL MASTERY & SCORECARDS
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Sectional Accuracy Matrix */}
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                  <BarChart3Icon size={18} className="text-institutional-600" />
                  <span>Sectional Accuracy & Subject Mastery</span>
                </h3>
                <p className="text-xs text-charcoal-500">
                  Calibrated across recent full mocks and speed drills.
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {[
                  { name: 'Quantitative Aptitude', accuracy: 82, questions: '142 / 173', status: 'Strong Area' },
                  { name: 'General Intelligence & Reasoning', accuracy: 91, questions: '168 / 185', status: 'Mastered' },
                  { name: 'English Comprehension', accuracy: 74, questions: '118 / 160', status: 'Good Pace' },
                  { name: 'General Awareness & Current Affairs', accuracy: 64, questions: '96 / 150', status: 'Focus Area' },
                ].map((subj) => (
                  <div key={subj.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-charcoal-800 dark:text-charcoal-200">{subj.name}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-charcoal-400 font-normal">{subj.questions}</span>
                        <span className={`font-black ${
                          subj.accuracy >= 85 ? 'text-emerald-700 dark:text-emerald-400' :
                          subj.accuracy >= 70 ? 'text-amber-700 dark:text-amber-400' :
                          'text-rose-700 dark:text-rose-400'
                        }`}>
                          {subj.accuracy}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-charcoal-100 dark:bg-charcoal-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          subj.accuracy >= 85 ? 'bg-emerald-500' :
                          subj.accuracy >= 70 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${subj.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: TCS iON Question Disposition */}
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                  <TargetIcon size={18} className="text-emerald-600" />
                  <span>TCS iON Attempt Disposition</span>
                </h3>
                <p className="text-xs text-charcoal-500">
                  Attempt behavior under +2.0 / -0.5 negative marking principles.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400 font-mono">142</div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">Correct (+284)</div>
                  <div className="text-[10px] text-charcoal-500 mt-1">79% accuracy</div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                  <div className="text-2xl font-black text-rose-800 dark:text-rose-400 font-mono">24</div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-300 mt-0.5">Negative (-12)</div>
                  <div className="text-[10px] text-charcoal-500 mt-1">Avoid blind guesses</div>
                </div>

                <div className="p-4 rounded-2xl bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-center">
                  <div className="text-2xl font-black text-charcoal-800 dark:text-charcoal-200 font-mono">18</div>
                  <div className="text-xs font-bold text-charcoal-700 dark:text-charcoal-300 mt-0.5">Skipped (0)</div>
                  <div className="text-[10px] text-charcoal-500 mt-1">Strategic skips</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-300 flex items-start gap-2">
                <span className="text-sm">💡</span>
                <span className="leading-snug">
                  <strong>Aspirant Insight:</strong> You lost 12 raw marks to negative guesses. Eliminating wild guesses preserves percentile cutoffs.
                </span>
              </div>
            </div>
          </div>

          {/* Recent Mock Test Scorecards Table */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                  Recent Mock Test Scorecards
                </h3>
                <p className="text-xs text-charcoal-500">
                  Scores, negative marking penalties, and qualified percentiles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="pb-3 pr-4">Mock Test Title</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3 font-mono">Raw Score</th>
                    <th className="pb-3 px-3 font-mono">Accuracy</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                  {(dashboard?.recent_attempts || []).length > 0 ? (
                    dashboard.recent_attempts.map((att) => (
                      <tr key={att.attempt_id} className="hover:bg-charcoal-50 dark:hover:bg-charcoal-800/40 transition-colors">
                        <td className="py-3.5 pr-4 max-w-xs">
                          <div className="font-bold text-charcoal-900 dark:text-white truncate">{att.test_title}</div>
                          {att.ended_reason === 'tab_switch' && (
                            <div className="mt-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                              Ended early: tab switch limit reached.
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-charcoal-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(att.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-charcoal-900 dark:text-white whitespace-nowrap">
                          {att.total_score?.toFixed(1)} / {att.max_possible_score || 50}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {att.accuracy_percentage?.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {att.ended_reason === 'tab_switch' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Tab Switch
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Qualified
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => onSelectAttempt(att.attempt_id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-100 hover:bg-charcoal-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200 transition-colors cursor-pointer"
                          >
                            Scorecard
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-charcoal-400">
                        No recent attempts yet. Launch your first mock test to see detailed analytics!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

              <button
                onClick={() => onNavigate && onNavigate('courses')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 transition-colors cursor-pointer self-start sm:self-auto"
              >
                Browse All Courses →
              </button>
            </div>

            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.id || course.course_id}
                    className="p-5 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/50 dark:bg-charcoal-800/40 hover:border-institutional-400 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active Pass
                        </span>
                        <span className="text-[11px] text-charcoal-400 font-mono">
                          {course.enrolled_at ? new Date(course.enrolled_at).toLocaleDateString() : 'Enrolled'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-charcoal-900 dark:text-white line-clamp-1">
                        {course.course_title || course.title}
                      </h4>

                      {course.tagline && (
                        <p className="text-xs text-charcoal-500 line-clamp-2">
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
                        <span>{course.total_quizzes || 4} Quizzes</span>
                      </span>

                      <button
                        onClick={() => {
                          setActiveCourseModal(course);
                          setSelectedQuizIdx(0);
                          setActiveQuizQuestionIdx(0);
                          setSelectedAnswers({});
                          setShowExplanation(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white shadow-xs transition-all cursor-pointer"
                      >
                        Practice Quizzes →
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
                  onClick={() => onNavigate && onNavigate('courses')}
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
                onClick={() => onNavigate && onNavigate('courses')}
                className="text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline cursor-pointer"
              >
                View All Plans
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exploreCourses.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-800/30 flex flex-col justify-between space-y-3"
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
                    onClick={() => onNavigate && onNavigate('courses')}
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
        <div className="bg-gradient-to-r from-institutional-950 via-charcoal-900 to-institutional-900 border border-charcoal-800 rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
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
                onClick={() => onNavigate && onNavigate('typing')}
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
                Exam Mock Test Library ({filteredTests.length})
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test) => (
              <article
                key={test.id}
                className="p-5 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 hover:border-institutional-400 bg-white dark:bg-charcoal-800/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                      {test.test_type}
                    </span>
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
                    onClick={() => setDashboardRulesModalTest(test)}
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
                      <div className="p-12 text-center text-charcoal-500">
                        No questions available for this subject quiz.
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
                          {currentQ.options.map((opt, optIdx) => {
                            const isChosen = selectedOpt === optIdx;
                            const isCorrect = optIdx === currentQ.correct_answer_index;
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
                                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                                    isAnswered && isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : isAnswered && isChosen && !isCorrect
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                                {isAnswered && isCorrect && (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <SparklesIcon size={13} /> Step-by-Step Derivation
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Correct: Option {String.fromCharCode(65 + currentQ.correct_answer_index)}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-700 dark:text-charcoal-300 leading-relaxed font-sans whitespace-pre-line">
                            {currentQ.explanation}
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

      {/* =========================================================================
          6. PRE-EXAM INSTRUCTIONS & CANDIDATE DECLARATION MODAL
          ========================================================================= */}
      <TestRulesModal
        test={dashboardRulesModalTest}
        isOpen={!!dashboardRulesModalTest}
        onClose={() => setDashboardRulesModalTest(null)}
        onStartExam={(test) => onStartTest(test.id || test)}
      />
    </div>
  );
};
