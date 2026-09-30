import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  TrophyIcon,
  TargetIcon,
  BarChart3Icon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  UserIcon,
} from '../components/Icons';

export const StudentDashboardPage = ({ onSelectAttempt, onStartTest }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.users.getDashboard(user?.id || 'demo-student');
      setDashboard(data);
    } catch (err) {
      console.warn('Dashboard fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Loading Candidate Performance Profile...</h2>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Student Welcome & Target Banner */}
      <div className="hero-banner" style={{ padding: '1.75rem 2rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <UserIcon size={14} />
            <span>Aspirant Portfolio</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Welcome back, {user?.full_name || 'Candidate'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Targeting: <strong>{user?.profile?.target_exams?.join(', ') || 'SSC CGL 2026'}</strong> • Aiming for 99+ Percentile
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            OVERALL ALL-INDIA PERCENTILE
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {dashboard?.overall_percentile?.toFixed(1) || '91.8'}%
          </div>
        </div>
      </div>

      {/* 4 Lifetime Stats Cards */}
      <div className="metrics-kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BookOpenIcon size={24} />
          </div>
          <div>
            <div className="kpi-title">Total Mocks Attempted</div>
            <div className="kpi-val">{dashboard?.total_mocks_attempted || 14}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <TargetIcon size={24} />
          </div>
          <div>
            <div className="kpi-title">Average Accuracy</div>
            <div className="kpi-val" style={{ color: 'var(--success)' }}>
              {dashboard?.average_accuracy?.toFixed(1) || '82.4'}%
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
            <TrophyIcon size={24} />
          </div>
          <div>
            <div className="kpi-title">Highest Score</div>
            <div className="kpi-val" style={{ color: 'var(--purple)' }}>
              {dashboard?.best_score?.toFixed(1) || '168.0'}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <BarChart3Icon size={24} />
          </div>
          <div>
            <div className="kpi-title">Average Score</div>
            <div className="kpi-val">
              {dashboard?.average_score?.toFixed(1) || '138.5'}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Subject Proficiency & Recommended Tests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Subject Proficiency */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3Icon size={18} />
            <span>Lifetime Subject Proficiency</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.entries(dashboard?.subject_performance || {
              'Quantitative Aptitude': 88.0,
              'General Intelligence & Reasoning': 92.5,
              'English Comprehension': 78.0,
              'General Awareness': 71.0,
            }).map(([subj, acc]) => (
              <div key={subj}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <span>{subj}</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{acc}%</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${acc}%`,
                      background: acc >= 85 ? 'var(--success)' : acc >= 75 ? 'var(--primary)' : 'var(--warning)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Tests */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SparklesIcon size={18} />
            <span>Recommended Next Drills</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(dashboard?.recommended_tests || [
              { test_id: 'mock-geometry-mini', title: 'Geometry & Trigonometry Mini Speed Drill', reason: 'High ROI for SSC CGL Tier-I' },
              { test_id: 'mock-polity-mini', title: 'Indian Polity & Constitution Mini Mock', reason: 'Strengthen static GK accuracy' },
            ]).map((rec) => (
              <div
                key={rec.test_id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {rec.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    🎯 {rec.reason}
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onStartTest({ id: rec.test_id, title: rec.title, duration_minutes: 15 })}
                >
                  Attempt
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Attempts History Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem' }}>
          Recent Mock Attempt History
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>TEST TITLE</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>DATE</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>SCORE</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>ACCURACY</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.recent_attempts?.map((att) => (
                <tr key={att.attempt_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                    {att.test_title}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                    {new Date(att.start_time).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {att.total_score.toFixed(1)} / {att.max_possible_score}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--success)', fontWeight: 700 }}>
                    {att.accuracy_percentage.toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <span className="badge badge-easy">{att.status}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onSelectAttempt(att.attempt_id)}
                    >
                      Scorecard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
