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
} from './Icons';

/**
 * AnalyticsDashboardView — Executive-Grade Aspirant Analytics Dashboard
 * Features:
 * - 4 Interactive Key Performance Indicators with trend benchmarks.
 * - Interactive Multi-Metric Trend Area/Line Chart (Score, Accuracy, Speed) with hover tooltips and cutoff guides.
 * - Interactive Attempt Disposition Donut Chart with negative marking impact simulator.
 * - Sectional Mastery Radar / Spider Chart comparing Student vs Topper Benchmarks.
 * - Difficulty Tier Matrix (Easy, Medium, Hard) with peer percentile superiority.
 * - Speed vs. Precision Quadrant Matrix (Scatter Plot).
 * - Interactive Scorecards Table with search, status filters, and instant scorecard review.
 */
export const AnalyticsDashboardView = ({
  dashboard,
  onSelectAttempt,
  onStartPractice,
}) => {
  // Filters & metric toggles
  const [timeRange, setTimeRange] = useState('30D'); // '7D' | '30D' | 'ALL'
  const [trendMetric, setTrendMetric] = useState('score'); // 'score' | 'accuracy' | 'speed'
  const [selectedSection, setSelectedSection] = useState('ALL'); // 'ALL' | 'Quant' | 'Reasoning' | 'English' | 'GA'
  const [hoveredDisposition, setHoveredDisposition] = useState(null); // 'correct' | 'negative' | 'skipped' | null
  const [pinnedDisposition, setPinnedDisposition] = useState(null);
  const activeDisposition = hoveredDisposition || pinnedDisposition || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [scorecardFilter, setScorecardFilter] = useState('ALL'); // 'ALL' | 'QUALIFIED' | 'REVIEW'
  const [activeTooltip, setActiveTooltip] = useState(null); // { x, y, data }
  const [radarView, setRadarView] = useState('radar'); // 'radar' | 'bars'
  const [hoveredRadarSection, setHoveredRadarSection] = useState(null); // 'Quant' | 'Reasoning' | 'English' | 'GA' | null

  // Hover point coordinates for floating tooltips locked to cursor position
  const donutContainerRef = useRef(null);
  const [donutTooltipPos, setDonutTooltipPos] = useState({ x: 100, y: 70 });
  const radarContainerRef = useRef(null);
  const [radarTooltipPos, setRadarTooltipPos] = useState({ x: 130, y: 110 });

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

  // Extract base dashboard stats or sensible academic defaults
  const totalMocks = dashboard?.total_mocks_attempted ?? 14;
  const avgScore = dashboard?.average_score ?? 138.5;
  const avgAccuracy = dashboard?.average_accuracy ?? 82.4;
  const bestScore = dashboard?.best_score ?? 168.0;
  const percentile = dashboard?.overall_percentile ?? 91.8;
  const globalRank = dashboard?.global_rank ?? 1420;

  // Attempt Disposition metrics
  const disposition = useMemo(() => {
    return {
      correct: 142,
      correctMarks: 284,
      negative: 24,
      negativePenalty: 12,
      skipped: 18,
      total: 184,
      accuracy: 79.3,
    };
  }, []);

  // Sectional Mastery dataset
  const sectionalMastery = useMemo(() => [
    {
      id: 'Quant',
      name: 'Quantitative Aptitude',
      accuracy: 88.0,
      topperAccuracy: 94.0,
      speedSec: 68,
      topperSpeedSec: 54,
      questions: '142 / 173',
      status: 'Strong Area',
      color: '#f59e0b',
      topics: [
        { name: 'Arithmetic (Percentages & Ratio)', score: 92 },
        { name: 'Algebra & Equations', score: 85 },
        { name: 'Geometry & Mensuration', score: 74 },
      ],
    },
    {
      id: 'Reasoning',
      name: 'General Intelligence & Reasoning',
      accuracy: 92.5,
      topperAccuracy: 96.0,
      speedSec: 46,
      topperSpeedSec: 40,
      questions: '168 / 185',
      status: 'Mastered',
      color: '#10b981',
      topics: [
        { name: 'Syllogism & Coding-Decoding', score: 96 },
        { name: 'Analogy & Classification', score: 94 },
        { name: 'Blood Relations & Puzzles', score: 88 },
      ],
    },
    {
      id: 'English',
      name: 'English Comprehension',
      accuracy: 78.0,
      topperAccuracy: 88.0,
      speedSec: 42,
      topperSpeedSec: 36,
      questions: '118 / 160',
      status: 'Solid Pace',
      color: '#6366f1',
      topics: [
        { name: 'Reading Comprehension', score: 84 },
        { name: 'Grammar & Error Spotting', score: 76 },
        { name: 'Vocabulary & Idioms', score: 72 },
      ],
    },
    {
      id: 'GA',
      name: 'General Awareness & Current Affairs',
      accuracy: 71.0,
      topperAccuracy: 82.0,
      speedSec: 32,
      topperSpeedSec: 28,
      questions: '96 / 150',
      status: 'Focus Needed',
      color: '#ec4899',
      topics: [
        { name: 'Modern History & Polity', score: 78 },
        { name: 'Current Affairs & Schemes', score: 72 },
        { name: 'General Science & Geography', score: 62 },
      ],
    },
  ], []);

  // Multi-day timeline performance trend dataset
  const trendHistory = useMemo(() => {
    const rawAttempts = dashboard?.recent_attempts || [];
    if (rawAttempts.length >= 5) {
      return rawAttempts.map((att, idx) => ({
        index: idx + 1,
        title: att.test_title || `Mock #${idx + 1}`,
        date: new Date(att.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: att.total_score || (120 + idx * 4.5),
        maxScore: att.max_possible_score || 200,
        accuracy: att.accuracy_percentage || (74 + idx * 2.2),
        speed: Math.round((att.total_time_taken_seconds || 1800) / Math.max(1, att.total_questions || 25)),
      }));
    }

    // Comprehensive synthetic series representing aspirant trajectory
    return [
      { index: 1, title: 'Diagnostic Tier-1 Mock #01', date: 'Sep 12', score: 118.5, maxScore: 200, accuracy: 71.2, speed: 78 },
      { index: 2, title: 'Speed & Accuracy Drill #04', date: 'Sep 16', score: 126.0, maxScore: 200, accuracy: 74.8, speed: 74 },
      { index: 3, title: 'SSC CGL Sectional Quant #02', date: 'Sep 21', score: 132.5, maxScore: 200, accuracy: 78.5, speed: 69 },
      { index: 4, title: 'Full Length National Mock #02', date: 'Sep 26', score: 141.0, maxScore: 200, accuracy: 82.0, speed: 65 },
      { index: 5, title: 'All India Live Mock #03', date: 'Oct 01', score: 148.5, maxScore: 200, accuracy: 84.5, speed: 62 },
      { index: 6, title: 'History & Reasoning Marathon', date: 'Oct 05', score: 154.0, maxScore: 200, accuracy: 87.2, speed: 59 },
      { index: 7, title: 'Latest CGL Pro Benchmark #07', date: 'Oct 10', score: 162.5, maxScore: 200, accuracy: 89.0, speed: 56 },
    ];
  }, [dashboard]);

  // SVG Chart Dimensions & Scale Calculations (Optimized for Headroom & Zero Scroll)
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 92, right: 65, bottom: 35, left: 55 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const currentValues = trendHistory.map((d) =>
    trendMetric === 'score' ? d.score : trendMetric === 'accuracy' ? d.accuracy : d.speed
  );
  const minVal = trendMetric === 'speed' ? Math.min(...currentValues, 40) - 5 : Math.min(...currentValues, 50) - 10;
  const maxVal = trendMetric === 'score' ? Math.max(...currentValues, 180) + 10 : trendMetric === 'accuracy' ? 100 : Math.max(...currentValues, 90) + 10;

  const getX = (idx) => padding.left + (idx / Math.max(1, trendHistory.length - 1)) * graphWidth;
  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + graphHeight - ((clamped - minVal) / Math.max(1, maxVal - minVal)) * graphHeight;
  };

  // Build SVG path
  const linePoints = trendHistory.map((d, i) => `${getX(i)},${getY(trendMetric === 'score' ? d.score : trendMetric === 'accuracy' ? d.accuracy : d.speed)}`);
  const linePathD = linePoints.length > 0 ? `M ${linePoints.join(' L ')}` : '';
  const areaPathD = linePoints.length > 0
    ? `M ${getX(0)},${padding.top + graphHeight} L ${linePoints.join(' L ')} L ${getX(trendHistory.length - 1)},${padding.top + graphHeight} Z`
    : '';

  // Benchmark target cutoff line for currently chosen metric
  const benchmarkY = getY(trendMetric === 'score' ? 140 : trendMetric === 'accuracy' ? 80 : 60);

  // Filtered scorecards list
  const attemptsList = dashboard?.recent_attempts || [
    {
      attempt_id: 'att-1',
      test_title: 'SSC CGL All-India Full Length Mock #07',
      start_time: '2026-10-10T10:30:00Z',
      total_score: 162.5,
      max_possible_score: 200.0,
      accuracy_percentage: 89.0,
      status: 'QUALIFIED',
      rank: 24,
    },
    {
      attempt_id: 'att-2',
      test_title: 'History & Reasoning Marathon Drill #02',
      start_time: '2026-10-05T15:20:00Z',
      total_score: 154.0,
      max_possible_score: 200.0,
      accuracy_percentage: 87.2,
      status: 'QUALIFIED',
      rank: 48,
    },
    {
      attempt_id: 'att-3',
      test_title: 'Quantitative Aptitude Advance Sectional #04',
      start_time: '2026-10-01T12:00:00Z',
      total_score: 42.5,
      max_possible_score: 50.0,
      accuracy_percentage: 85.0,
      status: 'QUALIFIED',
      rank: 18,
    },
    {
      attempt_id: 'att-4',
      test_title: 'English Comprehension & Vocab Drill #01',
      start_time: '2026-09-28T09:40:00Z',
      total_score: 34.0,
      max_possible_score: 50.0,
      accuracy_percentage: 68.0,
      status: 'REVIEW',
      rank: 112,
    },
  ];

  const filteredScorecards = attemptsList.filter((att) => {
    const matchesSearch = att.test_title.toLowerCase().includes(searchQuery.toLowerCase());
    const isQual = (att.accuracy_percentage || 0) >= 70;
    if (scorecardFilter === 'QUALIFIED') return matchesSearch && isQual;
    if (scorecardFilter === 'REVIEW') return matchesSearch && !isQual;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER CONTROLS & ASPIRANT ANALYTICS SUMMARY BANNER
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
              Real-time psychometric evaluation, percentile benchmarking, and sectional accuracy telemetry.
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

        {/* 4 Interactive KPI Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Accuracy */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span>Overall Accuracy</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-black">+4.2% ↑</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white">
                {avgAccuracy.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Target benchmark: <strong>&gt; 80%</strong> for Tier-1 cutoff
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, avgAccuracy)}%` }}
              />
            </div>
          </div>

          {/* Card 2: National Percentile */}
          <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-800/40 border border-charcoal-200/80 dark:border-charcoal-750 space-y-1 relative overflow-hidden group hover:border-institutional-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-500">
              <span>National Percentile</span>
              <TrophyIcon size={14} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-institutional-600 dark:text-institutional-400">
                {percentile.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Top <strong>{(100 - percentile).toFixed(1)}%</strong> of active test takers
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-institutional-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, percentile)}%` }}
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
                {avgScore.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-charcoal-400">/ 200</span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Personal Best: <strong>{bestScore.toFixed(1)}</strong> marks
            </p>
            <div className="w-full h-1.5 rounded-full bg-charcoal-200 dark:bg-charcoal-700 overflow-hidden mt-2">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (avgScore / 200) * 100)}%` }}
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
                58s
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
          <div className="flex items-center gap-1.5 bg-charcoal-100 dark:bg-charcoal-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setTrendMetric('score')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                trendMetric === 'score'
                  ? 'bg-white dark:bg-charcoal-700 text-institutional-600 dark:text-institutional-300 shadow-xs'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
            >
              📈 Marks Secured
            </button>
            <button
              onClick={() => setTrendMetric('accuracy')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                trendMetric === 'accuracy'
                  ? 'bg-white dark:bg-charcoal-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900'
              }`}
            >
              🎯 Accuracy (%)
            </button>
            <button
              onClick={() => setTrendMetric('speed')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
        <div className="relative pt-2 pb-1 w-full" onMouseLeave={() => setActiveTooltip(null)}>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2">
                <SparklesIcon size={18} className="text-amber-500" />
                <span>Sectional Mastery vs. Topper Benchmark</span>
              </h3>
              <p className="text-xs text-charcoal-500">
                Compare your current sectional accuracy with AIR-100 topper percentiles.
              </p>
            </div>

            {/* Toggle View */}
            <div className="flex items-center bg-charcoal-100 dark:bg-charcoal-800 p-0.5 rounded-lg text-xs font-bold">
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
            /* Interactive SVG Radar Chart */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              <div
                ref={radarContainerRef}
                onMouseMove={handleRadarMouseMove}
                className="relative shrink-0 flex items-center justify-center"
              >
                {/* Minimal Clean Tooltip: Positioned exactly at the hovered point */}
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
                        <span className="font-mono opacity-80">({sec.accuracy}%)</span>
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

                <svg width="290" height="210" viewBox="0 0 310 220" className="select-none">
                  {/* Concentric Polygons (25%, 50%, 75%, 100%) */}
                  {[0.25, 0.5, 0.75, 1.0].map((level) => {
                    const r = 58 * level;
                    const points = [
                      `130,${110 - r}`, // Top (Quant)
                      `${130 + r},110`, // Right (Reasoning)
                      `130,${110 + r}`, // Bottom (English)
                      `${130 - r},110`, // Left (GA)
                    ].join(' ');
                    return (
                      <polygon
                        key={level}
                        points={points}
                        fill="transparent"
                        stroke="currentColor"
                        className="text-charcoal-200 dark:text-charcoal-800"
                        strokeWidth="1"
                        strokeDasharray={level === 1 ? 'none' : '3 3'}
                      />
                    );
                  })}

                  {/* Axes Lines */}
                  <line
                    x1="130"
                    y1="46"
                    x2="130"
                    y2="174"
                    stroke={hoveredRadarSection === 'Quant' || hoveredRadarSection === 'English' ? '#0284c7' : 'currentColor'}
                    className={hoveredRadarSection === 'Quant' || hoveredRadarSection === 'English' ? '' : 'text-charcoal-200 dark:text-charcoal-800'}
                    strokeWidth={hoveredRadarSection === 'Quant' || hoveredRadarSection === 'English' ? '2' : '1'}
                  />
                  <line
                    x1="66"
                    y1="110"
                    x2="194"
                    y2="110"
                    stroke={hoveredRadarSection === 'Reasoning' || hoveredRadarSection === 'GA' ? '#0284c7' : 'currentColor'}
                    className={hoveredRadarSection === 'Reasoning' || hoveredRadarSection === 'GA' ? '' : 'text-charcoal-200 dark:text-charcoal-800'}
                    strokeWidth={hoveredRadarSection === 'Reasoning' || hoveredRadarSection === 'GA' ? '2' : '1'}
                  />

                  {/* Topper Benchmark Polygon (Amber Dotted) */}
                  <polygon
                    points="130,55.5 185.7,110 130,161 82.4,110"
                    fill="#f59e0b"
                    fillOpacity="0.1"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Aspirant Polygon (Institutional Blue Solid with Gradient) */}
                  <polygon
                    points="130,58.9 183.7,110 130,155.2 88.8,110"
                    fill="#0284c7"
                    fillOpacity="0.25"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                  />

                  {/* Topper Benchmark Highlight Vertices */}
                  <circle cx="130" cy="55.5" r={hoveredRadarSection === 'Quant' ? '5.5' : '3'} fill="#f59e0b" stroke="white" strokeWidth="1.5" className="transition-all" />
                  <circle cx="185.7" cy="110" r={hoveredRadarSection === 'Reasoning' ? '5.5' : '3'} fill="#f59e0b" stroke="white" strokeWidth="1.5" className="transition-all" />
                  <circle cx="130" cy="161" r={hoveredRadarSection === 'English' ? '5.5' : '3'} fill="#f59e0b" stroke="white" strokeWidth="1.5" className="transition-all" />
                  <circle cx="82.4" cy="110" r={hoveredRadarSection === 'GA' ? '5.5' : '3'} fill="#f59e0b" stroke="white" strokeWidth="1.5" className="transition-all" />

                  {/* Animated Ping Ring on Active Hovered Node */}
                  {hoveredRadarSection === 'Quant' && (
                    <circle cx="130" cy="58.9" r="14" fill="#0284c7" opacity="0.4" className="animate-ping pointer-events-none" />
                  )}
                  {hoveredRadarSection === 'Reasoning' && (
                    <circle cx="183.7" cy="110" r="14" fill="#0284c7" opacity="0.4" className="animate-ping pointer-events-none" />
                  )}
                  {hoveredRadarSection === 'English' && (
                    <circle cx="130" cy="155.2" r="14" fill="#0284c7" opacity="0.4" className="animate-ping pointer-events-none" />
                  )}
                  {hoveredRadarSection === 'GA' && (
                    <circle cx="88.8" cy="110" r="14" fill="#0284c7" opacity="0.4" className="animate-ping pointer-events-none" />
                  )}

                  {/* Interactive Aspirant Vertices with High-Contrast Ring */}
                  <circle
                    cx="130"
                    cy="58.9"
                    r={hoveredRadarSection === 'Quant' ? '7' : '4.5'}
                    fill={hoveredRadarSection === 'Quant' ? '#f59e0b' : '#0284c7'}
                    stroke="white"
                    strokeWidth="2.5"
                    className="transition-all cursor-pointer"
                  />
                  <circle
                    cx="183.7"
                    cy="110"
                    r={hoveredRadarSection === 'Reasoning' ? '7' : '4.5'}
                    fill={hoveredRadarSection === 'Reasoning' ? '#10b981' : '#0284c7'}
                    stroke="white"
                    strokeWidth="2.5"
                    className="transition-all cursor-pointer"
                  />
                  <circle
                    cx="130"
                    cy="155.2"
                    r={hoveredRadarSection === 'English' ? '7' : '4.5'}
                    fill={hoveredRadarSection === 'English' ? '#6366f1' : '#0284c7'}
                    stroke="white"
                    strokeWidth="2.5"
                    className="transition-all cursor-pointer"
                  />
                  <circle
                    cx="88.8"
                    cy="110"
                    r={hoveredRadarSection === 'GA' ? '7' : '4.5'}
                    fill={hoveredRadarSection === 'GA' ? '#ec4899' : '#0284c7'}
                    stroke="white"
                    strokeWidth="2.5"
                    className="transition-all cursor-pointer"
                  />

                  {/* Generous Invisible Hit Targets for Effortless Hover */}
                  <circle
                    cx="130"
                    cy="58.9"
                    r="20"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('Quant');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                  />
                  <circle
                    cx="183.7"
                    cy="110"
                    r="20"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('Reasoning');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                  />
                  <circle
                    cx="130"
                    cy="155.2"
                    r="20"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('English');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                  />
                  <circle
                    cx="88.8"
                    cy="110"
                    r="20"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('GA');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                  />

                  {/* Interactive Section Labels positioned cleanly inside viewBox */}
                  <text
                    x="130"
                    y="24"
                    textAnchor="middle"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('Quant');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                    className={`text-[10px] cursor-pointer transition-colors ${
                      hoveredRadarSection === 'Quant' ? 'fill-amber-600 dark:fill-amber-400 font-black' : 'fill-charcoal-800 dark:fill-charcoal-200 font-bold'
                    }`}
                  >
                    Quant (88%)
                  </text>
                  <text
                    x="195"
                    y="114"
                    textAnchor="start"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('Reasoning');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                    className={`text-[10px] cursor-pointer transition-colors ${
                      hoveredRadarSection === 'Reasoning' ? 'fill-emerald-600 dark:fill-emerald-400 font-black' : 'fill-charcoal-800 dark:fill-charcoal-200 font-bold'
                    }`}
                  >
                    Reasoning (92.5%)
                  </text>
                  <text
                    x="130"
                    y="196"
                    textAnchor="middle"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('English');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                    className={`text-[10px] cursor-pointer transition-colors ${
                      hoveredRadarSection === 'English' ? 'fill-indigo-600 dark:fill-indigo-400 font-black' : 'fill-charcoal-800 dark:fill-charcoal-200 font-bold'
                    }`}
                  >
                    English (78%)
                  </text>
                  <text
                    x="74"
                    y="114"
                    textAnchor="end"
                    onMouseEnter={(e) => {
                      handleRadarMouseMove(e);
                      setHoveredRadarSection('GA');
                    }}
                    onMouseMove={handleRadarMouseMove}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                    className={`text-[10px] cursor-pointer transition-colors ${
                      hoveredRadarSection === 'GA' ? 'fill-rose-600 dark:fill-rose-400 font-black' : 'fill-charcoal-800 dark:fill-charcoal-200 font-bold'
                    }`}
                  >
                    GA (71%)
                  </text>
                </svg>
              </div>

              {/* Radar Legend & Delta stats */}
              <div className="space-y-3 text-xs w-full sm:w-auto shrink-0 pl-1">
                <div
                  onMouseEnter={() => {
                    setHoveredRadarSection('Reasoning');
                    setRadarTooltipPos({ x: 184, y: 110 });
                  }}
                  onMouseLeave={() => setHoveredRadarSection(null)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-charcoal-50 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-institutional-600 shrink-0" />
                  <div>
                    <span className="font-bold text-charcoal-800 dark:text-charcoal-200">Your Accuracy</span>
                    <div className="text-[10px] text-charcoal-500 font-mono">82.4% aggregate</div>
                  </div>
                </div>

                <div
                  onMouseEnter={() => {
                    setHoveredRadarSection('Quant');
                    setRadarTooltipPos({ x: 130, y: 58 });
                  }}
                  onMouseLeave={() => setHoveredRadarSection(null)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-charcoal-50 dark:hover:bg-charcoal-800/50 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-charcoal-800 dark:text-charcoal-200">AIR-100 Topper Avg</span>
                    <div className="text-[10px] text-charcoal-500 font-mono">92.5% aggregate</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800 space-y-1">
                  <div className="text-[11px] font-semibold text-charcoal-700 dark:text-charcoal-300">
                    Highest Sectional Delta:
                  </div>
                  <div
                    onMouseEnter={() => {
                      setHoveredRadarSection('GA');
                      setRadarTooltipPos({ x: 88, y: 110 });
                    }}
                    onMouseLeave={() => setHoveredRadarSection(null)}
                    className="text-[10px] text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    ⚠️ GA & Current Affairs: -11% gap vs Toppers
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Bar Mastery Grid View */
            <div className="space-y-4 pt-1">
              {sectionalMastery.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => setSelectedSection(selectedSection === subj.id ? 'ALL' : subj.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedSection === subj.id
                      ? 'bg-institutional-50/60 dark:bg-institutional-950/40 border-institutional-400'
                      : 'hover:bg-charcoal-50 dark:hover:bg-charcoal-800/40 border-charcoal-200/60 dark:border-charcoal-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-charcoal-900 dark:text-white">{subj.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-charcoal-400 text-[11px]">{subj.questions}</span>
                      <span className="font-black text-institutional-600 dark:text-institutional-400">
                        {subj.accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-charcoal-100 dark:bg-charcoal-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${subj.accuracy}%`, backgroundColor: subj.color }}
                    />
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
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
              Recent Mock Test Scorecards
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
