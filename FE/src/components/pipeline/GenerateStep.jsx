import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { SparklesIcon } from '../Icons';
import { CustomSelect } from '../CustomSelect';
import { Alert, BTN_PRIMARY, Busy, DifficultyMix, Field, INPUT_CLS, Section, Segmented, Stats, StepCard } from './PipelineUI';
import { DEFAULT_MIX, LEVELS, errorText, mixTotal, topicsFor } from './pipelineUtils';

const Split = ({ value, highlight }) => (
  <span className={`font-mono text-[13px] ${highlight ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-charcoal-700 dark:text-charcoal-300'}`}>
    {LEVELS.map((l) => value?.[l] ?? 0).join(' / ')}
  </span>
);

export const GenerateStep = ({ subject, taxonomyDoc, targetExam, onGenerated }) => {
  const [subSubject, setSubSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [perSubtopic, setPerSubtopic] = useState(10);
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [allowAi, setAllowAi] = useState(false);
  const [styleNotes, setStyleNotes] = useState('');
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
        per_subtopic: Number(perSubtopic) || 10,
        difficulty: mix,
        allow_ai_knowledge: allowAi,
        style_notes: styleNotes.trim() || null,
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
        <button type="button" className={BTN_PRIMARY} onClick={run} disabled={busy || mixTotal(mix) !== 100 || !subtopicCount}>
          {busy ? <Busy label={`Generating… ${elapsed}s`} /> : 'Generate questions'}
        </button>
      }
    >
      <Alert type="error">{error}</Alert>

      <Section title="Scope">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Sub-subject">
            <CustomSelect className={INPUT_CLS} value={subSubject} onChange={(e) => { setSubSubject(e.target.value); setTopic(''); }} disabled={!subSubjects.length}>
              <option value="">{subSubjects.length ? 'All sub-subjects' : 'Whole subject'}</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </CustomSelect>
          </Field>
          <Field label="Topic">
            <CustomSelect className={INPUT_CLS} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">All topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </CustomSelect>
          </Field>
          <Field label="Target per subtopic" hint="Questions to have in the bank for each subtopic">
            <input
              type="number"
              min="1"
              max="200"
              className={INPUT_CLS}
              value={perSubtopic}
              onWheel={(e) => e.target.blur()}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  setPerSubtopic('');
                  return;
                }
                const n = parseInt(v, 10);
                if (!isNaN(n)) setPerSubtopic(Math.min(200, Math.max(0, n)));
              }}
              onBlur={() => {
                if (perSubtopic === '' || Number(perSubtopic) < 1) {
                  setPerSubtopic(1);
                }
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title="Difficulty">
        <DifficultyMix value={mix} onChange={setMix} label="Split each subtopic's target by" />
      </Section>

      <Section title="Source and style">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="When a subtopic has no theory"
            hint={
              allowAi
                ? 'The AI writes from its own knowledge and the questions go straight into the bank, marked "AI knowledge". Nothing checks them against a source, so spot-check some.'
                : 'Those subtopics are skipped. Upload theory for them to generate verified questions.'
            }
          >
            <Segmented
              value={allowAi ? 'ai' : 'skip'}
              onChange={(v) => setAllowAi(v === 'ai')}
              options={[{ value: 'skip', label: 'Skip them' }, { value: 'ai', label: 'Use AI knowledge' }]}
            />
          </Field>
          <Field label="Exam style notes (optional)" hint={`Added to the built-in ${targetExam} style. e.g. "statement-based, application questions, avoid trivia".`}>
            <textarea
              className={INPUT_CLS}
              rows={3}
              maxLength={500}
              placeholder="Describe how this exam's questions look"
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
            />
          </Field>
        </div>
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
          {result.saved_from_ai_knowledge > 0 && (
            <div className="mt-2.5">
              <Alert type="warning">
                {result.saved_from_ai_knowledge} of these were written from the AI's own knowledge (no theory) and are marked "AI knowledge" in the bank. They are not checked against any source.
              </Alert>
            </div>
          )}
          {result.skipped_no_theory?.length > 0 && (
            <div className="mt-2.5">
              <Alert type="warning">
                Skipped — no theory uploaded yet: {result.skipped_no_theory.map((s) => [s.sub_subject, s.topic, s.subtopic].filter(Boolean).join(' › ')).join(', ')}
              </Alert>
            </div>
          )}
          <div className="mt-3">
            <Stats
              items={[
                { label: 'Saved to bank', value: result.saved, tone: 'success' },
                { label: 'Flagged for review', value: result.flagged_for_review, tone: result.flagged_for_review ? 'warning' : '' },
                { label: 'Duplicates rejected', value: result.duplicates_rejected },
                { label: 'Still short', value: result.shortfall, tone: result.shortfall ? 'danger' : '' },
              ]}
            />
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Sub-subject</th>
                  <th className="px-3 py-2.5">Topic</th>
                  <th className="px-3 py-2.5">Subtopic</th>
                  <th className="px-3 py-2.5">Target</th>
                  <th className="px-3 py-2.5">Had</th>
                  <th className="px-3 py-2.5">Added</th>
                  <th className="px-3 py-2.5">Short</th>
                  <th className="px-3 py-2.5 text-right">Dupes</th>
                </tr>
                <tr>
                  <th colSpan={3} className="px-3" />
                  <th colSpan={4} className="px-3 pt-0 font-semibold normal-case tracking-normal text-[10px]">easy / medium / hard</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                {result.per_subtopic.map((r) => (
                  <tr key={`${r.sub_subject}|${r.topic}|${r.subtopic}`} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                    <td className="px-3 py-2 text-charcoal-400 dark:text-charcoal-500">{r.sub_subject || '—'}</td>
                    <td className="px-3 py-2 text-charcoal-400 dark:text-charcoal-500">{r.topic}</td>
                    <td className="px-3 py-2">
                      {r.subtopic}
                      {r.skipped === 'no_theory' && (
                        <span className="ml-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                          no theory
                        </span>
                      )}
                      {r.source === 'ai_knowledge' && (
                        <span className="ml-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          AI knowledge
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2"><Split value={r.target} /></td>
                    <td className="px-3 py-2"><Split value={r.already_in_bank} /></td>
                    <td className="px-3 py-2"><Split value={r.accepted} /></td>
                    <td className="px-3 py-2"><Split value={r.shortfall} highlight={Object.values(r.shortfall || {}).some(Boolean)} /></td>
                    <td className="px-3 py-2 text-right">{r.duplicates_rejected}</td>
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
