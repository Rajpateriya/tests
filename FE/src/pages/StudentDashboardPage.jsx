import React, { useState, useEffect } from 'react';
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
  UserIcon,
  BellIcon,
  FlameIcon,
  PlayIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FilterIcon,
  StarIcon,
  ShieldIcon,
  ZapIcon,
  CrownIcon,
  CheckIcon,
  CameraIcon,
} from '../components/Icons';

/**
 * Competitive Mock Test Platform — Student Profile & Daily Practice Arena
 *
 * Core Features:
 * 1. Today's Daily Practice Challenge: Exactly ONE high-yield question auto-picked from DB.
 *    - Clearly labeled with its difficulty tag (Easy / Medium / Hard).
 *    - High-contrast, crystal-clear buttons and typography in BOTH Light & Dark modes.
 *    - Instant DB verification with step-by-step official TCS iON explanation.
 *    - Automatically advances streak and awards GovCoins (+20 daily, +100 to +500 on milestone jackpots).
 *    - Infinite Free Practice Mode on-demand.
 * 2. Aspirant Identity & Exam Readiness Metrics (Predicted AIR, Net Accuracy with Negative Marking, Speed).
 * 3. 30-Day Study Discipline Roadmap & Horizontally Scrollable Monthly Habit Calendar.
 * 4. Sectional Mastery & Diagnostic Weak Areas (Quant, Reasoning, English, General Awareness).
 * 5. Recent Mock Test Scorecards & Test Library.
 */
export const StudentDashboardPage = ({ onSelectAttempt, onStartTest, onNavigate }) => {
  const { user, updateCoins, updateProfile } = useAuth();

  // Avatar upload state & feedback
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarToast, setAvatarToast] = useState(null);

  // Horizontal roadmap scroll ref
  const roadmapScrollRef = React.useRef(null);

  const handleScrollRoadmap = (direction) => {
    if (roadmapScrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      roadmapScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleJumpToToday = () => {
    if (roadmapScrollRef.current) {
      const activeEl = roadmapScrollRef.current.querySelector('[data-active-day="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

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
            setAvatarToast({ type: 'success', message: 'Profile photo updated successfully!' });
            setTimeout(() => setAvatarToast(null), 3000);
          } catch (updateErr) {
            console.error('Failed to save profile picture:', updateErr);
            setAvatarToast({ type: 'error', message: 'Failed to save profile picture.' });
          } finally {
            setAvatarUploading(false);
          }
        };
        img.onerror = () => {
          setAvatarToast({ type: 'error', message: 'Failed to process image file.' });
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

  // General Dashboard & Test Data
  const [dashboard, setDashboard] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

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

      // Check if user already solved today
      if (streakRes?.today_completed) {
        setIsDailyCompleted(true);
      }

      // Load today's single practice challenge question
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
      // Exactly 1 random question auto-picked from DB
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

      // Register completion in backend to advance streak and award coins
      const rewardRes = await api.streak.solveDailyQuiz({
        correct_count: res.is_correct ? 1 : 0,
        total_count: 1,
      });
      setDailyReward(rewardRes);

      // Update coins in auth context and refresh streak
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

  // Free Practice On-Demand Question Flow
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-800 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>Easy</span>
        </span>
      );
    }
    if (diff === 'HARD') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-400 dark:border-rose-800 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" />
          <span>Hard</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-800 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
        <span>Medium</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
          Loading Aspirant Performance Dashboard...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Calibrating exam readiness scores and question bank...
        </p>
      </div>
    );
  }

  const streakDays = streakData?.current_streak ?? 6;
  const coinsBalance = user?.profile?.coins_balance ?? streakData?.coins_balance ?? 150;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. TOP HERO & ASPIRANT IDENTITY BANNER */}
      <section className="border-b border-slate-200 dark:border-charcoal-800 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Aspirant Identity with Image Upload & Multi-Target Exams */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-md">
                  <div className="w-full h-full bg-white dark:bg-charcoal-900 rounded-[14px] flex items-center justify-center font-extrabold text-2xl text-blue-600 dark:text-blue-400 overflow-hidden relative">
                    {user?.profile?.avatar_url ? (
                      <img
                        src={user.profile.avatar_url}
                        alt={user?.full_name || 'Aspirant Avatar'}
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                    ) : (
                      <span>{user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}</span>
                    )}

                    {/* Interactive Camera Hover Overlay */}
                    <label
                      htmlFor="aspirant-avatar-upload"
                      className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-[2px] text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer select-none"
                      title="Upload or Change Profile Photo"
                    >
                      <CameraIcon size={18} />
                      <span className="text-[10px] font-bold mt-0.5">Upload</span>
                    </label>

                    {/* Uploading Spinner */}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-charcoal-900/80 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Quick Action Badge */}
                <label
                  htmlFor="aspirant-avatar-upload"
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white border-2 border-white dark:border-charcoal-900 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  title="Upload / Change Photo"
                >
                  <CameraIcon size={12} />
                </label>

                {/* Hidden File Input */}
                <input
                  id="aspirant-avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {user?.full_name || 'Alex Aspirant'}
                  </h1>

                  {/* Verified Role Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs">
                    <ShieldIcon size={12} className="text-blue-600" />
                    {user?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED ASPIRANT'}
                  </span>

                  {/* Dynamic Target Exam Tags (Supports Multi-Selection from Registration) */}
                  {(user?.profile?.target_exams && user.profile.target_exams.length > 0
                    ? user.profile.target_exams
                    : ['SSC CGL Tier-1 2026']
                  ).map((exam) => (
                    <span
                      key={exam}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-charcoal-800 dark:text-slate-200 border border-slate-200 dark:border-charcoal-700 shadow-xs hover:border-amber-400/60 transition-colors"
                    >
                      <TargetIcon size={12} className="text-amber-500" />
                      {exam}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-medium">
                  <span>{user?.email}</span>
                  <span>•</span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                    <ClockIcon size={12} /> Target Exam in 42 Days
                  </span>
                </p>

                {/* Avatar upload feedback toast */}
                {avatarToast && (
                  <div
                    className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-md inline-block ${
                      avatarToast.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {avatarToast.message}
                  </div>
                )}
              </div>
            </div>

            {/* GovCoins Wallet & Subscription Action */}
            <div className="flex flex-wrap items-center gap-3">
              {/* GovCoins Wallet Pill */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 shadow-xs">
                <span className="text-lg">🪙</span>
                <div>
                  <div className="text-xs font-black tracking-tight leading-tight flex items-center gap-1">
                    <span>{coinsBalance}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">GovCoins</span>
                  </div>
                  <div className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                    = ₹{coinsBalance} off any pass
                  </div>
                </div>
              </div>

              {/* Redeem for Pass CTA */}
              <button
                onClick={() => onNavigate && onNavigate('subscription')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <CrownIcon size={14} />
                <span>Redeem Coins for Pass</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ROW 1: EXAM PERFORMANCE PULSE METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: All India Rank Standing */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Predicted All-India Rank
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 flex items-baseline gap-1.5 font-mono">
                <span>#420</span>
                <span className="text-xs font-normal text-slate-400">/ 12,450</span>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                <span>↑ Top 3.4% Percentile</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">(Safe Cutoff Zone)</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrophyIcon size={20} />
            </div>
          </div>

          {/* Card 2: Net Mock Accuracy (with negative marking) */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Net Mock Accuracy
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 font-mono">
                79.4%
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1">
                TCS iON Marking: +2.0 / -0.5
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TargetIcon size={20} />
            </div>
          </div>

          {/* Card 3: Average Speed per Question */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Avg Speed per Question
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1 font-mono">
                48s <span className="text-xs font-normal text-slate-400">/ Q</span>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                ⚡ 12s faster than cutoff pace
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClockIcon size={20} />
            </div>
          </div>

          {/* Card 4: Daily Study Streak */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Study Discipline Streak
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center gap-1.5">
                <span>{streakDays} Days</span>
                <span className="text-xl">🔥</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                {isDailyCompleted ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Today's goal completed! ✓</span>
                ) : (
                  <span>Solve today's question for +100 bonus!</span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <FlameIcon size={20} />
            </div>
          </div>
        </section>

        {/* ROW 2: THE STAR COMPONENT — TODAY'S DAILY PRACTICE CHALLENGE (EXACTLY 1 QUESTION) */}
        <section className="bg-white dark:bg-charcoal-900 border-2 border-blue-500/40 dark:border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-charcoal-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase bg-blue-600 text-white tracking-wider">
                  Daily Challenge
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Today's Daily Practice Challenge</span>
                  <span className="text-amber-500">⚡</span>
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                1 high-yield practice question auto-picked from the Question Bank. Solve to maintain your daily study streak and earn GovCoins!
              </p>
            </div>

            {/* Status / Difficulty Pill */}
            <div className="flex items-center gap-3">
              {dailyQuestion && getDifficultyBadge(dailyQuestion.difficulty)}
              {isDailyCompleted && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Completed ✓
                </span>
              )}
            </div>
          </div>

          {/* ACTIVE QUIZ ARENA */}
          {questionLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Auto-picking today's daily question from the Question Bank...</p>
            </div>
          ) : isDailyCompleted && !dailyQuestion ? (
            /* CELEBRATION / COMPLETED STATE */
            <div className="py-10 text-center space-y-5 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg animate-bounce">
                🎉
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {dailyReward?.milestone_title
                    ? `🎉 ${dailyReward.milestone_title.toUpperCase()} JACKPOT UNLOCKED!`
                    : dailyReward?.is_milestone || dailyReward?.is_7day_milestone
                    ? '🎉 MILESTONE JACKPOT UNLOCKED!'
                    : "Today's Daily Challenge Solved!"}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 font-medium">
                  {dailyReward?.message || `You solved today's practice challenge! +${dailyReward?.coins_earned || 20} GovCoins added to your wallet.`}
                </p>
              </div>

              {/* Reward Highlights */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-700 text-left">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Discipline Streak</div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                    {dailyReward?.current_streak || streakDays} Days 🔥
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Coins Rewarded</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                    +{dailyReward?.coins_earned || 120} 🪙
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate && onNavigate('subscription')}
                  className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CrownIcon size={14} />
                  <span>Use Coins on Subscription Pass</span>
                </button>
                <button
                  onClick={() => handleStartFreePractice('Medium')}
                  className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <SparklesIcon size={14} />
                  <span>Practice Another Question (Free Practice)</span>
                </button>
              </div>
            </div>
          ) : dailyQuestion ? (
            /* SINGLE QUESTION VIEW */
            <div className="pt-6 space-y-6">
              {/* Question Header & Timer */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {getDifficultyBadge(dailyQuestion.difficulty)}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {dailyQuestion.subject} • {dailyQuestion.topic}
                  </span>
                </div>

                {/* Stopwatch Timer */}
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-charcoal-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-charcoal-700">
                  <ClockIcon size={14} className="text-amber-500" />
                  <span>{questionTimer}s spent</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed font-sans bg-slate-50 dark:bg-charcoal-800/60 p-5 rounded-2xl border border-slate-200 dark:border-charcoal-700">
                {dailyQuestion.question_text}
              </div>

              {/* 4 Options (A, B, C, D) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(dailyQuestion.options || []).map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isVerified = verificationResult !== null;
                  const isCorrect = verificationResult?.correct_option === opt.id;
                  const isChosenWrong = isVerified && isSelected && !verificationResult?.is_correct;

                  let cardStyle =
                    'border-slate-300 dark:border-charcoal-700 hover:border-blue-600 hover:bg-blue-50/60 dark:hover:bg-charcoal-750 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-slate-100 shadow-xs';
                  let badgeStyle =
                    'bg-slate-100 dark:bg-charcoal-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-charcoal-600';

                  if (isSelected && !isVerified) {
                    cardStyle =
                      'border-blue-600 dark:border-blue-500 bg-blue-50/90 dark:bg-blue-950/70 ring-2 ring-blue-500/40 text-blue-950 dark:text-white shadow-sm';
                    badgeStyle = 'bg-blue-600 text-white';
                  } else if (isVerified) {
                    if (isCorrect) {
                      cardStyle =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 ring-2 ring-emerald-500/40 text-emerald-950 dark:text-emerald-100';
                      badgeStyle = 'bg-emerald-600 text-white';
                    } else if (isChosenWrong) {
                      cardStyle =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/70 ring-2 ring-rose-500/40 text-rose-950 dark:text-rose-100';
                      badgeStyle = 'bg-rose-600 text-white';
                    } else {
                      cardStyle = 'opacity-40 border-slate-300 dark:border-charcoal-700 text-slate-700 dark:text-slate-300';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isVerified}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 text-xs sm:text-sm font-semibold cursor-pointer ${cardStyle}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-xs ${badgeStyle}`}
                      >
                        {opt.id}
                      </div>
                      <span className="flex-1 leading-snug pt-0.5">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* OFFICIAL SOLUTION & EXPLANATION PANEL */}
              {verificationResult && (
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-2.5 ${
                    verificationResult.is_correct
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-extrabold">
                    {verificationResult.is_correct ? (
                      <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircleIcon size={18} /> Correct Answer! (+20 GovCoins Awarded)
                      </span>
                    ) : (
                      <span className="text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <XCircleIcon size={18} /> Incorrect • Your Answer: Option {verificationResult.selected_option} | Correct: Option {verificationResult.correct_option}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Official TCS iON Solution & Explanation:
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed mt-1 font-sans">
                      {verificationResult.solution_explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* SUBMIT ANSWER ACTION BAR (ROCK-SOLID CONTRAST IN LIGHT & DARK MODE) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-charcoal-800">
                <div className="text-xs font-semibold">
                  {!verificationResult ? (
                    selectedOption ? (
                      <span className="text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1.5">
                        <CheckCircleIcon size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Option {selectedOption} chosen — Ready to Submit!</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <span className="text-amber-500">👉</span>
                        <span>Select Option A, B, C, or D above to submit</span>
                      </span>
                    )
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircleIcon size={15} />
                      <span>Daily challenge verified and recorded</span>
                    </span>
                  )}
                </div>

                {!verificationResult ? (
                  <button
                    type="button"
                    disabled={!selectedOption || isVerifying}
                    onClick={handleVerifyAnswer}
                    className="px-8 py-3 text-sm font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating Answer...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <ArrowRightIcon size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartFreePractice('Medium')}
                    className="px-6 py-3 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <SparklesIcon size={14} />
                    <span>Practice Another Question →</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400">
              No daily question available. Click below to load a question.
              <div className="mt-3">
                <button
                  onClick={loadDailyQuestion}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer"
                >
                  Reload Question
                </button>
              </div>
            </div>
          )}
        </section>

        {/* FREE PRACTICE MODAL / INLINE ON-DEMAND ACCORDION */}
        {isFreePracticeActive && (
          <section className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-charcoal-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Free Practice Arena (Infinite Questions)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold">One by One</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Pick any difficulty and practice randomly sampled mock exam questions from the database.
                </p>
              </div>

              {/* Difficulty selector */}
              <div className="flex items-center gap-2">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => {
                      setPracticeDifficulty(diff);
                      handleStartFreePractice(diff);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      practiceDifficulty === diff
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
                <button
                  onClick={() => setIsFreePracticeActive(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 ml-2 cursor-pointer font-bold"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {practiceLoading ? (
              <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold">
                Fetching random {practiceDifficulty} question from database...
              </div>
            ) : practiceQuestion ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-xs">
                  {getDifficultyBadge(practiceQuestion.difficulty)}
                  <span className="font-bold text-slate-700 dark:text-slate-300">{practiceQuestion.subject} • {practiceQuestion.topic}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
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
                        className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected && !isVerified
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/40 text-blue-950 dark:text-white shadow-xs'
                            : isVerified && isCorrect
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100'
                            : 'border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-slate-100 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-charcoal-750'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-charcoal-700 text-slate-900 dark:text-slate-100 font-extrabold flex items-center justify-center shrink-0 border border-slate-300 dark:border-charcoal-600">
                          {opt.id}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {practiceVerification && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-charcoal-800/80 border border-slate-200 dark:border-charcoal-700 text-xs space-y-1">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {practiceVerification.is_correct ? '✓ Correct Answer!' : `✗ Incorrect (Correct: Option ${practiceVerification.correct_option})`}
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">{practiceVerification.solution_explanation}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {!practiceVerification ? (
                    <button
                      type="button"
                      disabled={!practiceSelectedOption}
                      onClick={handleVerifyPracticeAnswer}
                      className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartFreePractice(practiceDifficulty)}
                      className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm"
                    >
                      Next Random Question →
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* ROW 3: 30-DAY STUDY DISCIPLINE ROADMAP & MONTHLY HABIT CALENDAR */}
        <section className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FlameIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>30-Day Study Discipline Roadmap</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Monthly Habit Calendar
                    </span>
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Build competitive exam consistency across 30 days. Earn +20 GovCoins daily and unlock 5 progressive Milestone Jackpots (+100 to +500 🪙) as you progress toward your target exam!
              </p>
            </div>

            {/* Streak Counter & Horizontal Navigation Controls */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5 font-mono shadow-xs">
                <span>🔥</span>
                <span>Streak: {streakDays} Days</span>
              </div>

              {/* Jump to Today Button */}
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-charcoal-700 transition-colors cursor-pointer flex items-center gap-1"
                title="Scroll horizontally to today's active challenge"
              >
                <TargetIcon size={13} className="text-amber-500" />
                <span>Jump to Today</span>
              </button>

              {/* Horizontal Scroll Arrow Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-charcoal-800 p-1 rounded-xl border border-slate-200 dark:border-charcoal-700">
                <button
                  type="button"
                  onClick={() => handleScrollRoadmap('left')}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-charcoal-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-xs cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollRoadmap('right')}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-charcoal-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-xs cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontally Scrollable 30-Day Habit Timeline */}
          {(() => {
            const timelineList = (streakData?.timeline && streakData.timeline.length === 30)
              ? streakData.timeline
              : Array.from({ length: 30 }, (_, idx) => {
                  const d = idx + 1;
                  const isDone = d <= streakDays;
                  const isToday = d === (streakDays + 1) && !isDailyCompleted;
                  const isMilestone = [7, 14, 21, 28, 30].includes(d);
                  const milestoneRewards = { 7: 120, 14: 170, 21: 220, 28: 320, 30: 520 };
                  const milestoneTitles = {
                    7: 'Week 1 Habit',
                    14: 'Fortnight Anchor',
                    21: 'Discipline Master',
                    28: 'Focus Champion',
                    30: 'Grand Monthly Master',
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

            const completedCount = timelineList.filter((s) => s.completed).length;
            const progressPercent = Math.round((completedCount / 30) * 100);
            const nextMilestone = timelineList.find((s) => s.is_milestone && !s.completed);

            return (
              <div className="space-y-4">
                {/* Horizontal Scroll Track */}
                <div
                  ref={roadmapScrollRef}
                  className="flex items-stretch gap-3 overflow-x-auto scroll-smooth py-3 px-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-charcoal-700"
                >
                  {timelineList.map((step) => {
                    const isDone = step.completed;
                    const isToday = step.is_current;
                    const isJackpot = step.is_milestone;

                    return (
                      <div
                        key={step.day_number}
                        data-active-day={isToday}
                        className={`min-w-[125px] sm:min-w-[135px] flex-shrink-0 flex flex-col justify-between items-center p-3.5 rounded-2xl border text-center transition-all relative ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-300 shadow-xs'
                            : isToday
                            ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-200 scale-[1.03] shadow-md z-10'
                            : isJackpot
                            ? step.day_number === 30
                              ? 'bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-amber-500/15 border-purple-400/50 text-slate-800 dark:text-slate-100 shadow-xs'
                              : 'bg-gradient-to-b from-amber-500/10 to-blue-500/10 border-amber-400/40 text-slate-800 dark:text-slate-200 shadow-xs'
                            : 'bg-slate-50 dark:bg-charcoal-800/40 border-slate-200 dark:border-charcoal-800 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {/* Milestone / Today Ribbon Badge */}
                        {isToday ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                            Active Today
                          </span>
                        ) : isJackpot ? (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border shadow-2xs ${
                            step.day_number === 30
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {step.milestone_badge || 'JACKPOT'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {step.label}
                          </span>
                        )}

                        {/* Status Icon Indicator */}
                        <div className="my-2.5">
                          {isDone ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                              ✓
                            </div>
                          ) : isToday ? (
                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm shadow-md animate-pulse">
                              🔥
                            </div>
                          ) : isJackpot ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs ${
                              step.day_number === 30 ? 'bg-gradient-to-tr from-purple-600 to-amber-500 text-white animate-bounce' : 'bg-amber-500 text-white'
                            }`}>
                              {step.day_number === 30 ? '👑' : '🎁'}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-charcoal-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-xs font-bold">
                              {step.day_number}
                            </div>
                          )}
                        </div>

                        {/* Milestone Description or Status Note */}
                        {step.milestone_title ? (
                          <span className="text-[9px] font-extrabold truncate max-w-full text-slate-800 dark:text-slate-200 mb-1">
                            {step.milestone_title}
                          </span>
                        ) : null}

                        {/* Reward Tag */}
                        <div className="w-full pt-1 border-t border-slate-200/50 dark:border-charcoal-750 flex items-center justify-center gap-1 font-mono text-xs font-black">
                          <span>+{step.coins_reward}</span>
                          <span>🪙</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly Consistency Progress Strip */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-750 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-xs">
                      <span>Monthly Consistency Habit: {completedCount} / 30 Days Completed</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{progressPercent}% Completed</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-charcoal-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(progressPercent, 4))}%` }}
                      />
                    </div>
                  </div>

                  {nextMilestone && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 font-semibold self-start sm:self-auto shrink-0">
                      <span>🎁</span>
                      <span>Next Jackpot: <strong className="font-bold">{nextMilestone.label} (+{nextMilestone.coins_reward} 🪙)</strong> in {Math.max(1, nextMilestone.day_number - streakDays)} days!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </section>

        {/* ROW 4: SECTIONAL ACCURACY & SUBJECT MASTERY (COMPETITIVE EXAM SPECIFIC) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Subject Mastery Matrix */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3Icon size={18} className="text-blue-600" />
                <span>Sectional Accuracy & Subject Mastery</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Performance calibrated across recent full mocks and sectional speed tests.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {[
                { name: 'Quantitative Aptitude', accuracy: 82, questions: '142 / 173', status: 'Strong Area', color: 'emerald' },
                { name: 'General Intelligence & Reasoning', accuracy: 91, questions: '168 / 185', status: 'Mastered', color: 'emerald' },
                { name: 'English Comprehension', accuracy: 74, questions: '118 / 160', status: 'Good Pace', color: 'amber' },
                { name: 'General Awareness & Current Affairs', accuracy: 64, questions: '96 / 150', status: 'Focus Area', color: 'rose' },
              ].map((subj) => (
                <div key={subj.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">{subj.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 font-normal">{subj.questions}</span>
                      <span className={`font-black ${
                        subj.accuracy >= 85 ? 'text-emerald-700 dark:text-emerald-400' :
                        subj.accuracy >= 70 ? 'text-amber-700 dark:text-amber-400' :
                        'text-rose-700 dark:text-rose-400'
                      }`}>
                        {subj.accuracy}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-charcoal-800 overflow-hidden">
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

          {/* Right: Mock Exam Question Breakdown & Speed Benchmarking */}
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TargetIcon size={18} className="text-emerald-600" />
                <span>Mock Exam Question Disposition</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Attempt behavior analysis based on TCS iON negative marking principles.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400 font-mono">142</div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">Correct (+284)</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">79% accuracy</div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <div className="text-2xl font-black text-rose-800 dark:text-rose-400 font-mono">24</div>
                <div className="text-xs font-bold text-rose-900 dark:text-rose-300 mt-0.5">Negative (-12)</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">Avoid blind guesses</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-charcoal-800 border border-slate-200 dark:border-charcoal-700 text-center">
                <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono">18</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Skipped (0)</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">Strategic skips</div>
              </div>
            </div>

            {/* Diagnostic advice callout */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-300 flex items-start gap-2">
              <span className="text-sm">💡</span>
              <span className="leading-snug font-medium">
                <strong>Aspirant Insight:</strong> Reducing your 24 negative attempts by just 10 questions would increase your predicted All-India Rank by over 150 places!
              </span>
            </div>
          </div>
        </section>

        {/* ROW 5: RECENT MOCK ATTEMPTS & SCORECARDS TABLE */}
        <section className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-charcoal-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recent Mock Test Scorecards
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Detailed test scores, negative marking breakdown, and percentile standings.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-charcoal-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3 pr-4">Mock Test Title</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3 font-mono">Raw Score</th>
                  <th className="pb-3 px-3 font-mono">Accuracy</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 pl-3 text-right">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                {(dashboard?.recent_attempts || []).length > 0 ? (
                  dashboard.recent_attempts.map((att) => (
                    <tr key={att.attempt_id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/40 transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {att.test_title}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(att.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {att.total_score?.toFixed(1)} / {att.max_possible_score || 50}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {att.accuracy_percentage?.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Qualified
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectAttempt(att.attempt_id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-charcoal-700 bg-slate-100 hover:bg-slate-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          View Scorecard
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No recent mock attempts yet. Launch your first full-length mock below to start benchmarking!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ROW 6: AVAILABLE MOCK TESTS LIBRARY & SPEED DRILLS */}
        <section className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-charcoal-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Exam Mock Test Library
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Full-Length Mocks, Sectional Speed Tests, and Topic Drills calibrated to the latest exam syllabus.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'FULL', 'SUBJECT', 'TOPIC_MINI'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setSelectedFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === filterKey
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-charcoal-750'
                  }`}
                >
                  {filterKey === 'ALL'
                    ? 'All Mocks'
                    : filterKey === 'FULL'
                    ? 'Full Tests'
                    : filterKey === 'SUBJECT'
                    ? 'Sectional'
                    : 'Topic Drills'}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test) => (
              <article
                key={test.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-charcoal-800 hover:border-blue-500/50 bg-white dark:bg-charcoal-800/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                      {test.test_type}
                    </span>
                    {getDifficultyBadge(test.difficulty)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 line-clamp-1">
                    {test.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                    {test.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-charcoal-700 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span>⏱ {test.duration_minutes}m</span>
                    <span>•</span>
                    <span>📝 {test.total_questions} Qs</span>
                  </div>
                  <button
                    onClick={() => onStartTest(test.id)}
                    className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlayIcon size={12} />
                    <span>Start Test</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};
