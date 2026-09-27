import React, { useState, useEffect } from 'react';
import { api, DEMO_TESTS } from '../services/api';
import {
  ClockIcon,
  ShieldIcon,
  SearchIcon,
  BookOpenIcon,
  SparklesIcon,
  PlayIcon,
  FilterIcon,
  ArrowRightIcon,
  TrophyIcon,
  TargetIcon,
} from '../components/Icons';
import { TestRulesModal } from '../components/TestRulesModal';

export const TestDiscoveryPage = ({ onStartTest, activeAttempt }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, FULL, SUBJECT, TOPIC_MINI
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalTest, setModalTest] = useState(null);

  useEffect(() => {
    loadTests();
  }, [selectedType, selectedSubject]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'ALL') params.test_type = selectedType;
      if (selectedSubject !== 'ALL') params.subject = selectedSubject;
      const res = await api.tests.list(params);
      setTests(res || DEMO_TESTS);
    } catch (err) {
      console.warn('Fallback to demo tests:', err);
      setTests(DEMO_TESTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.topic?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="main-content">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            <SparklesIcon size={14} />
            <span>SSC CGL 2026 Ready</span>
          </div>
          <h1 className="hero-title">Mock Test Discovery & Simulation</h1>
          <p className="hero-subtitle">
            Experience the real TCS iON exam engine with standard marking schemes, instant evaluation, and granular peer analytics to maximize your AIR.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <TrophyIcon size={16} className="text-primary" />
              <span>Full-length Mocks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <TargetIcon size={16} className="text-primary" />
              <span>Subject-wise Drills</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <ClockIcon size={16} className="text-primary" />
              <span>10-min Speed Tests</span>
            </div>
          </div>
        </div>

        {/* Quick Active Attempt Card */}
        {activeAttempt && (
          <div
            className="card"
            style={{
              minWidth: '280px',
              border: '2px solid var(--warning)',
              background: 'var(--bg-secondary)',
              boxShadow: '0 8px 24px rgba(217, 119, 6, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <ClockIcon size={16} />
              <span>Exam in Progress</span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {activeAttempt.test_title}
            </h4>
            <button
              className="btn btn-warning"
              style={{ width: '100%' }}
              onClick={() => onStartTest(activeAttempt)}
            >
              <PlayIcon size={16} />
              <span>Resume Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        {/* Test Type Tabs */}
        <div className="tab-pills">
          {[
            { id: 'ALL', label: 'All Mocks' },
            { id: 'FULL', label: 'Full Mocks' },
            { id: 'SUBJECT', label: 'Subject Mocks' },
            { id: 'TOPIC_MINI', label: 'Topic Mini Mocks' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-pill ${selectedType === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Subject Dropdown */}
          <select
            className="filter-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="ALL">All Subjects</option>
            <option value="Quantitative Aptitude">Quantitative Aptitude</option>
            <option value="General Intelligence & Reasoning">General Intelligence & Reasoning</option>
            <option value="English Comprehension">English Comprehension</option>
            <option value="General Awareness">General Awareness</option>
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <SearchIcon size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search tests by topic or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading mock tests...
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpenIcon size={40} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No mock tests found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Try changing your filter settings or search query.
          </p>
        </div>
      ) : (
        <div className="test-grid">
          {filteredTests.map((test) => (
            <div key={test.id} className="card test-card card-interactive">
              <div>
                <div className="test-card-header">
                  <span className={`badge badge-${test.test_type?.toLowerCase() || 'full'}`}>
                    {test.test_type}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {test.target_exam}
                  </span>
                </div>

                <h3 className="test-card-title">{test.title}</h3>
                <p className="test-card-desc">{test.description}</p>
              </div>

              <div>
                {/* Meta Grid */}
                <div className="test-meta-grid">
                  <div className="test-meta-item">
                    <ClockIcon size={16} />
                    <span>{test.duration_minutes} Mins</span>
                  </div>
                  <div className="test-meta-item">
                    <ShieldIcon size={16} />
                    <span>{test.total_questions} Questions</span>
                  </div>
                  <div className="test-meta-item">
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>+{test.positive_marks_per_q}</span>
                    <span>Correct Mark</span>
                  </div>
                  <div className="test-meta-item">
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>-{test.negative_marks_per_q}</span>
                    <span>Negative Mark</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setModalTest(test)}
                  >
                    Rules & Info
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.2 }}
                    onClick={() => setModalTest(test)}
                  >
                    <span>Start Test</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Modal */}
      <TestRulesModal
        test={modalTest}
        isOpen={!!modalTest}
        onClose={() => setModalTest(null)}
        onStartExam={(test) => onStartTest(test)}
      />
    </div>
  );
};
