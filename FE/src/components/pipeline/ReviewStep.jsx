import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CheckIcon, RefreshCwIcon, ShieldIcon, TrashIcon } from '../Icons';
import { Alert, Busy, BTN_OUTLINE_SM, DifficultyBadge, Empty, StepCard } from './PipelineUI';
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
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 cursor-pointer">
              <input type="checkbox" checked={onlySubject} onChange={(e) => setOnlySubject(e.target.checked)} />
              Only {subject}
            </label>
          )}
          <button type="button" className={BTN_OUTLINE_SM} onClick={load}>
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
        <div key={q._id} className="bg-charcoal-50/60 dark:bg-charcoal-850/40 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {!filterBySubject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300">
                  {q.subject}
                </span>
              )}
              {q.sub_subject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300">
                  {q.sub_subject}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300">
                {q.subtopic}
              </span>
              <DifficultyBadge level={q.difficulty} />
              <span className="text-xs text-charcoal-500 dark:text-charcoal-400">
                {q.target_exam} · grounding {Number(q.groundedness_score ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Approve"
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                disabled={busyId === q._id}
                onClick={() => act(q._id, 'approve')}
              >
                <CheckIcon size={14} />
              </button>
              <button
                type="button"
                title="Reject"
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                disabled={busyId === q._id}
                onClick={() => act(q._id, 'reject')}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          </div>

          <div className="text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">{q.question_text}</div>
          <div className="space-y-1">
            {q.options?.map((opt) => (
              <div
                key={opt.id}
                className={`text-xs px-2.5 py-1.5 rounded-lg ${
                  opt.id === q.correct_option
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-semibold'
                    : 'text-charcoal-600 dark:text-charcoal-300'
                }`}
              >
                <strong>{opt.id}.</strong> {opt.text}
              </div>
            ))}
          </div>
          <div className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed">
            <strong className="text-charcoal-700 dark:text-charcoal-300">Explanation:</strong> {q.solution_explanation}
          </div>
        </div>
      ))}
    </StepCard>
  );
};
