import React, { useState, useEffect, useRef } from 'react';
import { api, DEMO_QUESTIONS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  FlagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  HelpCircleIcon,
} from '../components/Icons';

export const ExamRoomPage = ({ attemptSession, onTestCompleted, onExit }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> option_id
  const [paletteStates, setPaletteStates] = useState({}); // question_id -> 'NOT_VISITED'|'NOT_ANSWERED'|'ANSWERED'|'MARKED_FOR_REVIEW'|'ANSWERED_AND_MARKED_FOR_REVIEW'
  const [timeSpent, setTimeSpent] = useState({}); // question_id -> seconds
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const attemptId = attemptSession?.attempt_id || 'demo-attempt';
  const timerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());

  // 1. Initialize attempt data
  useEffect(() => {
    initExam();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(syncTimerRef.current);
    };
  }, [attemptSession]);

  const initExam = async () => {
    setLoading(true);
    try {
      const data = await api.attempts.getQuestions(attemptId);
      setQuestions(data.questions || DEMO_QUESTIONS);
      setRemainingSeconds(data.remaining_seconds || (attemptSession?.duration_minutes ? attemptSession.duration_minutes * 60 : 3600));
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
    if (loading) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      // Track time on active question
      const currentQ = questions[currentIndex];
      if (currentQ) {
        setTimeSpent((prev) => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, currentIndex, questions]);

  // 3. Periodic Sync Heartbeat (every 8 seconds)
  useEffect(() => {
    if (loading) return;

    syncTimerRef.current = setInterval(() => {
      syncCurrentState();
    }, 8000);

    return () => clearInterval(syncTimerRef.current);
  }, [loading, currentIndex, answers, paletteStates, timeSpent, tabSwitchCount]);

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
      // Sync retry silently in background
    }
  };

  // 4. Anti-Cheat: Detect Tab Switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const currentQuestion = questions[currentIndex] || questions[0];

  // Option selection
  const handleSelectOption = (optionId) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Action: Clear Response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
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

  // Action: Save & Next
  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    const isAnswered = !!answers[currentQuestion.id];

    setPaletteStates((prev) => ({
      ...prev,
      [currentQuestion.id]: isAnswered ? 'ANSWERED' : 'NOT_ANSWERED',
    }));

    goToNextQuestion();
  };

  // Action: Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;
    const isAnswered = !!answers[currentQuestion.id];

    setPaletteStates((prev) => ({
      ...prev,
      [currentQuestion.id]: isAnswered
        ? 'ANSWERED_AND_MARKED_FOR_REVIEW'
        : 'MARKED_FOR_REVIEW',
    }));

    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = questions[nextIdx];
      // Mark as not answered if not visited yet
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
  };

  // Palette counts
  const counts = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    markedReview: 0,
    answeredMarkedReview: 0,
  };

  questions.forEach((q) => {
    const state = paletteStates[q.id] || 'NOT_VISITED';
    if (state === 'ANSWERED') counts.answered++;
    else if (state === 'NOT_ANSWERED') counts.notAnswered++;
    else if (state === 'MARKED_FOR_REVIEW') counts.markedReview++;
    else if (state === 'ANSWERED_AND_MARKED_FOR_REVIEW') counts.answeredMarkedReview++;
    else counts.notVisited++;
  });

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
      // Fallback result
      onTestCompleted({ attempt_id: attemptId });
    } finally {
      setSubmitting(false);
    }
  };

  // Timer warning status
  const isTimerDanger = remainingSeconds < 60;
  const isTimerWarning = remainingSeconds < 300 && !isTimerDanger;

  if (loading) {
    return (
      <div className="exam-full-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Initializing TCS iON Exam Engine...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Configuring server-side timer and question security...</p>
      </div>
    );
  }

  // Current question unique subject
  const currentSubject = currentQuestion?.subject || 'Test Section';

  return (
    <div className="exam-full-container">
      {/* 1. TCS iON Top Bar */}
      <header className="exam-header">
        <div className="exam-info-title">
          <span className="badge badge-full">TCS iON ENGINE</span>
          <span style={{ fontWeight: 800 }}>{attemptSession?.test_title || 'Mock Examination'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Server Timer */}
          <div
            className={`exam-timer-box ${isTimerDanger ? 'timer-danger' : isTimerWarning ? 'timer-warning' : ''}`}
          >
            <ClockIcon size={20} />
            <span>Time Left: {formatTime(remainingSeconds)}</span>
          </div>

          {/* Candidate Profile */}
          <div className="candidate-badge">
            <div className="candidate-photo">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.full_name || 'Candidate'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Roll: CGL-2026-{user?.id?.slice(0, 5) || '99281'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Section Tabs & Tools Bar */}
      <div className="exam-section-bar">
        <div className="section-tabs">
          <div className="section-tab-btn active">
            <span>{currentSubject}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowInstructionsModal(true)}
          >
            <HelpCircleIcon size={14} />
            <span>Instructions</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace: Question Area (Left) & Palette (Right) */}
      <div className="exam-workspace">
        {/* Left: Active Question Area */}
        <div className="exam-question-area">
          {/* Question Subheader */}
          <div className="question-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="question-number-pill">
                Question No. {currentIndex + 1} of {questions.length}
              </span>
              <span className={`badge badge-${currentQuestion?.difficulty?.toLowerCase() || 'medium'}`}>
                {currentQuestion?.difficulty || 'MEDIUM'}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Topic: <strong>{currentQuestion?.topic}</strong>
              </span>
            </div>

            <div className="question-marks-pill">
              <span className="mark-pos">+2.00</span>
              <span className="mark-neg">-0.50</span>
            </div>
          </div>

          {/* Question & Options Body */}
          <div className="question-body">
            <div className="question-text">
              {currentQuestion?.question_text}
            </div>

            <div className="options-list">
              {currentQuestion?.options?.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(opt.id)}
                  >
                    <div className="option-radio">{opt.id}</div>
                    <div className="option-text">{opt.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exam Navigation Footer */}
          <div className="exam-footer">
            <div className="footer-btn-group">
              <button
                className="btn btn-purple"
                onClick={handleMarkForReviewAndNext}
              >
                <FlagIcon size={16} />
                <span>Mark for Review & Next</span>
              </button>

              <button
                className="btn btn-outline"
                onClick={handleClearResponse}
                disabled={!answers[currentQuestion?.id]}
              >
                Clear Response
              </button>
            </div>

            <div className="footer-btn-group">
              <button
                className="btn btn-secondary"
                onClick={goToPrevQuestion}
                disabled={currentIndex === 0}
              >
                <ChevronLeftIcon size={16} />
                <span>Previous</span>
              </button>

              <button
                className="btn btn-success"
                onClick={handleSaveAndNext}
              >
                <span>Save & Next</span>
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: TCS iON Question Palette Sidebar */}
        <aside className="exam-palette-sidebar">
          <div className="palette-header">
            <span>QUESTION PALETTE</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total: {questions.length}
            </span>
          </div>

          {/* Official Legend Grid with Real-time Counters */}
          <div className="palette-legend">
            <div className="legend-item">
              <span className="legend-badge ans">{counts.answered}</span>
              <span>Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge not-ans">{counts.notAnswered}</span>
              <span>Not Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge not-vis">{counts.notVisited}</span>
              <span>Not Visited</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge review">{counts.markedReview}</span>
              <span>Marked for Review</span>
            </div>
            <div className="legend-item" style={{ gridColumn: 'span 2' }}>
              <span className="legend-badge review-ans">{counts.answeredMarkedReview}</span>
              <span>Answered & Marked for Review</span>
            </div>
          </div>

          {/* Palette Questions Grid */}
          <div className="palette-grid-wrapper">
            <div className="palette-grid">
              {questions.map((q, idx) => {
                const state = paletteStates[q.id] || 'NOT_VISITED';
                const isCurrent = idx === currentIndex;

                let stateClass = 'btn-not-visited';
                if (state === 'ANSWERED') stateClass = 'btn-answered';
                else if (state === 'NOT_ANSWERED') stateClass = 'btn-not-answered';
                else if (state === 'MARKED_FOR_REVIEW') stateClass = 'btn-review';
                else if (state === 'ANSWERED_AND_MARKED_FOR_REVIEW') stateClass = 'btn-review-answered';

                return (
                  <button
                    key={q.id}
                    className={`q-btn ${stateClass} ${isCurrent ? 'current' : ''}`}
                    onClick={() => jumpToQuestion(idx)}
                    title={`Question ${idx + 1} (${state})`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions: Submit Test */}
          <div className="palette-bottom-actions">
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontWeight: 800 }}
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Examination
            </button>
          </div>
        </aside>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Confirm Test Submission</h3>
              <button onClick={() => setShowSubmitModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                Are you sure you want to submit your mock test? Here is your current attempt summary:
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL QUESTIONS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{questions.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ANSWERED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                    {counts.answered + counts.answeredMarkedReview}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NOT ANSWERED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>
                    {counts.notAnswered}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MARKED FOR REVIEW</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--purple)' }}>
                    {counts.markedReview}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  fontSize: '0.85rem',
                }}
              >
                <AlertTriangleIcon size={18} />
                <span>Once submitted, you cannot change your answers. Instant evaluation will follow.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Return to Test
              </button>
              <button
                className="btn btn-success"
                onClick={submitExam}
                disabled={submitting}
              >
                {submitting ? 'Evaluating Score...' : 'Confirm & Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switch Warning Modal */}
      {showTabWarning && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box" style={{ maxWidth: '480px', border: '2px solid var(--danger)' }}>
            <div className="modal-header" style={{ background: 'var(--danger-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertTriangleIcon size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Anti-Cheat Warning Flagged</h3>
              </div>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.92rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                You have switched browser tabs or windows during an active examination.
              </p>
              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Total tab switches detected: <strong>{tabSwitchCount}</strong>.
                Repeated deviations will result in automatic test invalidation.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger"
                style={{ width: '100%' }}
                onClick={() => setShowTabWarning(false)}
              >
                I Understand, Return to Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Reference Modal */}
      {showInstructionsModal && (
        <div className="modal-backdrop" onClick={() => setShowInstructionsModal(false)}>
          <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Exam Instructions Reference</h3>
              <button onClick={() => setShowInstructionsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p>• Correct answer awards: <strong>+2.00 marks</strong></p>
              <p>• Incorrect answer incurs negative marking of: <strong>-0.50 marks</strong></p>
              <p>• Unattempted questions carry: <strong>0.00 marks</strong></p>
              <p>• Questions <strong>Answered and Marked for Review</strong> will be considered for evaluation.</p>
              <p>• Server timer auto-submits once 00:00 is reached.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowInstructionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
