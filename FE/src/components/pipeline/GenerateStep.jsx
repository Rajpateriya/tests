import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { SparklesIcon } from '../Icons';
import { Alert, Busy, DifficultyMix, Field, Section, Stats, StepCard } from './PipelineUI';
import { DEFAULT_MIX, LEVELS, errorText, mixTotal, topicsFor } from './pipelineUtils';

const Split = ({ value, highlight }) => (
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: highlight ? 'var(--danger)' : undefined, fontWeight: highlight ? 700 : 400 }}>
    {LEVELS.map((l) => value?.[l] ?? 0).join(' / ')}
  </span>
);

export const GenerateStep = ({ subject, taxonomyDoc, targetExam, onGenerated }) => {
  const [subSubject, setSubSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [perSubtopic, setPerSubtopic] = useState(10);
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!busy) return undefined;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const subSubjects = taxonomyDoc?.sub_subjects || [];
  const topics = topicsFor(taxonomyDoc, subSubject);
  const subtopicCount = (taxonomyDoc?.tree || [])
    .filter((e) => (!subSubject || e.sub_subject === subSubject) && (!topic || e.topic === topic))
    .reduce((n, e) => n + e.subtopics.length, 0);

  const run = async () => {
    setError('');
    setResult(null);
    setElapsed(0);
    setBusy(true);
    try {
      const res = await api.generation.generate({
        target_exam: targetExam,
        subject,
        sub_subject: subSubject || null,
        topic: topic || null,
        per_subtopic: perSubtopic,
        difficulty: mix,
      });
      setResult(res);
      onGenerated();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const scopeLabel = [subSubject || (subSubjects.length ? 'All sub-subjects' : null), topic].filter(Boolean).join(' › ') || 'Whole subject';

  return (
    <StepCard
      icon={<SparklesIcon size={20} />}
      title="Generate questions"
      tag={`${subject} · ${targetExam}`}
      subtitle="Each subtopic in scope is filled up to the target, split by difficulty and grounded in its theory. Only missing questions are generated, so running it again just tops up."
      footerNote={`${scopeLabel}: ${subtopicCount} subtopic${subtopicCount === 1 ? '' : 's'} × ${perSubtopic} = up to ${subtopicCount * perSubtopic} questions in the bank.`}
      footer={
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || mixTotal(mix) !== 100 || !subtopicCount}>
          {busy ? <Busy label={`Generating… ${elapsed}s`} /> : 'Generate questions'}
        </button>
      }
    >
      <Alert type="error">{error}</Alert>

      <Section title="Scope">
        <div className="pp-grid cols-3">
          <Field label="Sub-subject">
            <select className="form-input" value={subSubject} onChange={(e) => { setSubSubject(e.target.value); setTopic(''); }} disabled={!subSubjects.length}>
              <option value="">{subSubjects.length ? 'All sub-subjects' : 'Whole subject'}</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <select className="form-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">All topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Target per subtopic" hint="Questions to have in the bank for each subtopic">
            <input type="number" min="1" max="200" className="form-input" value={perSubtopic}
              onChange={(e) => setPerSubtopic(Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
          </Field>
        </div>
      </Section>

      <Section title="Difficulty">
        <DifficultyMix value={mix} onChange={setMix} label="Split each subtopic's target by" />
      </Section>

      {busy && (
        <Alert type="info">Generating in batches of 10 per subtopic. Big runs can take several minutes — progress is printed in the server console.</Alert>
      )}

      {result && (
        <Section title="Result">
          <Alert type={result.shortfall ? 'warning' : 'success'}>
            Saved {result.saved} new question{result.saved === 1 ? '' : 's'} across {result.subtopics} subtopic{result.subtopics === 1 ? '' : 's'}
            {result.shortfall ? ` — ${result.shortfall} still short. Run again, or upload more theory for those subtopics.` : '.'}
          </Alert>
          {result.skipped_no_theory?.length > 0 && (
            <div style={{ marginTop: '0.6rem' }}>
              <Alert type="warning">
                Skipped — no theory uploaded yet: {result.skipped_no_theory.map((s) => [s.sub_subject, s.topic, s.subtopic].filter(Boolean).join(' › ')).join(', ')}
              </Alert>
            </div>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            <Stats
              items={[
                { label: 'Saved to bank', value: result.saved, tone: 'success' },
                { label: 'Flagged for review', value: result.flagged_for_review, tone: result.flagged_for_review ? 'warning' : '' },
                { label: 'Duplicates rejected', value: result.duplicates_rejected },
                { label: 'Still short', value: result.shortfall, tone: result.shortfall ? 'danger' : '' },
              ]}
            />
          </div>
          <div className="data-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sub-subject</th>
                  <th>Topic</th>
                  <th>Subtopic</th>
                  <th>Target</th>
                  <th>Had</th>
                  <th>Added</th>
                  <th>Short</th>
                  <th className="num">Dupes</th>
                </tr>
                <tr>
                  <th colSpan={3} />
                  <th colSpan={4} style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, paddingTop: 0 }}>easy / medium / hard</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.per_subtopic.map((r) => (
                  <tr key={`${r.sub_subject}|${r.topic}|${r.subtopic}`}>
                    <td className="muted">{r.sub_subject || '—'}</td>
                    <td className="muted">{r.topic}</td>
                    <td>
                      {r.subtopic}
                      {r.skipped === 'no_theory' && <span className="badge badge-hard" style={{ marginLeft: 6 }}>no theory</span>}
                    </td>
                    <td><Split value={r.target} /></td>
                    <td><Split value={r.already_in_bank} /></td>
                    <td><Split value={r.accepted} /></td>
                    <td><Split value={r.shortfall} highlight={Object.values(r.shortfall || {}).some(Boolean)} /></td>
                    <td className="num">{r.duplicates_rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </StepCard>
  );
};
