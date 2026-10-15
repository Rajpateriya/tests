import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ClockIcon,
  AwardIcon,
  BarChartIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '../components/Icons';

const fmtDate = (value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// Measures an element's width so a chart draws at its real pixel size (text stays legible on phones).
const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

// Round axis ticks (0 / 20 / 40 ...) covering [lo, hi].
const niceScale = (lo, hi, count = 4) => {
  const top = hi === lo ? lo + 1 : hi;
  const raw = (top - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(top / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
};

/**
 * One-series trend line: 2px line + 10% area wash, >=8px markers with a surface ring, hairline grid,
 * a crosshair that snaps to the nearest attempt (pointer or arrow keys) with one tooltip, and only
 * two direct labels (latest, best). points: [{ value, date, title, qualified, secondary }]
 */
const TrendChart = ({ points, colorClass, name, unit, zeroBase, maxCap, refValue, refLabel, ariaLabel }) => {
  const [wrapRef, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  const H = 230;
  const m = { l: 40, r: 56, t: 16, b: 30 };
  const W = Math.max(width, 280);
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;
  const n = points.length;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, refValue ?? Infinity);
  const hi = Math.max(...values, refValue ?? -Infinity);
  let dlo = zeroBase ? 0 : Math.max(0, lo - Math.max((hi - lo) * 0.25, 2));
  let dhi = hi + Math.max((hi - lo) * 0.15, 2);
  if (maxCap !== undefined) dhi = Math.min(dhi, maxCap);
  const scale = niceScale(dlo, dhi);
  if (maxCap !== undefined && scale.max > maxCap) {
    scale.max = maxCap;
    scale.ticks = scale.ticks.filter((t) => t <= maxCap);
    if (!scale.ticks.includes(maxCap)) scale.ticks.push(maxCap);
  }

  const x = (i) => m.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => m.t + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;
  const baseY = m.t + innerH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${baseY} L${x(0).toFixed(1)},${baseY} Z`;

  const lastIdx = n - 1;
  const bestIdx = values.indexOf(Math.max(...values));
  const tickCount = Math.min(n, 5);
  const xTicks = [...new Set(Array.from({ length: tickCount }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, tickCount - 1))))];

  const nearest = (clientX, svg) => {
    const px = clientX - svg.getBoundingClientRect().left;
    return Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / innerW) * (n - 1))));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? lastIdx) - 1));
    else if (e.key === 'ArrowRight') setHover((h) => Math.min(lastIdx, (h ?? lastIdx) + 1));
    else if (e.key === 'Escape') setHover(null);
  };

  const active = hover !== null ? points[hover] : null;
  const tipRight = hover !== null && x(hover) > W / 2;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setHover((h) => h ?? lastIdx)}
        onBlur={() => setHover(null)}
        className={`block max-w-full outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded-lg ${colorClass}`}
      >
        {/* Grid + y-axis: solid hairlines, text in muted ink */}
        {scale.ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--border-light)" strokeWidth="1" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {t}
            </text>
          </g>
        ))}

        {/* Reference line (the average) */}
        {refValue !== undefined && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={y(refValue)} y2={y(refValue)} stroke="var(--border-strong)" strokeWidth="1" />
            <text x={m.l + 4} y={y(refValue) - 5} fontSize="11" fill="var(--text-secondary)">
              {refLabel} {Math.round(refValue * 10) / 10}
            </text>
          </g>
        )}

        {/* Area wash + line */}
        {n > 1 && <path d={area} fill="currentColor" fillOpacity="0.1" />}
        {n > 1 && <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

        {/* X axis labels */}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 && n > 1 ? 'start' : i === lastIdx && n > 1 ? 'end' : 'middle'} fontSize="11" fill="var(--text-muted)">
            {points[i].date}
          </text>
        ))}

        {/* Crosshair */}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={baseY} stroke="var(--border-strong)" strokeWidth="1" />}

        {/* Markers: >= 8px, 2px surface ring */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 5.5 : 4}
            fill="currentColor"
            stroke="var(--bg-card)"
            strokeWidth="2"
          />
        ))}

        {/* Direct labels: the latest value, and the best one when it is not the latest */}
        <text x={x(lastIdx) + 9} y={y(points[lastIdx].value) + 4} fontSize="12" fontWeight="700" fill="var(--text-primary)">
          {points[lastIdx].value}
        </text>
        {bestIdx !== lastIdx && n > 2 && (
          <text x={x(bestIdx)} y={y(points[bestIdx].value) - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-secondary)">
            best {points[bestIdx].value}
          </text>
        )}

        {/* Hit layer: the nearest attempt wins, so the pointer never has to land on a dot */}
        <rect
          x={m.l - 8}
          y={m.t}
          width={innerW + 16}
          height={innerH}
          fill="transparent"
          onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget.ownerSVGElement))}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {active && (
        <div
          className="absolute z-10 pointer-events-none min-w-[160px] max-w-[220px] rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 shadow-lifted px-3 py-2 space-y-1"
          style={{ top: 4, left: tipRight ? x(hover) - 12 : x(hover) + 12, transform: tipRight ? 'translateX(-100%)' : 'none' }}
        >
          <div className="text-[10px] font-semibold text-charcoal-500 dark:text-charcoal-400">{active.date}</div>
          <div className="text-xs font-bold text-charcoal-900 dark:text-white truncate">{active.title}</div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-0.5 rounded-full ${colorClass} bg-current`} />
            <span className="text-base font-black font-mono text-charcoal-900 dark:text-white">
              {active.value}
              {unit}
            </span>
            <span className="text-[11px] text-charcoal-500 dark:text-charcoal-400">{name}</span>
          </div>
          {active.secondary && <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400">{active.secondary}</div>}
          <div
            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              active.qualified ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {active.qualified ? <CheckCircleIcon size={11} /> : <XCircleIcon size={11} />}
            {active.qualified ? 'Qualified' : 'Not qualified'}
          </div>
        </div>
      )}
    </div>
  );
};

export const TypingMasterPage = () => {
  const [passages, setPassages] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(null);
  const [activeTab, setActiveTab] = useState('test'); // 'test' | 'history'

  // Typing engine session states
  const [typedText, setTypedText] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // in seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [scorecard, setScorecard] = useState(null);

  const inputRef = useRef(null);
  const passageContainerRef = useRef(null);

  useEffect(() => {
    loadPassagesAndHistory();
  }, []);

  const loadPassagesAndHistory = async () => {
    setLoading(true);
    try {
      const pList = await api.typing.listPassages();
      setPassages(pList || []);
      if (pList && pList.length > 0) {
        initPassage(pList[0]);
      }
      const hist = await api.typing.getMyHistory();
      setHistoryData(hist);
    } catch (err) {
      console.error('Failed to load typing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const initPassage = (passage) => {
    setSelectedPassage(passage);
    setTypedText('');
    setSessionActive(false);
    setSessionCompleted(false);
    setTimeLeft(passage.duration_seconds || 900);
    setElapsedSeconds(0);
    setBackspaceCount(0);
    setScorecard(null);
  };

  // Timer tick
  useEffect(() => {
    let timer = null;
    if (sessionActive && !sessionCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessionActive, sessionCompleted, timeLeft]);

  const handleInputChange = (e) => {
    if (sessionCompleted) return;
    if (!sessionActive) {
      setSessionActive(true);
    }
    const val = e.target.value;
    setTypedText(val);

    // Auto complete if passage typed completely
    if (selectedPassage && val.length >= selectedPassage.content.length) {
      handleSubmitAttempt(val, elapsedSeconds || 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      setBackspaceCount((prev) => prev + 1);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitAttempt(typedText, elapsedSeconds || 1);
  };

  const handleSubmitAttempt = async (textToSubmit, timeTaken) => {
    if (!selectedPassage || sessionCompleted || submitting) return;
    setSubmitting(true);
    setSessionCompleted(true);
    setSessionActive(false);

    try {
      const payload = {
        passage_id: selectedPassage.id,
        typed_text: textToSubmit,
        time_taken_seconds: Math.max(1, timeTaken || elapsedSeconds || 1),
        backspace_count: backspaceCount,
        total_keystrokes: textToSubmit.length,
      };

      const result = await api.typing.submitAttempt(payload);
      setScorecard(result);

      // Refresh history stats
      const updatedHistory = await api.typing.getMyHistory();
      setHistoryData(updatedHistory);
    } catch (err) {
      console.error('Failed to submit typing attempt:', err);
      // Fallback calculation for demonstration
      const content = selectedPassage.content;
      const minLen = Math.min(content.length, textToSubmit.length);
      let correct = 0;
      for (let i = 0; i < minLen; i++) {
        if (content[i] === textToSubmit[i]) correct++;
      }
      const wrong = textToSubmit.length - correct;
      const acc = textToSubmit.length > 0 ? (correct / textToSubmit.length) * 100 : 0;
      const mins = Math.max(0.1, (timeTaken || 30) / 60);
      const gross = Math.round((textToSubmit.length / 5) / mins);
      const net = Math.max(0, Math.round(gross - (wrong / 5) / mins));

      setScorecard({
        passage_id: selectedPassage.id,
        passage_title: selectedPassage.title,
        exam_category: selectedPassage.exam_category,
        time_taken_seconds: timeTaken || 30,
        gross_wpm: gross,
        net_wpm: net,
        accuracy_percentage: Math.round(acc * 10) / 10,
        total_keystrokes: textToSubmit.length,
        correct_keystrokes: correct,
        wrong_keystrokes: wrong,
        backspace_count: backspaceCount,
        error_count: wrong,
        is_qualified: net >= (selectedPassage.target_wpm || 27) && acc >= 93,
        qualification_reason: net >= (selectedPassage.target_wpm || 27)
          ? `QUALIFIED: Net Speed ${net} WPM exceeded required benchmark`
          : `NOT QUALIFIED: Net Speed ${net} WPM below benchmark`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time calculation helpers
  const targetContent = selectedPassage?.content || '';
  const currentTypedLength = typedText.length;
  const currentMinutes = Math.max(0.1, elapsedSeconds / 60);
  const liveGrossWpm = elapsedSeconds > 0 ? Math.round((currentTypedLength / 5) / currentMinutes) : 0;
  const progressPct = targetContent.length ? Math.min(100, Math.round((currentTypedLength / targetContent.length) * 100)) : 0;

  // Render character tokens
  const renderPassageWithHighlights = () => {
    const chars = targetContent.split('');
    return chars.map((char, index) => {
      let statusClass = 'text-charcoal-400 dark:text-charcoal-500'; // untyped

      if (index < currentTypedLength) {
        if (typedText[index] === char) {
          statusClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 font-semibold';
        } else {
          statusClass = 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 font-bold underline';
        }
      } else if (index === currentTypedLength) {
        statusClass = 'bg-institutional-600 text-white rounded font-bold animate-pulse';
      }

      return (
        <span key={index} className={`transition-colors font-mono text-sm sm:text-base leading-relaxed ${statusClass}`}>
          {char}
        </span>
      );
    });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timeIsLow = timeLeft <= 60;

  // Performance History: everything below is calculated from the attempts the API returned.
  const attempts = historyData?.attempts || [];
  const ordered = [...attempts].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // oldest -> newest
  const toPoint = (a, value, secondary) => ({
    value,
    date: fmtDate(a.created_at),
    title: a.passage_title,
    qualified: !!a.is_qualified,
    secondary,
  });
  const speedPoints = ordered.map((a) => toPoint(a, Number(a.net_wpm), `${a.accuracy_percentage}% accuracy`));
  const accuracyPoints = ordered.map((a) => toPoint(a, Number(a.accuracy_percentage), `${a.net_wpm} WPM net`));
  const mean = (nums) => nums.reduce((sum, v) => sum + v, 0) / nums.length;
  const avgSpeed = ordered.length ? mean(speedPoints.map((p) => p.value)) : 0;
  const avgAccuracy = ordered.length ? mean(accuracyPoints.map((p) => p.value)) : 0;
  const speedDelta = ordered.length >= 2 ? Math.round((speedPoints[speedPoints.length - 1].value - speedPoints[0].value) * 10) / 10 : null;
  const qualifiedCount = ordered.filter((a) => a.is_qualified).length;
  const qualifiedRate = ordered.length ? Math.round((qualifiedCount / ordered.length) * 100) : 0;
  let qualifiedStreak = 0;
  for (let i = ordered.length - 1; i >= 0 && ordered[i].is_qualified; i--) qualifiedStreak++;
  const bestByPassage = Object.values(
    ordered.reduce((acc, a) => {
      const cur = acc[a.passage_title];
      if (!cur || Number(a.net_wpm) > Number(cur.net_wpm)) acc[a.passage_title] = a;
      return acc;
    }, {})
  )
    .sort((a, b) => Number(b.net_wpm) - Number(a.net_wpm))
    .slice(0, 6);
  const topPassageWpm = bestByPassage.length ? Math.max(1, Number(bestByPassage[0].net_wpm)) : 1;

  return (
    // The -mt/-mb + pt/pb pairs cancel the app shell's navbar/footer padding so the backdrop reaches the very top and bottom.
    <div className="relative overflow-hidden -mt-20 pt-20 sm:-mt-24 sm:pt-24 -mb-12 pb-12 font-sans text-charcoal-900 dark:text-charcoal-100 bg-grid-pattern bg-mesh-hero">
      {/* Ambient glows — same backdrop as the landing page */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-institutional-500/10 dark:bg-institutional-400/15 blur-[120px] rounded-full pointer-events-none animate-blob" />
      <div className="absolute top-[520px] -left-36 w-[520px] h-[520px] bg-emerald-500/8 dark:bg-emerald-400/10 blur-[130px] rounded-full pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[900px] -right-36 w-[560px] h-[560px] bg-purple-500/8 dark:bg-purple-400/10 blur-[140px] rounded-full pointer-events-none animate-glow-pulse" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-charcoal-950 dark:text-white leading-[1.15]">
              Typing <span className="text-institutional-600 dark:text-institutional-400">Master</span>
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-charcoal-300 max-w-2xl leading-relaxed">
              Government-exam typing simulation (SSC CGL DEST, CHSL, RRB NTPC) with live Gross and Net WPM, keystroke accuracy and correction analysis.
            </p>
          </div>

          <div className="flex items-center p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'test'
                  ? 'bg-white dark:bg-charcoal-900 text-institutional-700 dark:text-institutional-300 shadow-sm font-extrabold'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              Mock Test Arena
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-charcoal-900 text-institutional-700 dark:text-institutional-300 shadow-sm font-extrabold'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              <BarChartIcon size={14} />
              <span>Performance History</span>
            </button>
          </div>
        </section>

        {activeTab === 'test' && (
          <div className="space-y-5">
            {/* Passage picker */}
            <div className="flex items-stretch gap-3 overflow-x-auto pb-1 scrollbar-none">
              {passages.map((p) => {
                const isSelected = selectedPassage?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => initPassage(p)}
                    className={`px-4 py-3 rounded-xl border text-left shrink-0 transition-all ${
                      isSelected
                        ? 'border-institutional-500 bg-institutional-50 dark:bg-institutional-950/40 shadow-card'
                        : 'border-charcoal-200 dark:border-charcoal-800 bg-white/90 dark:bg-charcoal-900/90 hover:border-institutional-300 dark:hover:border-institutional-700 hover:-translate-y-0.5 shadow-subtle'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-institutional-600 dark:text-institutional-400">
                      {p.exam_category}
                    </div>
                    <div className="text-xs font-extrabold text-charcoal-900 dark:text-white truncate max-w-[220px] mt-0.5">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                      Target {p.target_wpm} WPM · {Math.round(p.duration_seconds / 60)} min
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-subtle">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    timeIsLow
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                      : 'bg-institutional-50 text-institutional-600 dark:bg-institutional-950/50 dark:text-institutional-300'
                  }`}
                >
                  <ClockIcon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold truncate">Time left</div>
                  <div className={`text-lg font-black font-mono leading-tight ${timeIsLow ? 'text-rose-600 dark:text-rose-400' : 'text-charcoal-900 dark:text-white'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-subtle">
                <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 text-base">
                  ⚡
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold truncate">Gross speed</div>
                  <div className="text-lg font-black font-mono leading-tight text-charcoal-900 dark:text-white">
                    {liveGrossWpm} <span className="text-[10px] font-semibold text-charcoal-400">WPM</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-subtle">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <AwardIcon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold truncate">Cutoff</div>
                  <div className="text-lg font-black font-mono leading-tight text-charcoal-900 dark:text-white">
                    {selectedPassage?.target_wpm || 27} <span className="text-[10px] font-semibold text-charcoal-400">WPM</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-subtle">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 text-base">
                  ⌨️
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold truncate">Keystrokes</div>
                  <div className="text-lg font-black font-mono leading-tight text-charcoal-900 dark:text-white">
                    {currentTypedLength} <span className="text-[10px] font-semibold text-charcoal-400">/ {selectedPassage?.target_keystrokes || 2000}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-subtle col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 text-base">
                  ⌫
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-semibold truncate">Backspaces</div>
                  <div className="text-lg font-black font-mono leading-tight text-charcoal-900 dark:text-white">{backspaceCount}</div>
                </div>
              </div>
            </div>

            {/* Test arena: target text + input */}
            <section className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-card overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-institutional-800 via-institutional-600 to-sky-500" />
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white truncate">
                      {selectedPassage?.title}
                    </h3>
                    <div className="text-xs text-charcoal-500 dark:text-charcoal-400">
                      Type the passage exactly as shown. Green is a correct stroke, red is a typo.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => initPassage(selectedPassage)}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:border-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-300 transition-colors"
                  >
                    Restart
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-institutional-600 to-sky-500 transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-semibold text-charcoal-400 text-right font-mono">{progressPct}% typed</div>
                </div>

                {/* Target passage */}
                <div
                  ref={passageContainerRef}
                  className="p-4 sm:p-5 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 max-h-56 overflow-y-auto select-none space-x-0.5 tracking-wide"
                >
                  {renderPassageWithHighlights()}
                </div>

                {/* Input */}
                <div className="space-y-3">
                  <textarea
                    ref={inputRef}
                    value={typedText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={sessionCompleted}
                    placeholder={sessionActive ? 'Keep typing with rhythm and precision...' : 'Click here and start typing to begin the timer...'}
                    rows={5}
                    className="w-full p-4 rounded-xl bg-white dark:bg-charcoal-800 border-2 border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 font-mono text-sm leading-relaxed focus:outline-none focus:border-institutional-500 dark:focus:border-institutional-500 resize-none disabled:opacity-60"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-charcoal-500 dark:text-charcoal-400 font-medium inline-flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${sessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-charcoal-300 dark:bg-charcoal-600'}`} />
                      {sessionActive ? 'Test in progress · live keystroke tracking' : 'The timer starts on your first keypress'}
                    </span>

                    <button
                      type="button"
                      disabled={typedText.length === 0 || sessionCompleted || submitting}
                      onClick={() => handleSubmitAttempt(typedText, elapsedSeconds || 1)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>{submitting ? 'Analyzing performance...' : 'Submit & Analyze'}</span>
                      <ArrowRightIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Scorecard */}
            {scorecard && (
              <section className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-card overflow-hidden animate-fade-in">
                <div className="h-1.5 bg-gradient-to-r from-institutional-800 via-institutional-600 to-sky-500" />
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Verdict */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      scorecard.is_qualified
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          scorecard.is_qualified ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {scorecard.is_qualified ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="text-base font-extrabold tracking-tight">
                          {scorecard.is_qualified ? 'Qualified' : 'Not qualified'}
                        </div>
                        <div className="text-xs opacity-90 font-medium">{scorecard.qualification_reason}</div>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-lg bg-white/70 dark:bg-black/30 font-mono font-bold text-[11px]">
                      {scorecard.exam_category} benchmark
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 text-center">
                      <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Net speed</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-institutional-600 dark:text-institutional-400 mt-1">
                        {scorecard.net_wpm} <span className="text-xs font-semibold">WPM</span>
                      </div>
                      <div className="text-[10px] text-charcoal-400 mt-0.5">Gross {scorecard.gross_wpm} WPM</div>
                    </div>

                    <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 text-center">
                      <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Accuracy</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {scorecard.accuracy_percentage}%
                      </div>
                      <div className="text-[10px] text-charcoal-400 mt-0.5">Error rate {(100 - scorecard.accuracy_percentage).toFixed(1)}%</div>
                    </div>

                    <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 text-center">
                      <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Keystrokes</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                        {scorecard.total_keystrokes}
                      </div>
                      <div className="text-[10px] text-charcoal-400 mt-0.5">
                        Correct {scorecard.correct_keystrokes} · Wrong {scorecard.wrong_keystrokes}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-150 dark:border-charcoal-800 text-center">
                      <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Time taken</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                        {Math.round(scorecard.time_taken_seconds)} <span className="text-xs font-semibold">sec</span>
                      </div>
                      <div className="text-[10px] text-charcoal-400 mt-0.5">Backspaces {scorecard.backspace_count}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => initPassage(selectedPassage)}
                      className="px-5 py-2.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                    >
                      Retake test
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Tab 2: performance history */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-subtle">
                <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Tests taken</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                  {historyData?.total_tests || 0}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-subtle">
                <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Best net speed</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-institutional-600 dark:text-institutional-400 mt-1">
                  {historyData?.best_wpm || 0} <span className="text-xs font-semibold">WPM</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-subtle">
                <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Average speed</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                  {historyData?.average_wpm || 0} <span className="text-xs font-semibold">WPM</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-charcoal-900/90 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-subtle">
                <div className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">Qualification rate</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {historyData?.qualification_rate || 0}%
                </div>
              </div>
            </div>

            {ordered.length > 0 && (
              <div className="grid lg:grid-cols-3 gap-5">
                {/* Net speed trend */}
                <section className="lg:col-span-2 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-subtle p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white">Net speed trend</h3>
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Net WPM on each attempt, oldest to newest</p>
                    </div>
                    {speedDelta !== null && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          speedDelta > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : speedDelta < 0
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              : 'bg-charcoal-100 dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-300'
                        }`}
                      >
                        <span aria-hidden="true">{speedDelta > 0 ? '▲' : speedDelta < 0 ? '▼' : '•'}</span>
                        <span>
                          {speedDelta > 0 ? '+' : ''}
                          {speedDelta} WPM since your first attempt
                        </span>
                      </span>
                    )}
                  </div>

                  {ordered.length >= 2 ? (
                    <TrendChart
                      points={speedPoints}
                      colorClass="text-institutional-600 dark:text-institutional-400"
                      name="net speed"
                      unit=" WPM"
                      zeroBase
                      refValue={avgSpeed}
                      refLabel="avg"
                      ariaLabel={`Net typing speed over ${ordered.length} attempts, from ${speedPoints[0].value} to ${speedPoints[speedPoints.length - 1].value} WPM, average ${Math.round(avgSpeed * 10) / 10}. Full values are in the attempts table below.`}
                    />
                  ) : (
                    <p className="py-10 text-center text-xs text-charcoal-500 dark:text-charcoal-400">
                      Take at least two typing tests to see your speed trend.
                    </p>
                  )}
                </section>

                {/* Qualification */}
                <section className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-subtle p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white">Qualification</h3>
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Across your {ordered.length} attempt{ordered.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-4xl font-black font-mono text-charcoal-900 dark:text-white leading-none">{qualifiedRate}%</div>
                    <div
                      className="h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={qualifiedRate}
                      aria-label="Share of attempts that qualified"
                    >
                      <div className="h-full bg-emerald-500 rounded-r-[4px] transition-all duration-500" style={{ width: `${qualifiedRate}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-charcoal-600 dark:text-charcoal-300">
                        <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                        Qualified
                      </span>
                      <span className="font-mono font-bold text-charcoal-900 dark:text-white">{qualifiedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-charcoal-600 dark:text-charcoal-300">
                        <XCircleIcon size={14} className="text-rose-600 dark:text-rose-400" />
                        Not qualified
                      </span>
                      <span className="font-mono font-bold text-charcoal-900 dark:text-white">{ordered.length - qualifiedCount}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between text-xs">
                    <span className="text-charcoal-600 dark:text-charcoal-300">Current qualified streak</span>
                    <span className="font-mono font-black text-charcoal-900 dark:text-white">{qualifiedStreak}</span>
                  </div>
                </section>

                {/* Accuracy trend */}
                <section className="lg:col-span-2 bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-subtle p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white">Accuracy trend</h3>
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Accuracy on each attempt (exams usually ask for 93% or better)</p>
                  </div>

                  {ordered.length >= 2 ? (
                    <TrendChart
                      points={accuracyPoints}
                      colorClass="text-sky-600 dark:text-sky-400"
                      name="accuracy"
                      unit="%"
                      maxCap={100}
                      refValue={avgAccuracy}
                      refLabel="avg"
                      ariaLabel={`Accuracy over ${ordered.length} attempts, from ${accuracyPoints[0].value}% to ${accuracyPoints[accuracyPoints.length - 1].value}%, average ${Math.round(avgAccuracy * 10) / 10}%. Full values are in the attempts table below.`}
                    />
                  ) : (
                    <p className="py-10 text-center text-xs text-charcoal-500 dark:text-charcoal-400">
                      Take at least two typing tests to see your accuracy trend.
                    </p>
                  )}
                </section>

                {/* Best speed per passage */}
                <section className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-subtle p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white">Best speed by passage</h3>
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Your top net WPM on each passage</p>
                  </div>

                  <div className="space-y-3">
                    {bestByPassage.map((a) => (
                      <div key={a.passage_title} title={`${a.passage_title}: best ${a.net_wpm} WPM, ${a.accuracy_percentage}% accuracy`} className="space-y-1">
                        <div className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300 truncate">{a.passage_title}</div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-r-[4px] bg-institutional-600 dark:bg-institutional-400 transition-all duration-500"
                            style={{ width: `${Math.max(4, (Number(a.net_wpm) / topPassageWpm) * 78)}%` }}
                          />
                          <span className="text-xs font-mono font-bold text-charcoal-900 dark:text-white shrink-0">{a.net_wpm}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            <section className="bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-card overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-institutional-800 via-institutional-600 to-sky-500" />
              <div className="p-5 sm:p-6 space-y-4">
                <h3 className="text-base font-extrabold tracking-tight text-charcoal-900 dark:text-white">Past typing mock attempts</h3>

                {historyData?.attempts && historyData.attempts.length > 0 ? (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-400 uppercase tracking-wider text-[10px]">
                          <th className="pb-3 font-semibold">Exam / Passage</th>
                          <th className="pb-3 font-semibold">Net Speed</th>
                          <th className="pb-3 font-semibold">Accuracy</th>
                          <th className="pb-3 font-semibold">Keystrokes</th>
                          <th className="pb-3 font-semibold">Duration</th>
                          <th className="pb-3 font-semibold">Result</th>
                          <th className="pb-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                        {historyData.attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-institutional-50/50 dark:hover:bg-institutional-950/20 transition-colors">
                            <td className="py-3 font-bold text-charcoal-900 dark:text-white max-w-[200px] truncate">
                              {att.passage_title}
                            </td>
                            <td className="py-3 font-mono font-bold text-institutional-600 dark:text-institutional-400">
                              {att.net_wpm} WPM
                            </td>
                            <td className="py-3 font-mono">{att.accuracy_percentage}%</td>
                            <td className="py-3 font-mono text-charcoal-500">{att.total_keystrokes}</td>
                            <td className="py-3 font-mono text-charcoal-500">{Math.round(att.time_taken_seconds)}s</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.is_qualified
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {att.is_qualified ? 'QUALIFIED' : 'FAILED'}
                              </span>
                            </td>
                            <td className="py-3 text-charcoal-400 font-mono text-[11px]">
                              {new Date(att.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-charcoal-500 space-y-3">
                    <p>You haven't completed any typing mock tests yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('test')}
                      className="px-4 py-2 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-xs shadow-sm transition-colors"
                    >
                      Take your first typing test
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
