import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
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
  CheckIcon,
  LayersIcon,
  UserIcon,
  ShieldIcon,
  AlertTriangleIcon,
  LightbulbIcon,
} from '../components/Icons';

/**
 * ResultScorecardPage — Academic Performance & CBT Exam Room Solution Review
 * Fully responsive across all devices (Mobile, Tablet, Desktop):
 * - Mobile-first compact architecture: Zero unwanted vertical scrolling.
 * - Solid high-contrast palette: NO fade masks or washed-out backgrounds.
 * - 4x2 mobile / 8x1 desktop adaptive KPI executive performance strip.
 * - Responsive topic tag cloud: clean truncation, no overflowing badges, touch-friendly filter pills.
 * - Responsive CBT Solution Review mode with mobile-optimized option cards, question palette, and controls.
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

  // Topic diagnosis tab filter ('ALL' | 'WEAK' | 'STRONG')
  const [topicFilter, setTopicFilter] = useState('ALL');

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
      console.error('Failed loading results data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to cleanly parse topic labels formatted as "Topic Name (Subject Name)"
  const parseTopicString = (rawTopic) => {
    if (!rawTopic) return { title: 'General Topic', subject: '' };
    const match = String(rawTopic).match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { title: match[1].trim(), subject: match[2].trim() };
    }
    return { title: String(rawTopic).trim(), subject: '' };
  };

  // Question review breakdown list
  const questionsList = useMemo(() => {
    if (insights?.questions_breakdown && insights.questions_breakdown.length > 0) {
      return insights.questions_breakdown;
    }
    return [];
  }, [insights]);

  // Unique subjects for quick navigation
  const uniqueSubjects = useMemo(() => {
    const list = Array.from(new Set(questionsList.map((q) => q.subject).filter(Boolean)));
    return ['ALL', ...list];
  }, [questionsList]);

  // Clean structured topic diagnosis items
  const diagnosedTopics = useMemo(() => {
    if (insights?.topic_analysis && insights.topic_analysis.length > 0) {
      return insights.topic_analysis.map((t) => {
        const parsed = parseTopicString(t.topic);
        const acc = t.accuracy_percentage ?? 0;
        let status = 'weak';
        if (acc >= 75) status = 'strong';
        else if (acc >= 50) status = 'average';

        return {
          title: parsed.title,
          subject: t.subject || parsed.subject,
          accuracy: acc,
          total: t.total_questions || 0,
          attempted: t.attempted || 0,
          correct: t.correct || 0,
          avgTime: t.avg_time_per_q_seconds || 0,
          status,
        };
      });
    }

    // Fallback: reconstruct from weak_areas & strong_areas
    const list = [];
    (insights?.weak_areas || []).forEach((item) => {
      const parsed = parseTopicString(item);
      list.push({
        title: parsed.title,
        subject: parsed.subject,
        accuracy: 0,
        total: 0,
        attempted: 0,
        correct: 0,
        avgTime: 0,
        status: 'weak',
      });
    });
    (insights?.strong_areas || []).forEach((item) => {
      const parsed = parseTopicString(item);
      list.push({
        title: parsed.title,
        subject: parsed.subject,
        accuracy: 100,
        total: 0,
        attempted: 0,
        correct: 0,
        avgTime: 0,
        status: 'strong',
      });
    });

    return list;
  }, [insights]);

  // Filtered topics based on user selection
  const filteredTopics = useMemo(() => {
    if (topicFilter === 'WEAK') return diagnosedTopics.filter((t) => t.status === 'weak');
    if (topicFilter === 'STRONG') return diagnosedTopics.filter((t) => t.status === 'strong');
    return diagnosedTopics;
  }, [diagnosedTopics, topicFilter]);

  const weakCount = useMemo(() => diagnosedTopics.filter((t) => t.status === 'weak').length, [diagnosedTopics]);
  const strongCount = useMemo(() => diagnosedTopics.filter((t) => t.status === 'strong').length, [diagnosedTopics]);

  // Filtered questions based on palette filter & subject in CBT Review mode
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
    const s = Math.round(secs % 60);
    if (m === 0) return `${s}s`;
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
      <div className="min-h-screen bg-charcoal-50/70 dark:bg-charcoal-950 font-sans text-charcoal-900 dark:text-charcoal-100 flex flex-col justify-center">
        <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-4 animate-pulse">
          <div className="h-16 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl" />
          <div className="h-28 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl" />
          <div className="h-64 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl" />
        </main>
      </div>
    );
  }

  const marksSecured = scoreData?.total_score !== undefined ? scoreData.total_score : 0;
  const maxMarks = scoreData?.max_possible_score !== undefined
    ? scoreData.max_possible_score
    : (scoreData?.total_questions ? scoreData.total_questions * 2 : 100);
  const accuracy = scoreData?.accuracy_percentage !== undefined ? scoreData.accuracy_percentage : 0;
  const rank = insights?.rank || scoreData?.rank || 1;
  const totalParticipants = insights?.total_participants || 1;
  const percentile = insights?.percentile !== undefined ? insights.percentile : (accuracy || 100);
  const correctCount = scoreData?.correct_count || 0;
  const incorrectCount = scoreData?.incorrect_count || 0;
  const unattemptedCount = scoreData?.unattempted_count || 0;
  const totalQuestions = scoreData?.total_questions || questionsList.length || 40;

  return (
    <div className="min-h-screen bg-charcoal-50/70 dark:bg-charcoal-950 font-sans text-charcoal-900 dark:text-charcoal-100 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {isCelebratory && <Confetti duration={3000} />}

        {/* ========================================================================= */}
        {/* COMPACT EXECUTIVE HEADER (Title, Official Seal, Mode Toggle & Actions)    */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Status Icon */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-institutional-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldIcon size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-institutional-50 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200/80 dark:border-institutional-800">
                  Official Mock
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-charcoal-400">
                  ID: {scoreData?.attempt_id?.slice(0, 10) || 'ATPT-01'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Certified</span>
                </span>
              </div>

              <h1 className="text-base sm:text-lg md:text-xl font-black text-charcoal-950 dark:text-white truncate mt-0.5">
                {scoreData?.test_title || 'Mock Examination Scorecard'}
              </h1>
            </div>
          </div>

          {/* Mode Switcher & Quick Navigation */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 w-full md:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-charcoal-150 dark:border-charcoal-800">
            {/* Scorecard vs Review Toggle */}
            <div className="flex items-center p-0.5 sm:p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl border border-charcoal-200/80 dark:border-charcoal-700 shrink-0">
              <button
                id="view-overview-tab"
                onClick={() => setActiveView('overview')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'overview'
                    ? 'bg-white dark:bg-charcoal-900 text-institutional-700 dark:text-institutional-300 shadow-2xs'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                <BarChart3Icon size={13} />
                <span>Scorecard</span>
              </button>

              <button
                id="view-cbt-review-tab"
                onClick={() => setActiveView('review')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'review'
                    ? 'bg-institutional-600 text-white shadow-2xs'
                    : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                <LayersIcon size={13} />
                <span>CBT Review ({questionsList.length}Q)</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onRetake && (
                <button
                  onClick={onRetake}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 text-charcoal-700 dark:text-charcoal-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Retake this mock"
                >
                  <RotateCcwIcon size={12} />
                  <span className="hidden sm:inline">Retake</span>
                </button>
              )}

              <button
                onClick={onBackToDiscovery}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 text-charcoal-700 dark:text-charcoal-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <BookOpenIcon size={12} />
                <span className="hidden sm:inline">All Tests</span>
              </button>

              <button
                onClick={onGoToDashboard}
                className="px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <TrophyIcon size={12} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </section>

        {scoreData?.ended_reason === 'tab_switch' && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangleIcon size={15} className="shrink-0 text-rose-600" />
            <span>
              <strong>Test ended early:</strong> attempt submitted automatically due to switching exam tabs {scoreData?.tab_switch_count ? `${scoreData.tab_switch_count} times` : 'repeatedly'}.
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW SCORECARD                                                */}
        {/* ========================================================================= */}
        {activeView === 'overview' && (
          <div className="space-y-3 sm:space-y-4">
            {/* 1. ADAPTIVE EXECUTIVE METRIC STRIP (4 Cols on Mobile, 8 Cols on Desktop) */}
            <section className="bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800 rounded-2xl p-2.5 sm:p-3.5 shadow-sm">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2.5 text-center">
                {/* 1. Marks Secured */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200/70 dark:border-charcoal-750 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Marks</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-charcoal-950 dark:text-white my-0.5 truncate">
                    {marksSecured.toFixed(1)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-charcoal-400">/{maxMarks.toFixed(0)}</div>
                </div>

                {/* 2. Rank */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200/70 dark:border-charcoal-750 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Rank</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-institutional-600 dark:text-institutional-400 my-0.5 truncate">
                    #{rank}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-charcoal-400 truncate">of {totalParticipants}</div>
                </div>

                {/* 3. Percentile */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200/70 dark:border-charcoal-750 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Percentile</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-institutional-600 dark:text-institutional-400 my-0.5 truncate">
                    {percentile.toFixed(0)}%
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-charcoal-400 truncate">Top {Math.max(0.1, 100 - percentile).toFixed(0)}%</div>
                </div>

                {/* 4. Time Taken */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200/70 dark:border-charcoal-750 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Time</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-charcoal-950 dark:text-white my-0.5 truncate">
                    {formatSeconds(scoreData?.total_time_taken_seconds || 0)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-charcoal-400 truncate">
                    {insights?.avg_time_per_question ? `${Math.round(insights.avg_time_per_question)}s` : '2s'}/Q
                  </div>
                </div>

                {/* 5. Correct Count */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-850 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Correct</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 my-0.5 truncate">
                    {correctCount}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    +{(correctCount * 2).toFixed(0)} pts
                  </div>
                </div>

                {/* 6. Incorrect Count */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-850 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Incorrect</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-rose-700 dark:text-rose-300 my-0.5 truncate">
                    {incorrectCount}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-rose-600 dark:text-rose-400">
                    -{(incorrectCount * 0.5).toFixed(1)} pts
                  </div>
                </div>

                {/* 7. Unattempted */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-charcoal-100/70 dark:bg-charcoal-850 border border-charcoal-200/80 dark:border-charcoal-750 flex flex-col justify-between">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-charcoal-600 dark:text-charcoal-400">Skipped</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono text-charcoal-800 dark:text-charcoal-200 my-0.5 truncate">
                    {unattemptedCount}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-charcoal-400">0 pts</div>
                </div>

                {/* 8. Hit Accuracy & Launch Review CTA */}
                <button
                  type="button"
                  onClick={() => setActiveView('review')}
                  className="p-2 sm:p-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white flex flex-col justify-between transition-all cursor-pointer group shadow-xs"
                  title="Launch CBT Exam Solution Review"
                >
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-institutional-100 flex items-center justify-center gap-0.5">
                    <span>Acc</span>
                    <SparklesIcon size={10} />
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-black font-mono my-0.5 truncate">
                    {accuracy.toFixed(0)}%
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-institutional-100 flex items-center justify-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Review →</span>
                  </div>
                </button>
              </div>
            </section>

            {/* 2. COMPACT SIDE-BY-SIDE ANALYTICS (Subject Mastery + Compact Topic Chips) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* LEFT: Subject Performance (4 Cols) */}
              <section className="lg:col-span-4 bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between space-y-2.5 sm:space-y-3">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
                    <h2 className="text-xs font-black uppercase tracking-wider text-charcoal-900 dark:text-white">
                      Subject Performance
                    </h2>
                    <span className="text-[10px] font-mono font-bold text-institutional-600 dark:text-institutional-400">
                      Target &gt; 80%
                    </span>
                  </div>

                  {/* Subject List */}
                  <div className="space-y-2">
                    {(insights?.subject_analysis && insights.subject_analysis.length > 0
                      ? insights.subject_analysis
                      : [
                          {
                            subject: scoreData?.subject || 'Current Affairs & Banking Awareness',
                            total_questions: totalQuestions,
                            correct: correctCount,
                            accuracy_percentage: accuracy,
                            avg_time_per_q_seconds: insights?.avg_time_per_question || 2.0,
                          },
                        ]
                    ).map((subj) => {
                      const acc = subj.accuracy_percentage ?? 0;
                      const isStrong = acc >= 75;
                      const isAvg = acc >= 50 && acc < 75;

                      return (
                        <div key={subj.subject} className="p-2 sm:p-2.5 rounded-xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200/70 dark:border-charcoal-750 space-y-1.5">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-bold text-charcoal-900 dark:text-white truncate">
                              {subj.subject}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] sm:text-[11px] shrink-0 ${
                                isStrong
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : isAvg
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {acc.toFixed(0)}%
                            </span>
                          </div>

                          <div className="w-full bg-charcoal-200 dark:bg-charcoal-700 h-2 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isStrong ? 'bg-emerald-500' : isAvg ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(2, acc)}%` }}
                            />
                            <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-charcoal-400 z-10 opacity-60" />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-charcoal-400 font-mono">
                            <span>{subj.correct}/{subj.total_questions} Solved</span>
                            <span>{Math.round(subj.avg_time_per_q_seconds || 0)}s avg/Q</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Benchmark Legend */}
                <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between text-[10px] text-charcoal-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Strong
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Average
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Needs Work
                  </span>
                </div>
              </section>

              {/* RIGHT: Actionable Topic Diagnosis (8 Cols) - COMPACT TAG CLOUD, NO SCROLLBARS */}
              <section className="lg:col-span-8 bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between space-y-2.5 sm:space-y-3">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-black uppercase tracking-wider text-charcoal-900 dark:text-white">
                        Actionable Topic Diagnosis
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300">
                        {diagnosedTopics.length} Topics
                      </span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-[10px] sm:text-[11px] font-bold">
                      <button
                        onClick={() => setTopicFilter('ALL')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer shrink-0 ${
                          topicFilter === 'ALL'
                            ? 'bg-charcoal-800 dark:bg-charcoal-200 text-white dark:text-charcoal-900'
                            : 'text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200'
                        }`}
                      >
                        All ({diagnosedTopics.length})
                      </button>

                      <button
                        onClick={() => setTopicFilter('WEAK')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer shrink-0 ${
                          topicFilter === 'WEAK'
                            ? 'bg-rose-600 text-white'
                            : 'text-rose-600 hover:text-rose-700'
                        }`}
                      >
                        Needs Work ({weakCount})
                      </button>

                      <button
                        onClick={() => setTopicFilter('STRONG')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer shrink-0 ${
                          topicFilter === 'STRONG'
                            ? 'bg-emerald-600 text-white'
                            : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        Proficient ({strongCount})
                      </button>
                    </div>
                  </div>

                  {/* COMPACT TAG CHIPS (Clean, horizontal flow, responsive truncation, NO scrollbars) */}
                  {filteredTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {filteredTopics.map((topic, idx) => {
                        const isWeak = topic.status === 'weak';
                        const isStrong = topic.status === 'strong';

                        return (
                          <div
                            key={`${topic.title}-${idx}`}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold max-w-full transition-all ${
                              isWeak
                                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                                : isStrong
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                                : 'bg-charcoal-100/80 dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-800 dark:text-charcoal-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isWeak ? 'bg-rose-500' : isStrong ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <span className="truncate max-w-[170px] sm:max-w-none">{topic.title}</span>
                            <span
                              className={`px-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                                isWeak
                                  ? 'bg-rose-200/70 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                                  : isStrong
                                  ? 'bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-charcoal-200 text-charcoal-700 dark:bg-charcoal-700 dark:text-charcoal-300'
                              }`}
                            >
                              {isWeak ? 'Revise' : isStrong ? 'Mastered' : 'Avg'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-xs text-charcoal-400">
                      No topics matching the selected filter.
                    </div>
                  )}
                </div>

                {/* Strategic AI Recommendation Callout */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-institutional-50 dark:bg-institutional-950/40 border border-institutional-200/80 dark:border-institutional-800/80 text-xs text-charcoal-800 dark:text-charcoal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-institutional-600 text-white shrink-0">
                      <LightbulbIcon size={13} />
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-charcoal-700 dark:text-charcoal-300 leading-snug">
                      <strong>AI Tip:</strong> Target speed drills on the {weakCount} weak topic{weakCount > 1 ? 's' : ''} to convert negative marks into score gains.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveView('review')}
                    className="self-end sm:self-auto px-3 py-1 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-[10px] sm:text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                  >
                    Open Review
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CBT EXAM ROOM REVIEW (FULL SIMULATOR)                             */}
        {/* ========================================================================= */}
        {activeView === 'review' && currentQuestion && (
          <section className="space-y-3 sm:space-y-4 animate-fade-in" aria-label="CBT Exam Room Solution Review">
            {/* 1. Sub-Header Toolbar */}
            <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200/90 dark:border-charcoal-800 p-2.5 sm:p-3 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
              {/* Section Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
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
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedSubject === subj
                        ? 'bg-institutional-600 text-white shadow-2xs'
                        : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-200 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    {subj === 'ALL' ? 'All Sections' : subj}
                  </button>
                ))}
              </div>

              {/* Tools: Time, Answer Key, Font Zoom, Switch back */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 text-xs pt-1.5 lg:pt-0 border-t lg:border-t-0 border-charcoal-150 dark:border-charcoal-800">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 font-mono text-[11px] font-bold text-charcoal-700 dark:text-charcoal-300">
                  <ClockIcon size={12} className="text-amber-500" />
                  <span>Time:</span>
                  <span className="text-charcoal-900 dark:text-white">
                    {currentQuestion.time_taken_seconds !== undefined ? `${currentQuestion.time_taken_seconds}s` : '—'}
                  </span>
                </div>

                <button
                  type="button"
                  id="toggle-correct-key-btn"
                  onClick={() => setShowCorrectKey((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    showCorrectKey
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400'
                  }`}
                >
                  <EyeIcon size={12} className={showCorrectKey ? 'text-emerald-600' : 'text-charcoal-400'} />
                  <span>{showCorrectKey ? 'Key On' : 'Reveal Key'}</span>
                </button>

                {/* Font Size Zoom Controller */}
                <div className="flex items-center gap-0.5 bg-charcoal-100 dark:bg-charcoal-800 p-0.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700">
                  <button
                    onClick={() => setFontZoom('sm')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'sm' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontZoom('normal')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'normal' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontZoom('lg')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      fontZoom === 'lg' ? 'bg-institutional-600 text-white' : 'text-charcoal-600 dark:text-charcoal-400'
                    }`}
                  >
                    A+
                  </button>
                </div>

                <button
                  onClick={() => setActiveView('overview')}
                  className="px-2.5 py-1 rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 font-bold text-xs cursor-pointer"
                >
                  ← Scorecard
                </button>
              </div>
            </div>

            {/* 2. Main Review Workspace */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch">
              {/* LEFT: Question Pane */}
              <section className="flex-1 flex flex-col justify-between bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200/90 dark:border-charcoal-800 shadow-sm overflow-hidden">
                <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                  {/* Question Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-charcoal-150 dark:border-charcoal-800">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-institutional-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                        Q.{reviewIndex + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-charcoal-900 dark:text-white">
                        Question {reviewIndex + 1} of {questionsList.length}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200 dark:border-charcoal-700">
                        {currentQuestion.subject}
                      </span>
                      {currentQuestion.topic && (
                        <span className="text-xs text-charcoal-400 hidden sm:inline">• {currentQuestion.topic}</span>
                      )}
                    </div>

                    {/* Marks Pill */}
                    <div className="text-xs">
                      {currentQuestion.is_attempted ? (
                        currentQuestion.is_correct ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircleIcon size={12} className="text-emerald-600" />
                            <span>Correct (+{currentQuestion.marks_awarded > 0 ? currentQuestion.marks_awarded.toFixed(1) : '2.0'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <XCircleIcon size={12} className="text-rose-600" />
                            <span>Incorrect ({currentQuestion.marks_awarded < 0 ? currentQuestion.marks_awarded.toFixed(1) : '-0.5'})</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-500 border border-charcoal-200 dark:border-charcoal-700">
                          <TargetIcon size={12} />
                          <span>Not Attempted</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className={`font-medium text-charcoal-900 dark:text-charcoal-100 ${getQuestionFontSize()}`}>
                    {currentQuestion.question_text}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                      Options & Candidate Response:
                    </div>

                    {currentQuestion.options?.map((opt) => {
                      const isUserChoice = opt.id === currentQuestion.selected_option;
                      const isCorrectAnswer = opt.id === currentQuestion.correct_option;

                      let containerClasses =
                        'border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/40 dark:bg-charcoal-850/30 text-charcoal-800 dark:text-charcoal-200';
                      let radioClasses =
                        'border-charcoal-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal-400';
                      let badge = null;

                      if (isUserChoice) {
                        if (currentQuestion.is_correct) {
                          containerClasses =
                            'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30';
                          radioClasses = 'border-emerald-600 bg-emerald-600 text-white';
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shrink-0">
                              <CheckIcon size={10} />
                              <span>Your Choice (Correct)</span>
                            </span>
                          );
                        } else {
                          containerClasses =
                            'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/30';
                          radioClasses = 'border-rose-600 bg-rose-600 text-white';
                          badge = (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shrink-0">
                              <XCircleIcon size={10} />
                              <span>Your Choice (Incorrect)</span>
                            </span>
                          );
                        }
                      } else if (isCorrectAnswer && showCorrectKey) {
                        containerClasses =
                          'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-400/50';
                        radioClasses =
                          'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300';
                        badge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shrink-0">
                            <span>★ Official Key</span>
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition-all ${containerClasses} ${getOptionFontSize()}`}
                        >
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 font-bold transition-all mt-0.5 sm:mt-0 ${radioClasses}`}
                            >
                              {isUserChoice && currentQuestion.is_correct && <CheckIcon size={10} />}
                              {isUserChoice && !currentQuestion.is_correct && <span className="text-[10px]">✕</span>}
                              {!isUserChoice && isCorrectAnswer && showCorrectKey && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              )}
                            </div>

                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className="font-mono font-bold text-xs opacity-75 shrink-0">
                                ({opt.id})
                              </span>
                              <span className="font-medium break-words leading-snug">
                                {opt.text}
                              </span>
                            </div>
                          </div>

                          {badge && <div className="self-end sm:self-auto shrink-0">{badge}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Derivation Accordion */}
                  <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                    <button
                      type="button"
                      onClick={() => setShowExplanation((prev) => !prev)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-750 text-xs font-bold text-institutional-700 dark:text-institutional-400 hover:bg-charcoal-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-left">
                        <HelpCircleIcon size={14} className="shrink-0" />
                        <span className="truncate">Concept & Step-by-Step Derivation</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-charcoal-500 shrink-0">
                        <span>{showExplanation ? 'Hide' : 'Show'}</span>
                        {showExplanation ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
                      </div>
                    </button>

                    {showExplanation && (
                      <div className="mt-2 p-3 rounded-xl bg-charcoal-50/70 dark:bg-charcoal-850/50 border border-charcoal-200 dark:border-charcoal-750 text-xs text-charcoal-800 dark:text-charcoal-200 space-y-1.5 animate-fade-in leading-relaxed">
                        <div className="flex items-center justify-between pb-1 border-b border-charcoal-200/60 dark:border-charcoal-750 text-[10px] font-mono text-charcoal-500">
                          <span>CORRECT: <strong>({currentQuestion.correct_option})</strong></span>
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

                {/* Footer Controls */}
                <footer className="p-2.5 sm:p-3 bg-charcoal-50 dark:bg-charcoal-850 border-t border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={reviewIndex === 0}
                      className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeftIcon size={12} />
                      <span>Prev</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewIndex((prev) => Math.min(questionsList.length - 1, prev + 1))}
                      disabled={reviewIndex === questionsList.length - 1}
                      className="px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRightIcon size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleJumpToNextMistake}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Jump to the next incorrect answer"
                  >
                    <span>⚡ Next Mistake</span>
                  </button>
                </footer>
              </section>

              {/* RIGHT: Candidate & Palette Sidebar */}
              <aside className="w-full lg:w-72 xl:w-80 flex flex-col gap-2.5 sm:gap-3 shrink-0">
                {/* Proctored Candidate Pill */}
                <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200/90 dark:border-charcoal-800 p-2.5 sm:p-3 shadow-sm flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-institutional-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-charcoal-900 dark:text-white truncate max-w-[120px]">
                        {user?.full_name || 'Candidate'}
                      </div>
                      <div className="text-[10px] text-charcoal-400 font-mono">
                        Roll: {user?.id ? '250' + String(user.id).slice(-4) : '250104'}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Graded
                  </span>
                </div>

                {/* Palette */}
                <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200/90 dark:border-charcoal-800 p-3 shadow-sm space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold pb-1.5 border-b border-charcoal-150 dark:border-charcoal-800">
                      <span className="uppercase text-[10px] text-charcoal-500">Palette</span>
                      <span className="font-mono text-institutional-600 dark:text-institutional-400 text-[11px]">
                        Q.{reviewIndex + 1}
                      </span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 pt-1 pb-1.5 text-[10px] overflow-x-auto">
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'INCORRECT', label: `Wrong (${incorrectCount})` },
                        { id: 'CORRECT', label: `Right (${correctCount})` },
                        { id: 'UNATTEMPTED', label: `Skip (${unattemptedCount})` },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setReviewFilter(f.id)}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer shrink-0 ${
                            reviewFilter === f.id
                              ? 'bg-institutional-600 text-white'
                              : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Grid of Number Tiles */}
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-6 gap-1.5 max-h-[220px] sm:max-h-[260px] overflow-y-auto p-0.5">
                      {questionsList.map((q, idx) => {
                        const isCurrent = idx === reviewIndex;
                        const isCorrect = q.is_correct && q.is_attempted;
                        const isIncorrect = !q.is_correct && q.is_attempted;
                        const isUnattempted = !q.is_attempted;

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
                            className={`h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs select-none transition-all cursor-pointer ${tileBg} ${
                              isCurrent
                                ? 'ring-2 ring-institutional-500 scale-105 shadow-sm z-10'
                                : 'hover:opacity-90'
                            } ${!matchesFilter ? 'opacity-20 cursor-not-allowed' : ''}`}
                          >
                            <span>{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return to Scorecard */}
                  <button
                    type="button"
                    onClick={() => setActiveView('overview')}
                    className="w-full mt-2 py-1.5 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-850 hover:bg-charcoal-100 text-charcoal-700 dark:text-charcoal-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>← Back to Scorecard</span>
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
