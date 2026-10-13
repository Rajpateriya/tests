import React, { useState, useEffect, useMemo } from 'react';
import { api, DEMO_QUESTIONS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Confetti } from '../components/Confetti';
import {
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TargetIcon,
  BarChart3Icon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  EyeIcon,
  FileTextIcon,
  CheckIcon,
  LayersIcon,
  UserIcon,
  ShieldIcon,
  FlagIcon,
  AlertTriangleIcon,
} from '../components/Icons';

/**
 * ResultScorecardPage — Academic Performance & CBT Exam Room Solution Review
 * Features:
 * - Hero Section: Marks secured, All-India Rank, Percentile benchmark, Total time.
 * - 5 KPI Cards: Correct, Incorrect, Unattempted, Hit Accuracy, and CBT Solution Review tab.
 * - Visual Analytics: Subject-wise Accuracy vs. Time Spent chart layout & Actionable Topic Diagnosis.
 * - Full-Fidelity CBT Exam Room Review Mode (TCS iON / Real CBT Simulator Layout):
 *   - Sub-header toolbar with section navigation, marks scheme, dwell timer, font zoom (A-, A, A+),
 *     and toggle to show/hide the official correct answer key.
 *   - Left Question Pane with user's selected choice pre-ticked/checked.
 *   - Wrong answers flagged in soft rose with user's selection, and option to highlight the official
 *     correct key in emerald green with "★ Official Correct Answer" badge.
 *   - Step-by-step conceptual solution and derivation accordion.
 *   - Action controls: Previous, Next, and "Jump to Next Mistake" shortcut.
 *   - Right CBT Sidebar with Proctored Candidate Card, Performance summary, Legend,
 *     filter pills (All, Incorrect, Correct, Skipped), and color-coded Question Palette grid.
 */
export const ResultScorecardPage = ({ attemptId, onRetake, onGoToDashboard, onBackToDiscovery }) => {
  const { user } = useAuth();

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [insights, setInsights] = useState(null);

  // View & Review Navigation States
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'review'
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('ALL'); // 'ALL' | 'INCORRECT' | 'CORRECT' | 'UNATTEMPTED'
  const [showCorrectKey, setShowCorrectKey] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [fontZoom, setFontZoom] = useState('normal'); // 'sm' | 'normal' | 'lg'
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const [resScore, resInsights] = await Promise.all([
        api.results.getResult(attemptId),
        api.results.getInsights(attemptId),
      ]);
      setScoreData(resScore);
      setInsights(resInsights);
    } catch (err) {
      console.warn('Fallback loading results data:', err);
      const fallbackScore = await api.results.getResult(attemptId);
      const fallbackInsights = await api.results.getInsights(attemptId);
      setScoreData(fallbackScore);
      setInsights(fallbackInsights);
    } finally {
      setLoading(false);
    }
  };

  // Safe question review breakdown list with full fallback
  const questionsList = useMemo(() => {
    if (insights?.questions_breakdown && insights.questions_breakdown.length > 0) {
      return insights.questions_breakdown;
    }
    // Fallback based on DEMO_QUESTIONS
    return DEMO_QUESTIONS.map((q, idx) => ({
      question_id: q.id,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty || 'MEDIUM',
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      selected_option: idx === 7 ? 'A' : q.correct_option,
      is_correct: idx !== 7,
      is_attempted: true,
      marks_awarded: idx !== 7 ? 2.0 : -0.5,
      time_taken_seconds: 65,
      solution_explanation: q.solution_explanation,
    }));
  }, [insights]);

  // Unique subjects for quick navigation
  const uniqueSubjects = useMemo(() => {
    const list = Array.from(new Set(questionsList.map((q) => q.subject).filter(Boolean)));
    return ['ALL', ...list];
  }, [questionsList]);

  // Filtered questions based on palette filter & subject
  const filteredIndices = useMemo(() => {
    return questionsList
      .map((q, idx) => {
        const matchesSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
        let matchesFilter = true;
        if (reviewFilter === 'CORRECT') matchesFilter = q.is_correct && q.is_attempted;
        else if (reviewFilter === 'INCORRECT') matchesFilter = !q.is_correct && q.is_attempted;
        else if (reviewFilter === 'UNATTEMPTED') matchesFilter = !q.is_attempted;

        return matchesSubject && matchesFilter ? idx : -1;
      })
      .filter((idx) => idx !== -1);
  }, [questionsList, selectedSubject, reviewFilter]);

  const currentQuestion = questionsList[reviewIndex] || questionsList[0] || null;

  // Jump to next mistake shortcut
  const handleJumpToNextMistake = () => {
    const incorrectIndices = questionsList
      .map((q, idx) => (!q.is_correct && q.is_attempted ? idx : -1))
      .filter((idx) => idx !== -1);

    if (!incorrectIndices.length) return;

    const nextIdx = incorrectIndices.find((idx) => idx > reviewIndex);
    if (nextIdx !== undefined) {
      setReviewIndex(nextIdx);
    } else {
      setReviewIndex(incorrectIndices[0]);
    }
  };

  const isCelebratory = (scoreData?.accuracy_percentage || 0) >= 70;

  const formatSeconds = (secs = 0) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // Font zoom class helper
  const getQuestionFontSize = () => {
    if (fontZoom === 'sm') return 'text-xs sm:text-sm leading-relaxed';
    if (fontZoom === 'lg') return 'text-base sm:text-lg leading-relaxed';
    return 'text-sm sm:text-base leading-relaxed';
  };

  const getOptionFontSize = () => {
    if (fontZoom === 'sm') return 'text-xs';
    if (fontZoom === 'lg') return 'text-sm sm:text-base';
    return 'text-xs sm:text-sm';
  };

  // Skeleton loading screen
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse font-sans">
        <div className="h-44 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-28 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
      </main>
    );
  }

  return (
    <div className="relative overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-radial-glow min-h-screen">
      {/* Moving Ambient Scorecard Glows */}
      <div className="absolute -top-32 left-1/3 w-[500px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-1/2 -right-24 w-[450px] h-[450px] bg-institutional-500/10 dark:bg-institutional-500/15 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-amber-500/8 dark:bg-amber-500/12 blur-[120px] rounded-full pointer-events-none animate-drift-slow" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {isCelebratory && <Confetti duration={3000} />}

        {/* ========================================================================= */}
        {/* TOP VIEW NAVIGATION BAR (Scorecard Analytics vs CBT Solution Review)     */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-md border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-3 sm:p-4 shadow-subtle">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl border border-charcoal-200 dark:border-charcoal-700">
            <button
              id="view-overview-tab"
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'overview'
                  ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              <BarChart3Icon size={15} />
              <span>Scorecard & Analytics</span>
            </button>

            <button
              id="view-cbt-review-tab"
              onClick={() => setActiveView('review')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'review'
                  ? 'bg-institutional-600 text-white shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              <LayersIcon size={15} />
              <span>CBT Exam Room Review</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-institutional-100 text-institutional-800 dark:bg-institutional-900 dark:text-institutional-200 font-mono">
                {questionsList.length}Q
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDiscovery}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-750 transition-colors cursor-pointer"
            >
              All Tests
            </button>
            <button
              onClick={onGoToDashboard}
              className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-institutional-600 hover:bg-institutional-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <TrophyIcon size={14} />
              <span>Candidate Dashboard</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. HERO SECTION: Official Evaluation Scorecard                            */}
        {/* ========================================================================= */}
        <section className="bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
          {scoreData?.ended_reason === 'tab_switch' && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangleIcon size={16} className="shrink-0 text-rose-600" />
              <span>
                <strong>Test ended early:</strong> this attempt was ended automatically because you switched away from the exam
                tab {scoreData?.tab_switch_count ? `${scoreData.tab_switch_count} times` : 'too many times'}. Only the answers saved
                up to that point were scored.
              </span>
            </div>
          )}

          {/* Top Title & Completed Time */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200/60 dark:border-institutional-800/40">
                  Official Mock Evaluation
                </span>
                <span className="text-xs text-charcoal-400 font-mono">
                  Session ID: {scoreData?.attempt_id?.slice(0, 12) || 'DEMO-ATPT-01'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-charcoal-900 dark:text-charcoal-50">
                {scoreData?.test_title || 'Mock Examination Scorecard'}
              </h1>

              <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
                Completed on{' '}
                {new Date(scoreData?.end_time || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Quick Status Tag */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircleIcon size={14} className="text-emerald-600" />
                <span>EVALUATED & CERTIFIED</span>
              </span>
            </div>
          </div>

          {/* Hero Score Highlights (Data-Rich, Academic Layout) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 bg-charcoal-50/70 dark:bg-charcoal-850/50 rounded-2xl border border-charcoal-200/80 dark:border-charcoal-750">
            {/* Final Score */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Marks Secured</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-50">
                  {scoreData?.total_score !== undefined ? scoreData.total_score.toFixed(1) : '13.5'}
                </span>
                <span className="text-sm font-mono text-charcoal-400">
                  / {scoreData?.max_possible_score !== undefined ? scoreData.max_possible_score.toFixed(1) : '16.0'}
                </span>
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium">
                Net Percentage: <strong>{scoreData?.percentage?.toFixed(1) || 84.4}%</strong>
              </div>
            </div>

            {/* All India Estimated Rank */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Estimated Rank</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-institutional-700 dark:text-institutional-300">
                #{insights?.rank || '18'}
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium">
                Out of <strong>{insights?.total_participants || '412'}</strong> examinees
              </div>
            </div>

            {/* All India Percentile */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">National Percentile</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-institutional-700 dark:text-institutional-300">
                {insights?.percentile ? insights.percentile.toFixed(1) : '94.2'}%
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium">
                Top <strong>{(100 - (insights?.percentile || 94.2)).toFixed(1)}%</strong> nationwide
              </div>
            </div>

            {/* Total Time Taken */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Time Taken</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-50">
                {formatSeconds(scoreData?.total_time_taken_seconds || 540)}
              </div>
              <div className="text-[11px] text-charcoal-500 font-medium">
                Avg dwell: <strong>{insights?.avg_time_per_question ? Math.round(insights.avg_time_per_question) : 68}s</strong> / Q
              </div>
            </div>
          </div>

          {/* 5 KPI CARDS ROW: Correct, Incorrect, Unattempted, Hit Accuracy, AND CBT Solution Review */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Correct Answers */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Correct</div>
                <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {scoreData?.correct_count || 0}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircleIcon size={20} />
              </div>
            </div>

            {/* Incorrect Answers */}
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Incorrect</div>
                <div className="text-2xl font-black font-mono text-rose-900 dark:text-rose-200 mt-0.5">
                  {scoreData?.incorrect_count || 0}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                <XCircleIcon size={20} />
              </div>
            </div>

            {/* Unattempted */}
            <div className="p-4 rounded-2xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50/50 dark:bg-charcoal-850/40 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-charcoal-600 dark:text-charcoal-400 uppercase tracking-wider">Unattempted</div>
                <div className="text-2xl font-black font-mono text-charcoal-800 dark:text-charcoal-200 mt-0.5">
                  {scoreData?.unattempted_count || 0}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300">
                <TargetIcon size={20} />
              </div>
            </div>

            {/* Hit Accuracy */}
            <div className="p-4 rounded-2xl border border-institutional-200 dark:border-institutional-800/60 bg-institutional-50/40 dark:bg-institutional-950/20 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-institutional-700 dark:text-institutional-300 uppercase tracking-wider">Hit Accuracy</div>
                <div className="text-2xl font-black font-mono text-institutional-900 dark:text-institutional-100 mt-0.5">
                  {scoreData?.accuracy_percentage?.toFixed(1) || 0}%
                </div>
              </div>
              <div className="p-2 rounded-xl bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300">
                <SparklesIcon size={20} />
              </div>
            </div>

            {/* 5th TAB: CBT SOLUTION REVIEW (Requested beside Hit Accuracy) */}
            <button
              id="cbt-review-action-tab"
              type="button"
              onClick={() => {
                setActiveView('review');
              }}
              className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                activeView === 'review'
                  ? 'border-institutional-600 bg-institutional-600 text-white shadow-md ring-2 ring-institutional-500/30'
                  : 'border-institutional-300 dark:border-institutional-700 bg-gradient-to-br from-institutional-50 to-indigo-50/50 dark:from-institutional-950/40 dark:to-indigo-950/30 text-institutional-900 dark:text-institutional-100 hover:border-institutional-500 hover:shadow-md'
              }`}
            >
              <div>
                <div className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                  activeView === 'review' ? 'text-institutional-100' : 'text-institutional-700 dark:text-institutional-300'
                }`}>
                  <span>CBT Review</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className={`text-sm sm:text-base font-black mt-0.5 flex items-center gap-1 ${
                  activeView === 'review' ? 'text-white' : 'text-institutional-950 dark:text-white'
                }`}>
                  <span>{questionsList.length} Questions</span>
                </div>
                <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${
                  activeView === 'review' ? 'text-institutional-200' : 'text-institutional-600 dark:text-institutional-400 group-hover:translate-x-0.5 transition-transform'
                }`}>
                  <span>{activeView === 'review' ? 'Active in Review Mode' : 'Launch Review Mode →'}</span>
                </div>
              </div>

              <div className={`p-2 rounded-xl transition-all ${
                activeView === 'review'
                  ? 'bg-white/20 text-white'
                  : 'bg-institutional-600 text-white shadow-sm group-hover:scale-105'
              }`}>
                <LayersIcon size={20} />
              </div>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW & ANALYTICS                                              */}
        {/* ========================================================================= */}
        {activeView === 'overview' && (
          <>
            {/* Visual Analytics: Subject-Wise Performance & Topic Diagnosis */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-labelledby="analytics-heading">
              {/* Left 2 Cols: Subject Performance Bar & Time Layout */}
              <div className="lg:col-span-2 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 shadow-subtle space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
                  <div>
                    <h2 id="analytics-heading" className="text-base font-bold text-charcoal-900 dark:text-charcoal-100">
                      Subject-Wise Performance Analysis
                    </h2>
                    <p className="text-xs text-charcoal-500">
                      Accuracy percentage mapped alongside average dwell time per question.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-charcoal-400">
                    Benchmark: &gt; 80% Target
                  </span>
                </div>

                {/* Subject Rows */}
                <div className="space-y-5">
                  {(insights?.subject_analysis || [
                    { subject: 'Quantitative Aptitude', total_questions: 3, correct: 3, accuracy_percentage: 100.0, avg_time_per_q_seconds: 75.0 },
                    { subject: 'General Intelligence & Reasoning', total_questions: 2, correct: 2, accuracy_percentage: 100.0, avg_time_per_q_seconds: 52.0 },
                    { subject: 'General Awareness', total_questions: 2, correct: 1, accuracy_percentage: 50.0, avg_time_per_q_seconds: 35.0 },
                    { subject: 'English Comprehension', total_questions: 1, correct: 1, accuracy_percentage: 100.0, avg_time_per_q_seconds: 40.0 },
                  ]).map((subj) => (
                    <div key={subj.subject} className="space-y-1.5 p-3 rounded-xl hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/40 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-charcoal-900 dark:text-charcoal-100">{subj.subject}</span>
                          <span className="text-charcoal-400 font-mono">
                            ({subj.correct}/{subj.total_questions} Correct)
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-charcoal-500 flex items-center gap-1">
                            <ClockIcon size={12} className="text-charcoal-400" />
                            {Math.round(subj.avg_time_per_q_seconds || 0)}s avg
                          </span>
                          <span
                            className={`font-bold ${
                              subj.accuracy_percentage >= 75
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : subj.accuracy_percentage >= 50
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {subj.accuracy_percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Accuracy Bar */}
                      <div className="w-full bg-charcoal-100 dark:bg-charcoal-800 h-2.5 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            subj.accuracy_percentage >= 75
                              ? 'bg-emerald-600'
                              : subj.accuracy_percentage >= 50
                              ? 'bg-amber-600'
                              : 'bg-rose-600'
                          }`}
                          style={{ width: `${subj.accuracy_percentage}%` }}
                        />
                        <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-charcoal-400 dark:bg-charcoal-600 z-10" title="Target: 80%" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Strong (&gt;75%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" /> Average (50-75%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" /> Needs Work (&lt;50%)
                  </span>
                </div>
              </div>

              {/* Right 1 Col: Actionable Topic Insights */}
              <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-6 shadow-subtle flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-charcoal-900 dark:text-charcoal-100">
                      Actionable Topic Diagnosis
                    </h2>
                    <p className="text-xs text-charcoal-500">
                      Syllabus topics categorized by mastery for your revision strategy.
                    </p>
                  </div>

                  {/* High Proficiency Topics */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      ✓ High Proficiency Topics (≥ 75%)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(insights?.strong_areas || ['Geometry', 'Profit & Loss', 'Syllogisms', 'Indian Polity']).map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Needs Improvement Topics */}
                  <div className="space-y-2 pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                      ⚠ Topics Requiring Remediation (&lt; 50%)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {insights?.weak_areas && insights.weak_areas.length > 0 ? (
                        insights.weak_areas.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          No critical weak syllabus gaps detected in this test!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-institutional-50 dark:bg-institutional-950/30 rounded-xl border border-institutional-200/80 dark:border-institutional-800/40 text-xs text-institutional-900 dark:text-institutional-200">
                  💡 <strong>Next Action:</strong> Target 15-minute speed drills on Modern History to eliminate negative marking before the live exam.
                </div>
              </div>
            </section>

            {/* Launch CBT Review Mode Action Banner */}
            <section className="bg-gradient-to-r from-institutional-900 via-charcoal-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-institutional-800">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Interactive CBT Simulation
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black">
                  Examine Every Response in the Real CBT Exam Interface
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-300 leading-relaxed">
                  Review all {questionsList.length} questions in the exact TCS iON examination room layout.
                  Your selected answers are pre-ticked, incorrect answers are clearly flagged, and official keys
                  are provided with step-by-step conceptual derivations.
                </p>
              </div>

              <button
                id="launch-cbt-review-banner-btn"
                onClick={() => setActiveView('review')}
                className="px-6 py-3 rounded-xl bg-institutional-500 hover:bg-institutional-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LayersIcon size={16} />
                <span>Launch CBT Exam Room Review</span>
                <ArrowRightIcon size={14} />
              </button>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CBT EXAM ROOM REVIEW (IDENTICAL REAL EXAM ROOM SIMULATOR)         */}
        {/* ========================================================================= */}
        {activeView === 'review' && currentQuestion && (
          <section className="space-y-5 animate-fade-in" aria-label="CBT Exam Room Solution Review">
            {/* 1. SUB-HEADER TOOLBAR (Matching ExamRoomPage Toolbar) */}
            <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 p-3 sm:p-4 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Section Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-xs font-bold uppercase text-charcoal-400 pr-1 shrink-0">Sections:</span>
                {uniqueSubjects.map((subj) => (
                  <button
                    key={subj}
                    onClick={() => {
                      setSelectedSubject(subj);
                      if (subj !== 'ALL') {
                        const firstIdx = questionsList.findIndex((q) => q.subject === subj);
                        if (firstIdx !== -1) setReviewIndex(firstIdx);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedSubject === subj
                        ? 'bg-institutional-600 text-white shadow-xs'
                        : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-200 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    {subj === 'ALL' ? 'All Sections' : subj}
                  </button>
                ))}
              </div>

              {/* Utility Tools: Key Toggle, Zoom, Dwell Time */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs self-start lg:self-auto">
                {/* Dwell Time on this question */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800/80 font-mono text-xs font-bold text-charcoal-700 dark:text-charcoal-300">
                  <ClockIcon size={13} className="text-amber-500" />
                  <span>Time Spent:</span>
                  <span className="text-charcoal-900 dark:text-white">
                    {currentQuestion.time_taken_seconds || 65}s
                  </span>
                </div>

                {/* Show/Hide Official Key Toggle */}
                <button
                  type="button"
                  id="toggle-correct-key-btn"
                  onClick={() => setShowCorrectKey((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    showCorrectKey
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400'
                  }`}
                >
                  <EyeIcon size={14} className={showCorrectKey ? 'text-emerald-600' : 'text-charcoal-400'} />
                  <span>{showCorrectKey ? 'Official Key Visible' : 'Reveal Official Key'}</span>
                </button>

                {/* Font Size Zoom Controller (Matching ExamRoomPage) */}
                <div className="flex items-center gap-0.5 bg-charcoal-100 dark:bg-charcoal-800 p-0.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700">
                  <button
                    onClick={() => setFontZoom('sm')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'sm' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                    title="Small Font"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontZoom('normal')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'normal' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                    title="Normal Font"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontZoom('lg')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'lg' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                    title="Large Font"
                  >
                    A+
                  </button>
                </div>

                {/* Switch back to Scorecard button */}
                <button
                  onClick={() => setActiveView('overview')}
                  className="px-3 py-1 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 font-bold text-xs cursor-pointer"
                >
                  Scorecard Overview
                </button>
              </div>
            </div>

            {/* 2. MAIN REVIEW WORKSPACE (Left: Question Zone | Right: CBT Palette) */}
            <div className="flex flex-col lg:flex-row gap-5 items-stretch">
              {/* ================================================================= */}
              {/* LEFT COLUMN: QUESTION PANE (Matching ExamRoomPage CBT Layout)     */}
              {/* ================================================================= */}
              <section className="flex-1 flex flex-col justify-between bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 shadow-subtle overflow-hidden">
                <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
                  {/* Question Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-institutional-700 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                        Q.{reviewIndex + 1}
                      </span>
                      <span className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                        Question No. {reviewIndex + 1} of {questionsList.length}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700">
                        {currentQuestion.subject}
                      </span>
                      <span className="text-xs text-charcoal-400 hidden sm:inline">• {currentQuestion.topic}</span>
                    </div>

                    {/* Marks & Evaluation Pill */}
                    <div className="flex items-center gap-2 text-xs">
                      {currentQuestion.is_attempted ? (
                        currentQuestion.is_correct ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                            <CheckCircleIcon size={13} className="text-emerald-600" />
                            <span>Correct (+{currentQuestion.marks_awarded > 0 ? currentQuestion.marks_awarded.toFixed(2) : '2.00'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                            <XCircleIcon size={13} className="text-rose-600" />
                            <span>Incorrect ({currentQuestion.marks_awarded < 0 ? currentQuestion.marks_awarded.toFixed(2) : '-0.50'})</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 border border-charcoal-200 dark:border-charcoal-700">
                          <TargetIcon size={13} />
                          <span>Not Attempted (0.00)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text (Responsive with Font Zoom) */}
                  <div className={`font-medium text-charcoal-900 dark:text-charcoal-100 ${getQuestionFontSize()}`}>
                    {currentQuestion.question_text}
                  </div>

                  {/* OPTIONS LIST WITH USER'S TICKED ANSWER & OFFICIAL KEY COMPARISON */}
                  <div className="space-y-3 pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                      Options & Candidate Response:
                    </div>

                    {currentQuestion.options?.map((opt) => {
                      const isUserChoice = opt.id === currentQuestion.selected_option;
                      const isCorrectAnswer = opt.id === currentQuestion.correct_option;

                      // Visual states
                      let containerClasses =
                        'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30 text-charcoal-800 dark:text-charcoal-200';
                      let radioClasses =
                        'border-charcoal-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal-400';
                      let badge = null;

                      if (isUserChoice) {
                        if (currentQuestion.is_correct) {
                          // User choice is correct
                          containerClasses =
                            'border-emerald-500 dark:border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs';
                          radioClasses =
                            'border-emerald-600 bg-emerald-600 text-white';
                          badge = (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                              <CheckIcon size={11} />
                              <span>Your Choice (Correct)</span>
                            </span>
                          );
                        } else {
                          // User choice is wrong
                          containerClasses =
                            'border-rose-500 dark:border-rose-600 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30 shadow-xs';
                          radioClasses =
                            'border-rose-600 bg-rose-600 text-white';
                          badge = (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                              <XCircleIcon size={11} />
                              <span>Your Choice (Incorrect)</span>
                            </span>
                          );
                        }
                      } else if (isCorrectAnswer && showCorrectKey) {
                        // Official correct answer revealed
                        containerClasses =
                          'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-400/50';
                        radioClasses =
                          'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300';
                        badge = (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                            <span>★</span>
                            <span>Official Correct Key</span>
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${containerClasses} ${getOptionFontSize()}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Pre-ticked Radio Check Simulator */}
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 font-bold transition-all ${radioClasses}`}
                            >
                              {isUserChoice && currentQuestion.is_correct && (
                                <CheckIcon size={12} className="stroke-[3]" />
                              )}
                              {isUserChoice && !currentQuestion.is_correct && (
                                <span className="text-[11px] leading-none">✕</span>
                              )}
                              {!isUserChoice && isCorrectAnswer && showCorrectKey && (
                                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                              )}
                            </div>

                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-mono font-extrabold text-xs uppercase opacity-75 shrink-0">
                                ({opt.id})
                              </span>
                              <span className="font-medium break-words leading-relaxed">
                                {opt.text}
                              </span>
                            </div>
                          </div>

                          {badge && <div className="shrink-0">{badge}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* COLLAPSIBLE STEP-BY-STEP CONCEPT DERIVATION & SOLUTION ACCORDION */}
                  <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800">
                    <button
                      type="button"
                      onClick={() => setShowExplanation((prev) => !prev)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850/60 border border-charcoal-200 dark:border-charcoal-750 text-xs font-bold text-institutional-700 dark:text-institutional-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircleIcon size={16} />
                        <span>Concept, Formula & Step-by-Step Mathematical Derivation</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-charcoal-500">
                        <span>{showExplanation ? 'Hide Derivation' : 'Show Derivation'}</span>
                        {showExplanation ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                      </div>
                    </button>

                    {showExplanation && (
                      <div className="mt-2.5 p-4 sm:p-5 rounded-xl bg-charcoal-50/70 dark:bg-charcoal-850/50 border border-charcoal-200 dark:border-charcoal-750 text-xs sm:text-sm text-charcoal-800 dark:text-charcoal-200 space-y-2.5 animate-fade-in leading-relaxed">
                        <div className="flex items-center justify-between pb-2 border-b border-charcoal-200/60 dark:border-charcoal-750 text-[11px] font-mono text-charcoal-500">
                          <span>CORRECT OPTION: <strong>({currentQuestion.correct_option})</strong></span>
                          <span>DIFFICULTY: <strong>{currentQuestion.difficulty || 'MEDIUM'}</strong></span>
                        </div>
                        <p className="whitespace-pre-line text-charcoal-700 dark:text-charcoal-300">
                          {currentQuestion.solution_explanation ||
                            'Standard solution methodology applies based on official syllabus concepts.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Navigation Action Footer */}
                <footer className="p-4 bg-charcoal-50 dark:bg-charcoal-850 border-t border-charcoal-200 dark:border-charcoal-800 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Previous Button */}
                  <button
                    type="button"
                    onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={reviewIndex === 0}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-charcoal-100 text-charcoal-700 dark:text-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Previous Question</span>
                  </button>

                  {/* Center: Jump to Next Mistake (Pro Feature for Aspirants) */}
                  <button
                    type="button"
                    onClick={handleJumpToNextMistake}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Jump to the next incorrect answer"
                  >
                    <span>⚡ Jump to Next Mistake</span>
                  </button>

                  {/* Right: Next Button */}
                  <button
                    type="button"
                    onClick={() => setReviewIndex((prev) => Math.min(questionsList.length - 1, prev + 1))}
                    disabled={reviewIndex === questionsList.length - 1}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRightIcon size={14} />
                  </button>
                </footer>
              </section>

              {/* ================================================================= */}
              {/* RIGHT COLUMN: PROCTORED CANDIDATE + QUESTION PALETTE              */}
              {/* ================================================================= */}
              <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0">
                {/* 1. Proctored Candidate Card (Matching ExamRoomPage Layout) */}
                <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 p-3.5 shadow-subtle flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-institutional-600 to-indigo-600 p-0.5 shadow-xs shrink-0">
                      <div className="w-full h-full bg-charcoal-900 rounded-[10px] overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                        {user?.profile?.avatar_url ? (
                          <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black text-charcoal-900 dark:text-white truncate max-w-[140px]">
                        {user?.full_name || 'Candidate'}
                      </div>
                      <div className="text-[10px] text-charcoal-400 font-mono">
                        Roll: {user?.id ? '25010' + String(user.id).slice(-4) : '2501048291'}
                      </div>
                      <div className="text-[10px] text-institutional-600 dark:text-institutional-400 font-semibold font-mono">
                        Node: <strong>C-042 (Lab B)</strong>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>EVALUATED</span>
                  </span>
                </div>

                {/* 2. Review Palette Legend Card */}
                <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 p-4 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-900 dark:text-white pb-2 border-b border-charcoal-100 dark:border-charcoal-800">
                    <span className="uppercase tracking-wider text-[11px] text-charcoal-500">QUESTION PALETTE</span>
                    <span className="font-mono text-charcoal-400">{questionsList.length} Questions</span>
                  </div>

                  {/* 3 Status Legend Counts */}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                        {scoreData?.correct_count || 0}
                      </span>
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium">Correct</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-rose-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                        {scoreData?.incorrect_count || 0}
                      </span>
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium">Incorrect</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-charcoal-300 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200 font-mono font-bold text-[10px] flex items-center justify-center">
                        {scoreData?.unattempted_count || 0}
                      </span>
                      <span className="text-charcoal-700 dark:text-charcoal-300 font-medium">Skipped</span>
                    </div>
                  </div>

                  {/* Filter Pills for Palette */}
                  <div className="flex items-center gap-1 pt-2 border-t border-charcoal-100 dark:border-charcoal-800 text-[10px]">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'INCORRECT', label: `Incorrect (${scoreData?.incorrect_count || 0})` },
                      { id: 'CORRECT', label: `Correct (${scoreData?.correct_count || 0})` },
                      { id: 'UNATTEMPTED', label: `Skipped (${scoreData?.unattempted_count || 0})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setReviewFilter(f.id)}
                        className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          reviewFilter === f.id
                            ? 'bg-institutional-600 text-white shadow-2xs'
                            : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Interactive Question Tiles Grid */}
                <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 p-4 shadow-subtle space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-charcoal-100 dark:border-charcoal-800">
                      <span className="text-charcoal-900 dark:text-white">Select Question</span>
                      <span className="text-institutional-600 dark:text-institutional-400 font-mono text-[11px]">
                        Active: #{reviewIndex + 1}
                      </span>
                    </div>

                    {/* Question Number Tiles */}
                    <div className="grid grid-cols-6 sm:grid-cols-7 lg:grid-cols-6 gap-2 pt-3 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
                      {questionsList.map((q, idx) => {
                        const isCurrent = idx === reviewIndex;
                        const isCorrect = q.is_correct && q.is_attempted;
                        const isIncorrect = !q.is_correct && q.is_attempted;
                        const isUnattempted = !q.is_attempted;

                        // Check if passes palette filter
                        const matchesFilter =
                          reviewFilter === 'ALL' ||
                          (reviewFilter === 'CORRECT' && isCorrect) ||
                          (reviewFilter === 'INCORRECT' && isIncorrect) ||
                          (reviewFilter === 'UNATTEMPTED' && isUnattempted);

                        let tileBg = 'bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-800 dark:text-charcoal-200';
                        if (isCorrect) tileBg = 'bg-emerald-600 text-white';
                        else if (isIncorrect) tileBg = 'bg-rose-600 text-white';

                        return (
                          <button
                            key={q.question_id || idx}
                            type="button"
                            onClick={() => setReviewIndex(idx)}
                            disabled={!matchesFilter}
                            className={`h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs select-none transition-all cursor-pointer relative ${tileBg} ${
                              isCurrent
                                ? 'ring-2 ring-institutional-500 dark:ring-institutional-400 ring-offset-2 dark:ring-offset-charcoal-900 scale-105 shadow-md z-10'
                                : 'hover:opacity-90'
                            } ${!matchesFilter ? 'opacity-20 cursor-not-allowed' : ''}`}
                            title={`Q${idx + 1}: ${isCorrect ? 'Correct' : isIncorrect ? 'Incorrect' : 'Skipped'}`}
                          >
                            <span>{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Stats & Quick Jump */}
                  <div className="space-y-2 pt-3 border-t border-charcoal-100 dark:border-charcoal-800 text-xs">
                    <div className="flex items-center justify-between text-charcoal-500">
                      <span>Net Score Secured:</span>
                      <span className="font-mono font-bold text-charcoal-900 dark:text-white">
                        {scoreData?.total_score !== undefined ? scoreData.total_score.toFixed(1) : '13.5'} / {scoreData?.max_possible_score || '16.0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-charcoal-500">
                      <span>Examination Accuracy:</span>
                      <span className="font-mono font-bold text-institutional-600 dark:text-institutional-400">
                        {scoreData?.accuracy_percentage?.toFixed(1) || 0}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveView('overview')}
                      className="w-full mt-2 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 hover:bg-charcoal-100 text-charcoal-700 dark:text-charcoal-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>← Back to Scorecard Analytics</span>
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
