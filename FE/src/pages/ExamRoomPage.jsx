import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckCircleIcon,
  PauseIcon,
  PlayIcon,
  XCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
  SunIcon,
  MoonIcon,
  RefreshCwIcon,
  FileTextIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
  BookmarkIcon,
  ClipboardCheckIcon,
  LockIcon,
} from '../components/Icons';

// Switching away from the tab more than this many times ends the exam
const MAX_TAB_SWITCHES = 2;

/**
 * Standard TCS iON / TestAce Computer Based Test (CBT) Assessment Room
 * Matches the official examination portal layout:
 * 1. Top Header: Logo, Live Assessment status, Section Timers, Candidate Node & Info.
 * 2. Sub-Header Toolbar: Section tabs, Marking scheme, Clock, Language dropdown, Q.Paper, Instructions, Font Zoom.
 * 3. Left Question Pane: Direction/Data Interpretation box, Question statement, Option cards with radio checks.
 * 4. Action Footer: Mark for Review & Next, Clear Response, Save & Previous, Save & Next.
 * 5. Right Sidebar: Proctored webcam frame, Palette Legend, Interactive Question Grid, Attempt Rate, Submit Test.
 * 6. Bottom Strip: Assessment Engine Licensing & Proctoring Status.
 * 7. On-Submit Modal: TCS iON Candidate Audit Format Exam Submission Summary.
 */
export const ExamRoomPage = ({ attemptSession, onTestCompleted, onExit }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> option_id
  const [paletteStates, setPaletteStates] = useState({}); // question_id -> status
  const [timeSpent, setTimeSpent] = useState({}); // question_id -> seconds
  const [remainingSeconds, setRemainingSeconds] = useState(3600);

  // UI & Utility Controls
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isDeclared, setIsDeclared] = useState(false);
  const [showQuestionPaperModal, setShowQuestionPaperModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [fontZoom, setFontZoom] = useState('normal'); // 'sm' | 'normal' | 'lg'
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Anti-Cheat & Tab Integrity
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminated, setTerminated] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const attemptId = attemptSession?.attempt_id || 'demo-attempt';
  const timerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const tabCountRef = useRef(0);
  const submittedRef = useRef(false);
  const latestRef = useRef({});
  const lastReasonRef = useRef(undefined);
  latestRef.current = { answers, timeSpent, paletteStates };
  const tabStorageKey = `tab-switches-${attemptId}`;

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
        throw new Error('This examination has no questions.');
      }
      setQuestions(data.questions || DEMO_QUESTIONS);
      setRemainingSeconds(
        data.remaining_seconds || (attemptSession?.duration_minutes ? attemptSession.duration_minutes * 60 : 3600)
      );
      setAnswers(data.answers || {});
      setTimeSpent(data.time_spent_per_question || {});

      // Initialize palette
      const initialPalette = data.palette_states || {};
      (data.questions || DEMO_QUESTIONS).forEach((q, idx) => {
        if (!initialPalette[q.id]) {
          initialPalette[q.id] = idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED';
        }
      });
      setPaletteStates(initialPalette);
      setCurrentIndex(data.current_question_index || 0);

      let savedSwitches = 0;
      try {
        savedSwitches = Number(sessionStorage.getItem(tabStorageKey)) || 0;
      } catch {
        // storage unavailable
      }
      tabCountRef.current = savedSwitches;
      setTabSwitchCount(savedSwitches);
      if (savedSwitches > 0) setShowTabWarning(true);
    } catch (err) {
      console.warn('Fallback loading active attempt questions:', err);
      if (isRealSession()) {
        setLoadError(err.message || 'Could not load questions for this attempt.');
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

  // 2. Countdown Timer
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

  // 3. Periodic Background Sync (every 8s)
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
      // background silent retry
    }
  };

  // 4. Anti-Cheat: Detect Tab Switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || isPaused || submittedRef.current) return;
      tabCountRef.current += 1;
      const count = tabCountRef.current;
      try {
        sessionStorage.setItem(tabStorageKey, String(count));
      } catch {
        // memory fallback
      }
      setTabSwitchCount(count);
      setShowTabWarning(true);
      if (count > MAX_TAB_SWITCHES) submitExam('tab_switch');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPaused, tabStorageKey]);

  useEffect(() => {
    if (!loading && !loadError && tabCountRef.current > MAX_TAB_SWITCHES) submitExam('tab_switch');
  }, [loading]);

  // Esc key cancels submit modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSubmitModal) {
        setShowSubmitModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSubmitModal]);

  // Reset declaration checkbox when submit modal opens
  useEffect(() => {
    if (showSubmitModal) {
      setIsDeclared(false);
    }
  }, [showSubmitModal]);

  // Time formatter
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // Sections decomposition
  const sections = useMemo(() => {
    if (!questions.length) return [];
    const map = {};
    questions.forEach((q, idx) => {
      const s = q.subject || 'General Section';
      if (!map[s]) map[s] = [];
      map[s].push(idx);
    });
    return Object.keys(map).map((name) => ({
      name,
      indices: map[name],
      count: map[name].length,
    }));
  }, [questions]);

  const currentQuestion = questions[currentIndex] || questions[0];
  const currentSection = sections.find((s) => s.indices.includes(currentIndex)) || sections[0];

  // Option selection
  const handleSelectOption = (optionId) => {
    if (!currentQuestion || isPaused) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Clear Response
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

  // Toggle Mark for Review
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

  // Save & Next
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

  // Mark for Review & Next (Standard TCS iON behavior)
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion || isPaused) return;
    const isAnswered = !!answers[currentQuestion.id];
    const finalState = isAnswered ? 'ANSWERED_AND_MARKED_FOR_REVIEW' : 'MARKED_FOR_REVIEW';

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
    setShowMobileDrawer(false);
  };

  // Palette Counts
  const counts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let markedReview = 0;
    let ansAndMarkedReview = 0;

    questions.forEach((q) => {
      const s = paletteStates[q.id] || 'NOT_VISITED';
      if (s === 'ANSWERED') answered++;
      else if (s === 'NOT_ANSWERED') notAnswered++;
      else if (s === 'MARKED_FOR_REVIEW') markedReview++;
      else if (s === 'ANSWERED_AND_MARKED_FOR_REVIEW') ansAndMarkedReview++;
      else notVisited++;
    });

    return {
      answered,
      notAnswered,
      notVisited,
      markedReview,
      ansAndMarkedReview,
      totalMarked: markedReview + ansAndMarkedReview,
    };
  }, [questions, paletteStates]);

  // Section Attempt Rate
  const sectionStats = useMemo(() => {
    if (!currentSection) return { answered: 0, total: 1, percent: 0 };
    const secQuestions = currentSection.indices.map((i) => questions[i]);
    const ansCount = secQuestions.filter(
      (q) => paletteStates[q.id] === 'ANSWERED' || paletteStates[q.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW'
    ).length;
    return {
      answered: ansCount,
      total: secQuestions.length,
      percent: Math.round((ansCount / secQuestions.length) * 100),
    };
  }, [currentSection, questions, paletteStates]);

  // Sectional Performance Matrix for Submission Modal (TCS iON Format)
  const sectionalMatrix = useMemo(() => {
    if (!sections.length) return [];
    const dotColors = ['bg-blue-600', 'bg-slate-700', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];

    return sections.map((sec, secIdx) => {
      const secQuestions = sec.indices.map((i) => questions[i]);
      let answered = 0;
      let notAnswered = 0;
      let markedReview = 0;
      let ansAndMarked = 0;
      let notVisited = 0;

      secQuestions.forEach((q) => {
        const s = paletteStates[q.id] || 'NOT_VISITED';
        if (s === 'ANSWERED') answered++;
        else if (s === 'NOT_ANSWERED') notAnswered++;
        else if (s === 'MARKED_FOR_REVIEW') markedReview++;
        else if (s === 'ANSWERED_AND_MARKED_FOR_REVIEW') ansAndMarked++;
        else notVisited++;
      });

      return {
        name: sec.name,
        dotColor: dotColors[secIdx % dotColors.length],
        total: sec.count,
        answered,
        notAnswered,
        markedReview,
        ansAndMarked,
        notVisited,
      };
    });
  }, [sections, questions, paletteStates]);

  const matrixTotals = useMemo(() => {
    const totals = {
      total: questions.length,
      answered: 0,
      notAnswered: 0,
      markedReview: 0,
      ansAndMarked: 0,
      notVisited: 0,
    };

    sectionalMatrix.forEach((m) => {
      totals.answered += m.answered;
      totals.notAnswered += m.notAnswered;
      totals.markedReview += m.markedReview;
      totals.ansAndMarked += m.ansAndMarked;
      totals.notVisited += m.notVisited;
    });

    const netAttempted = totals.answered + totals.ansAndMarked;
    const unattempted = totals.notAnswered + totals.notVisited;
    const attemptedPercent = totals.total > 0 ? Math.round((netAttempted / totals.total) * 100) : 0;

    return {
      ...totals,
      netAttempted,
      unattempted,
      attemptedPercent,
    };
  }, [sectionalMatrix, questions]);

  // Pacing & Time for Submission Summary
  const totalDurationMins = attemptSession?.duration_minutes || 60;
  const totalDurationSecs = totalDurationMins * 60;
  const timeElapsedSecs = Math.max(0, totalDurationSecs - remainingSeconds);
  const elapsedFormatted = formatTime(timeElapsedSecs);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecsOnly = remainingSeconds % 60;

  const handlePauseExam = async () => {
    setIsPaused(true);
    try {
      await api.attempts.pause(attemptId);
    } catch (e) {
      console.warn('Pause API fallback');
    }
  };

  const handleResumeExam = async () => {
    setIsPaused(false);
    try {
      await api.attempts.resume(attemptId);
    } catch (e) {
      console.warn('Resume API fallback');
    }
  };

  const handleAutoSubmit = () => {
    submitExam();
  };

  const submitExam = async (reason) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    lastReasonRef.current = typeof reason === 'string' ? reason : undefined;
    setSubmitError('');
    setSubmitting(true);

    const latest = latestRef.current;
    const payload = {
      answers: latest.answers,
      time_spent_per_question: latest.timeSpent,
      palette_states: latest.paletteStates,
      tab_switch_count: tabCountRef.current,
      ...(reason === 'tab_switch' ? { ended_reason: 'tab_switch' } : {}),
    };

    let result = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3 && !result; attempt += 1) {
      try {
        result = await api.attempts.submit(attemptId, payload);
      } catch (err) {
        lastError = err;
        console.error(`Submission attempt ${attempt} failed:`, err);
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    setSubmitting(false);

    if (!result) {
      submittedRef.current = false;
      setShowSubmitModal(false);
      setSubmitError(lastError?.message || 'Could not connect to assessment server.');
      return;
    }

    if (reason === 'tab_switch') {
      setShowSubmitModal(false);
      setTerminated(result);
    } else {
      onTestCompleted(result);
    }
  };

  const isTimerDanger = remainingSeconds < 300;
  const isCurrentMarkedForReview =
    paletteStates[currentQuestion?.id] === 'MARKED_FOR_REVIEW' ||
    paletteStates[currentQuestion?.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW';

  // Tile Class & Badge Helper
  const getTileClasses = (state, isCurrent) => {
    let bg = 'bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-charcoal-700';

    if (state === 'ANSWERED') {
      bg = 'bg-emerald-600 text-white font-bold border border-emerald-700';
    } else if (state === 'NOT_ANSWERED') {
      bg = 'bg-rose-600 text-white font-bold border border-rose-700';
    } else if (state === 'MARKED_FOR_REVIEW' || state === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
      bg = 'bg-slate-700 dark:bg-slate-600 text-white font-bold border border-slate-800';
    }

    if (isCurrent) {
      return `${bg} ring-3 ring-blue-600 shadow-md scale-105 z-10`;
    }
    return bg;
  };

  // Font Size Stying
  const getQuestionFontSize = () => {
    if (fontZoom === 'sm') return 'text-xs sm:text-sm';
    if (fontZoom === 'lg') return 'text-base sm:text-lg';
    return 'text-sm sm:text-base';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 space-y-4 font-sans text-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Launching CBT Assessment Portal...
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Synchronizing encrypted candidate terminal, section cutoffs, and proctored stream...
          </p>
        </div>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-3 rounded-2xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-charcoal-900 p-6 shadow-md">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center border border-amber-300">
            <AlertTriangleIcon size={24} />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Response Sync Interrupted</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {submitError}. Please maintain active connection. Your answers are preserved in local buffer.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitExam(lastReasonRef.current)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            {submitting ? 'Re-Submitting...' : 'Retry Submission Now'}
          </button>
        </div>
      </div>
    );
  }

  if (terminated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-3 rounded-2xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-charcoal-900 p-6 shadow-md">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center border border-rose-300">
            <AlertTriangleIcon size={24} />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Examination Session Terminated</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Tab switch threshold exceeded ({MAX_TAB_SWITCHES} max allowed). In accordance with proctoring standards, all responses recorded up to this point have been locked and submitted.
          </p>
          <button
            type="button"
            onClick={() => onTestCompleted(terminated)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            View Official Scorecard →
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-charcoal-950 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="max-w-md w-full text-center space-y-3 rounded-2xl border border-rose-200 bg-white dark:bg-charcoal-900 p-6 shadow-md">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Unable to Load Assessment</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">{loadError}</p>
          <div className="flex justify-center gap-2 pt-1">
            <button type="button" onClick={initExamSession} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer">Retry</button>
            <button type="button" onClick={onExit} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-charcoal-950 text-slate-900 dark:text-slate-100 font-sans select-none">
      {/* =========================================================================
          1. TOP MAIN HEADER BAR (TCS iON CBT Assessment Portal Style)
          ========================================================================= */}
      <header className="bg-white dark:bg-charcoal-900 border-b border-slate-200 dark:border-charcoal-800 px-4 sm:px-6 py-2.5 shadow-xs sticky top-0 z-40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Brand Emblem + Exam Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hex Logo Emblem */}
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              <ShieldIcon size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-blue-900 dark:text-blue-400 text-sm tracking-tight">TESTACE</span>
                <span className="text-[10px] text-slate-400 font-mono">|</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ONLINE EXAM PORTAL</span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md mt-1">
                {attemptSession?.test_title || 'SBI PO Prelims All-India Live Mock #04'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE ASSESSMENT SESSION</span>
              </div>
            </div>
          </div>

          {/* Center: Top Section Timers (Dynamic Multi-Section Pills) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto py-1">
            {sections.map((sec) => {
              const isActiveSec = sec.name === currentSection?.name;
              return (
                <div
                  key={sec.name}
                  onClick={() => jumpToQuestion(sec.indices[0])}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActiveSec
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-charcoal-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{sec.name}</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                    isActiveSec ? 'bg-white/20 text-white' : 'bg-white dark:bg-charcoal-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {isActiveSec ? formatTime(remainingSeconds) : '20:00'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Quick Tools & Candidate Roll */}
          <div className="flex items-center gap-2 sm:gap-3 self-end lg:self-auto shrink-0">
            {/* View in: ENG */}
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
              View in: <strong className="text-slate-800 dark:text-slate-200">ENG</strong>
            </span>

            {/* Summary Modal Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-slate-100 dark:hover:bg-charcoal-750 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Summary
            </button>

            {/* Instructions Button */}
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-slate-100 dark:hover:bg-charcoal-750 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Instructions
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
            </button>

            {/* Candidate Metadata Block */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-charcoal-700">
              <div className="text-right leading-tight hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                  {user?.full_name || 'Aditya K.'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Roll: {user?.id ? '240' + String(user.id).slice(-5) : '24098132'}
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. SECONDARY SUB-HEADER TOOLBAR (Sections + Time Left + Meta Strip)
          ========================================================================= */}
      <nav className="bg-slate-50 dark:bg-charcoal-900/90 border-b border-slate-200 dark:border-charcoal-800 px-4 sm:px-6 py-2 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Section Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {sections.map((sec) => {
              const isActive = sec.name === currentSection?.name;
              return (
                <button
                  key={sec.name}
                  onClick={() => jumpToQuestion(sec.indices[0])}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-charcoal-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{sec.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-charcoal-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {sec.count} Qs
                  </span>
                </button>
              );
            })}
          </div>

          {/* Meta & Utility Strip (Time Left, Question Paper, Instructions, Font Zoom) */}
          <div className="flex flex-wrap items-center gap-3 text-xs self-start md:self-auto">
            {/* Marking Scheme Pill */}
            <div className="flex items-center gap-1 font-mono font-bold text-[11px] bg-white dark:bg-charcoal-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-charcoal-700">
              <span className="text-emerald-600">+1.00</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-rose-600">-0.25</span>
            </div>

            {/* Time Left Clock */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono font-bold text-xs ${
              isTimerDanger
                ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                : 'bg-white dark:bg-charcoal-800 border-slate-200 dark:border-charcoal-700 text-slate-800 dark:text-slate-200'
            }`}>
              <ClockIcon size={14} className={isTimerDanger ? 'text-rose-600' : 'text-amber-500'} />
              <span>TIME LEFT:</span>
              <span className={isTimerDanger ? 'text-rose-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                {formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Language Dropdown */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-charcoal-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="English">View in: English</option>
                <option value="Hindi">View in: Hindi (हिंदी)</option>
              </select>
            </div>

            {/* Question Paper Button */}
            <button
              onClick={() => setShowQuestionPaperModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-charcoal-800 hover:bg-slate-100 border border-slate-200 dark:border-charcoal-700 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <FileTextIcon size={12} />
              <span>Q. Paper</span>
            </button>

            {/* Instructions Button */}
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-charcoal-800 hover:bg-slate-100 border border-slate-200 dark:border-charcoal-700 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <HelpCircleIcon size={12} />
              <span>Instructions</span>
            </button>

            {/* Font Size Zoom Controller */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-charcoal-800 p-0.5 rounded-lg border border-slate-200 dark:border-charcoal-700">
              <button
                onClick={() => setFontZoom('sm')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontZoom === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Small Font"
              >
                A-
              </button>
              <button
                onClick={() => setFontZoom('normal')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontZoom === 'normal' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Default Font"
              >
                A
              </button>
              <button
                onClick={() => setFontZoom('lg')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontZoom === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Large Font"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab Switch Alert Banner */}
      {showTabWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Integrity Notice:</strong> Tab switch detected ({tabSwitchCount} of {MAX_TAB_SWITCHES} allowed).{' '}
              {tabSwitchCount >= MAX_TAB_SWITCHES
                ? 'One more switch will terminate and submit your assessment.'
                : 'Please remain inside the examination window.'}
            </span>
          </div>
          <button
            onClick={() => setShowTabWarning(false)}
            className="text-xs font-bold underline cursor-pointer ml-4"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* =========================================================================
          3. MAIN EXAMINATION WORKSPACE (Left: Question Zone | Right: Palette)
          ========================================================================= */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5 items-stretch">
        {/* LEFT COLUMN: QUESTION PANE (~70% width) */}
        <section className="flex-1 flex flex-col justify-between bg-white dark:bg-charcoal-900 rounded-2xl border border-slate-200 dark:border-charcoal-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {/* Question Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-charcoal-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-900 dark:bg-blue-700 text-white font-mono font-black text-xs flex items-center justify-center">
                  Q. {currentIndex + 1}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Question No. {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-charcoal-700">
                  Single Choice Objective
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleToggleMarkForReview}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    isCurrentMarkedForReview
                      ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-white dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-charcoal-700 hover:bg-slate-100'
                  }`}
                >
                  <FlagIcon size={12} className={isCurrentMarkedForReview ? 'text-purple-600' : 'text-slate-400'} />
                  <span>{isCurrentMarkedForReview ? 'Flagged for Review' : 'Flag Question'}</span>
                </button>

                <div className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">
                  Section Mark: +1.00 / -0.25
                </div>
              </div>
            </div>

            {/* Direction / Data Interpretation Box */}
            {(currentQuestion?.direction || currentQuestion?.passage || currentQuestion?.topic?.toLowerCase().includes('data interpretation') || currentQuestion?.topic?.toLowerCase().includes('comprehension')) && (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                  <span>📊</span>
                  <span>DIRECTION (Q. NOS {Math.max(1, currentIndex - 2)} - {Math.min(questions.length, currentIndex + 2)}): STUDY THE FOLLOWING CAREFULLY & ANSWER THE QUESTION.</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {currentQuestion?.direction ||
                    'The data represents the proportional breakdown of commercial transactions across financial quarters. Evaluate net ratios and variance accurately before selecting the optimal choice.'}
                </p>
              </div>
            )}

            {/* Question Text */}
            <div className={`font-bold text-slate-900 dark:text-white leading-relaxed ${getQuestionFontSize()} p-1`}>
              {currentQuestion?.question_text}
            </div>

            {/* Answer Options (A, B, C, D, E) */}
            <div className="space-y-3 pt-2" role="radiogroup" aria-label="Answer options">
              {(currentQuestion?.options || []).map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/30 text-blue-950 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800/70 text-slate-800 dark:text-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-charcoal-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-charcoal-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-charcoal-600'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="leading-snug">{opt.text}</span>
                      {isSelected && (
                        <span className="ml-2 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          SELECTED
                        </span>
                      )}
                    </div>

                    {/* Radio Button Circle */}
                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-charcoal-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUESTION ACTION FOOTER (Sticky Navigation Controls) */}
          <footer className="p-3.5 sm:p-4 bg-slate-50 dark:bg-charcoal-900 border-t border-slate-200 dark:border-charcoal-800 flex flex-wrap items-center justify-between gap-3">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FlagIcon size={12} />
                <span>Mark for Review & Next</span>
              </button>

              <button
                type="button"
                onClick={handleClearResponse}
                disabled={!answers[currentQuestion?.id]}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCwIcon size={12} />
                <span>Clear Response</span>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrevQuestion}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeftIcon size={14} />
                <span>Save & Previous</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Save & Next</span>
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </footer>
        </section>

        {/* RIGHT COLUMN: PROCTORED CANDIDATE + QUESTION PALETTE (~30% width) */}
        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0">
          {/* 1. Proctored Candidate Card */}
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-slate-200 dark:border-charcoal-800 p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Photo Frame */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-xs shrink-0">
                <div className="w-full h-full bg-slate-900 rounded-[10px] overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                  {user?.profile?.avatar_url ? (
                    <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {user?.full_name || 'Aditya K.'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Roll: {user?.id ? '25010' + String(user.id).slice(-4) : '2501048291'}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold font-mono">
                  Node: <strong>C-042 (Lab B)</strong>
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PROCTORED
            </span>
          </div>

          {/* 2. Palette Legend Card */}
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-slate-200 dark:border-charcoal-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-charcoal-800">
              <span className="uppercase tracking-wider text-[11px] text-slate-500">PALETTE LEGEND</span>
              <span className="font-mono text-slate-400">{questions.length} Questions</span>
            </div>

            {/* Grid of 5 States */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                  {String(counts.answered).padStart(2, '0')}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-rose-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                  {String(counts.notAnswered).padStart(2, '0')}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Not Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-slate-200 dark:bg-charcoal-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center">
                  {String(counts.notVisited).padStart(2, '0')}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Not Visited</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-slate-700 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                  {String(counts.markedReview).padStart(2, '0')}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Marked Review</span>
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-charcoal-800">
                <span className="w-5 h-5 rounded bg-slate-700 text-white font-mono font-bold text-[10px] flex items-center justify-center relative">
                  {String(counts.ansAndMarkedReview).padStart(2, '0')}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-0.5 right-0.5" />
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                  Ans. & Marked for Review (Evaluated)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Question Palette Tiles Grid */}
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-slate-200 dark:border-charcoal-800 p-4 shadow-xs space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-charcoal-800">
                <span className="text-slate-900 dark:text-white">Question Palette</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium text-[11px] truncate max-w-[130px]">
                  {currentSection?.name || 'Section'}
                </span>
              </div>

              {/* Number Buttons Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-7 lg:grid-cols-6 gap-2 pt-3 max-h-[320px] overflow-y-auto p-1 scrollbar-thin">
                {questions.map((q, idx) => {
                  const state = paletteStates[q.id] || 'NOT_VISITED';
                  const isCurrent = idx === currentIndex;
                  const isAnsReview = state === 'ANSWERED_AND_MARKED_FOR_REVIEW';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => jumpToQuestion(idx)}
                      className={`h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs select-none transition-all cursor-pointer relative ${getTileClasses(state, isCurrent)}`}
                    >
                      <span>{idx + 1}</span>
                      {isAnsReview && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Attempt Rate & Pace Bar */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-charcoal-800 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Section Attempt Rate:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {sectionStats.answered} / {sectionStats.total} ({sectionStats.percent}%)
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-charcoal-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${sectionStats.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Avg Pace: <strong>42 sec/Q</strong></span>
                <span>Target Cutoff: <strong>{Math.ceil(sectionStats.total * 0.65)}+ Qs</strong></span>
              </div>
            </div>

            {/* SUBMIT TEST BUTTON (Full Width Prominent Red Banner) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckIcon size={18} />
                <span>Submit Test</span>
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* =========================================================================
          4. BOTTOM STATUS STRIP (Licensing & Proctored Session Footnote)
          ========================================================================= */}
      <footer className="bg-white dark:bg-charcoal-900 border-t border-slate-200 dark:border-charcoal-800 px-4 sm:px-6 py-2 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <strong className="text-slate-700 dark:text-slate-300 uppercase">LEGEND:</strong>
          <span className="flex items-center gap-1">🟩 Answered</span>
          <span className="flex items-center gap-1">🟥 Not Answered</span>
          <span className="flex items-center gap-1">⬜ Not Visited</span>
          <span className="flex items-center gap-1">⬛ Review</span>
        </div>

        <div className="font-mono text-[10px]">
          © 2026 TestAce Assessment Engine. Licensed to Candidate Session. Proctored Stream Active.
        </div>
      </footer>

      {/* =========================================================================
          5. QUESTION PAPER MODAL (Quick Scan of all questions in paper)
          ========================================================================= */}
      {showQuestionPaperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-750 max-w-4xl w-full max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Full Question Paper Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {attemptSession?.test_title || 'Assessment Paper'} • {questions.length} Questions
                </p>
              </div>
              <button
                onClick={() => setShowQuestionPaperModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-charcoal-800 bg-slate-50/50 dark:bg-charcoal-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Question {idx + 1} ({q.subject})</span>
                    <button
                      onClick={() => {
                        jumpToQuestion(idx);
                        setShowQuestionPaperModal(false);
                      }}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Jump to this question →
                    </button>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{q.question_text}</div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    {(q.options || []).map((opt) => (
                      <div key={opt.id} className="p-2 rounded-lg bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-charcoal-700">
                        <strong className="mr-1.5">{opt.id}.</strong> {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-charcoal-800 flex justify-end">
              <button
                onClick={() => setShowQuestionPaperModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer"
              >
                Return to Active Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. INSTRUCTIONS MODAL
          ========================================================================= */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-750 max-w-2xl w-full max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Examination Guidelines & Marking Scheme
                </h3>
                <p className="text-xs text-slate-500">Standard TCS iON Computer-Based Testing Rules</p>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-1 font-medium">
                <div className="font-bold text-blue-900 dark:text-blue-200">Negative Marking Rule:</div>
                <div>• Correct Answer: <strong>+1.00 Marks</strong> (or +2.00 for tier-specific sections).</div>
                <div>• Incorrect Answer: <strong>-0.25 Marks</strong> penalty deducted from raw aggregate.</div>
                <div>• Unattempted: <strong>0.00 Marks</strong> (no penalty applied).</div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white">Navigation & Palette Rules:</div>
                <div>• Click <strong>Save & Next</strong> to save response and proceed to next question.</div>
                <div>• Click <strong>Mark for Review & Next</strong> to save and flag for secondary evaluation.</div>
                <div>• Click <strong>Clear Response</strong> to deselect chosen option.</div>
                <div>• Note: Questions marked for review with an answered option <strong>WILL BE EVALUATED</strong> in final score.</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-charcoal-800 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL: EXAM SUBMISSION SUMMARY (TCS iON Candidate Audit Format)
          ========================================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-750 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-charcoal-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <ClipboardCheckIcon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Exam Submission Summary
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      FINAL REVIEW
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {attemptSession?.test_title || 'SBI PO Prelims All-India Live Mock #04'}
                    </span>
                    <span>•</span>
                    <span className="text-rose-600 font-bold flex items-center gap-1 font-mono">
                      <span>⏳ Time Remaining:</span>
                      <span>{remainingMinutes} mins {remainingSecsOnly} secs</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 transition-colors cursor-pointer text-sm font-bold"
                title="Cancel & Return to Exam"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top 4 KPI Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Attempted */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      TOTAL ATTEMPTED
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <CheckIcon size={13} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl font-black text-emerald-800 dark:text-emerald-300">
                        {String(matrixTotals.netAttempted).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ {matrixTotals.total}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-charcoal-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${matrixTotals.attemptedPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">{matrixTotals.attemptedPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Unattempted */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      UNATTEMPTED
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-xs">
                      <XCircleIcon size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                        {String(matrixTotals.unattempted).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ {matrixTotals.total}</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      {matrixTotals.notAnswered} Not Ans • {matrixTotals.notVisited} Not Visited
                    </div>
                  </div>
                </div>

                {/* 3. Review Flagged */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      REVIEW FLAGGED
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <BookmarkIcon size={13} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {String(matrixTotals.markedReview + matrixTotals.ansAndMarked).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Total</span>
                    </div>
                    <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {matrixTotals.ansAndMarked} Ans & Evaluated
                    </div>
                  </div>
                </div>

                {/* 4. Pacing / Time */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-charcoal-800/60 border border-slate-200 dark:border-charcoal-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      PACING / TIME
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <ClockIcon size={13} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {elapsedFormatted}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ {totalDurationMins}m</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      {remainingMinutes}m {remainingSecsOnly}s Remaining
                    </div>
                  </div>
                </div>
              </div>

              {/* Sectional Performance Matrix Table (TCS iON Candidate Audit Format) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span>Sectional Performance Matrix</span>
                    <span className="text-slate-400 font-normal">(TCS iON Candidate Audit Format)</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 font-medium">
                    AUTO-SYNC @ {new Date().toLocaleTimeString('en-GB')}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-charcoal-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50/70 dark:bg-charcoal-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-charcoal-700">
                        <th className="py-3 px-4">SECTION NAME</th>
                        <th className="py-3 px-3 text-center font-mono">TOTAL QS</th>
                        <th className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400 font-bold">ANSWERED</th>
                        <th className="py-3 px-3 text-center text-rose-700 dark:text-rose-400 font-bold">NOT ANSWERED</th>
                        <th className="py-3 px-3 text-center">MARKED REVIEW</th>
                        <th className="py-3 px-3 text-center bg-blue-100/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">ANS & MARKED*</th>
                        <th className="py-3 px-3 text-center">NOT VISITED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800 bg-white dark:bg-charcoal-900 text-xs font-medium">
                      {sectionalMatrix.map((sec) => (
                        <tr key={sec.name} className="hover:bg-slate-50/60 dark:hover:bg-charcoal-800/40 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${sec.dotColor} shrink-0`} />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{sec.name}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {sec.total}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {sec.answered > 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                                {String(sec.answered).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400">00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {sec.notAnswered > 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold">
                                {String(sec.notAnswered).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400">00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {String(sec.markedReview).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {sec.ansAndMarked > 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                                {String(sec.ansAndMarked).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400">00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {sec.notVisited > 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
                                {String(sec.notVisited).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400">00</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Total Summary Row */}
                      <tr className="bg-blue-50/60 dark:bg-charcoal-800/80 font-black text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-charcoal-700">
                        <td className="py-3 px-4 text-blue-700 dark:text-blue-400 font-extrabold flex items-center gap-1.5">
                          <span className="text-sm">Σ</span>
                          <span>Total Summary</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black">{matrixTotals.total}</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-700 dark:text-emerald-400">{matrixTotals.answered}</td>
                        <td className="py-3 px-3 text-center font-mono text-rose-700 dark:text-rose-400">{matrixTotals.notAnswered}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">{String(matrixTotals.markedReview).padStart(2, '0')}</td>
                        <td className="py-3 px-3 text-center font-mono text-blue-700 dark:text-blue-400">{String(matrixTotals.ansAndMarked).padStart(2, '0')}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">{String(matrixTotals.notVisited).padStart(2, '0')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] pt-1 px-1">
                  <span className="text-slate-500">
                    * Answered & Marked for Review will be considered for final scoring evaluation.
                  </span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    Net Attempted Count: {matrixTotals.netAttempted} Qs
                  </span>
                </div>
              </div>

              {/* Attention Callout Box */}
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangleIcon size={16} />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                    Attention: Final Confirmation Required
                  </div>
                  <p className="text-rose-800/90 dark:text-rose-300 leading-relaxed font-sans">
                    You have <strong className="font-bold">{remainingMinutes} minutes and {remainingSecsOnly} seconds remaining</strong> in this exam session. Once you confirm final submission, you <strong className="font-bold">cannot resume, re-enter, or edit</strong> any answers for this assessment. Unsaved responses will be discarded. Answered questions marked for review will be scored in accordance with standard IBPS marking policy (+1.00 for correct, -0.25 for incorrect).
                  </p>
                </div>
              </div>

              {/* Candidate Declaration & Final Sign-Off Checkbox */}
              <label className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-3.5 cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isDeclared}
                  onChange={(e) => setIsDeclared(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Candidate Declaration & Final Sign-Off
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    I have thoroughly verified my sectional attempt summary presented above. I understand that submitting now is irreversible and hereby confirm I wish to conclude my examination.
                  </div>
                </div>
              </label>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-charcoal-900/90 border-t border-slate-100 dark:border-charcoal-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#eef4ff] hover:bg-[#e0ecff] dark:bg-charcoal-800 dark:hover:bg-charcoal-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <ChevronLeftIcon size={14} />
                <span>Resume Test / Return to Exam</span>
              </button>

              <span className="text-xs text-slate-400 hidden sm:inline">
                Press Esc to cancel
              </span>

              <button
                type="button"
                onClick={() => submitExam()}
                disabled={!isDeclared || submitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 ${
                  isDeclared && !submitting
                    ? 'bg-[#d78285] hover:bg-[#c97174] text-white cursor-pointer active:scale-98'
                    : 'bg-[#e7a8aa] dark:bg-rose-950/60 text-white/90 cursor-not-allowed opacity-60'
                }`}
              >
                <LockIcon size={14} />
                <span>{submitting ? 'Submitting & Grading Responses...' : 'Yes, Final Submit Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL: PAUSE EXAMINATION OVERLAY
          ========================================================================= */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center border border-amber-300">
              <PauseIcon size={24} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Assessment Session Paused
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Timer frozen at <strong className="font-mono text-slate-800 dark:text-slate-200">{formatTime(remainingSeconds)}</strong>. Your responses are safely buffered.
              </p>
            </div>

            <button
              onClick={handleResumeExam}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
            >
              Resume Assessment Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
