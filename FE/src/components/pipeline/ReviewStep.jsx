import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CheckIcon, RefreshCwIcon, ShieldIcon, TrashIcon } from '../Icons';
import { Alert, Busy, DifficultyBadge, Empty, StepCard } from './PipelineUI';
import { errorText } from './pipelineUtils';

export const ReviewStep = ({ subject, onChanged }) => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [onlySubject, setOnlySubject] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await api.generation.listStaging());
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      if (action === 'approve') await api.generation.approveStaging(id);
      else await api.generation.rejectStaging(id);
      setItems((list) => list.filter((q) => q._id !== id));
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const filterBySubject = onlySubject && !!subject;
  const shown = (items || []).filter((q) => !filterBySubject || q.subject === subject);

  return (
    <StepCard
      icon={<ShieldIcon size={20} />}
      title="Review flagged questions"
      tag={items ? `${shown.length} waiting` : null}
      subtitle="Questions that failed the groundedness check wait here and are never used in quizzes until approved. They still count toward the generation target, so review them before assembling."
      actions={
        <>
          {subject && (
            <label className="pp-inline" style={{ fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={onlySubject} onChange={(e) => setOnlySubject(e.target.checked)} />
              Only {subject}
            </label>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={load}>
            <RefreshCwIcon size={14} />
            <span>Refresh</span>
          </button>
        </>
      }
    >
      <Alert type="error">{error}</Alert>
      {items === null && !error && <Busy label="Loading..." />}
      {items !== null && !shown.length && <Empty>Nothing waiting for review — every generated question passed the groundedness check.</Empty>}

      {shown.map((q) => (
        <div key={q._id} className="pp-question">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="pp-inline" style={{ flexWrap: 'wrap' }}>
              {!filterBySubject && <span className="badge badge-subject">{q.subject}</span>}
              {q.sub_subject && <span className="badge badge-subject">{q.sub_subject}</span>}
              <span className="badge badge-topic">{q.subtopic}</span>
              <DifficultyBadge level={q.difficulty} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {q.target_exam} · grounding {Number(q.groundedness_score ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="pp-inline">
              <button type="button" className="btn btn-success btn-sm" disabled={busyId === q._id} onClick={() => act(q._id, 'approve')}>
                <CheckIcon size={14} />
                <span>Approve</span>
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busyId === q._id} onClick={() => act(q._id, 'reject')}>
                <TrashIcon size={14} />
                <span>Reject</span>
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.65rem' }}>{q.question_text}</div>
          <div className="pp-options">
            {q.options?.map((opt) => (
              <div key={opt.id} className={`pp-option ${opt.id === q.correct_option ? 'correct' : ''}`}>
                <strong>{opt.id}.</strong> {opt.text}
              </div>
            ))}
          </div>
          <div className="pp-explain">
            <strong>Explanation:</strong> {q.solution_explanation}
          </div>
        </div>
      ))}
    </StepCard>
  );
};
