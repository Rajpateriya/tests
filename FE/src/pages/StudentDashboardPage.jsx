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
  FilterIcon,
  StarIcon,
  ShieldIcon,
  ZapIcon,
  CrownIcon,
  CheckIcon,
} from '../components/Icons';

/**
 * Architected Student Profile & Exam Prep Dashboard
 * Tailored specifically for Competitive & Mock Test Examination Platforms (SSC, Banking, UPSC, Railways, TCS iON pattern).
 *
 * Core Pillars:
 * 1. Aspirant Identity & Exam Readiness Index (Predicted AIR, Net Accuracy with Negative Marking, Speed).
 * 2. Daily Practice Booster Arena:
 *    - Auto-picks 3 questions randomly from DB (Easy -> Medium -> Hard).
 *    - Solved one by one with live timer, interactive choice selection, instant DB verification,
 *      and step-by-step official solution explanation.
 *    - Advances daily streak & awards +20 daily coins (+100 milestone bonus on Day 7!).
 *    - Free Practice Mode for unlimited one-by-one random questions from DB.
 * 3. 7-Day Consistency & Habit Roadmap (Day 1 to Day 7 milestone with coin rewards).
 * 4. Sectional Mastery & Diagnostic Weak Areas (Quant, Reasoning, English, General Awareness).
 * 5. Recent Mock Test Scorecards & Quick Test Launch Library.
 */
export const StudentDashboardPage = ({ onSelectAttempt, onStartTest, onNavigate }) => {
  const { user, updateCoins } = useAuth();

  // General Dashboard & Test Data
  const [dashboard, setDashboard] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Daily Quiz Booster State (One-by-One Engine)
  const [boosterQuestions, setBoosterQuestions] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [answersSummary, setAnswersSummary] = useState([]); // [{ question_id, is_correct, selected, correct }]
  const [isBoosterCompleted, setIsBoosterCompleted] = useState(false);
  const [boosterReward, setBoosterReward] = useState(null);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [boosterLoading, setBoosterLoading] = useState(false);

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
    if (!isBoosterCompleted && !verificationResult && boosterQuestions.length > 0) {
      interval = setInterval(() => {
        setQuestionTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBoosterCompleted, verificationResult, boosterQuestions]);

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

      // Load Daily Booster Questions (Easy, Medium, Hard from DB)
      await loadBoosterQuestions();
    } catch (err) {
      console.warn('Dashboard data fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoosterQuestions = async () => {
    setBoosterLoading(true);
    try {
      const questions = await api.streak.getDailyBoosterQuestions({ count: 3 });
      if (questions && questions.length > 0) {
        setBoosterQuestions(questions);
        setCurrentStepIndex(0);
        setSelectedOption(null);
        setVerificationResult(null);
        setAnswersSummary([]);
        setQuestionTimer(0);
      }
    } catch (err) {
      console.error('Failed to load booster questions:', err);
    } finally {
      setBoosterLoading(false);
    }
  };

  // Submit & Verify single question answer in Daily Booster
  const handleVerifyAnswer = async () => {
    if (!selectedOption || !currentQuestion) return;
    setIsVerifying(true);
    try {
      const res = await api.streak.verifyQuizAnswer({
        question_id: currentQuestion.id,
        selected_option: selectedOption,
      });
      setVerificationResult(res);
      setAnswersSummary((prev) => [
        ...prev,
        {
          question_id: currentQuestion.id,
          step: currentStepIndex + 1,
          difficulty: currentQuestion.difficulty,
          is_correct: res.is_correct,
          selected: selectedOption,
          correct: res.correct_option,
          explanation: res.solution_explanation,
        },
      ]);
    } catch (err) {
      console.error('Answer verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Move to next question or complete Daily Booster
  const handleProceedNext = async () => {
    if (currentStepIndex < boosterQuestions.length - 1) {
      // Advance to next question (e.g. Medium or Hard)
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOption(null);
      setVerificationResult(null);
      setQuestionTimer(0);
    } else {
      // All 3 questions completed! Finalize Daily Booster in backend
      setIsBoosterCompleted(true);
      try {
        const correctCount = answersSummary.filter((a) => a.is_correct).length;
        const totalCount = boosterQuestions.length;
        const rewardRes = await api.streak.solveDailyQuiz({
          correct_count: correctCount,
          total_count: totalCount,
        });
        setBoosterReward(rewardRes);

        // Update auth context coin balance and refresh streak
        if (rewardRes.coins_balance !== undefined) {
          updateCoins(rewardRes.coins_balance);
        }
        const updatedStreak = await api.streak.getStreak();
        setStreakData(updatedStreak);
      } catch (err) {
        console.error('Failed to record daily completion:', err);
      }
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

  const currentQuestion = boosterQuestions[currentStepIndex] || null;

  const filteredTests = availableTests.filter((test) => {
    if (selectedFilter === 'ALL') return true;
    return test.test_type === selectedFilter;
  });

  const getDifficultyBadge = (difficulty = 'MEDIUM') => {
    const diff = (difficulty || 'MEDIUM').toUpperCase();
    if (diff === 'EASY') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Easy
        </span>
      );
    }
    if (diff === 'HARD') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Hard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Medium
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-900 dark:text-charcoal-100">
          Loading Aspirant Performance Dashboard...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">
          Calibrating exam readiness scores and question bank...
        </p>
      </div>
    );
  }

  const streakDays = streakData?.current_streak ?? 6;
  const coinsBalance = user?.coins_balance ?? streakData?.coins_balance ?? 150;
  const isTodayAlreadyDone = streakData?.today_completed || isBoosterCompleted;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 text-charcoal-900 dark:text-charcoal-100 transition-colors">
      {/* 1. TOP HERO & ASPIRANT IDENTITY BANNER */}
      <section className="border-b border-charcoal-200/80 dark:border-charcoal-800/80 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Aspirant Identity */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-amber-500 p-0.5 shadow-md">
                  <div className="w-full h-full bg-white dark:bg-charcoal-900 rounded-[14px] flex items-center justify-center font-extrabold text-xl text-primary-600 dark:text-primary-400">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-charcoal-900 rounded-full flex items-center justify-center text-[10px] text-white font-bold" title="Active Aspirant">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
                    {user?.full_name || 'Alex Aspirant'}
                  </h1>

                  {/* Verified Role Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800 shadow-xs">
                    <ShieldIcon size={12} className="text-primary-500" />
                    {user?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED ASPIRANT'}
                  </span>

                  {/* Target Exam Tag */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-charcoal-100 text-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-300">
                    <TargetIcon size={12} className="text-amber-500" />
                    SSC CGL Tier-1 2026
                  </span>
                </div>

                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5 flex items-center gap-2">
                  <span>{user?.email}</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <ClockIcon size={12} /> Target Exam in 42 Days
                  </span>
                </p>
              </div>
            </div>

            {/* GovCoins Wallet & Subscription Action */}
            <div className="flex flex-wrap items-center gap-3">
              {/* GovCoins Wallet Pill */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 shadow-xs">
                <span className="text-lg">🪙</span>
                <div>
                  <div className="text-xs font-black tracking-tight leading-tight flex items-center gap-1">
                    <span>{coinsBalance}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">GovCoins</span>
                  </div>
                  <div className="text-[10px] text-amber-800/70 dark:text-amber-300/70 font-medium">
                    = ₹{coinsBalance} off any exam pass
                  </div>
                </div>
              </div>

              {/* Redeem for Pass CTA */}
              <button
                onClick={() => onNavigate && onNavigate('subscription')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
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
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                Predicted All-India Rank
              </div>
              <div className="text-2xl font-black text-charcoal-900 dark:text-charcoal-50 mt-1 flex items-baseline gap-1.5 font-mono">
                <span>#420</span>
                <span className="text-xs font-normal text-charcoal-400">/ 12,450</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <span>↑ Top 3.4% Percentile</span>
                <span className="text-charcoal-400 font-normal">(Safe Cutoff Zone)</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <TrophyIcon size={20} />
            </div>
          </div>

          {/* Card 2: Net Mock Accuracy (with negative marking) */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                Net Mock Accuracy
              </div>
              <div className="text-2xl font-black text-charcoal-900 dark:text-charcoal-50 mt-1 font-mono">
                79.4%
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium mt-1">
                TCS iON Marking: +2.0 / -0.5
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TargetIcon size={20} />
            </div>
          </div>

          {/* Card 3: Average Speed per Question */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                Avg Speed per Question
              </div>
              <div className="text-2xl font-black text-charcoal-900 dark:text-charcoal-50 mt-1 font-mono">
                48s <span className="text-xs font-normal text-charcoal-400">/ Q</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                ⚡ 12s faster than cutoff pace
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClockIcon size={20} />
            </div>
          </div>

          {/* Card 4: Daily Study Streak */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
                Study Discipline Streak
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center gap-1.5">
                <span>{streakDays} Days</span>
                <span className="text-xl">🔥</span>
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium mt-1">
                {isTodayAlreadyDone ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Today's goal completed! ✓</span>
                ) : (
                  <span>1 day left for +100 Coins Milestone</span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <FlameIcon size={20} />
            </div>
          </div>
        </section>

        {/* ROW 2: THE STAR COMPONENT - DAILY PRACTICE BOOSTER (ONE-BY-ONE FROM DB) */}
        <section className="bg-white dark:bg-charcoal-900 border-2 border-primary-500/30 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-charcoal-200 dark:border-charcoal-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-primary-500 text-white tracking-wide">
                  Daily Booster
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-charcoal-900 dark:text-charcoal-100 flex items-center gap-2">
                  <span>Today's Daily Practice Challenge</span>
                  <span className="text-amber-500">⚡</span>
                </h2>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
                3 high-yield questions randomly selected from the Question Bank (Easy → Medium → Hard). Solve one-by-one to maintain your study streak and earn GovCoins!
              </p>
            </div>

            {/* Stepper Tabs: Easy -> Medium -> Hard */}
            <div className="flex items-center gap-2 bg-charcoal-100 dark:bg-charcoal-800/80 p-1.5 rounded-2xl self-start sm:self-auto">
              {[
                { label: '1. Easy', diff: 'Easy' },
                { label: '2. Medium', diff: 'Medium' },
                { label: '3. Hard', diff: 'Hard' },
              ].map((step, idx) => {
                const isCurrent = currentStepIndex === idx && !isBoosterCompleted;
                const isPassed = currentStepIndex > idx || isBoosterCompleted;
                const answered = answersSummary[idx];

                return (
                  <div
                    key={step.label}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500/30'
                        : isPassed
                        ? answered?.is_correct
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'text-charcoal-400 dark:text-charcoal-500 opacity-70'
                    }`}
                  >
                    <span>{step.label}</span>
                    {isPassed && (
                      <span className="text-[10px] font-black">
                        {answered?.is_correct ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE QUIZ ARENA */}
          {boosterLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-charcoal-500">Auto-picking today's 3 questions from Question Bank...</p>
            </div>
          ) : isBoosterCompleted ? (
            /* CELEBRATION / COMPLETED STATE */
            <div className="py-10 text-center space-y-5 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-primary-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg animate-bounce">
                🎉
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-charcoal-900 dark:text-charcoal-100">
                  {boosterReward?.is_7day_milestone
                    ? '7-DAY STREAK JACKPOT UNLOCKED!'
                    : "Today's Daily Challenge Solved!"}
                </h3>
                <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-1.5">
                  {boosterReward?.message || `You solved all 3 daily questions! +${boosterReward?.coins_earned || 120} GovCoins added to your wallet.`}
                </p>
              </div>

              {/* Reward Highlights */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-800/50 border border-charcoal-200 dark:border-charcoal-700 text-left">
                <div>
                  <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Daily Score</div>
                  <div className="text-lg font-black text-charcoal-900 dark:text-charcoal-100 font-mono mt-0.5">
                    {answersSummary.filter((a) => a.is_correct).length} / {boosterQuestions.length}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Discipline Streak</div>
                  <div className="text-lg font-black text-amber-500 font-mono mt-0.5">
                    {boosterReward?.current_streak || streakDays} Days 🔥
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Coins Rewarded</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    +{boosterReward?.coins_earned || 120} 🪙
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate && onNavigate('subscription')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <CrownIcon size={14} />
                  <span>Use Coins on Subscription Pass</span>
                </button>
                <button
                  onClick={() => handleStartFreePractice('Medium')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-charcoal-100 dark:bg-charcoal-800 hover:bg-charcoal-200 dark:hover:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200 transition-all flex items-center gap-1.5"
                >
                  <SparklesIcon size={14} />
                  <span>Practice Infinite Random Questions</span>
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            /* QUESTION VIEW (ONE BY ONE) */
            <div className="pt-6 space-y-6">
              {/* Question Header & Timer */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800 font-mono">
                    Question {currentStepIndex + 1} of {boosterQuestions.length}
                  </span>
                  {getDifficultyBadge(currentQuestion.difficulty)}
                  <span className="text-xs font-semibold text-charcoal-500 dark:text-charcoal-400">
                    {currentQuestion.subject} • {currentQuestion.topic}
                  </span>
                </div>

                {/* Stopwatch Timer */}
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-charcoal-600 dark:text-charcoal-400 bg-charcoal-100 dark:bg-charcoal-800 px-2.5 py-1 rounded-lg">
                  <ClockIcon size={14} className="text-amber-500" />
                  <span>{questionTimer}s spent</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-bold text-charcoal-900 dark:text-charcoal-100 leading-relaxed font-sans bg-slate-50/70 dark:bg-charcoal-800/40 p-4 rounded-2xl border border-charcoal-200/70 dark:border-charcoal-800">
                {currentQuestion.question_text}
              </div>

              {/* 4 Options (A, B, C, D) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentQuestion.options || []).map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isVerified = verificationResult !== null;
                  const isCorrect = verificationResult?.correct_option === opt.id;
                  const isChosenWrong = isVerified && isSelected && !verificationResult?.is_correct;

                  let cardStyle =
                    'border-charcoal-200 dark:border-charcoal-800 hover:border-primary-400 dark:hover:border-primary-600 bg-white dark:bg-charcoal-800/60';
                  let badgeStyle =
                    'bg-charcoal-100 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300';

                  if (isSelected && !isVerified) {
                    cardStyle =
                      'border-primary-600 dark:border-primary-500 bg-primary-50/40 dark:bg-primary-950/40 ring-2 ring-primary-500/20';
                    badgeStyle = 'bg-primary-600 text-white';
                  } else if (isVerified) {
                    if (isCorrect) {
                      cardStyle =
                        'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30';
                      badgeStyle = 'bg-emerald-500 text-white';
                    } else if (isChosenWrong) {
                      cardStyle =
                        'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 ring-2 ring-rose-500/30';
                      badgeStyle = 'bg-rose-500 text-white';
                    } else {
                      cardStyle = 'opacity-50 border-charcoal-200 dark:border-charcoal-800';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isVerified}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 text-xs sm:text-sm font-medium ${cardStyle}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeStyle}`}
                      >
                        {opt.id}
                      </div>
                      <span className="text-charcoal-900 dark:text-charcoal-100 flex-1 leading-snug">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* OFFICIAL SOLUTION & EXPLANATION PANEL */}
              {verificationResult && (
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-2 ${
                    verificationResult.is_correct
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-extrabold">
                    {verificationResult.is_correct ? (
                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircleIcon size={16} /> Correct Answer! (+10 Speed XP)
                      </span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <XCircleIcon size={16} /> Incorrect • Your Answer: Option {verificationResult.selected_option} | Correct: Option {verificationResult.correct_option}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                      Official TCS iON Solution & Explanation:
                    </div>
                    <p className="text-xs text-charcoal-800 dark:text-charcoal-200 leading-relaxed mt-1 font-sans">
                      {verificationResult.solution_explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* ACTION BAR */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {!verificationResult ? (
                  <button
                    type="button"
                    disabled={!selectedOption || isVerifying}
                    onClick={handleVerifyAnswer}
                    className="px-6 py-2.5 text-xs font-extrabold rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <ArrowRightIcon size={14} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedNext}
                    className="px-6 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-sm transition-all flex items-center gap-2 animate-pulse"
                  >
                    <span>
                      {currentStepIndex < boosterQuestions.length - 1
                        ? `Next Question (${boosterQuestions[currentStepIndex + 1]?.difficulty}) →`
                        : 'Finish Daily Booster & Claim Coins 🎉'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-charcoal-500">
              No questions found. Click below to load new questions.
              <div className="mt-3">
                <button
                  onClick={loadBoosterQuestions}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white"
                >
                  Reload Questions
                </button>
              </div>
            </div>
          )}
        </section>

        {/* FREE PRACTICE MODAL / INLINE ON-DEMAND ACCORDION */}
        {isFreePracticeActive && (
          <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-charcoal-200 dark:border-charcoal-800">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100 flex items-center gap-2">
                  <span>Free Practice Arena (Infinite Questions)</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 font-bold">One by One</span>
                </h3>
                <p className="text-xs text-charcoal-500">
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
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      practiceDifficulty === diff
                        ? 'bg-primary-600 text-white'
                        : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
                <button
                  onClick={() => setIsFreePracticeActive(false)}
                  className="px-2.5 py-1 text-xs text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 ml-2"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {practiceLoading ? (
              <div className="py-8 text-center text-xs text-charcoal-500">
                Fetching random {practiceDifficulty} question from database...
              </div>
            ) : practiceQuestion ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs">
                  {getDifficultyBadge(practiceQuestion.difficulty)}
                  <span className="font-semibold text-charcoal-500">{practiceQuestion.subject} • {practiceQuestion.topic}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-charcoal-900 dark:text-charcoal-100">
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
                        className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2.5 ${
                          isSelected && !isVerified
                            ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/40 ring-1 ring-primary-500'
                            : isVerified && isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                            : 'border-charcoal-200 dark:border-charcoal-800'
                        }`}
                      >
                        <span className="w-5 h-5 rounded bg-charcoal-100 dark:bg-charcoal-700 font-bold flex items-center justify-center shrink-0">
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {practiceVerification && (
                  <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800/60 border border-charcoal-200 dark:border-charcoal-700 text-xs space-y-1">
                    <div className="font-bold text-charcoal-900 dark:text-charcoal-100">
                      {practiceVerification.is_correct ? '✓ Correct Answer!' : `✗ Incorrect (Correct: ${practiceVerification.correct_option})`}
                    </div>
                    <p className="text-charcoal-600 dark:text-charcoal-300">{practiceVerification.solution_explanation}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {!practiceVerification ? (
                    <button
                      type="button"
                      disabled={!practiceSelectedOption}
                      onClick={handleVerifyPracticeAnswer}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white disabled:opacity-50"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartFreePractice(practiceDifficulty)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white"
                    >
                      Next Random Question →
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* ROW 3: 7-DAY CONSISTENCY HABIT ROADMAP */}
        <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FlameIcon size={18} className="text-amber-500" />
                <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100">
                  7-Day Study Discipline Roadmap
                </h3>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Maintain 7 consecutive daily practice sessions to earn +20 GovCoins daily and unlock the +100 Milestone Bonus jackpot!
              </p>
            </div>

            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 self-start sm:self-auto font-mono">
              🔥 Current Streak: {streakDays} Days
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2">
            {(streakData?.timeline || [
              { day_number: 1, label: 'Day 1', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 2, label: 'Day 2', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 3, label: 'Day 3', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 4, label: 'Day 4', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 5, label: 'Day 5', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 6, label: 'Day 6', completed: true, coins_reward: 20, is_milestone: false },
              { day_number: 7, label: 'Day 7', completed: isTodayAlreadyDone, is_current: !isTodayAlreadyDone, coins_reward: 100, is_milestone: true },
            ]).map((step) => {
              const isDone = step.completed;
              const isToday = step.is_current;
              const isJackpot = step.is_milestone;

              return (
                <div
                  key={step.day_number}
                  className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : isToday
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-amber-700 dark:text-amber-300 scale-105 shadow-sm'
                      : isJackpot
                      ? 'bg-gradient-to-b from-amber-500/10 to-primary-500/10 border-amber-400/40 text-charcoal-700 dark:text-charcoal-300'
                      : 'bg-charcoal-50 dark:bg-charcoal-800/40 border-charcoal-200 dark:border-charcoal-800 text-charcoal-400'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {step.label}
                  </span>

                  <div className="my-2">
                    {isDone ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        ✓
                      </div>
                    ) : isJackpot ? (
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm shadow-xs animate-pulse">
                        🎁
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300 flex items-center justify-center font-mono text-xs">
                        {step.day_number}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-black font-mono">
                    +{step.coins_reward} 🪙
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ROW 4: SECTIONAL ACCURACY & SUBJECT MASTERY (COMPETITIVE EXAM SPECIFIC) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Subject Mastery Matrix */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100 flex items-center gap-2">
                <BarChart3Icon size={18} className="text-primary-500" />
                <span>Sectional Accuracy & Subject Mastery</span>
              </h3>
              <p className="text-xs text-charcoal-500">
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
                    <span className="text-charcoal-800 dark:text-charcoal-200">{subj.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-charcoal-400 font-normal">{subj.questions}</span>
                      <span className={`font-black ${
                        subj.accuracy >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                        subj.accuracy >= 70 ? 'text-amber-600 dark:text-amber-400' :
                        'text-rose-600 dark:text-rose-400'
                      }`}>
                        {subj.accuracy}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
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

          {/* Right: Mock Exam Question Breakdown & Speed Benchmarking */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100 flex items-center gap-2">
                <TargetIcon size={18} className="text-emerald-500" />
                <span>Mock Exam Question Disposition</span>
              </h3>
              <p className="text-xs text-charcoal-500">
                Attempt behavior analysis based on TCS iON negative marking principles.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">142</div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">Correct (+284)</div>
                <div className="text-[10px] text-charcoal-500 mt-1">79% accuracy</div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">24</div>
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">Negative (-12)</div>
                <div className="text-[10px] text-charcoal-500 mt-1">Avoid blind guesses</div>
              </div>

              <div className="p-4 rounded-2xl bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-center">
                <div className="text-2xl font-black text-charcoal-700 dark:text-charcoal-300 font-mono">18</div>
                <div className="text-xs font-bold text-charcoal-600 dark:text-charcoal-400 mt-0.5">Skipped (0)</div>
                <div className="text-[10px] text-charcoal-500 mt-1">Strategic skips</div>
              </div>
            </div>

            {/* Diagnostic advice callout */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="text-sm">💡</span>
              <span className="leading-snug">
                <strong>Aspirant Insight:</strong> Reducing your 24 negative attempts by just 10 questions would increase your predicted All-India Rank by over 150 places!
              </span>
            </div>
          </div>
        </section>

        {/* ROW 5: RECENT MOCK ATTEMPTS & SCORECARDS TABLE */}
        <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-charcoal-100 dark:border-charcoal-800">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100">
                Recent Mock Test Scorecards
              </h3>
              <p className="text-xs text-charcoal-500">
                Detailed test scores, negative marking breakdown, and percentile standings.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3 pr-4">Mock Test Title</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3 font-mono">Raw Score</th>
                  <th className="pb-3 px-3 font-mono">Accuracy</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 pl-3 text-right">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                {(dashboard?.recent_attempts || []).length > 0 ? (
                  dashboard.recent_attempts.map((att) => (
                    <tr key={att.attempt_id} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-800/40 transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-charcoal-900 dark:text-charcoal-100 max-w-xs truncate">
                        {att.test_title}
                      </td>
                      <td className="py-3.5 px-3 text-charcoal-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(att.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-charcoal-900 dark:text-charcoal-100 whitespace-nowrap">
                        {att.total_score?.toFixed(1)} / {att.max_possible_score || 50}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {att.accuracy_percentage?.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Qualified
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectAttempt(att.attempt_id)}
                          className="px-3 py-1 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 transition-colors"
                        >
                          View Scorecard
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-charcoal-500">
                      No recent mock attempts yet. Launch your first full-length mock below to start benchmarking!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ROW 6: AVAILABLE MOCK TESTS LIBRARY & SPEED DRILLS */}
        <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-charcoal-100 dark:border-charcoal-800">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100">
                Exam Mock Test Library
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Full-Length Mocks, Sectional Speed Tests, and Topic Drills calibrated to the latest exam syllabus.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'FULL', 'SUBJECT', 'TOPIC_MINI'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setSelectedFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedFilter === filterKey
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400 hover:bg-charcoal-200'
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
                className="p-5 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 hover:border-primary-500/50 bg-charcoal-50/40 dark:bg-charcoal-800/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 font-mono">
                      {test.test_type}
                    </span>
                    {getDifficultyBadge(test.difficulty)}
                  </div>
                  <h4 className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100 mt-2.5 line-clamp-1">
                    {test.title}
                  </h4>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400 line-clamp-2 mt-1">
                    {test.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-charcoal-200/60 dark:border-charcoal-700/60 flex items-center justify-between">
                  <div className="text-xs font-mono text-charcoal-500 flex items-center gap-2">
                    <span>⏱ {test.duration_minutes}m</span>
                    <span>•</span>
                    <span>📝 {test.total_questions} Qs</span>
                  </div>
                  <button
                    onClick={() => onStartTest(test.id)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all flex items-center gap-1.5"
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
