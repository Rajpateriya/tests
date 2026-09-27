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
} from '../components/Icons';

export const ResultScorecardPage = ({ attemptId, onRetake, onGoToDashboard, onBackToDiscovery }) => {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [filterReview, setFilterReview] = useState('ALL'); // ALL, CORRECT, INCORRECT, UNATTEMPTED

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
      // Fallback
      const fallbackScore = await api.results.getResult(attemptId);
      const fallbackInsights = await api.results.getInsights(attemptId);
      setScoreData(fallbackScore);
      setInsights(fallbackInsights);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Evaluating Answers & Computing Percentile...
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Applying negative marking algorithms and comparing against peer aspirant benchmarks...
        </p>
      </div>
    );
  }

  const isCelebratory = (scoreData?.accuracy_percentage || 0) >= 70;

  // Filter question breakdown
  const questionsList = insights?.questions_breakdown || [];
  const filteredQuestions = questionsList.filter((q) => {
    if (filterReview === 'CORRECT') return q.is_correct && q.is_attempted;
    if (filterReview === 'INCORRECT') return !q.is_correct && q.is_attempted;
    if (filterReview === 'UNATTEMPTED') return !q.is_attempted;
    return true;
  });

  return (
    <div className="main-content">
      {isCelebratory && <Confetti duration={3500} />}

      {/* Hero Scorecard Card */}
      <div className="score-hero-card">
        <div className="score-hero-top">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <TrophyIcon size={14} />
              <span>Official Mock Evaluation</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {scoreData?.test_title || 'Mock Examination Scorecard'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Completed on {new Date(scoreData?.end_time || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline btn-sm" onClick={onBackToDiscovery}>
              Explore More Mocks
            </button>
            <button className="btn btn-primary btn-sm" onClick={onGoToDashboard}>
              <BarChart3Icon size={16} />
              <span>My Full Performance</span>
            </button>
          </div>
        </div>

        {/* Big Score & Ranking Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              TOTAL MARKS SECURED
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span className="score-big">{scoreData?.total_score?.toFixed(1) || '0.0'}</span>
              <span className="score-max">/ {scoreData?.max_possible_score || '200'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                ACCURACY
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                {scoreData?.accuracy_percentage?.toFixed(1) || 0}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                PERCENTILE
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {insights?.percentile?.toFixed(1) || '92.4'}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                ALL INDIA ESTIMATED RANK
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>
                #{insights?.rank || '18'} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {insights?.total_participants || '500'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPIs Grid */}
        <div className="metrics-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircleIcon size={24} />
            </div>
            <div>
              <div className="kpi-title">Correct Answers</div>
              <div className="kpi-val" style={{ color: 'var(--success)' }}>
                {scoreData?.correct_count || 0}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <XCircleIcon size={24} />
            </div>
            <div>
              <div className="kpi-title">Incorrect Answers</div>
              <div className="kpi-val" style={{ color: 'var(--danger)' }}>
                {scoreData?.incorrect_count || 0}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <TargetIcon size={24} />
            </div>
            <div>
              <div className="kpi-title">Unattempted</div>
              <div className="kpi-val">
                {scoreData?.unattempted_count || 0}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ClockIcon size={24} />
            </div>
            <div>
              <div className="kpi-title">Time Taken</div>
              <div className="kpi-val">
                {Math.floor((scoreData?.total_time_taken_seconds || 0) / 60)}m {(scoreData?.total_time_taken_seconds || 0) % 60}s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Analytics & Subject Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Subject-Wise Performance */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3Icon size={18} />
            <span>Subject Accuracy Breakdown</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {insights?.subject_analysis?.map((subj) => (
              <div key={subj.subject}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <span>{subj.subject}</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {subj.accuracy_percentage.toFixed(0)}% ({subj.correct}/{subj.total_questions})
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${subj.accuracy_percentage}%`,
                      background: subj.accuracy_percentage >= 70 ? 'var(--success)' : subj.accuracy_percentage >= 50 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SparklesIcon size={18} />
            <span>Actionable Topic Insights</span>
          </h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ✓ High Proficiency Topics (≥ 75% Accuracy)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {insights?.strong_areas?.length > 0 ? (
                insights.strong_areas.map((t) => (
                  <span key={t} className="badge badge-topic" style={{ textTransform: 'none', fontSize: '0.82rem' }}>
                    {t}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None identified yet</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ⚠ Needs Improvement (&lt; 50% Accuracy)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {insights?.weak_areas?.length > 0 ? (
                insights.weak_areas.map((t) => (
                  <span key={t} className="badge badge-hard" style={{ textTransform: 'none', fontSize: '0.82rem' }}>
                    {t}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                  Excellent! No critical weak topics detected.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question-By-Question Detailed Solutions Review */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Comprehensive Solution Review</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Step-by-step explanations, shortcuts, and marking deductions for each question.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="tab-pills">
            {[
              { id: 'ALL', label: `All (${questionsList.length})` },
              { id: 'CORRECT', label: `Correct (${scoreData?.correct_count || 0})` },
              { id: 'INCORRECT', label: `Incorrect (${scoreData?.incorrect_count || 0})` },
              { id: 'UNATTEMPTED', label: `Unattempted (${scoreData?.unattempted_count || 0})` },
            ].map((f) => (
              <button
                key={f.id}
                className={`tab-pill ${filterReview === f.id ? 'active' : ''}`}
                onClick={() => setFilterReview(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredQuestions.map((q, idx) => {
            let borderClass = 'unattempted-border';
            if (q.is_attempted) {
              borderClass = q.is_correct ? 'correct-border' : 'incorrect-border';
            }

            return (
              <div key={q.question_id || idx} className={`solution-card ${borderClass}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Question #{idx + 1}</span>
                    <span className="badge badge-subject">{q.subject}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {q.topic}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {q.is_attempted ? (
                      q.is_correct ? (
                        <span className="badge badge-easy">+2.00 Marks</span>
                      ) : (
                        <span className="badge badge-hard">-0.50 Marks</span>
                      )
                    ) : (
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        0.00 Marks
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1rem' }}>
                  {q.question_text}
                </div>

                {/* Options List with Status Highlighting */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
                  {q.options?.map((opt) => {
                    const isCorrect = opt.id === q.correct_option;
                    const isSelected = opt.id === q.selected_option;

                    let bgStyle = 'var(--bg-secondary)';
                    let borderStyle = 'var(--border-light)';
                    let tagText = '';

                    if (isCorrect) {
                      bgStyle = 'var(--success-bg)';
                      borderStyle = 'var(--success-border)';
                      tagText = '✓ Correct Answer';
                    } else if (isSelected && !isCorrect) {
                      bgStyle = 'var(--danger-bg)';
                      borderStyle = 'var(--danger-border)';
                      tagText = '✗ Your Choice';
                    }

                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${borderStyle}`,
                          background: bgStyle,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.9rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 800 }}>{opt.id}.</span>
                          <span>{opt.text}</span>
                        </div>
                        {tagText && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {tagText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution Explanation Box */}
                <div className="solution-explanation-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <HelpCircleIcon size={16} />
                    <span>DETAILED SOLUTION & CONCEPT:</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {q.solution_explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
