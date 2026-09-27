import React from 'react';
import { ClockIcon, ShieldIcon, CheckCircleIcon, ArrowRightIcon } from './Icons';

export const TestRulesModal = ({ test, isOpen, onClose, onStartExam }) => {
  if (!isOpen || !test) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className={`badge badge-${test.test_type?.toLowerCase() || 'full'}`}>
                {test.test_type}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {test.target_exam}</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{test.title}</h3>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Key specs banner */}
          <div className="test-meta-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="test-meta-item">
              <ClockIcon size={18} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DURATION</div>
                <div className="test-meta-value">{test.duration_minutes} Minutes</div>
              </div>
            </div>
            <div className="test-meta-item">
              <ShieldIcon size={18} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>QUESTIONS</div>
                <div className="test-meta-value">{test.total_questions} Questions</div>
              </div>
            </div>
            <div className="test-meta-item">
              <span style={{ color: 'var(--success)', fontWeight: 800 }}>+{test.positive_marks_per_q}</span>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CORRECT MARK</div>
                <div className="test-meta-value">+{test.positive_marks_per_q} Marks</div>
              </div>
            </div>
            <div className="test-meta-item">
              <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{test.negative_marks_per_q}</span>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NEGATIVE MARK</div>
                <div className="test-meta-value">-{test.negative_marks_per_q} Marks</div>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Exam Hall Instructions & Guidelines:
          </h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <li>The clock will be set at the server. The countdown timer at the top indicates time remaining.</li>
            <li>You can navigate to any question directly using the Question Palette on the right panel.</li>
            <li><strong>Save & Next:</strong> Saves your selected answer and marks the question as answered (Green).</li>
            <li><strong>Mark for Review:</strong> Flags the question for reconsideration later (Purple).</li>
            <li><strong>Auto-Submit:</strong> When the timer expires, the test is automatically submitted and evaluated instantly.</li>
            <li>Anti-cheat deterrence is active: Switching tabs or minimizing the browser will be flagged.</li>
          </ul>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Official TCS iON Question Palette Legend:
          </h4>
          <div className="palette-legend" style={{ borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <div className="legend-item">
              <span className="legend-badge ans">1</span>
              <span>Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge not-ans">2</span>
              <span>Not Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge not-vis">3</span>
              <span>Not Visited</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge review">4</span>
              <span>Marked for Review</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onStartExam(test);
            }}
          >
            <span>Proceed to Exam Room</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
