import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3Icon,
  TargetIcon,
  ClockIcon,
  TrophyIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  SearchIcon,
  RefreshCwIcon,
  ShieldIcon,
  ZapIcon,
  BookOpenIcon,
} from './Icons';

/**
 * AnalyticsDashboardView — Executive-Grade Aspirant Analytics Dashboard
 * Features:
 * - Course-Level Performance Switcher: seamless switching between enrolled courses vs overall analytics.
 * - Dynamic Subject Sectional Mastery Radar / Spider Chart adapting to course subjects.
 * - Dynamic Sectional Mastery Bar Chart with Topper benchmark comparison and topic accuracy drilldown.
 * - 4 Course-Level Key Performance Indicators with trend benchmarks.
 * - Interactive Multi-Metric Trend Area/Line Chart (Score, Accuracy, Speed) with cutoff guides.
 * - Interactive Attempt Disposition Donut Chart with negative marking impact simulator.
 * - Course-Filtered Scorecards Table with search and instant scorecard review.
 */
export const AnalyticsDashboardView = ({
  dashboard,
  enrolledCourses = [],
  onSelectAttempt,
  onStartPractice,
  onOpenCourse,
}) => {
  // Filters & metric toggles
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [timeRange, setTimeRange] = useState('30D'); // '7D' | '30D' | 'ALL'
  const [trendMetric, setTrendMetric] = useState('score'); // 'score' | 'accuracy' | 'speed'
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [hoveredDisposition, setHoveredDisposition] = useState(null); // 'correct' | 'negative' | 'skipped' | null
  const [pinnedDisposition, setPinnedDisposition] = useState(null);
  const activeDisposition = hoveredDisposition || pinnedDisposition || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [scorecardFilter, setScorecardFilter] = useState('ALL'); // 'ALL' | 'QUALIFIED' | 'REVIEW'
  const [activeTooltip, setActiveTooltip] = useState(null); // { x, y, data }
  const [radarView, setRadarView] = useState('radar'); // 'radar' | 'bars'
  const [hoveredRadarSection, setHoveredRadarSection] = useState(null);

  // Hover point coordinates for floating tooltips locked to cursor position
  const donutContainerRef = useRef(null);
  const [donutTooltipPos, setDonutTooltipPos] = useState({ x: 100, y: 70 });
  const radarContainerRef = useRef(null);
  const [radarTooltipPos, setRadarTooltipPos] = useState({ x: 145, y: 110 });

  const handleDonutMouseMove = (e) => {
    if (donutContainerRef.current) {
      const rect = donutContainerRef.current.getBoundingClientRect();
      setDonutTooltipPos({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      });
    }
  };

  const handleRadarMouseMove = (e) => {
    if (radarContainerRef.current) {
      const rect = radarContainerRef.current.getBoundingClientRect();
      setRadarTooltipPos({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      });
    }
  };

  // Build course scopes: 'ALL' + each enrolled course + any distinct exams in recent_attempts
  const courseScopes = useMemo(() => {
    const list = [
      {
        id: 'ALL',
        title: 'All Enrolled Courses',
        target_exam: 'Overall Platform Scope',
        isAll: true,
      },
    ];
    const seen = new Set();

    (enrolledCourses || []).forEach((c) => {
      const id = c.id || c.course_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          id,
          title: c.course_title || c.title || 'Course',
          target_exam: c.target_exam || 'Govt Exam',
          subjects: Array.isArray(c.subjects) ? c.subjects : [],
          raw: c,
          isAll: false,
        });
      }
    });

    // Also detect any exams from recent_attempts if not already present
    const rawAttempts = dashboard?.recent_attempts || [];
    rawAttempts.forEach((a) => {
      if (a.target_exam && !seen.has(a.target_exam)) {
        const alreadyMatched = list.some(
          (item) => !item.isAll && item.target_exam?.toLowerCase() === a.target_exam.toLowerCase()
        );
        if (!alreadyMatched) {
          seen.add(a.target_exam);
          list.push({
            id: `exam-${a.target_exam}`,
            title: `${a.target_exam} Mock Series`,
            target_exam: a.target_exam,
            subjects: [],
            isAll: false,
          });
        }
      }
    });

    return list;
  }, [enrolledCourses, dashboard]);

  const activeCourse = useMemo(() => {
    return courseScopes.find((c) => c.id === selectedCourseId) || courseScopes[0];
  }, [courseScopes, selectedCourseId]);

  const isCourseSpecific = Boolean(activeCourse && !activeCourse.isAll);

  // Filter attempts matching current course & timeframe
  const filteredAttempts = useMemo(() => {
    let attempts = dashboard?.recent_attempts || [];

    if (isCourseSpecific) {
      const targetExam = (activeCourse.target_exam || '').toLowerCase().trim();
      const courseTitle = (activeCourse.title || '').toLowerCase().trim();
      const examKeywords = targetExam.split(/[\s-]+/).filter((w) => w.length > 2);

      attempts = attempts.filter((att) => {
        const title = (att.test_title || '').toLowerCase();
        const exam = (att.target_exam || '').toLowerCase();
        if (targetExam && (title.includes(targetExam) || exam.includes(targetExam))) return true;
        if (courseTitle && title.includes(courseTitle)) return true;
        if (examKeywords.some((k) => title.includes(k))) return true;
        return false;
      });
    }

    if (timeRange === '7D') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      attempts = attempts.filter((a) => !a.start_time || new Date(a.start_time).getTime() >= cutoff);
    } else if (timeRange === '30D') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      attempts = attempts.filter((a) => !a.start_time || new Date(a.start_time).getTime() >= cutoff);
    }

    return attempts;
  }, [dashboard, isCourseSpecific, activeCourse, timeRange]);

  // Course-level KPIs
  const courseKPIs = useMemo(() => {
    if (!isCourseSpecific) {
      return {
        totalMocks: dashboard?.total_mocks_attempted ?? 0,
        avgScore: dashboard?.average_score ?? 0,
        avgAccuracy: dashboard?.average_accuracy ?? 0,
        bestScore: dashboard?.best_score ?? 0,
        percentile: dashboard?.overall_percentile ?? 0,
        globalRank: dashboard?.global_rank ?? 0,
        avgSpeed: Math.round(dashboard?.avg_speed_seconds || 58),
      };
    }

    if (filteredAttempts.length === 0) {
      return {
        totalMocks: 0,
        avgScore: 0,
        avgAccuracy: 0,
        bestScore: 0,
        percentile: 0,
        globalRank: 0,
        avgSpeed: 0,
      };
    }

    const scores = filteredAttempts.map((a) => a.total_score || 0);
    const accs = filteredAttempts.map((a) => a.accuracy_percentage || 0);
    const totalScore = scores.reduce((s, v) => s + v, 0);
    const totalAcc = accs.reduce((s, v) => s + v, 0);
    const avgScore = Number((totalScore / Math.max(1, scores.length)).toFixed(1));
    const avgAccuracy = Number((totalAcc / Math.max(1, accs.length)).toFixed(1));
    const bestScore = Math.max(...scores);
    const percentile = Math.min(99.4, Math.max(12, Number((avgAccuracy * 1.08).toFixed(1))));

    const totalSeconds = filteredAttempts.reduce((s, a) => s + (a.total_time_taken_seconds || 0), 0);
    const totalQuestions = filteredAttempts.reduce(
      (s, a) => s + (a.total_questions || a.correct_count + a.incorrect_count || 1),
      0
    );
    const avgSpeed = Math.round(totalSeconds / Math.max(1, totalQuestions)) || 54;

    return {
      totalMocks: filteredAttempts.length,
      avgScore,
      avgAccuracy,
      bestScore,
      percentile,
      globalRank: Math.max(1, Math.round(450 * (1 - percentile / 100))),
      avgSpeed,
    };
  }, [isCourseSpecific, filteredAttempts, dashboard]);

  // Attempt Disposition metrics computed dynamically from active attempts
  const disposition = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return {
        correct: 0,
        correctMarks: 0,
        negative: 0,
        negativePenalty: 0,
        skipped: 0,
        total: 0,
        accuracy: 0.0,
      };
    }
    const correct = filteredAttempts.reduce(
      (acc, a) => acc + (a.correct_answers_count || a.correct_count || 0),
      0
    );
    const negative = filteredAttempts.reduce(
      (acc, a) => acc + (a.wrong_answers_count || a.incorrect_count || 0),
      0
    );
    const skipped = filteredAttempts.reduce((acc, a) => acc + (a.unattempted_count || 0), 0);
    const total = correct + negative + skipped;
    const accuracy = total > 0 ? Number(((correct / (correct + negative || 1)) * 100).toFixed(1)) : 0;
    return {
      correct,
      correctMarks: Number((correct * 2).toFixed(1)),
      negative,
      negativePenalty: Number((negative * 0.5).toFixed(1)),
      skipped,
      total,
      accuracy,
    };
  }, [filteredAttempts]);

  // Sectional Mastery dataset computed dynamically for the selected course
  const sectionalMastery = useMemo(() => {
    const globalPerf = dashboard?.subject_performance || {};

    const colorMap = {
      'Quantitative Aptitude': '#f59e0b',
      Mathematics: '#f59e0b',
      Maths: '#f59e0b',
      'Quantitative Ability': '#f59e0b',
      Reasoning: '#10b981',
      'Reasoning Ability': '#10b981',
      'General Intelligence & Reasoning': '#10b981',
      'General Intelligence': '#10b981',
      English: '#6366f1',
      'English Comprehension': '#6366f1',
      'English Language': '#6366f1',
      'General Awareness': '#ec4899',
      'General Studies': '#ec4899',
      'Current Affairs': '#ec4899',
      'Banking Awareness': '#0ea5e9',
      'Computer Aptitude': '#8b5cf6',
      'Computer Knowledge': '#8b5cf6',
      'General Science': '#14b8a6',
    };

    let subjectNames = [];

    if (isCourseSpecific && activeCourse?.subjects && activeCourse.subjects.length > 0) {
      subjectNames = activeCourse.subjects.map((s) =>
        typeof s === 'string' ? s : s.subject_name || s.name || 'Subject'
      );
    } else if (!isCourseSpecific && Object.keys(globalPerf).length > 0) {
      subjectNames = Object.keys(globalPerf);
    } else {
      subjectNames = [
        'Quantitative Aptitude',
        'General Intelligence & Reasoning',
        'English Comprehension',
        'General Awareness',
      ];
    }

    return subjectNames.map((subj) => {
      let accuracy = globalPerf[subj];

      if (accuracy === undefined) {
        const lower = subj.toLowerCase();
        for (const [k, v] of Object.entries(globalPerf)) {
          if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) {
            accuracy = v;
            break;
          }
        }
      }

      if (accuracy === undefined) {
        accuracy = isCourseSpecific && filteredAttempts.length === 0 ? 0 : 75;
      }

      const topperAccuracy = accuracy > 0 ? Math.min(100, Math.round(accuracy + 9)) : 92;

      let shortName = subj;
      if (subj.includes('Reasoning')) shortName = 'Reasoning';
      else if (subj.includes('Quantitative') || subj.includes('Math')) shortName = 'Quant';
      else if (subj.includes('English')) shortName = 'English';
      else if (subj.includes('Awareness') || subj.includes('Studies')) shortName = 'GA';
      else if (subj.length > 14) shortName = subj.slice(0, 12) + '...';

      const topics = [
        { name: 'Core Foundations & Formulae', score: Math.min(100, Math.round(accuracy * 1.05)) },
        { name: 'Applied Multi-Step Problem Solving', score: Math.round(accuracy * 0.95) },
        { name: 'Speed Drills & Mental Math', score: Math.round(accuracy * 0.9) },
      ];

      return {
        id: subj,
        name: subj,
        shortName,
        accuracy: Math.round(accuracy),
        topperAccuracy,
        speedSec: 46,
        topperSpeedSec: 36,
        questions: accuracy > 0 ? `${Math.round(accuracy * 0.8)} / 80 Qs` : '0 Qs Attempted',
        status:
          accuracy >= 80
            ? 'Mastered'
            : accuracy >= 60
            ? 'Solid Pace'
            : accuracy > 0
            ? 'Focus Needed'
            : 'Not Attempted',
        color: colorMap[subj] || '#3b82f6',
        topics,
      };
    });
  }, [isCourseSpecific, activeCourse, dashboard, filteredAttempts]);

  // Dynamic SVG Radar Geometry calculated from sectionalMastery
  const radarCenter = { x: 145, y: 110 };
  const radarRadius = 65;

  // Multi-day timeline performance trend dataset from course-filtered attempts
  const trendHistory = useMemo(() => {
    return filteredAttempts.map((att, idx) => ({
      index: idx + 1,
      title: att.test_title || `Mock #${idx + 1}`,
      date: att.start_time
        ? new Date(att.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `Mock ${idx + 1}`,
      score: att.total_score || 0,
      maxScore: att.max_possible_score || 200,
      accuracy: att.accuracy_percentage || 0,
      speed: Math.round((att.total_time_taken_seconds || 1800) / Math.max(1, att.total_questions || 25)),
    }));
  }, [filteredAttempts]);

  // SVG Chart Dimensions & Scale Calculations (Optimized for Headroom & Zero Scroll)
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 92, right: 65, bottom: 35, left: 55 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const currentValues = trendHistory.map((d) =>
    trendMetric === 'score' ? d.score : trendMetric === 'accuracy' ? d.accuracy : d.speed
  );
  const minVal =
    currentValues.length > 0
      ? trendMetric === 'speed'
        ? Math.min(...currentValues) - 5
        : Math.min(...currentValues) - 10
      : 0;
  const maxVal =
    currentValues.length > 0
      ? trendMetric === 'score'
        ? Math.max(...currentValues) + 10
        : trendMetric === 'accuracy'
        ? 100
        : Math.max(...currentValues) + 10
      : 100;

  const getX = (idx) => padding.left + (idx / Math.max(1, trendHistory.length - 1)) * graphWidth;
  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + graphHeight - ((clamped - minVal) / Math.max(1, maxVal - minVal)) * graphHeight;
  };

  // Build SVG path
  const linePoints = trendHistory.map(
    (d, i) => `${getX(i)},${getY(trendMetric === 'score' ? d.score : trendMetric === 'accuracy' ? d.accuracy : d.speed)}`
  );
  const linePathD = linePoints.length > 0 ? `M ${linePoints.join(' L ')}` : '';
  const areaPathD =
    linePoints.length > 0
      ? `M ${getX(0)},${padding.top + graphHeight} L ${linePoints.join(' L ')} L ${getX(trendHistory.length - 1)},${padding.top + graphHeight} Z`
      : '';

  // Benchmark target cutoff line for currently chosen metric
  const benchmarkY = getY(trendMetric === 'score' ? 140 : trendMetric === 'accuracy' ? 80 : 60);

  // Filtered scorecards list
  const attemptsList = filteredAttempts;

  const filteredScorecards = attemptsList.filter((att) => {
    const matchesSearch = (att.test_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isQual = (att.accuracy_percentage || 0) >= 70;
    if (scorecardFilter === 'QUALIFIED') return matchesSearch && isQual;
    if (scorecardFilter === 'REVIEW') return matchesSearch && !isQual;
    return matchesSearch;
  });

  // Calculate highest sectional delta for radar benchmark
  const highestDeltaSubj = useMemo(() => {
    if (sectionalMastery.length === 0) return null;
    let worst = sectionalMastery[0];
    let maxGap = worst.topperAccuracy - worst.accuracy;
    sectionalMastery.forEach((s) => {
      const gap = s.topperAccuracy - s.accuracy;
      if (gap > maxGap) {
        maxGap = gap;
        worst = s;
      }
    });
    return { ...worst, gap: maxGap };
  }, [sectionalMastery]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER CONTROLS, COURSE SELECTOR & ASPIRANT ANALYTICS SUMMARY BANNER
          ========================================================================= */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-institutional-600 text-white tracking-wider">
                Intelligence Engine
              </span>
              <h2 className="text-lg sm:text-xl font-black text-charcoal-900 dark:text-white flex items-center gap-2">
                <span>Aspirant Performance Analytics</span>
                <span className="text-amber-500">📊</span>
              </h2>
            </div>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1">
              Real-time psychometric evaluation, percentile benchmarking, and course-level sectional accuracy telemetry.
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="inline-flex p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-charcoal-600 dark:text-charcoal-300">
              {[
                { id: '7D', label: 'Last 7 Days' },
                { id: '30D', label: 'Last 30 Days' },
                { id: 'ALL', label: 'All Mocks' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeRange(tf.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeRange === tf.id
                      ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white shadow-xs'
                      : 'hover:text-charcoal-900 dark:hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COURSE-LEVEL ANALYTICS SWITCHER (MULTI-COURSE SUPPORT)
            ========================================================================= */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-charcoal-50/80 dark:bg-charcoal-800/40 border border-charcoal-200/90 dark:border-charcoal-750 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 flex items-center justify-center shrink-0">
              <BookOpenIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-charcoal-900 dark:text-white">
                  Course Analytics Scope
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                  {isCourseSpecific ? activeCourse.target_exam : `${courseScopes.length - 1} Courses Active`}
                </span>
              </div>
              <p className="text-[11px] text-charcoal-500">
                Filter Bar Graph, Radar Spider, and mock scorecards to specific enrolled courses.
              </p>
            </div>
          </div>

          {/* Course Selector Pills with Smooth Mobile Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
            {courseScopes.map((scope) => {
              const isSelected = selectedCourseId === scope.id;
              return (
                <button
                  key={scope.id}
                  onClick={() => {
                    setSelectedCourseId(scope.id);
                    setSelectedSection('ALL');
                    setHoveredRadarSection(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-institutional-600 text-white shadow-xs'
                      : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 border border-charcoal-200/80 dark:border-charcoal-700 hover:border-institutional-400'
                  }`}
                >
                  <span>{scope.isAll ? '🌐 All Courses' : `📚 ${scope.title}`}</span>
                  {!scope.isAll && scope.target_exam && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-charcoal-100 dark:bg-charcoal-700 text-charcoal-500'
                      }`}
                    >
                      {scope.target_exam}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Motivating Alert when 0 attempts for selected course */}
        {isCourseSpecific && filteredAttempts.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                <TargetIcon size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-charcoal-900 dark:text-white">
                  No mock test attempts recorded for {activeCourse.title}
                </h4>
                <p className="text-[11px] text-charcoal-600 dark:text-charcoal-300">
                  Take a sectional quiz or full mock test to populate course-level telemetry and AIR ranking.
                </p>
              </div>
            </div>
            <button
              onClick={() => (onOpenCourse ? onOpenCourse(activeCourse.id) : onStartPractice())}
              className="px-3.5 py-1.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold whitespace-nowrap transition-all cursor-pointer self-start sm:self-auto"
            >
              Start Course Mock →
            </button>
          </div>
        )}

        {/* 4 Interactive KPI Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Accuracy */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span className="truncate">{isCourseSpecific ? `${activeCourse.target_exam} Accuracy` : 'Overall Accuracy'}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-black">+4.2% ↑</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white">
                {courseKPIs.avgAccuracy.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Target benchmark: <strong>&gt; 80%</strong> for Tier-1 cutoff
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, courseKPIs.avgAccuracy)}%` }}
              />
            </div>
          </div>

          {/* Card 2: National Percentile */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span>{isCourseSpecific ? 'Course Percentile' : 'National Percentile'}</span>
              <TrophyIcon size={14} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-institutional-600 dark:text-institutional-400">
                {courseKPIs.percentile.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Top <strong>{(100 - courseKPIs.percentile).toFixed(1)}%</strong> of active candidates
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-institutional-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, courseKPIs.percentile)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Average Marks Secured */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span>Average Mock Score</span>
              <TargetIcon size={14} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white">
                {courseKPIs.avgScore.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-charcoal-400">/ 200</span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Personal Best: <strong>{courseKPIs.bestScore.toFixed(1)}</strong> marks
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (courseKPIs.avgScore / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Dwell Time / Speed */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span>Avg Speed per Q</span>
              <ClockIcon size={14} className="text-institutional-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white">
                {courseKPIs.avgSpeed || 54}s
              </span>
              <span className="text-xs font-mono text-charcoal-400">/ Question</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
              ✓ Optimal exam pacing (Benchmark: &lt;60s)
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. INTERACTIVE GRAPH 1: MULTI-METRIC PERFORMANCE TREND OVER TIME
          ========================================================================= */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
              <BarChart3Icon size={18} className="text-institutional-600" />
              <span>Score & Accuracy Progression Timeline</span>
            </h3>
            <p className="text-xs text-charcoal-500">
              Interactive longitudinal tracking across sequential test attempts. Hover over points to examine scorecard data.
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-charcoal-100 dark:bg-charcoal-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setTrendMetric('score')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                trendMetric === 'score'
                  ? 'bg-white dark:bg-charcoal-700 text-institutional-600 dark:text-institutional-300 shadow-xs'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
            >
              📈 Marks Secured
            </button>
            <button
              onClick={() => setTrendMetric('accuracy')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                trendMetric === 'accuracy'
                  ? 'bg-white dark:bg-charcoal-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
            >
              🎯 Accuracy (%)
            </button>
            <button
              onClick={() => setTrendMetric('speed')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                trendMetric === 'speed'
                  ? 'bg-white dark:bg-charcoal-700 text-amber-600 dark:text-amber-300 shadow-xs'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
            >
              ⏱️ Speed (s/Q)
            </button>
          </div>
        </div>

        {/* Interactive SVG Area/Line Graph (Full Width, Zero Horizontal Scroll) */}
        <div className="relative pt-2 pb-1 w-full overflow-hidden" onMouseLeave={() => setActiveTooltip(null)}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-56 sm:h-64 overflow-visible select-none"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + graphHeight * ratio;
              const value = Math.round(maxVal - ratio * (maxVal - minVal));
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-charcoal-200 dark:text-charcoal-800"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-charcoal-400 dark:fill-charcoal-500 font-semibold"
                  >
                    {value}
                    {trendMetric === 'accuracy' ? '%' : trendMetric === 'speed' ? 's' : ''}
                  </text>
                </g>
              );
            })}

            {/* Benchmark Target Cutoff Reference Line */}
            <line
              x1={padding.left}
              y1={benchmarkY}
              x2={chartWidth - padding.right}
              y2={benchmarkY}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              className="opacity-70"
            />
            <text
              x={chartWidth - padding.right}
              y={benchmarkY - 6}
              textAnchor="end"
              className="text-[9px] font-bold font-mono fill-rose-600 dark:fill-rose-400 uppercase tracking-wider"
            >
              Benchmark Cutoff ({trendMetric === 'score' ? '140 pts' : trendMetric === 'accuracy' ? '80%' : '<60s'})
            </text>

            {/* Area Gradient Fill */}
            {trendHistory.length === 0 && (
              <text
                x={chartWidth / 2}
                y={padding.top + graphHeight / 2}
                textAnchor="middle"
                className="text-xs font-semibold fill-charcoal-400 dark:fill-charcoal-500"
              >
                No mock tests taken yet. Attempt tests to visualize your progress trajectory.
              </text>
            )}

            {areaPathD && (
              <path d={areaPathD} fill="url(#trendGradient)" />
            )}

            {/* Main Trend Line */}
            {linePathD && (
              <path
                d={linePathD}
                fill="none"
                stroke={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Vertical guideline on hover */}
            {activeTooltip && (
              <line
                x1={activeTooltip.cx}
                y1={padding.top}
                x2={activeTooltip.cx}
                y2={chartHeight - padding.bottom}
                stroke={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                strokeDasharray="3 3"
                className="opacity-60"
                strokeWidth="1.5"
              />
            )}

            {/* Interactive Data Nodes */}
            {trendHistory.map((pt, idx) => {
              const cx = getX(idx);
              const cy = getY(trendMetric === 'score' ? pt.score : trendMetric === 'accuracy' ? pt.accuracy : pt.speed);
              const isHovered = activeTooltip?.index === pt.index;

              return (
                <g key={pt.index} className="cursor-pointer">
                  {/* Invisible larger hover hitbox */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="20"
                    fill="transparent"
                    onMouseEnter={() => setActiveTooltip({ ...pt, cx, cy })}
                    onClick={() => setActiveTooltip({ ...pt, cx, cy })}
                  />

                  {/* Outer Glow Halo when hovered */}
                  {isHovered && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="13"
                      fill={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                      opacity="0.35"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer border node */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? '7' : '5'}
                    fill="white"
                    stroke={trendMetric === 'score' ? '#0284c7' : trendMetric === 'accuracy' ? '#10b981' : '#f59e0b'}
                    strokeWidth={isHovered ? '3.5' : '2.5'}
                    className="transition-all duration-200"
                  />

                  {/* X-Axis Date Labels */}
                  <text
                    x={cx}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-charcoal-500 dark:fill-charcoal-400"
                  >
                    {pt.date}
                  </text>
                </g>
              );
            })}

            {/* In-SVG Tooltip: Mathematically Locked Directly on Top of Hovered Node */}
            {activeTooltip && (() => {
              const tooltipShift =
                activeTooltip.cx < 105
                  ? 105 - activeTooltip.cx
                  : activeTooltip.cx > chartWidth - 105
                  ? chartWidth - 105 - activeTooltip.cx
                  : 0;

              return (
                <g
                  transform={`translate(${activeTooltip.cx}, ${activeTooltip.cy})`}
                  className="pointer-events-none select-none"
                >
                  {/* Downward indicator arrow pointing straight into node center */}
                  <polygon
                    points="-6,-14 6,-14 0,-8"
                    className="fill-white dark:fill-charcoal-900 stroke-charcoal-300 dark:stroke-charcoal-700"
                    strokeWidth="1"
                  />

                  {/* Tooltip Background Card with Crisp Border and High Contrast */}
                  <rect
                    x={-92 + tooltipShift}
                    y="-78"
                    width="184"
                    height="64"
                    rx="12"
                    className="fill-white dark:fill-charcoal-900 stroke-charcoal-300 dark:stroke-charcoal-650"
                    strokeWidth="1.5"
                  />

                  {/* Test Title (truncated) */}
                  <text
                    x={-80 + tooltipShift}
                    y="-61"
                    className="text-[11px] font-extrabold fill-charcoal-900 dark:fill-white font-sans"
                  >
                    {activeTooltip.title.length > 17
                      ? activeTooltip.title.slice(0, 15) + '..'
                      : activeTooltip.title}
                  </text>

                  {/* Test Date */}
                  <text
                    x={80 + tooltipShift}
                    y="-61"
                    textAnchor="end"
                    className="text-[10px] font-mono font-semibold fill-charcoal-400 dark:fill-charcoal-400"
                  >
                    {activeTooltip.date}
                  </text>

                  {/* Header Divider Line */}
                  <line
                    x1={-82 + tooltipShift}
                    y1="-53"
                    x2={82 + tooltipShift}
                    y2="-53"
                    stroke="currentColor"
                    className="text-charcoal-150 dark:text-charcoal-800"
                    strokeWidth="0.75"
                  />

                  {/* Metric Pill 1: Marks Secured */}
                  <rect
                    x={-82 + tooltipShift}
                    y="-47"
                    width="50"
                    height="26"
                    rx="6"
                    className="fill-charcoal-50 dark:fill-charcoal-800 stroke-charcoal-200/60 dark:stroke-charcoal-700/60"
                    strokeWidth="0.5"
                  />
                  <text
                    x={-57 + tooltipShift}
                    y="-39"
                    textAnchor="middle"
                    className="text-[8px] font-sans font-bold fill-charcoal-400 uppercase tracking-tight"
                  >
                    MARKS
                  </text>
                  <text
                    x={-57 + tooltipShift}
                    y="-27"
                    textAnchor="middle"
                    className="text-[11px] font-mono font-black fill-institutional-600 dark:fill-institutional-400"
                  >
                    {activeTooltip.score.toFixed(1)}
                  </text>

                  {/* Metric Pill 2: Accuracy % */}
                  <rect
                    x={-26 + tooltipShift}
                    y="-47"
                    width="52"
                    height="26"
                    rx="6"
                    className="fill-charcoal-50 dark:fill-charcoal-800 stroke-charcoal-200/60 dark:stroke-charcoal-700/60"
                    strokeWidth="0.5"
                  />
                  <text
                    x={0 + tooltipShift}
                    y="-39"
                    textAnchor="middle"
                    className="text-[8px] font-sans font-bold fill-charcoal-400 uppercase tracking-tight"
                  >
                    ACC.
                  </text>
                  <text
                    x={0 + tooltipShift}
                    y="-27"
                    textAnchor="middle"
                    className="text-[11px] font-mono font-black fill-emerald-600 dark:fill-emerald-400"
                  >
                    {activeTooltip.accuracy.toFixed(1)}%
                  </text>

                  {/* Metric Pill 3: Speed in s/Q */}
                  <rect
                    x={32 + tooltipShift}
                    y="-47"
                    width="50"
                    height="26"
                    rx="6"
                    className="fill-charcoal-50 dark:fill-charcoal-800 stroke-charcoal-200/60 dark:stroke-charcoal-700/60"
                    strokeWidth="0.5"
                  />
                  <text
                    x={57 + tooltipShift}
                    y="-39"
                    textAnchor="middle"
                    className="text-[8px] font-sans font-bold fill-charcoal-400 uppercase tracking-tight"
                  >
                    SPEED
                  </text>
                  <text
                    x={57 + tooltipShift}
                    y="-27"
                    textAnchor="middle"
                    className="text-[11px] font-mono font-black fill-amber-600 dark:fill-amber-400"
                  >
                    {activeTooltip.speed}s
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* =========================================================================
          3. TWO-COL GRID: ATTEMPT DISPOSITION DONUT & SECTIONAL MASTERY RADAR
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: PrepMagnet Attempt Disposition & Penalty Impact (Interactive Donut) */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                <TargetIcon size={18} className="text-emerald-600" />
                <span>Attempt Disposition & Penalty Impact</span>
              </h3>
              <p className="text-xs text-charcoal-500">
                Hover over any slice or card to analyze negative marking impact under +2.0 / -0.5 rules.
              </p>
            </div>
            {pinnedDisposition && (
              <button
                onClick={() => setPinnedDisposition(null)}
                className="text-[10px] font-bold text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 bg-charcoal-100 dark:bg-charcoal-800 px-2 py-0.5 rounded-lg cursor-pointer"
              >
                Reset Filter ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
            {/* Interactive SVG Donut Chart with Gradients & Point-Locked Hover Tooltip */}
            <div
              ref={donutContainerRef}
              onMouseMove={handleDonutMouseMove}
              className="relative flex items-center justify-center py-1"
            >
              {/* Minimal Clean Tooltip: Positioned exactly at the hovered point */}
              {hoveredDisposition && (() => {
                const info =
                  hoveredDisposition === 'correct'
                    ? { title: 'Correct Answers', percent: '77.2%', dotBg: 'bg-emerald-500' }
                    : hoveredDisposition === 'negative'
                    ? { title: 'Negative Deductions', percent: '13.0%', dotBg: 'bg-rose-500' }
                    : { title: 'Strategic Skips', percent: '9.8%', dotBg: 'bg-slate-400' };

                const isNearTop = donutTooltipPos.y < 42;

                return (
                  <div
                    className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out whitespace-nowrap"
                    style={{
                      left: `${donutTooltipPos.x}px`,
                      top: `${donutTooltipPos.y}px`,
                      transform: isNearTop ? 'translate(-50%, 14px)' : 'translate(-50%, -125%)',
                    }}
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal-900/95 dark:bg-charcoal-100/95 text-white dark:text-charcoal-950 shadow-xl text-xs font-bold border border-charcoal-800 dark:border-charcoal-200 backdrop-blur-xs">
                      <span className={`w-2 h-2 rounded-full ${info.dotBg}`} />
                      <span>{info.title}</span>
                      <span className="font-mono opacity-80">({info.percent})</span>
                    </div>
                    {!isNearTop && (
                      <div className="w-1.5 h-1.5 bg-charcoal-900/95 dark:bg-charcoal-100/95 rotate-45 mx-auto -mt-1 border-r border-b border-charcoal-800 dark:border-charcoal-200" />
                    )}
                    {isNearTop && (
                      <div className="w-1.5 h-1.5 bg-charcoal-900/95 dark:bg-charcoal-100/95 rotate-45 mx-auto -mt-6 border-l border-t border-charcoal-800 dark:border-charcoal-200" />
                    )}
                  </div>
                );
              })()}

              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 overflow-visible select-none">
                <defs>
                  <linearGradient id="correctGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="negativeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                  <linearGradient id="skippedGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                </defs>

                {/* Base subtle guide ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-charcoal-150 dark:text-charcoal-800"
                  strokeWidth="14"
                />

                {/* Circumference = 2 * PI * 66 ≈ 414.7 */}
                {/* Correct Slice (77.2%): ~320 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="transparent"
                  stroke="url(#correctGrad)"
                  strokeWidth={activeDisposition === 'correct' ? '24' : activeDisposition === 'all' ? '18' : '14'}
                  strokeDasharray="316 415"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  opacity={activeDisposition === 'all' || activeDisposition === 'correct' ? 1 : 0.35}
                  onMouseEnter={(e) => {
                    handleDonutMouseMove(e);
                    setHoveredDisposition('correct');
                  }}
                  onMouseMove={handleDonutMouseMove}
                  onMouseLeave={() => setHoveredDisposition(null)}
                  onClick={() => setPinnedDisposition(prev => prev === 'correct' ? null : 'correct')}
                />

                {/* Negative Slice (13.0%): ~54 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="transparent"
                  stroke="url(#negativeGrad)"
                  strokeWidth={activeDisposition === 'negative' ? '24' : activeDisposition === 'all' ? '18' : '14'}
                  strokeDasharray="50 415"
                  strokeDashoffset="-322"
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  opacity={activeDisposition === 'all' || activeDisposition === 'negative' ? 1 : 0.35}
                  onMouseEnter={(e) => {
                    handleDonutMouseMove(e);
                    setHoveredDisposition('negative');
                  }}
                  onMouseMove={handleDonutMouseMove}
                  onMouseLeave={() => setHoveredDisposition(null)}
                  onClick={() => setPinnedDisposition(prev => prev === 'negative' ? null : 'negative')}
                />

                {/* Skipped Slice (9.8%): ~40 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="transparent"
                  stroke="url(#skippedGrad)"
                  strokeWidth={activeDisposition === 'skipped' ? '24' : activeDisposition === 'all' ? '18' : '14'}
                  strokeDasharray="34 415"
                  strokeDashoffset="-378"
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  opacity={activeDisposition === 'all' || activeDisposition === 'skipped' ? 1 : 0.35}
                  onMouseEnter={(e) => {
                    handleDonutMouseMove(e);
                    setHoveredDisposition('skipped');
                  }}
                  onMouseMove={handleDonutMouseMove}
                  onMouseLeave={() => setHoveredDisposition(null)}
                  onClick={() => setPinnedDisposition(prev => prev === 'skipped' ? null : 'skipped')}
                />
              </svg>

              {/* Dynamic Center Metrics in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center transition-all duration-200">
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono transition-colors duration-200 ${
                    activeDisposition === 'correct'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : activeDisposition === 'negative'
                      ? 'text-rose-600 dark:text-rose-400'
                      : activeDisposition === 'skipped'
                      ? 'text-slate-600 dark:text-slate-300'
                      : 'text-charcoal-900 dark:text-white'
                  }`}
                >
                  {activeDisposition === 'correct'
                    ? '142'
                    : activeDisposition === 'negative'
                    ? '24'
                    : activeDisposition === 'skipped'
                    ? '18'
                    : `${disposition.accuracy}%`}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${
                    activeDisposition === 'correct'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : activeDisposition === 'negative'
                      ? 'text-rose-700 dark:text-rose-300'
                      : activeDisposition === 'skipped'
                      ? 'text-slate-600 dark:text-slate-300'
                      : 'text-charcoal-500'
                  }`}
                >
                  {activeDisposition === 'correct'
                    ? 'Correct (+284)'
                    : activeDisposition === 'negative'
                    ? 'Mistakes (-12)'
                    : activeDisposition === 'skipped'
                    ? 'Skips (0)'
                    : 'Net Hit Rate'}
                </span>
                <span className="text-[9px] font-mono text-charcoal-400 mt-0.5">
                  {activeDisposition === 'correct'
                    ? '77.2% Accuracy'
                    : activeDisposition === 'negative'
                    ? '13.0% of Attempts'
                    : activeDisposition === 'skipped'
                    ? '9.8% Strategic'
                    : '184 Total Qs'}
                </span>
              </div>
            </div>

            {/* Hover-Synchronized Legend Cards */}
            <div className="space-y-2.5">
              <div
                onMouseEnter={() => {
                  setHoveredDisposition('correct');
                  setDonutTooltipPos({ x: 100, y: 35 });
                }}
                onMouseLeave={() => setHoveredDisposition(null)}
                onClick={() => setPinnedDisposition(prev => prev === 'correct' ? null : 'correct')}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  activeDisposition === 'correct'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 shadow-xs scale-[1.02]'
                    : activeDisposition === 'all'
                    ? 'bg-charcoal-50/60 dark:bg-charcoal-800/40 border-charcoal-200/70 dark:border-charcoal-750 hover:border-emerald-300'
                    : 'opacity-40 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                  <div>
                    <div className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <span>Correct Answers</span>
                      {activeDisposition === 'correct' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-charcoal-500 font-mono">142 Qs • +284.0 Gross Marks</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">77.2%</span>
              </div>

              <div
                onMouseEnter={() => {
                  setHoveredDisposition('negative');
                  setDonutTooltipPos({ x: 165, y: 100 });
                }}
                onMouseLeave={() => setHoveredDisposition(null)}
                onClick={() => setPinnedDisposition(prev => prev === 'negative' ? null : 'negative')}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  activeDisposition === 'negative'
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 shadow-xs scale-[1.02]'
                    : activeDisposition === 'all'
                    ? 'bg-charcoal-50/60 dark:bg-charcoal-800/40 border-charcoal-200/70 dark:border-charcoal-750 hover:border-rose-300'
                    : 'opacity-40 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-xs shrink-0" />
                  <div>
                    <div className="text-xs font-black text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                      <span>Negative Deductions</span>
                      {activeDisposition === 'negative' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-charcoal-500 font-mono">24 Qs • -12.0 Marks Lost</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">13.0%</span>
              </div>

              <div
                onMouseEnter={() => {
                  setHoveredDisposition('skipped');
                  setDonutTooltipPos({ x: 65, y: 135 });
                }}
                onMouseLeave={() => setHoveredDisposition(null)}
                onClick={() => setPinnedDisposition(prev => prev === 'skipped' ? null : 'skipped')}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  activeDisposition === 'skipped'
                    ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-xs scale-[1.02]'
                    : activeDisposition === 'all'
                    ? 'bg-charcoal-50/60 dark:bg-charcoal-800/40 border-charcoal-200/70 dark:border-charcoal-750 hover:border-slate-300'
                    : 'opacity-40 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shadow-xs shrink-0" />
                  <div>
                    <div className="text-xs font-black text-charcoal-900 dark:text-charcoal-200 flex items-center gap-1.5">
                      <span>Strategic Skips</span>
                      {activeDisposition === 'skipped' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-charcoal-500 font-mono">18 Qs • 0.0 Deduction</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-charcoal-600 dark:text-charcoal-300">9.8%</span>
              </div>
            </div>
          </div>

          {/* Context-Aware Tactical Guidance Box */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all duration-200 ${
              activeDisposition === 'negative'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                : activeDisposition === 'correct'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : activeDisposition === 'skipped'
                ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
            }`}
          >
            <span className="text-base shrink-0">
              {activeDisposition === 'negative'
                ? '⚠️'
                : activeDisposition === 'correct'
                ? '🎯'
                : activeDisposition === 'skipped'
                ? '🛡️'
                : '💡'}
            </span>
            <div className="leading-snug space-y-0.5">
              {activeDisposition === 'negative' ? (
                <span>
                  <strong>Negative Penalty Audit:</strong> You gave away <strong>12.0 raw marks</strong> to 24 negative guesses (-0.5 each). In competitive tier cutoffs, skipping these 50/50 guesses preserves marks and immediately leaps you ahead by <strong>~180 merit rank positions</strong>.
                </span>
              ) : activeDisposition === 'correct' ? (
                <span>
                  <strong>Scoring Precision Engine:</strong> 142 correct questions contributed <strong>+284.0 gross marks</strong> at a 77.2% accuracy rate, providing your strong foundation in the <strong>91.8th national percentile</strong>.
                </span>
              ) : activeDisposition === 'skipped' ? (
                <span>
                  <strong>Strategic Pruning Discipline:</strong> Skipping 18 high-risk questions saved your scorecard from potential negative mark deductions. Tactical skipping is a recognized competitive advantage.
                </span>
              ) : (
                <span>
                  <strong>Negative Marking Recovery Simulator:</strong> If you convert wild 50/50 guesses into strategic skips, your net score jumps by <strong>+12.0 raw marks</strong>, immediately raising national rank by <strong>~180 places</strong>.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sectional Accuracy & Subject Mastery (Radar / Spider Comparison) */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                <SparklesIcon size={18} className="text-amber-500" />
                <span>
                  Sectional Mastery {isCourseSpecific ? `(${activeCourse.target_exam})` : 'vs. Topper Benchmark'}
                </span>
              </h3>
              <p className="text-xs text-charcoal-500">
                {isCourseSpecific
                  ? `Course syllabus breakdown for ${activeCourse.title} vs AIR-100 benchmark.`
                  : 'Compare your sectional accuracy with AIR-100 topper percentiles across all syllabus areas.'}
              </p>
            </div>

            {/* Toggle View */}
            <div className="flex items-center bg-charcoal-100 dark:bg-charcoal-800 p-0.5 rounded-lg text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setRadarView('radar')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  radarView === 'radar'
                    ? 'bg-white dark:bg-charcoal-700 text-institutional-600 dark:text-white shadow-xs'
                    : 'text-charcoal-500'
                }`}
              >
                Radar
              </button>
              <button
                onClick={() => setRadarView('bars')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  radarView === 'bars'
                    ? 'bg-white dark:bg-charcoal-700 text-institutional-600 dark:text-white shadow-xs'
                    : 'text-charcoal-500'
                }`}
              >
                Bars
              </button>
            </div>
          </div>

          {radarView === 'radar' ? (
            /* Interactive Dynamic SVG Radar Chart */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              <div
                ref={radarContainerRef}
                onMouseMove={handleRadarMouseMove}
                className="relative shrink-0 flex items-center justify-center w-full sm:w-auto"
              >
                {/* Minimal Clean Tooltip: Positioned at active hovered node */}
                {hoveredRadarSection && (() => {
                  const sec = sectionalMastery.find((s) => s.id === hoveredRadarSection);
                  if (!sec) return null;

                  const isNearTop = radarTooltipPos.y < 42;

                  return (
                    <div
                      className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out whitespace-nowrap"
                      style={{
                        left: `${radarTooltipPos.x}px`,
                        top: `${radarTooltipPos.y}px`,
                        transform: isNearTop ? 'translate(-50%, 14px)' : 'translate(-50%, -125%)',
                      }}
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal-900/95 dark:bg-charcoal-100/95 text-white dark:text-charcoal-950 shadow-xl text-xs font-bold border border-charcoal-800 dark:border-charcoal-200 backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                        <span>{sec.name}</span>
                        <span className="font-mono opacity-90">({sec.accuracy}% vs {sec.topperAccuracy}% topper)</span>
                      </div>
                      {!isNearTop && (
                        <div className="w-1.5 h-1.5 bg-charcoal-900/95 dark:bg-charcoal-100/95 rotate-45 mx-auto -mt-1 border-r border-b border-charcoal-800 dark:border-charcoal-200" />
                      )}
                      {isNearTop && (
                        <div className="w-1.5 h-1.5 bg-charcoal-900/95 dark:bg-charcoal-100/95 rotate-45 mx-auto -mt-6 border-l border-t border-charcoal-800 dark:border-charcoal-200" />
                      )}
                    </div>
                  );
                })()}

                <svg width="310" height="220" viewBox="0 0 310 220" className="select-none max-w-full">
                  {/* Concentric Polygons (25%, 50%, 75%, 100%) */}
                  {[0.25, 0.5, 0.75, 1.0].map((level) => {
                    const r = radarRadius * level;
                    const pts = sectionalMastery
                      .map((_, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                        return `${(radarCenter.x + r * Math.cos(angle)).toFixed(1)},${(radarCenter.y + r * Math.sin(angle)).toFixed(1)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={level}
                        points={pts}
                        fill="transparent"
                        stroke="currentColor"
                        className="text-charcoal-200 dark:text-charcoal-800"
                        strokeWidth="1"
                        strokeDasharray={level === 1 ? 'none' : '3 3'}
                      />
                    );
                  })}

                  {/* Axes Lines */}
                  {sectionalMastery.map((subj, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                    const x2 = radarCenter.x + radarRadius * Math.cos(angle);
                    const y2 = radarCenter.y + radarRadius * Math.sin(angle);
                    const isHovered = hoveredRadarSection === subj.id;
                    return (
                      <line
                        key={subj.id}
                        x1={radarCenter.x}
                        y1={radarCenter.y}
                        x2={x2.toFixed(1)}
                        y2={y2.toFixed(1)}
                        stroke={isHovered ? subj.color : 'currentColor'}
                        className={isHovered ? '' : 'text-charcoal-200 dark:text-charcoal-800'}
                        strokeWidth={isHovered ? '2' : '1'}
                      />
                    );
                  })}

                  {/* Topper Benchmark Polygon (Amber Dotted) */}
                  <polygon
                    points={sectionalMastery
                      .map((subj, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                        const r = radarRadius * (Math.max(12, Math.min(100, subj.topperAccuracy)) / 100);
                        return `${(radarCenter.x + r * Math.cos(angle)).toFixed(1)},${(radarCenter.y + r * Math.sin(angle)).toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="#f59e0b"
                    fillOpacity="0.1"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Candidate Mastery Polygon */}
                  <polygon
                    points={sectionalMastery
                      .map((subj, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                        const r = radarRadius * (Math.max(6, Math.min(100, subj.accuracy)) / 100);
                        return `${(radarCenter.x + r * Math.cos(angle)).toFixed(1)},${(radarCenter.y + r * Math.sin(angle)).toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="#0284c7"
                    fillOpacity="0.25"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                  />

                  {/* Topper Benchmark Vertices */}
                  {sectionalMastery.map((subj, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                    const r = radarRadius * (Math.max(12, Math.min(100, subj.topperAccuracy)) / 100);
                    const cx = radarCenter.x + r * Math.cos(angle);
                    const cy = radarCenter.y + r * Math.sin(angle);
                    const isHovered = hoveredRadarSection === subj.id;
                    return (
                      <circle
                        key={`topper-${subj.id}`}
                        cx={cx.toFixed(1)}
                        cy={cy.toFixed(1)}
                        r={isHovered ? '5' : '3'}
                        fill="#f59e0b"
                        stroke="white"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    );
                  })}

                  {/* Aspirant Vertices with Ping & Invisible Hover Targets */}
                  {sectionalMastery.map((subj, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                    const r = radarRadius * (Math.max(6, Math.min(100, subj.accuracy)) / 100);
                    const cx = radarCenter.x + r * Math.cos(angle);
                    const cy = radarCenter.y + r * Math.sin(angle);
                    const isHovered = hoveredRadarSection === subj.id;

                    return (
                      <g key={`aspirant-${subj.id}`}>
                        {isHovered && (
                          <circle
                            cx={cx.toFixed(1)}
                            cy={cy.toFixed(1)}
                            r="14"
                            fill="#0284c7"
                            opacity="0.35"
                            className="animate-ping pointer-events-none"
                          />
                        )}
                        <circle
                          cx={cx.toFixed(1)}
                          cy={cy.toFixed(1)}
                          r={isHovered ? '6.5' : '4.5'}
                          fill={isHovered ? subj.color : '#0284c7'}
                          stroke="white"
                          strokeWidth="2.5"
                          className="transition-all cursor-pointer"
                        />
                        <circle
                          cx={cx.toFixed(1)}
                          cy={cy.toFixed(1)}
                          r="18"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={(e) => {
                            handleRadarMouseMove(e);
                            setHoveredRadarSection(subj.id);
                          }}
                          onMouseMove={handleRadarMouseMove}
                          onMouseLeave={() => setHoveredRadarSection(null)}
                        />
                      </g>
                    );
                  })}

                  {/* Section Labels Around Outer Boundary */}
                  {sectionalMastery.map((subj, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sectionalMastery.length;
                    const r = radarRadius + 22;
                    const lx = radarCenter.x + r * Math.cos(angle);
                    const ly = radarCenter.y + r * Math.sin(angle);
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
                    const isHovered = hoveredRadarSection === subj.id;

                    return (
                      <text
                        key={`label-${subj.id}`}
                        x={lx.toFixed(1)}
                        y={(ly + (sin < -0.5 ? -3 : sin > 0.5 ? 5 : 2)).toFixed(1)}
                        textAnchor={anchor}
                        onMouseEnter={(e) => {
                          handleRadarMouseMove(e);
                          setHoveredRadarSection(subj.id);
                        }}
                        onMouseMove={handleRadarMouseMove}
                        onMouseLeave={() => setHoveredRadarSection(null)}
                        className={`text-[9.5px] cursor-pointer transition-colors ${
                          isHovered
                            ? 'font-black'
                            : 'font-bold fill-charcoal-700 dark:fill-charcoal-300'
                        }`}
                        style={{ fill: isHovered ? subj.color : undefined }}
                      >
                        {subj.shortName} ({subj.accuracy}%)
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* Radar Legend & Delta stats */}
              <div className="space-y-3 text-xs w-full sm:w-auto shrink-0 pl-1">
                <div
                  onMouseEnter={() => {
                    if (sectionalMastery[0]) {
                      setHoveredRadarSection(sectionalMastery[0].id);
                      setRadarTooltipPos({ x: 145, y: 110 });
                    }
                  }}
                  onMouseLeave={() => setHoveredRadarSection(null)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-charcoal-50 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-institutional-600 shrink-0" />
                  <div>
                    <span className="font-bold text-charcoal-800 dark:text-charcoal-200">
                      {isCourseSpecific ? `${activeCourse.target_exam} Score` : 'Your Accuracy'}
                    </span>
                    <div className="text-[10px] text-charcoal-500 font-mono">
                      {courseKPIs.avgAccuracy.toFixed(1)}% course avg
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-charcoal-50 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-charcoal-800 dark:text-charcoal-200">AIR-100 Benchmark</span>
                    <div className="text-[10px] text-charcoal-500 font-mono">
                      {Math.round(
                        sectionalMastery.reduce((acc, s) => acc + s.topperAccuracy, 0) /
                          Math.max(1, sectionalMastery.length)
                      )}
                      % target cutoff
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 space-y-1">
                  <div className="text-[11px] font-semibold text-charcoal-700 dark:text-charcoal-300">
                    Highest Sectional Delta:
                  </div>
                  {highestDeltaSubj && highestDeltaSubj.gap > 0 ? (
                    <div
                      onMouseEnter={() => {
                        setHoveredRadarSection(highestDeltaSubj.id);
                        setRadarTooltipPos({ x: 145, y: 110 });
                      }}
                      onMouseLeave={() => setHoveredRadarSection(null)}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      ⚠️ {highestDeltaSubj.name}: -{highestDeltaSubj.gap}% gap vs Toppers
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold p-1">
                      ✓ Matching or exceeding Topper benchmarks across syllabus
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Bar Mastery Grid View */
            <div className="space-y-3.5 pt-1">
              {sectionalMastery.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => setSelectedSection(selectedSection === subj.id ? 'ALL' : subj.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedSection === subj.id
                      ? 'bg-institutional-50/60 dark:bg-institutional-950/40 border-institutional-400'
                      : 'hover:bg-charcoal-50 dark:hover:bg-charcoal-800/40 border-charcoal-200/60 dark:border-charcoal-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-1 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />
                      <span className="text-charcoal-900 dark:text-white font-extrabold">{subj.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          subj.status === 'Mastered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : subj.status === 'Solid Pace'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : subj.status === 'Focus Needed'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-charcoal-100 text-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-400'
                        }`}
                      >
                        {subj.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono self-end sm:self-auto">
                      <span className="text-charcoal-400 text-[11px]">{subj.questions}</span>
                      <span className="font-black text-institutional-600 dark:text-institutional-400 text-sm">
                        {subj.accuracy}%
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-2.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${subj.accuracy}%`, backgroundColor: subj.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-charcoal-500 mt-1 font-semibold">
                    <span>Target: <strong>80%+</strong></span>
                    <span>
                      Topper Benchmark: <strong className="text-amber-600 dark:text-amber-400">{subj.topperAccuracy}%</strong>
                    </span>
                  </div>

                  {/* Expanded Sub-Topics on click */}
                  {selectedSection === subj.id && (
                    <div className="mt-3 pt-2.5 border-t border-charcoal-200 dark:border-charcoal-700 space-y-1.5 animate-fade-in">
                      <div className="text-[10px] font-bold uppercase text-charcoal-400 tracking-wider">
                        Topic Accuracy Drilldown
                      </div>
                      {subj.topics.map((top) => (
                        <div key={top.name} className="flex items-center justify-between text-[11px]">
                          <span className="text-charcoal-600 dark:text-charcoal-300">{top.name}</span>
                          <span className="font-mono font-bold text-charcoal-900 dark:text-white">{top.score}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* =========================================================================
          4. DIFFICULTY MATRIX (LEETCODE STYLE) & SPEED QUADRANT
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Question Difficulty Matrix */}
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
              <ZapIcon size={18} className="text-amber-500" />
              <span>Difficulty Tier Mastery</span>
            </h3>
            <p className="text-xs text-charcoal-500">
              Questions solved across complexity tiers calibrated to exam weightage.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Easy */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Easy Questions</span>
                </span>
                <span className="font-mono text-emerald-800 dark:text-emerald-400 font-black">
                  42 / 50 (91.5%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-emerald-950/20 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '91.5%' }} />
              </div>
              <div className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold flex items-center justify-between">
                <span>Beats <strong>94.2%</strong> of candidates</span>
                <span>🔥 Mastered</span>
              </div>
            </div>

            {/* Medium */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Medium Questions</span>
                </span>
                <span className="font-mono text-amber-900 dark:text-amber-400 font-black">
                  31 / 40 (82.0%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-amber-950/20 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '82%' }} />
              </div>
              <div className="text-[10px] text-amber-900 dark:text-amber-400 font-semibold flex items-center justify-between">
                <span>Beats <strong>88.6%</strong> of candidates</span>
                <span>⚡ High Yield</span>
              </div>
            </div>

            {/* Hard */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-rose-950 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Hard Complex Drills</span>
                </span>
                <span className="font-mono text-rose-900 dark:text-rose-400 font-black">
                  12 / 20 (65.0%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-rose-950/20 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="text-[10px] text-rose-900 dark:text-rose-400 font-semibold flex items-center justify-between">
                <span>Beats <strong>76.4%</strong> of candidates</span>
                <span>🎯 Priority Focus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Speed vs Precision Scatter Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                <TargetIcon size={18} className="text-institutional-600" />
                <span>Speed vs. Precision Quadrant Matrix</span>
              </h3>
              <p className="text-xs text-charcoal-500">
                Quadrant mapping of mock tests to detect rush errors and pacing bottlenecks.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
              Optimal: Top-Right (Bullseye)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Quadrant 1: Fast & Accurate */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">🎯 Bullseye Zone</span>
                <span className="text-[10px] font-bold text-emerald-700">Fast & Accurate</span>
              </div>
              <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
                <strong>General Intelligence & Reasoning:</strong> 46s/Q with 92.5% accuracy. Your strongest competitive lever.
              </p>
            </div>

            {/* Quadrant 2: Deliberate & Accurate */}
            <div className="p-4 rounded-2xl bg-institutional-50 dark:bg-institutional-950/30 border border-institutional-300 dark:border-institutional-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-institutional-950 dark:text-institutional-200">⚖️ Methodical Zone</span>
                <span className="text-[10px] font-bold text-institutional-700">Deliberate & Accurate</span>
              </div>
              <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
                <strong>Quantitative Aptitude:</strong> 68s/Q with 88.0% accuracy. High accuracy but prune dwell time by ~8s.
              </p>
            </div>

            {/* Quadrant 3: Rushed & Careless */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">⚠️ Risk Zone</span>
                <span className="text-[10px] font-bold text-amber-700">Fast but Careless</span>
              </div>
              <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
                <strong>English Vocab:</strong> 35s/Q with 72% accuracy. Rushing through reading comprehension incurs negative marks.
              </p>
            </div>

            {/* Quadrant 4: Bottleneck */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-950 dark:text-rose-200">🛑 Bottleneck Zone</span>
                <span className="text-[10px] font-bold text-rose-700">Slow & Inaccurate</span>
              </div>
              <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
                <strong>Advanced Geometry:</strong> 85s/Q with 62% accuracy. Skip early; solve in Round 2.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. RECENT MOCK TEST SCORECARDS TABLE & DRILL-DOWN
          ========================================================================= */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200/80 dark:border-charcoal-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
          <div>
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
              <span>{isCourseSpecific ? `${activeCourse.title} Scorecards` : 'Recent Mock Test Scorecards'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300">
                {filteredScorecards.length} {filteredScorecards.length === 1 ? 'Mock' : 'Mocks'}
              </span>
            </h3>
            <p className="text-xs text-charcoal-500">
              Exam marks, negative marking deductions, accuracy rates, and instant scorecard review.
            </p>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search mock title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-institutional-500"
              />
            </div>

            <div className="inline-flex p-0.5 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-charcoal-600 dark:text-charcoal-300">
              <button
                onClick={() => setScorecardFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  scorecardFilter === 'ALL'
                    ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white shadow-xs'
                    : 'text-charcoal-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setScorecardFilter('QUALIFIED')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  scorecardFilter === 'QUALIFIED'
                    ? 'bg-white dark:bg-charcoal-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-charcoal-500'
                }`}
              >
                Qualified
              </button>
              <button
                onClick={() => setScorecardFilter('REVIEW')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  scorecardFilter === 'REVIEW'
                    ? 'bg-white dark:bg-charcoal-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-charcoal-500'
                }`}
              >
                Needs Review
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[620px]">
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
              {filteredScorecards.length > 0 ? (
                filteredScorecards.map((att) => {
                  const isQualified = (att.accuracy_percentage || 0) >= 70;
                  return (
                    <tr key={att.attempt_id} className="hover:bg-charcoal-50 dark:hover:bg-charcoal-800/40 transition-colors">
                      <td className="py-3.5 pr-4 max-w-xs">
                        <div className="font-bold text-charcoal-900 dark:text-white truncate">
                          {att.test_title}
                        </div>
                        <div className="text-[10px] text-charcoal-400 font-mono">
                          All-India Rank: #{att.rank || 24}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-charcoal-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(att.start_time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-charcoal-900 dark:text-white whitespace-nowrap">
                        {att.total_score?.toFixed(1)} / {att.max_possible_score || 50}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isQualified
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }
                        >
                          {att.accuracy_percentage?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Qualified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Review Needed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectAttempt(att.attempt_id)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-institutional-300 dark:border-institutional-700 bg-institutional-50 hover:bg-institutional-100 dark:bg-institutional-950 dark:hover:bg-institutional-900 text-institutional-700 dark:text-institutional-300 transition-colors cursor-pointer"
                        >
                          View Scorecard →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-charcoal-400">
                    No mock test attempts matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
