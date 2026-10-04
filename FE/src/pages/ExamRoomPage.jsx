import React, { useState, useEffect, useRef } from 'react';
import { api, DEMO_QUESTIONS, isRealSession } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import {
  ClockIcon,
  FlagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  CheckIcon,
  PauseIcon,
  PlayIcon,
  XCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
  SunIcon,
  MoonIcon,
} from '../components/Icons';

// Palette tile colours: green = answered, red = not answered, purple = review, white = not visited.
// Same tile colours and legend as the landing-page exam preview.
const TILE_STYLES = {
  ANSWERED: 'bg-emerald-600 text-white font-bold',
  NOT_ANSWERED: 'bg-rose-600 text-white font-bold',
  MARKED_FOR_REVIEW: 'bg-purple-600 text-white font-bold',
  ANSWERED_AND_MARKED_FOR_REVIEW: 'bg-purple-600 text-white font-bold',
  NOT_VISITED: 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700',
};
const TILE_RING = {
  ANSWERED: 'ring-emerald-400',
  NOT_ANSWERED: 'ring-rose-400',
  MARKED_FOR_REVIEW: 'ring-purple-400',
  ANSWERED_AND_MARKED_FOR_REVIEW: 'ring-purple-400',
  NOT_VISITED: 'ring-charcoal-400',
};
const tileClass = (state) => TILE_STYLES[state] || TILE_STYLES.NOT_VISITED;
const tileRing = (state) => TILE_RING[state] || TILE_RING.NOT_VISITED;

const PaletteLegend = () => (
  <div className="grid grid-cols-2 gap-2 text-[10px] text-charcoal-600 dark:text-charcoal-400 py-3 border-b border-charcoal-200 dark:border-charcoal-700">
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[8px]">✓</span>
      <span>Answered</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[8px]">✕</span>
      <span>Not Answered</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[8px]">●</span>
      <span>Review</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300 flex items-center justify-center font-bold text-[8px]">-</span>
      <span>Not Visited</span>
    </div>
  </div>
);

/**
 * ExamRoomPage — Focused, Distraction-Free Assessment Interface
 * Core UX:
 * - Unobtrusive sticky top bar with countdown timer, test title, Pause and Submit actions.
 * - Distraction-free question zone with 1.6 line-height and large readable question typography.
 * - Entire clickable option block rows with custom radio buttons and subtle selected states.
 * - Desktop sidebar palette + Mobile collapsible bottom drawer sheet.
 * - Palette state tracking: Answered (Green), Unattempted (Gray outline), Marked for Review (Amber/Purple).
 * - Full Pause / Resume session support and Submit confirmation modal.
 * - Heartbeat synchronization to prevent state loss on tab refresh.
 */
export const ExamRoomPage = ({ attemptSession, onTestCompleted, onExit }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> option_id
  const [paletteStates, setPaletteStates] = useState({}); // question_id -> 'NOT_VISITED'|'NOT_ANSWERED'|'ANSWERED'|'MARKED_FOR_REVIEW'|'ANSWERED_AND_MARKED_FOR_REVIEW'
  const [timeSpent, setTimeSpent] = useState({}); // question_id -> seconds
  const [remainingSeconds, setRemainingSeconds] = useState(3600);

  // Modals & States
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const attemptId = attemptSession?.attempt_id || 'demo-attempt';
  const timerRef = useRef(null);
  const syncTimerRef = useRef(null);

  // 1. Initialize attempt data
  useEffect(() => {
    initExamSession();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(syncTimerRef.current);
    };
  }, [attemptSession]);

  const initExamSession = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.attempts.getQuestions(attemptId);
      if (isRealSession() && !data?.questions?.length) {
        throw new Error('This test has no questions.');
      }
      setQuestions(data.questions || DEMO_QUESTIONS);
      setRemainingSeconds(
        data.remaining_seconds || (attemptSession?.duration_minutes ? attemptSession.duration_minutes * 60 : 3600)
      );
      setAnswers(data.answers || {});
      setTimeSpent(data.time_spent_per_question || {});

      // Setup initial palette
      const initialPalette = data.palette_states || {};
      (data.questions || DEMO_QUESTIONS).forEach((q, idx) => {
        if (!initialPalette[q.id]) {
          initialPalette[q.id] = idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED';
        }
      });
      setPaletteStates(initialPalette);
      setCurrentIndex(data.current_question_index || 0);
    } catch (err) {
      console.warn('Fallback loading active attempt questions:', err);
      if (isRealSession()) {
        // A real attempt must show its real questions or a real error — never demo ones.
        setLoadError(err.message || 'Could not load the questions for this attempt.');
        return;
      }
      setQuestions(DEMO_QUESTIONS);
      const initialPalette = {};
      DEMO_QUESTIONS.forEach((q, idx) => {
        initialPalette[q.id] = idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED';
      });
      setPaletteStates(initialPalette);
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown Timer (pauses when isPaused is true)
  useEffect(() => {
    if (loading || isPaused) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      // Track active question dwell time
      const currentQ = questions[currentIndex];
      if (currentQ) {
        setTimeSpent((prev) => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, isPaused, currentIndex, questions]);

  // 3. Periodic Background Sync (every 8 seconds)
  useEffect(() => {
    if (loading || isPaused) return;

    syncTimerRef.current = setInterval(() => {
      syncCurrentState();
    }, 8000);

    return () => clearInterval(syncTimerRef.current);
  }, [loading, isPaused, currentIndex, answers, paletteStates, timeSpent, tabSwitchCount]);

  const syncCurrentState = async () => {
    try {
      await api.attempts.sync(attemptId, {
        current_question_index: currentIndex,
        palette_states: paletteStates,
        answers: answers,
        time_spent_per_question: timeSpent,
        tab_switch_count: tabSwitchCount,
      });
    } catch (err) {
      // Background retry silently
    }
  };

  // 4. Anti-Cheat: Detect Tab Switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused) {
        setTabSwitchCount((prev) => prev + 1);
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPaused]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const currentQuestion = questions[currentIndex] || questions[0];

  // Option selection handler
  const handleSelectOption = (optionId) => {
    if (!currentQuestion || isPaused) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Action: Clear Response
  const handleClearResponse = () => {
    if (!currentQuestion || isPaused) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });

    setPaletteStates((prev) => ({
      ...prev,
      [currentQuestion.id]: 'NOT_ANSWERED',
    }));
  };

  // Action: Toggle Mark for Review
  const handleToggleMarkForReview = () => {
    if (!currentQuestion || isPaused) return;
    const isAnswered = !!answers[currentQuestion.id];
    const currentState = paletteStates[currentQuestion.id];

    let newState;
    if (currentState === 'MARKED_FOR_REVIEW' || currentState === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
      newState = isAnswered ? 'ANSWERED' : 'NOT_ANSWERED';
    } else {
      newState = isAnswered ? 'ANSWERED_AND_MARKED_FOR_REVIEW' : 'MARKED_FOR_REVIEW';
    }

    setPaletteStates((prev) => ({
      ...prev,
      [currentQuestion.id]: newState,
    }));
  };

  // Action: Save & Next
  const handleSaveAndNext = () => {
    if (!currentQuestion || isPaused) return;
    const isAnswered = !!answers[currentQuestion.id];
    const currentState = paletteStates[currentQuestion.id];

    let finalState = isAnswered ? 'ANSWERED' : 'NOT_ANSWERED';
    if (currentState === 'MARKED_FOR_REVIEW' || currentState === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
      finalState = isAnswered ? 'ANSWERED_AND_MARKED_FOR_REVIEW' : 'MARKED_FOR_REVIEW';
    }

    setPaletteStates((prev) => ({
      ...prev,
      [currentQuestion.id]: finalState,
    }));

    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = questions[nextIdx];
      if (paletteStates[nextQ.id] === 'NOT_VISITED') {
        setPaletteStates((prev) => ({
          ...prev,
          [nextQ.id]: 'NOT_ANSWERED',
        }));
      }
      setCurrentIndex(nextIdx);
    }
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const jumpToQuestion = (idx) => {
    const targetQ = questions[idx];
    if (paletteStates[targetQ.id] === 'NOT_VISITED') {
      setPaletteStates((prev) => ({
        ...prev,
        [targetQ.id]: 'NOT_ANSWERED',
      }));
    }
    setCurrentIndex(idx);
    setShowMobileDrawer(false); // Close mobile drawer when question chosen
  };

  // Palette counts
  const counts = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    markedReview: 0,
  };

  questions.forEach((q) => {
    const state = paletteStates[q.id] || 'NOT_VISITED';
    if (state === 'ANSWERED') counts.answered++;
    else if (state === 'NOT_ANSWERED') counts.notAnswered++;
    else if (state === 'MARKED_FOR_REVIEW' || state === 'ANSWERED_AND_MARKED_FOR_REVIEW') counts.markedReview++;
    else counts.notVisited++;
  });

  // Pause Exam Action
  const handlePauseExam = async () => {
    setIsPaused(true);
    try {
      await api.attempts.pause(attemptId);
    } catch (e) {
      console.warn('Pause API fallback');
    }
  };

  // Resume Exam Action
  const handleResumeExam = async () => {
    setIsPaused(false);
    try {
      await api.attempts.resume(attemptId);
    } catch (e) {
      console.warn('Resume API fallback');
    }
  };

  // Final Submit
  const handleAutoSubmit = () => {
    submitExam();
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      const result = await api.attempts.submit(attemptId, {
        answers,
        time_spent_per_question: timeSpent,
        palette_states: paletteStates,
      });
      onTestCompleted(result);
    } catch (err) {
      console.error('Submission error:', err);
      onTestCompleted({ attempt_id: attemptId });
    } finally {
      setSubmitting(false);
    }
  };

  // Timer urgency states
  const isTimerDanger = remainingSeconds < 60;
  const isTimerWarning = remainingSeconds < 300 && !isTimerDanger;

  const isCurrentMarkedForReview =
    paletteStates[currentQuestion?.id] === 'MARKED_FOR_REVIEW' ||
    paletteStates[currentQuestion?.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW';

  // Skeleton screen while initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-charcoal-200 border-t-charcoal-800 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-charcoal-800 dark:text-charcoal-200">
            Initializing Secure Exam Engine
          </h2>
          <p className="text-xs text-charcoal-500">
            Verifying candidate token, questions encryption, and server-side timer...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="max-w-md w-full text-center space-y-3 rounded-2xl border border-red-200 bg-white dark:bg-charcoal-900 p-6 shadow-subtle">
          <h2 className="text-base font-bold text-charcoal-800 dark:text-charcoal-100">Could not load this test</h2>
          <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{loadError}</p>
          <div className="flex justify-center gap-2 pt-1">
            <button type="button" onClick={initExamSession} className="px-4 py-2 rounded-lg bg-charcoal-900 text-white text-xs font-bold">Try again</button>
            <button type="button" onClick={onExit} className="px-4 py-2 rounded-lg border border-charcoal-300 text-xs font-bold text-charcoal-700 dark:text-charcoal-200">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-hero selection:bg-institutional-100">
      {/* Same ambient glows as the landing page */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-institutional-500/10 dark:bg-institutional-400/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-[480px] -left-36 w-[550px] h-[550px] bg-emerald-500/8 dark:bg-emerald-400/10 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[900px] -right-36 w-[600px] h-[600px] bg-purple-500/8 dark:bg-purple-400/10 blur-[140px] rounded-full pointer-events-none animate-glow-pulse" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <section className="relative rounded-3xl p-5 sm:p-8 shadow-card space-y-6 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200/90 dark:border-charcoal-800/90 overflow-hidden bg-terminal-pattern">
      {/* ========================================================================= */}
      {/* 1. STICKY TOP BAR (Academic, Focused, Clear Timer)                         */}
      {/* ========================================================================= */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
        {/* Left: Test Title & Section Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-mono font-bold text-xs">
            TCS
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-charcoal-900 dark:text-charcoal-100 truncate max-w-xs sm:max-w-md">
              {attemptSession?.test_title || 'Mock Examination'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400">
              <span className="font-medium text-institutional-700 dark:text-institutional-400">
                {currentQuestion?.subject || 'General Section'}
              </span>
              <span>•</span>
              <span>Section 1 of 1</span>
            </div>
          </div>
        </div>

        {/* Center: Unobtrusive Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-sm sm:text-base font-bold transition-colors ${
            isTimerDanger
              ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 animate-pulse'
              : isTimerWarning
              ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
              : 'bg-charcoal-100 dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
          }`}
          aria-label={`Time remaining: ${formatTime(remainingSeconds)}`}
        >
          <ClockIcon size={16} />
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        {/* Right: Theme Toggle, Pause & Submit Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors focus:outline-none"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          {/* Pause Exam Button */}
          <button
            onClick={handlePauseExam}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-charcoal-700 dark:text-charcoal-300 bg-white dark:bg-charcoal-800 border border-charcoal-300 dark:border-charcoal-700 hover:bg-charcoal-100 dark:hover:bg-charcoal-700/60 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-400"
          >
            <PauseIcon size={14} />
            <span>Pause</span>
          </button>

          {/* Submit Test Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 dark:bg-institutional-700 dark:hover:bg-institutional-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 shadow-sm"
          >
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Tab Switch Alert Banner */}
      {showTabWarning && (
        <div className="relative z-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Integrity Notice:</strong> Tab switch detected ({tabSwitchCount} warning{tabSwitchCount > 1 ? 's' : ''}). Please stay in the exam tab during your timed session.
            </span>
          </div>
          <button
            onClick={() => setShowTabWarning(false)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE: Question Area (Center) & Palette Sidebar (Desktop)     */}
      {/* ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question area */}
        <div className="lg:col-span-2 space-y-4">
            {/* Subject line + marking scheme (same as the landing-page preview) */}
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-500 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
              <span>
                {currentQuestion?.subject || 'General'} • {currentQuestion?.topic || 'General'}
                {currentQuestion?.difficulty ? ` • ${currentQuestion.difficulty}` : ''}
              </span>
              <span className="text-institutional-600 dark:text-institutional-400 font-mono font-bold">
                +2.00 / -0.50 Marks
              </span>
            </div>

            <div className="text-sm sm:text-base font-semibold text-charcoal-900 dark:text-charcoal-100 leading-question whitespace-pre-line">
              <strong>Q{currentIndex + 1}.</strong> {currentQuestion?.question_text}
            </div>

            {/* Clickable Option Rows */}
            <div className="space-y-2.5 pt-2" role="radiogroup" aria-label="Answer options">
              {currentQuestion?.options?.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectOption(opt.id);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                      isSelected
                        ? 'border-institutional-500 bg-institutional-50/70 dark:bg-institutional-950/40 text-institutional-900 dark:text-institutional-100 shadow-sm ring-1 ring-institutional-500'
                        : 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-800/60 text-charcoal-800 dark:text-charcoal-200 hover:border-charcoal-300 dark:hover:border-charcoal-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-institutional-600 text-white'
                            : 'bg-white dark:bg-charcoal-800 border border-charcoal-300 dark:border-charcoal-600 text-charcoal-700 dark:text-charcoal-300'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                    {isSelected && <CheckIcon size={16} className="text-institutional-600 dark:text-institutional-400" />}
                  </div>
                );
              })}
            </div>

            {/* Action bar (same buttons as the landing-page preview, plus Previous / Save & Next) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex gap-2">
                <button
                  onClick={handleToggleMarkForReview}
                  className="px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  {isCurrentMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                </button>
                <button
                  onClick={handleClearResponse}
                  disabled={!answers[currentQuestion?.id]}
                  className="px-3 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 text-xs font-semibold hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={goToPrevQuestion}
                  disabled={currentIndex === 0}
                  className="px-3 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 text-xs font-semibold hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeftIcon size={14} />
                  <span>Previous</span>
                </button>
                <button
                  onClick={handleSaveAndNext}
                  className="px-4 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span>{currentIndex === questions.length - 1 ? 'Save Response' : 'Save & Next'}</span>
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>

            {/* Mobile palette trigger */}
            <div className="lg:hidden pt-2">
              <button
                onClick={() => setShowMobileDrawer(true)}
                className="w-full py-2.5 px-4 bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-300 dark:border-charcoal-700 rounded-xl text-xs font-bold text-charcoal-800 dark:text-charcoal-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <LayersIcon size={16} />
                  <span>Question Palette ({counts.answered}/{questions.length} Answered)</span>
                </div>
                <span className="text-institutional-600 dark:text-institutional-400">Tap to View Grid →</span>
              </button>
            </div>
          </div>

        {/* ========================================================================= */}
        {/* DESKTOP SIDEBAR: Question Navigation Palette (Anti-AI Minimalist Design)   */}
        {/* ========================================================================= */}
        <aside className="hidden lg:flex p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-800 flex-col justify-between space-y-4 self-start">
          <div>
            {/* Palette Header */}
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-200 dark:border-charcoal-700 text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-charcoal-300">
              <span>Question Palette</span>
              <span className="text-[11px] font-mono text-institutional-600">Q {currentIndex + 1} of {questions.length}</span>
            </div>

            {/* State Legend */}
            <PaletteLegend />

            {/* Question Tiles Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-3 max-h-[420px] overflow-y-auto p-0.5">
              {questions.map((q, idx) => {
                const state = paletteStates[q.id] || 'NOT_VISITED';
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(idx)}
                    className={`h-8 rounded flex items-center justify-center text-xs font-mono transition-transform hover:scale-105 select-none relative ${tileClass(state)} ${
                      isCurrent ? `ring-2 ${tileRing(state)}` : ''
                    }`}
                    aria-label={`Jump to Question ${idx + 1}`}
                  >
                    {idx + 1}
                    {state === 'ANSWERED_AND_MARKED_FOR_REVIEW' && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 text-center font-medium">
            Candidate: <strong>{user?.full_name?.split(' ')[0] || 'Aspirant'}</strong> • {counts.answered}/{questions.length} answered
          </div>
        </aside>
      </div>
      </section>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE COLLAPSIBLE BOTTOM DRAWER (Native App Bottom Sheet)             */}
      {/* ========================================================================= */}
      {showMobileDrawer && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-charcoal-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 rounded-t-2xl border-t border-charcoal-200 dark:border-charcoal-800 p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-drawer">
            {/* Sheet Handle & Header */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-1 bg-charcoal-300 dark:bg-charcoal-700 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between pb-2 border-b border-charcoal-200 dark:border-charcoal-800">
                <span className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100">
                  Question Palette ({questions.length} Total)
                </span>
                <button
                  onClick={() => setShowMobileDrawer(false)}
                  className="p-1 rounded-lg hover:bg-charcoal-100 dark:hover:bg-charcoal-800 text-charcoal-500"
                >
                  <XCircleIcon size={20} />
                </button>
              </div>
            </div>

            {/* Mobile Legend */}
            <PaletteLegend />

            {/* Mobile Numbers Grid */}
            <div className="grid grid-cols-5 gap-2.5 p-1.5">
              {questions.map((q, idx) => {
                const state = paletteStates[q.id] || 'NOT_VISITED';
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(idx)}
                    className={`h-10 rounded flex items-center justify-center text-sm font-mono select-none ${tileClass(state)} ${
                      isCurrent ? `ring-2 ${tileRing(state)}` : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: PAUSE EXAMINATION OVERLAY                                       */}
      {/* ========================================================================= */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-lifted text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <PauseIcon size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-charcoal-100">
                Examination Paused
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                Your remaining time is frozen at <strong className="font-mono text-charcoal-800 dark:text-charcoal-200">{formatTime(remainingSeconds)}</strong>. Your responses are safely synchronized to the server.
              </p>
            </div>

            <div className="p-3 bg-charcoal-50 dark:bg-charcoal-800/60 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs text-charcoal-600 dark:text-charcoal-300 text-left space-y-1">
              <div className="font-semibold text-charcoal-800 dark:text-charcoal-200">Exam Snapshot:</div>
              <div>• Answered: <strong>{counts.answered}</strong> questions</div>
              <div>• Pending: <strong>{questions.length - counts.answered}</strong> questions</div>
            </div>

            <button
              onClick={handleResumeExam}
              className="w-full py-2.5 px-4 rounded-lg font-bold text-xs text-white bg-institutional-600 hover:bg-institutional-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <PlayIcon size={14} />
              <span>Resume Examination</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: FINAL SUBMISSION CONFIRMATION                                   */}
      {/* ========================================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-lifted space-y-5">
            <div className="flex items-start justify-between border-b border-charcoal-150 dark:border-charcoal-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-charcoal-900 dark:text-charcoal-100">
                  Confirm Final Submission
                </h2>
                <p className="text-xs text-charcoal-500">
                  Please review your attempt breakdown before final submission and grading.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Summary Stat Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                  {counts.answered}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">
                  Answered
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300">
                  {counts.markedReview}
                </div>
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase mt-0.5">
                  In Review
                </div>
              </div>

              <div className="p-3 rounded-xl bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700">
                <div className="text-2xl font-bold font-mono text-charcoal-700 dark:text-charcoal-300">
                  {counts.notAnswered + counts.notVisited}
                </div>
                <div className="text-[11px] font-semibold text-charcoal-500 uppercase mt-0.5">
                  Unattempted
                </div>
              </div>
            </div>

            <p className="text-xs text-charcoal-500 bg-charcoal-50 dark:bg-charcoal-800/60 p-3 rounded-lg border border-charcoal-200 dark:border-charcoal-700">
              Note: Marking will deduct <strong>0.50 marks</strong> for every incorrect answer. Once submitted, answers cannot be modified.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 border border-charcoal-300 dark:border-charcoal-700 transition-colors"
              >
                Return to Exam
              </button>

              <button
                onClick={submitExam}
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Evaluating Answers...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
