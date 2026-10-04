import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
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
  RotateCcwIcon,
} from '../components/Icons';

/**
 * ResultScorecardPage — Academic Performance & Deep Analytics Scorecard
 * Features:
 * - Hero Section: Final score secured, All-India Rank, Percentile benchmark, Total time taken.
 * - 4 Minimalist KPI Cards: Correct, Incorrect, Unattempted, and Average Time.
 * - Visual Analytics: Subject-wise Accuracy vs. Time Spent chart layout with pure lightweight SVG/CSS.
 * - Actionable topic strength & weakness analysis.
 * - Review Mode: Filter pills (All, Correct, Incorrect, Unattempted), soft red/green highlights for answers,
 *   and collapsible detailed concept explanation accordions for every question.
 * - Fast skeleton loading and WCAG AA accessibility.
 */
export const ResultScorecardPage = ({ attemptId, onRetake, onGoToDashboard, onBackToDiscovery }) => {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [filterReview, setFilterReview] = useState('ALL'); // ALL | CORRECT | INCORRECT | UNATTEMPTED
  const [expandedSolutions, setExpandedSolutions] = useState({}); // question_id -> boolean

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

      // Pre-expand incorrect solutions for immediate learning
      const initialExpanded = {};
      (resInsights?.questions_breakdown || []).forEach((q) => {
        if (!q.is_correct && q.is_attempted) {
          initialExpanded[q.question_id] = true;
        }
      });
      setExpandedSolutions(initialExpanded);
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

  const toggleSolution = (qid) => {
    setExpandedSolutions((prev) => ({
      ...prev,
      [qid]: !prev[qid],
    }));
  };

  const isCelebratory = (scoreData?.accuracy_percentage || 0) >= 70;

  // Filter question review list
  const questionsList = insights?.questions_breakdown || [];
  const filteredQuestions = questionsList.filter((q) => {
    if (filterReview === 'CORRECT') return q.is_correct && q.is_attempted;
    if (filterReview === 'INCORRECT') return !q.is_correct && q.is_attempted;
    if (filterReview === 'UNATTEMPTED') return !q.is_attempted;
    return true;
  });

  // Skeleton screen while computing
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse font-sans">
        <div className="h-44 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-charcoal-200/60 dark:bg-charcoal-800/60 rounded-xl" />
      </main>
    );
  }

  const formatSeconds = (secs = 0) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="relative overflow-hidden font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-radial-glow">
      {/* Moving Ambient Scorecard Glows */}
      <div className="absolute -top-32 left-1/3 w-[500px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-1/2 -right-24 w-[450px] h-[450px] bg-institutional-500/10 dark:bg-institutional-500/15 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-amber-500/8 dark:bg-amber-500/12 blur-[120px] rounded-full pointer-events-none animate-drift-slow" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {isCelebratory && <Confetti duration={3000} />}

        {/* ========================================================================= */}
        {/* 1. HERO SECTION: Official Evaluation Scorecard                            */}
        {/* ========================================================================= */}
        <section className="bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-xl p-6 sm:p-8 shadow-subtle space-y-6">
        {/* Top Header Row */}
        {scoreData?.ended_reason === 'tab_switch' && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-xs sm:text-sm text-rose-800 dark:text-rose-200">
            <strong>Test ended early:</strong> this attempt was ended automatically because you switched away from the exam
            tab {scoreData?.tab_switch_count ? `${scoreData.tab_switch_count} times` : 'too many times'}. Only the answers saved
            up to that point were scored.
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-charcoal-150 dark:border-charcoal-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200/60 dark:border-institutional-800/40">
                Official Mock Evaluation
              </span>
              <span className="text-xs text-charcoal-400 font-mono">
                Session ID: {scoreData?.attempt_id?.slice(0, 12)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-charcoal-50">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDiscovery}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-700/60 transition-colors"
            >
              All Tests
            </button>
            <button
              onClick={onGoToDashboard}
              className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-institutional-600 hover:bg-institutional-700 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <BarChart3Icon size={14} />
              <span>Candidate Dashboard</span>
            </button>
          </div>
        </div>

        {/* Hero Score Highlights (Data-Rich, Academic Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 bg-charcoal-50/70 dark:bg-charcoal-850/50 rounded-xl border border-charcoal-200/80 dark:border-charcoal-750">
          {/* Final Score */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Marks Secured</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-50">
                {scoreData?.total_score?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm font-mono text-charcoal-400">
                / {scoreData?.max_possible_score || '200.0'}
              </span>
            </div>
            <div className="text-[11px] text-charcoal-500 font-medium">
              Net Percentage: <strong>{scoreData?.percentage?.toFixed(1) || 0}%</strong>
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

        {/* 4 Minimalist KPI Cards: Correct, Incorrect, Unattempted, Accuracy */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Correct Answers */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Correct</div>
              <div className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                {scoreData?.correct_count || 0}
              </div>
            </div>
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircleIcon size={20} />
            </div>
          </div>

          {/* Incorrect Answers */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Incorrect</div>
              <div className="text-2xl font-bold font-mono text-rose-900 dark:text-rose-200 mt-0.5">
                {scoreData?.incorrect_count || 0}
              </div>
            </div>
            <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              <XCircleIcon size={20} />
            </div>
          </div>

          {/* Unattempted */}
          <div className="p-4 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50/50 dark:bg-charcoal-850/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-charcoal-600 dark:text-charcoal-400 uppercase tracking-wider">Unattempted</div>
              <div className="text-2xl font-bold font-mono text-charcoal-800 dark:text-charcoal-200 mt-0.5">
                {scoreData?.unattempted_count || 0}
              </div>
            </div>
            <div className="p-2 rounded-full bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-charcoal-300">
              <TargetIcon size={20} />
            </div>
          </div>

          {/* Accuracy Rate */}
          <div className="p-4 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50/50 dark:bg-charcoal-850/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-charcoal-600 dark:text-charcoal-400 uppercase tracking-wider">Hit Accuracy</div>
              <div className="text-2xl font-bold font-mono text-charcoal-900 dark:text-charcoal-100 mt-0.5">
                {scoreData?.accuracy_percentage?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="p-2 rounded-full bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300">
              <SparklesIcon size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. VISUAL ANALYTICS: Subject-Wise Accuracy vs. Time Spent Layout          */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-labelledby="analytics-heading">
        {/* Left 2 Cols: Subject Performance Bar & Time Layout */}
        <div className="lg:col-span-2 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl p-6 shadow-subtle space-y-6">
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

          {/* Clean Subject Rows with Dual Metrics (Accuracy Bar + Time Spent Indicator) */}
          <div className="space-y-5">
            {(insights?.subject_analysis || [
              { subject: 'Quantitative Aptitude', total_questions: 3, correct: 3, accuracy_percentage: 100.0, avg_time_per_q_seconds: 75.0 },
              { subject: 'General Intelligence & Reasoning', total_questions: 2, correct: 2, accuracy_percentage: 100.0, avg_time_per_q_seconds: 52.0 },
              { subject: 'General Awareness', total_questions: 2, correct: 1, accuracy_percentage: 50.0, avg_time_per_q_seconds: 35.0 },
              { subject: 'English Comprehension', total_questions: 1, correct: 1, accuracy_percentage: 100.0, avg_time_per_q_seconds: 40.0 },
            ]).map((subj) => (
              <div key={subj.subject} className="space-y-1.5 p-3 rounded-lg hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/40 transition-colors">
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

                {/* Accuracy Bar with Target Milestone Indicator */}
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
                  {/* Target 80% mark line */}
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

        {/* Right 1 Col: Actionable Topic Insights (Strengths & Weaknesses) */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl p-6 shadow-subtle flex flex-col justify-between space-y-5">
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
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
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
                {(insights?.weak_areas && insights.weak_areas.length > 0 ? (
                  insights.weak_areas.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    No critical weak syllabus gaps detected in this test!
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-institutional-50 dark:bg-institutional-950/30 rounded-lg border border-institutional-200/80 dark:border-institutional-800/40 text-xs text-institutional-900 dark:text-institutional-200">
            💡 <strong>Next Action:</strong> Target 15-minute speed drills on Modern History to eliminate negative marking before Tier-I.
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. REVIEW MODE: Comprehensive Solution Review with Collapsible Concept     */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl p-6 sm:p-8 shadow-subtle space-y-6">
        {/* Review Mode Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900 dark:text-charcoal-100">
              Question-by-Question Solution Review
            </h2>
            <p className="text-xs text-charcoal-500">
              Compare your choice against the official key with step-by-step mathematical reasoning.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800/80 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs font-semibold self-start sm:self-center">
            {[
              { id: 'ALL', label: `All (${questionsList.length})` },
              { id: 'CORRECT', label: `Correct (${scoreData?.correct_count || 0})` },
              { id: 'INCORRECT', label: `Incorrect (${scoreData?.incorrect_count || 0})` },
              { id: 'UNATTEMPTED', label: `Skipped (${scoreData?.unattempted_count || 0})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterReview(f.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filterReview === f.id
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm font-bold'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Solutions List */}
        <div className="space-y-5">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = !!expandedSolutions[q.question_id];

            return (
              <article
                key={q.question_id || idx}
                className="p-5 sm:p-6 rounded-xl border border-charcoal-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-900 space-y-4 shadow-subtle hover:border-charcoal-350 dark:hover:border-charcoal-700 transition-colors"
              >
                {/* Question Item Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                      Q{idx + 1}.
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300">
                      {q.subject}
                    </span>
                    <span className="text-xs text-charcoal-400">• {q.topic}</span>
                  </div>

                  {/* Marks Status Pill */}
                  <div>
                    {q.is_attempted ? (
                      q.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircleIcon size={12} />
                          <span>+2.00 Marks</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircleIcon size={12} />
                          <span>-0.50 Marks</span>
                        </span>
                      )
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 border border-charcoal-200 dark:border-charcoal-700">
                        0.00 (Unattempted)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text (Large Readable 1.6 Line Height) */}
                <div className="text-question font-medium text-charcoal-900 dark:text-charcoal-100 leading-[1.6]">
                  {q.question_text}
                </div>

                {/* Options List with Soft Background Highlights (Non-Blinding) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options?.map((opt) => {
                    const isCorrect = opt.id === q.correct_option;
                    const isSelected = opt.id === q.selected_option;

                    // Soft Non-Blinding Semantic Styling
                    let optionStyle = 'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/50 dark:bg-charcoal-850/30 text-charcoal-700 dark:text-charcoal-300';
                    let tagText = '';

                    if (isCorrect) {
                      optionStyle = 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium ring-1 ring-emerald-300/40';
                      tagText = '✓ Correct Answer';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-medium ring-1 ring-rose-300/40';
                      tagText = '✗ Your Choice';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm transition-colors ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5 pr-2">
                          <span className="font-mono font-bold">{opt.id}.</span>
                          <span>{opt.text}</span>
                        </div>
                        {tagText && (
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold shrink-0 ${
                              isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {tagText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible Detailed Explanation Accordion */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleSolution(q.question_id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-700 dark:text-institutional-400 hover:underline focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <HelpCircleIcon size={14} />
                    <span>{isExpanded ? 'Hide Detailed Solution' : 'View Detailed Explanation & Concept'}</span>
                    {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850/60 border border-charcoal-200 dark:border-charcoal-750 text-xs sm:text-sm text-charcoal-700 dark:text-charcoal-300 space-y-2 animate-fade-in leading-relaxed">
                      <div className="font-bold text-charcoal-900 dark:text-charcoal-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <span>Concept & Step-by-Step Derivation</span>
                      </div>
                      <p className="whitespace-pre-line text-charcoal-700 dark:text-charcoal-200">
                        {q.solution_explanation}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
    </div>
  );
};
