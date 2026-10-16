import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LayersIcon, RefreshCwIcon } from '../Icons';
import {
  Alert,
  BTN_OUTLINE,
  BTN_OUTLINE_SM,
  BTN_PRIMARY,
  Busy,
  CollapseButton,
  DifficultyBadge,
  Empty,
  Field,
  INPUT_CLS,
  Section,
  Stats,
  StepCard,
} from './PipelineUI';
import { errorText } from './pipelineUtils';

const LEVEL_NAMES = ['Easy', 'Medium', 'Hard'];

// Bank rows (one per subtopic x difficulty) -> one row per subtopic with E/M/H cells.
function pivot(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.sub_subject || ''}|${r.topic}|${r.subtopic}`;
    if (!map.has(key)) map.set(key, { sub_subject: r.sub_subject, topic: r.topic, subtopic: r.subtopic, cells: {} });
    map.get(key).cells[r.difficulty] = r;
  });
  return [...map.values()];
}

const intInput = (setter, min = 1) => (e) => setter(Math.max(min, parseInt(e.target.value, 10) || min));

const PILL_CLS =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300';

export const AssembleStep = ({ subject, taxonomyDoc, targetExam, onAssembled, onGoToMocks }) => {
  const [bank, setBank] = useState(null);
  const [bankError, setBankError] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [subSubject, setSubSubject] = useState('');
  const [blueprintNames, setBlueprintNames] = useState([]);
  const [blueprintName, setBlueprintName] = useState('Default');
  const [quizzes, setQuizzes] = useState(2);
  const [perQuiz, setPerQuiz] = useState('');
  const [maxReuse, setMaxReuse] = useState(1);
  const [titlePrefix, setTitlePrefix] = useState('');
  const [duration, setDuration] = useState(30);
  const [posMarks, setPosMarks] = useState(2);
  const [negMarks, setNegMarks] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [collapsedBankTopics, setCollapsedBankTopics] = useState(() => new Set());
  const toggleBankTopic = (key) =>
    setCollapsedBankTopics((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const loadBank = useCallback(async () => {
    setBankError('');
    setBankLoading(true);
    try {
      const data = await api.generation.bank(subject, targetExam);
      setBank(data);
      setCollapsedBankTopics(new Set(
        [...new Set(data.rows.map((r) => `${r.sub_subject || ''}|${r.topic}`))]
      ));
    } catch (err) {
      setBankError(errorText(err));
    } finally {
      setBankLoading(false);
    }
  }, [subject, targetExam]);

  useEffect(() => {
    loadBank();
  }, [loadBank]);

  useEffect(() => {
    let cancelled = false;
    api.generation.listBlueprints(subject)
      .then((list) => {
        if (cancelled) return;
        const found = list.map((b) => b.name);
        setBlueprintNames(found);
        setBlueprintName((prev) => (found.includes(prev) ? prev : found[0] || 'Default'));
      })
      .catch(() => { if (!cancelled) setBlueprintNames([]); });
    return () => { cancelled = true; };
  }, [subject]);

  const subSubjects = taxonomyDoc?.sub_subjects || [];

  const assemble = async () => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await api.generation.assemble({
        target_exam: targetExam,
        subject,
        blueprint_name: blueprintName || null,
        sub_subject: subSubject || null,
        quizzes,
        questions_per_quiz: perQuiz ? Number(perQuiz) : null,
        max_question_reuse: maxReuse,
        title_prefix: titlePrefix || null,
        duration_minutes: duration,
        positive_marks: posMarks,
        negative_marks: negMarks,
      });
      setResult(res);
      loadBank();
      onAssembled();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const bankRows = bank ? pivot(bank.rows.filter((r) => !subSubject || r.sub_subject === subSubject)) : [];

  return (
    <StepCard
      icon={<LayersIcon size={20} />}
      title="Assemble quizzes"
      tag={`${subject} · ${targetExam}`}
      subtitle="Builds ready-to-take tests from the bank, each following the saved blueprint exactly. Least-used questions go first; only complete quizzes are created."
      footerNote={`${quizzes} quiz${quizzes === 1 ? '' : 'zes'} of ${perQuiz || 'blueprint-size'} questions from ${subSubject || 'the whole subject'} using the "${blueprintName}" blueprint, ${duration} min, +${posMarks} / −${negMarks}.`}
      footer={
        <>
          <button type="button" className={BTN_PRIMARY} onClick={assemble} disabled={busy}>
            {busy ? <Busy label="Assembling..." /> : `Assemble ${quizzes} quiz${quizzes === 1 ? '' : 'zes'}`}
          </button>
          {result?.created > 0 && onGoToMocks && (
            <button type="button" className={BTN_OUTLINE} onClick={onGoToMocks}>View in Mock Tests</button>
          )}
        </>
      }
    >
      <Alert type="error">{error}</Alert>

      <Section title="What to build">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Field label="Blueprint" hint={blueprintNames.length > 1 ? `${blueprintNames.length} saved for this subject` : 'Which saved blueprint to follow'}>
            <select
              className={INPUT_CLS}
              value={blueprintName}
              onChange={(e) => setBlueprintName(e.target.value)}
              disabled={blueprintNames.length < 2}
            >
              {(blueprintNames.length ? blueprintNames : [blueprintName]).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Sub-subject">
            <select className={INPUT_CLS} value={subSubject} onChange={(e) => setSubSubject(e.target.value)} disabled={!subSubjects.length}>
              <option value="">Whole subject</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s} only</option>)}
            </select>
          </Field>
          <Field label="Quizzes">
            <input type="number" min="1" max="200" className={INPUT_CLS} value={quizzes} onChange={intInput(setQuizzes)} />
          </Field>
          <Field label="Questions per quiz" hint="Empty = blueprint size">
            <input type="number" min="1" className={INPUT_CLS} value={perQuiz} placeholder="Blueprint"
              onChange={(e) => setPerQuiz(e.target.value)} />
          </Field>
          <Field label="Max tests per question" hint="1 = never repeat a question">
            <input type="number" min="1" className={INPUT_CLS} value={maxReuse} onChange={intInput(setMaxReuse)} />
          </Field>
        </div>
      </Section>

      <Section title="Test settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Field label="Title prefix" hint="Tests are numbered #1, #2, …">
            <input className={INPUT_CLS} value={titlePrefix} placeholder={`${subSubject || subject} Mock`}
              onChange={(e) => setTitlePrefix(e.target.value)} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" min="1" className={INPUT_CLS} value={duration} onChange={intInput(setDuration)} />
          </Field>
          <Field label="Marks per correct">
            <input type="number" step="0.5" min="0.5" className={INPUT_CLS} value={posMarks}
              onChange={(e) => setPosMarks(parseFloat(e.target.value) || 2)} />
          </Field>
          <Field label="Negative marks">
            <input type="number" step="0.25" min="0" className={INPUT_CLS} value={negMarks}
              onChange={(e) => setNegMarks(Math.max(0, parseFloat(e.target.value) || 0))} />
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850/60 border border-charcoal-200 dark:border-charcoal-800">
        <span className="text-xs text-charcoal-500 dark:text-charcoal-400">
          {`${quizzes} quiz${quizzes === 1 ? '' : 'zes'} of ${perQuiz || 'blueprint-size'} questions from ${subSubject || 'the whole subject'} using the "${blueprintName}" blueprint, ${duration} min, +${posMarks} / −${negMarks}.`}
        </span>
        <button type="button" className={BTN_PRIMARY} onClick={assemble} disabled={busy}>
          {busy ? <Busy label="Assembling..." /> : `Assemble ${quizzes} quiz${quizzes === 1 ? '' : 'zes'}`}
        </button>
      </div>

      <Section
        title="Question bank"
        aside={
          <span className="flex items-center gap-2 flex-wrap normal-case tracking-normal font-semibold">
            {bank && (
              <>
                <span className={PILL_CLS}><strong>{bank.total}</strong> approved</span>
                <span className={PILL_CLS}><strong>{bank.unused}</strong> unused</span>
                <span className={PILL_CLS}><strong>{bank.pending_review}</strong> awaiting review</span>
              </>
            )}
            <button
              type="button"
              title="Refresh bank"
              onClick={loadBank}
              disabled={bankLoading}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-charcoal-400 hover:text-institutional-600 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 transition-colors disabled:opacity-50"
            >
              <RefreshCwIcon size={15} />
            </button>
          </span>
        }
      >
        <Alert type="error">{bankError}</Alert>
        {!bank && bankLoading && <Busy label="Loading bank..." />}
        {bank && !bankRows.length && (
          <Empty>No approved questions for {subSubject || 'this subject'} and {targetExam} yet — generate some first.</Empty>
        )}
        {bankRows.length > 0 && (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <button type="button" className={BTN_OUTLINE_SM} onClick={() => setCollapsedBankTopics(new Set())}>Expand all</button>
              <button
                type="button"
                className={BTN_OUTLINE_SM}
                onClick={() => setCollapsedBankTopics(new Set(
                  [...new Set(bankRows.map((r) => `${r.sub_subject || ''}|${r.topic}`))]
                ))}
              >
                Collapse all
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Sub-subject · Topic · Subtopic</th>
                    {LEVEL_NAMES.map((l) => <th key={l} className="px-3 py-2.5 text-right">{l}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                  {(() => {
                    const byTopic = [];
                    const index = new Map();
                    for (const r of bankRows) {
                      const key = `${r.sub_subject || ''}|${r.topic}`;
                      if (!index.has(key)) {
                        index.set(key, byTopic.length);
                        byTopic.push({ key, sub_subject: r.sub_subject, topic: r.topic, rows: [] });
                      }
                      byTopic[index.get(key)].rows.push(r);
                    }
                    return byTopic.map((group) => {
                      const collapsed = collapsedBankTopics.has(group.key);
                      const totals = LEVEL_NAMES.map((l) =>
                        group.rows.reduce((sum, r) => sum + (r.cells[l]?.unused || 0), 0)
                      );
                      return (
                        <React.Fragment key={group.key}>
                          <tr className="bg-charcoal-50 dark:bg-charcoal-850/80 font-extrabold">
                            <td className="px-3 py-2">
                              <CollapseButton
                                collapsed={collapsed}
                                onClick={() => toggleBankTopic(group.key)}
                                title={collapsed ? 'Expand' : 'Collapse'}
                              />
                              {group.sub_subject && (
                                <span className="text-charcoal-500 dark:text-charcoal-400 mr-1.5">{group.sub_subject} ·</span>
                              )}
                              {group.topic}
                              <span className="text-charcoal-500 dark:text-charcoal-400 font-normal ml-1.5 text-[11px]">
                                ({group.rows.length} subtopic{group.rows.length === 1 ? '' : 's'})
                              </span>
                            </td>
                            {totals.map((t, i) => (
                              <td key={i} className="px-3 py-2 text-right text-charcoal-500 dark:text-charcoal-400">{t}</td>
                            ))}
                          </tr>
                          {!collapsed && group.rows.map((r) => (
                            <tr key={`${r.sub_subject}|${r.topic}|${r.subtopic}`} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                              <td className="px-3 py-2 pl-8 text-charcoal-600 dark:text-charcoal-300">{r.subtopic}</td>
                              {LEVEL_NAMES.map((l) => {
                                const cell = r.cells[l];
                                return (
                                  <td
                                    key={l}
                                    title="unused / total"
                                    className={`px-3 py-2 text-right ${cell?.unused ? '' : 'text-rose-500 dark:text-rose-400'}`}
                                  >
                                    {cell ? `${cell.unused} / ${cell.count}` : '0 / 0'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
        {bankRows.length > 0 && (
          <div className="mt-2 text-xs text-charcoal-500 dark:text-charcoal-400">
            Each cell is unused / total. Red cells have no fresh questions left.
          </div>
        )}
      </Section>

      {result && (
        <Section title="Result">
          <Alert type={result.not_created ? 'warning' : 'success'}>
            Created {result.created} of {result.requested} quiz{result.requested === 1 ? '' : 'zes'}, {result.questions_per_quiz} questions each.
            {result.not_created ? ` The bank supports ${result.max_possible} — see what's missing below.` : ' They now appear under Mock Tests.'}
          </Alert>
          <div className="mt-3">
            <Stats
              items={[
                { label: 'Created', value: result.created, tone: 'success' },
                { label: 'Not created', value: result.not_created, tone: result.not_created ? 'danger' : '' },
                { label: 'Bank supports', value: result.max_possible, tone: 'primary' },
                { label: 'Questions each', value: result.questions_per_quiz },
              ]}
            />
          </div>
          {result.tests.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Test</th>
                    <th className="px-3 py-2.5 text-right">Questions</th>
                    <th className="px-3 py-2.5">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                  {result.tests.map((t) => (
                    <tr key={t.id} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                      <td className="px-3 py-2 font-extrabold text-charcoal-900 dark:text-white">{t.title}</td>
                      <td className="px-3 py-2 text-right">{t.total_questions}</td>
                      <td className="px-3 py-2 text-charcoal-500 dark:text-charcoal-400 font-mono text-[11px]">{t.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.substituted?.length > 0 && (
            <>
              <div className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                Filled from elsewhere
              </div>
              <Alert type="info">
                Where a subtopic had no unused questions left, the quiz was kept at full size by
                falling back — first to the same subtopic's nearest difficulty, then to a sibling
                subtopic under the same topic, and only as a last resort to another topic. The
                "Taken from" column shows which. Difficulty mix, and for borrowed rows the topic
                balance, differ slightly from the blueprint.
              </Alert>
              <div className="mt-2.5 overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Topic</th>
                      <th className="px-3 py-2.5">Subtopic</th>
                      <th className="px-3 py-2.5">Wanted</th>
                      <th className="px-3 py-2.5">Used instead</th>
                      <th className="px-3 py-2.5">Taken from</th>
                      <th className="px-3 py-2.5 text-right">Questions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                    {result.substituted.map((s, i) => (
                      <tr key={i} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                        <td className="px-3 py-2 text-charcoal-500 dark:text-charcoal-400">{s.topic}</td>
                        <td className="px-3 py-2">{s.subtopic}</td>
                        <td className="px-3 py-2"><DifficultyBadge level={s.wanted} /></td>
                        <td className="px-3 py-2"><DifficultyBadge level={s.used} /></td>
                        <td className={`px-3 py-2 ${s.borrowed_from ? '' : 'text-charcoal-500 dark:text-charcoal-400'}`}>
                          {s.borrowed_topic
                            ? `${s.borrowed_topic} / ${s.borrowed_from}`
                            : s.borrowed_from || 'same subtopic'}
                        </td>
                        <td className="px-3 py-2 text-right">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {result.missing.length > 0 && (
            <>
              <div className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                Subtopics too short at every difficulty — generate more, then assemble again
              </div>
              <div className="overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Sub-subject</th>
                      <th className="px-3 py-2.5">Topic</th>
                      <th className="px-3 py-2.5">Subtopic</th>
                      <th className="px-3 py-2.5 text-right">Needed / quiz</th>
                      <th className="px-3 py-2.5 text-right">Unused left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                    {result.missing.map((m, i) => (
                      <tr key={i} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                        <td className="px-3 py-2 text-charcoal-500 dark:text-charcoal-400">{m.sub_subject || '—'}</td>
                        <td className="px-3 py-2 text-charcoal-500 dark:text-charcoal-400">{m.topic}</td>
                        <td className="px-3 py-2">{m.subtopic}</td>
                        <td className="px-3 py-2 text-right">{m.needed_per_quiz}</td>
                        <td className="px-3 py-2 text-right text-rose-500 dark:text-rose-400">{m.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>
      )}
    </StepCard>
  );
};
