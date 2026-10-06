import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldIcon,
  SparklesIcon,
  AwardIcon,
  BarChartIcon,
  ArrowRightIcon,
} from '../components/Icons';

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

  // Render character tokens
  const renderPassageWithHighlights = () => {
    const chars = targetContent.split('');
    return chars.map((char, index) => {
      let statusClass = 'text-charcoal-400 dark:text-charcoal-500'; // untyped
      let isCurrent = false;

      if (index < currentTypedLength) {
        if (typedText[index] === char) {
          statusClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 font-semibold';
        } else {
          statusClass = 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 font-bold underline';
        }
      } else if (index === currentTypedLength) {
        isCurrent = true;
        statusClass = 'bg-blue-500 text-white rounded font-bold animate-pulse';
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

  return (
    <div className="min-h-screen bg-charcoal-50/60 dark:bg-charcoal-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-charcoal-200 dark:border-charcoal-800 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
              <SparklesIcon size={14} />
              <span>SSC CGL DEST • CHSL • RRB NTPC Benchmarks</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900 dark:text-white tracking-tight">
              Typing Master Mock Engine
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
              Official government exam simulation with real-time Gross/Net WPM, Keystroke precision, and correction analysis.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-charcoal-100 dark:bg-charcoal-900 p-1 rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'test'
                  ? 'bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200'
              }`}
            >
              Mock Test Arena
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200'
              }`}
            >
              <BarChartIcon size={14} />
              <span>Performance History</span>
            </button>
          </div>
        </div>

        {activeTab === 'test' && (
          <div className="space-y-6">
            {/* Passage Picker Strip */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {passages.map((p) => {
                const isSelected = selectedPassage?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => initPassage(p)}
                    className={`px-4 py-3 rounded-2xl border text-left shrink-0 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 shadow-sm'
                        : 'border-charcoal-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-900 hover:bg-charcoal-50 dark:hover:bg-charcoal-850'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                      {p.exam_category}
                    </div>
                    <div className="text-xs font-extrabold text-charcoal-900 dark:text-white truncate max-w-[220px]">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-charcoal-500 mt-0.5">
                      Target: {p.target_wpm} WPM • {Math.round(p.duration_seconds / 60)} Mins
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Stats HUD Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Timer */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  timeLeft <= 60 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 animate-pulse' : 'bg-blue-50 text-blue-600 dark:bg-blue-950'
                }`}>
                  <ClockIcon size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Time Remaining</div>
                  <div className={`text-lg font-black font-mono ${timeLeft <= 60 ? 'text-rose-600 dark:text-rose-400' : 'text-charcoal-900 dark:text-white'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Live Gross WPM */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Gross Speed</div>
                  <div className="text-lg font-black font-mono text-charcoal-900 dark:text-white">
                    {liveGrossWpm} <span className="text-xs font-normal text-charcoal-400">WPM</span>
                  </div>
                </div>
              </div>

              {/* Target Benchmark */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  <AwardIcon size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Cutoff Benchmark</div>
                  <div className="text-lg font-black font-mono text-charcoal-900 dark:text-white">
                    {selectedPassage?.target_wpm || 27} <span className="text-xs font-normal text-charcoal-400">WPM</span>
                  </div>
                </div>
              </div>

              {/* Keystrokes Progress */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-sm">
                  ⌨️
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Keystrokes</div>
                  <div className="text-lg font-black font-mono text-charcoal-900 dark:text-white">
                    {currentTypedLength} <span className="text-xs font-normal text-charcoal-400">/ {selectedPassage?.target_keystrokes || 2000}</span>
                  </div>
                </div>
              </div>

              {/* Backspace Discipline */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 flex items-center gap-3 shadow-sm col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-sm">
                  ⌫
                </div>
                <div>
                  <div className="text-[10px] text-charcoal-400 uppercase font-semibold">Backspaces</div>
                  <div className="text-lg font-black font-mono text-charcoal-900 dark:text-white">
                    {backspaceCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Arena: Target Text + Interactive Input Box */}
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                    {selectedPassage?.title}
                  </h3>
                  <div className="text-xs text-charcoal-500">
                    Type the passage below exactly as displayed. Green indicates correct strokes, red indicates typos.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => initPassage(selectedPassage)}
                  className="px-3 py-1.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800"
                >
                  Restart Test
                </button>
              </div>

              {/* Target Passage Token Display */}
              <div
                ref={passageContainerRef}
                className="p-5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 max-h-56 overflow-y-auto select-none space-x-0.5 tracking-wide"
              >
                {renderPassageWithHighlights()}
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <textarea
                  ref={inputRef}
                  value={typedText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={sessionCompleted}
                  placeholder={sessionActive ? 'Keep typing with rhythm and precision...' : 'Click here and start typing to begin the timer...'}
                  rows={5}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-charcoal-800 border-2 border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 shadow-inner resize-none"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-charcoal-500 font-medium">
                    {sessionActive ? 'Test in progress • Live keystroke tracking active' : 'Timer will start on your first keypress'}
                  </span>

                  <button
                    type="button"
                    disabled={typedText.length === 0 || sessionCompleted || submitting}
                    onClick={() => handleSubmitAttempt(typedText, elapsedSeconds || 1)}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2"
                  >
                    <span>{submitting ? 'Analyzing Performance...' : 'Submit & Analyze'}</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scorecard Modal / View */}
            {scorecard && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 space-y-6 shadow-xl animate-fade-in">
                {/* Qualification Verdict Banner */}
                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  scorecard.is_qualified
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${
                      scorecard.is_qualified ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {scorecard.is_qualified ? '✓' : '✕'}
                    </div>
                    <div>
                      <div className="text-lg font-black tracking-tight">
                        {scorecard.is_qualified ? 'EXAMINATION STATUS: QUALIFIED' : 'EXAMINATION STATUS: NOT QUALIFIED'}
                      </div>
                      <div className="text-xs opacity-90 font-medium">
                        {scorecard.qualification_reason}
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-xl bg-white/60 dark:bg-black/30 font-mono font-bold text-xs">
                    {scorecard.exam_category} Benchmark
                  </div>
                </div>

                {/* Performance Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center">
                    <div className="text-[10px] text-charcoal-500 uppercase font-bold">Net Typing Speed</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                      {scorecard.net_wpm} <span className="text-xs font-normal">WPM</span>
                    </div>
                    <div className="text-[10px] text-charcoal-400 mt-0.5">Gross: {scorecard.gross_wpm} WPM</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center">
                    <div className="text-[10px] text-charcoal-500 uppercase font-bold">Accuracy Rate</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {scorecard.accuracy_percentage}%
                    </div>
                    <div className="text-[10px] text-charcoal-400 mt-0.5">Error Rate: {(100 - scorecard.accuracy_percentage).toFixed(1)}%</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center">
                    <div className="text-[10px] text-charcoal-500 uppercase font-bold">Keystrokes Typed</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                      {scorecard.total_keystrokes}
                    </div>
                    <div className="text-[10px] text-charcoal-400 mt-0.5">Correct: {scorecard.correct_keystrokes} • Wrong: {scorecard.wrong_keystrokes}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 text-center">
                    <div className="text-[10px] text-charcoal-500 uppercase font-bold">Time Taken</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                      {Math.round(scorecard.time_taken_seconds)} <span className="text-xs font-normal">sec</span>
                    </div>
                    <div className="text-[10px] text-charcoal-400 mt-0.5">Backspaces: {scorecard.backspace_count}</div>
                  </div>
                </div>

                {/* Retake Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => initPassage(selectedPassage)}
                    className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Retake Mock Test
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: User Performance History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-sm">
                <div className="text-[10px] text-charcoal-400 uppercase font-bold">Total Tests Taken</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                  {historyData?.total_tests || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-sm">
                <div className="text-[10px] text-charcoal-400 uppercase font-bold">Best Net Speed</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                  {historyData?.best_wpm || 0} <span className="text-xs font-normal">WPM</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-sm">
                <div className="text-[10px] text-charcoal-400 uppercase font-bold">Average Speed</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-charcoal-900 dark:text-white mt-1">
                  {historyData?.average_wpm || 0} <span className="text-xs font-normal">WPM</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 text-center shadow-sm">
                <div className="text-[10px] text-charcoal-400 uppercase font-bold">Qualification Rate</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {historyData?.qualification_rate || 0}%
                </div>
              </div>
            </div>

            {/* Past Attempts Table */}
            <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white">
                Past Typing Mock Attempts
              </h3>

              {historyData?.attempts && historyData.attempts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-400 uppercase text-[10px]">
                        <th className="pb-3 font-semibold">Exam / Passage</th>
                        <th className="pb-3 font-semibold">Net Speed</th>
                        <th className="pb-3 font-semibold">Accuracy</th>
                        <th className="pb-3 font-semibold">Keystrokes</th>
                        <th className="pb-3 font-semibold">Duration</th>
                        <th className="pb-3 font-semibold">Result</th>
                        <th className="pb-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-850">
                      {historyData.attempts.map((att) => (
                        <tr key={att.id} className="hover:bg-charcoal-50 dark:hover:bg-charcoal-850/50">
                          <td className="py-3 font-bold text-charcoal-900 dark:text-white max-w-[200px] truncate">
                            {att.passage_title}
                          </td>
                          <td className="py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {att.net_wpm} WPM
                          </td>
                          <td className="py-3 font-mono">
                            {att.accuracy_percentage}%
                          </td>
                          <td className="py-3 font-mono text-charcoal-500">
                            {att.total_keystrokes}
                          </td>
                          <td className="py-3 font-mono text-charcoal-500">
                            {Math.round(att.time_taken_seconds)}s
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              att.is_qualified
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
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
                <div className="text-center py-12 text-xs text-charcoal-500 space-y-2">
                  <p>You haven't completed any typing mock tests yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('test')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    Take First Typing Test
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
