import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EyeIcon, TargetIcon, TrashIcon } from '../Icons';
import {
  Alert, BTN_OUTLINE, BTN_OUTLINE_SM, BTN_PRIMARY, Busy, CollapseButton, Dialog,
  DifficultyBadge, DifficultyMix, Empty, Field, INPUT_CLS, Picker, Section, Segmented, Stats, StepCard,
} from './PipelineUI';
import { JsonPanel } from './JsonPanel';
import { BLUEPRINT_EXAMPLE, DEFAULT_MIX, cleanBlueprint, errorText, mixTotal, validateBlueprintJson } from './pipelineUtils';

const sum = (arr, fn) => arr.reduce((n, x) => n + fn(x), 0);
const countTotal = (bp) => sum(bp.sections, (s) => sum(s.topics, (t) => sum(t.subtopics, (st) => Number(st.count) || 0)));

// Keep proportions when switching between exact counts and total + weights.
function toWeights(bp) {
  return {
    ...bp,
    total_questions: countTotal(bp) || 10,
    sections: bp.sections.map((s) => ({
      ...s,
      weight: sum(s.topics, (t) => sum(t.subtopics, (st) => Number(st.count) || 1)),
      topics: s.topics.map((t) => ({
        ...t,
        weight: sum(t.subtopics, (st) => Number(st.count) || 1),
        subtopics: t.subtopics.map((st) => ({ ...st, weight: Number(st.count) || 1, count: null })),
      })),
    })),
  };
}

function toCounts(bp) {
  const total = Number(bp.total_questions) || 10;
  const w = (n) => Number(n.weight) || 1;
  const sectionSum = sum(bp.sections, w);
  return {
    ...bp,
    total_questions: null,
    sections: bp.sections.map((s) => {
      const topicSum = sum(s.topics, w);
      return {
        ...s,
        weight: null,
        topics: s.topics.map((t) => {
          const stSum = sum(t.subtopics, w);
          return {
            ...t,
            weight: null,
            subtopics: t.subtopics.map((st) => ({
              ...st,
              weight: null,
              count: Math.max(1, Math.round((total * w(s) * w(t) * w(st)) / (sectionSum * topicSum * stSum))),
            })),
          };
        }),
      };
    }),
  };
}

const NumberCell = ({ value, onChange, min = 1, step = 1, placeholder = '1' }) => (
  <input
    type="number"
    min={min}
    step={step}
    className={`${INPUT_CLS} w-24 py-1.5`}
    value={value ?? ''}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
  />
);

export const BlueprintStep = ({ subject, taxonomyDoc }) => {
  const taxonomyTree = taxonomyDoc?.tree || [];
  const [blueprint, setBlueprint] = useState(null);
  const [mode, setMode] = useState('counts');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultCount, setDefaultCount] = useState(2);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // A subject can hold several blueprints — e.g. "Part A" over 5 topics and
  // "Part B" over the other 5 — each with its own size, weights and mix.
  const [names, setNames] = useState([]);
  const [activeName, setActiveName] = useState('Default');

  const [planSub, setPlanSub] = useState('');
  const [planTotal, setPlanTotal] = useState('');
  const [planQuizzes, setPlanQuizzes] = useState(1);
  const [planShownQuiz, setPlanShownQuiz] = useState(1);
  const [collapsedTopics, setCollapsedTopics] = useState(() => new Set());
  const toggleTopic = (key) =>
    setCollapsedTopics((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const [collapsedPreviewTopics, setCollapsedPreviewTopics] = useState(() => new Set());
  const togglePreviewTopic = (key) =>
    setCollapsedPreviewTopics((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const [plan, setPlan] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');

  const load = useCallback(async (name = activeName) => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const list = await api.generation.listBlueprints(subject).catch(() => []);
      setNames(list.map((b) => b.name));
      const wanted = list.some((b) => b.name === name) ? name : (list[0]?.name || 'Default');
      setActiveName(wanted);
      const bp = await api.generation.getBlueprint(subject, wanted);
      setBlueprint(bp);
      setMode(bp.total_questions ? 'weights' : 'counts');
      setDirty(false);
      setCollapsedTopics(new Set(
        bp.sections.flatMap((s, si) => s.topics.map((t) => `${si}-${t.topic}`))
      ));
    } catch {
      setBlueprint(null);
    } finally {
      setLoading(false);
    }
    // activeName is read as the default argument only; re-running on every rename
    // would fight the user mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  useEffect(() => {
    load('Default');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // { kind: 'new' | 'delete' | 'switch', to?: string }
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);

  const closeDialog = () => {
    setDialog(null);
    setDialogError('');
    setDialogBusy(false);
  };

  const switchBlueprint = (name) => {
    if (name === activeName) return;
    if (dirty) return setDialog({ kind: 'switch', to: name });
    setMessage('');
    load(name);
  };

  const createBlueprint = (name) => {
    if (names.some((n) => n.toLowerCase() === name.toLowerCase()))
      return setDialogError(`"${subject}" already has a blueprint named "${name}".`);
    closeDialog();
    setError('');
    setActiveName(name);
    setBlueprint({ subject, name, total_questions: null, difficulty: DEFAULT_MIX, sections: [] });
    setMode('counts');
    setDirty(true);
    setPlan(null);
    setMessage(`New blueprint "${name}" — click Build from structure, remove the topics it should not cover, then Save.`);
  };

  const removeBlueprint = async () => {
    setDialogBusy(true);
    setDialogError('');
    try {
      await api.generation.deleteBlueprint(subject, activeName);
      const gone = activeName;
      closeDialog();
      setDirty(false);
      setMessage(`Deleted blueprint "${gone}".`);
      load('Default');
    } catch (err) {
      setDialogError(errorText(err));
      setDialogBusy(false);
    }
  };

  const edit = (next) => {
    setBlueprint(next);
    setDirty(true);
    setMessage('');
  };

  const buildStarter = async () => {
    setError('');
    try {
      const built = await api.generation.starterBlueprint(subject, defaultCount);
      edit(built);
      setMode('counts');
      setPlan(null);
      setCollapsedTopics(new Set(
        built.sections.flatMap((s, si) => s.topics.map((t) => `${si}-${t.topic}`))
      ));
      setMessage(`Draft built from the structure with ${defaultCount} per subtopic — adjust, then Save.`);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const switchMode = (next) => {
    if (!blueprint || next === mode) return;
    edit(next === 'weights' ? toWeights(blueprint) : toCounts(blueprint));
    setMode(next);
  };

  const patchSection = (si, patch) =>
    edit({ ...blueprint, sections: blueprint.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const patchTopic = (si, ti, patch) =>
    patchSection(si, { topics: blueprint.sections[si].topics.map((t, i) => (i === ti ? { ...t, ...patch } : t)) });
  const patchSubtopic = (si, ti, sti, patch) =>
    patchTopic(si, ti, {
      subtopics: blueprint.sections[si].topics[ti].subtopics.map((st, i) => (i === sti ? { ...st, ...patch } : st)),
    });
  const removeSection = (si) => edit({ ...blueprint, sections: blueprint.sections.filter((_, i) => i !== si) });
  const removeTopic = (si, ti) => patchSection(si, { topics: blueprint.sections[si].topics.filter((_, i) => i !== ti) });
  const removeSubtopic = (si, ti, sti) =>
    patchTopic(si, ti, { subtopics: blueprint.sections[si].topics[ti].subtopics.filter((_, i) => i !== sti) });

  // Topics/subtopics already in this blueprint, so the picker only offers what's
  // genuinely missing — and names come from the taxonomy, so they match what was
  // actually generated into the bank rather than a free-typed string nothing can find.
  const existingTopics = (si) => new Set((blueprint.sections[si]?.topics || []).map((t) => t.topic));
  const existingSubtopics = (si, ti) =>
    new Set((blueprint.sections[si]?.topics[ti]?.subtopics || []).map((st) => st.subtopic));

  const availableTopics = (si) => {
    const subSubject = blueprint.sections[si]?.sub_subject ?? null;
    const have = existingTopics(si);
    const seen = new Set();
    return taxonomyTree
      .filter((e) => (e.sub_subject || null) === subSubject)
      .filter((e) => !have.has(e.topic) && !seen.has(e.topic) && seen.add(e.topic))
      .map((e) => e.topic);
  };

  const availableSubtopics = (si, ti) => {
    const subSubject = blueprint.sections[si]?.sub_subject ?? null;
    const topic = blueprint.sections[si]?.topics[ti]?.topic;
    const have = existingSubtopics(si, ti);
    const names = taxonomyTree
      .filter((e) => (e.sub_subject || null) === subSubject && e.topic === topic)
      .flatMap((e) => e.subtopics || []);
    return [...new Set(names)].filter((s) => !have.has(s));
  };

  const addTopic = (si, topic) => {
    if (!topic) return;
    patchSection(si, {
      topics: [{ topic, subtopics: [] }, ...blueprint.sections[si].topics],
    });
  };

  const addSubtopic = (si, ti, subtopic) => {
    if (!subtopic) return;
    const base = mode === 'weights' ? { subtopic } : { subtopic, count: defaultCount };
    patchTopic(si, ti, { subtopics: [base, ...blueprint.sections[si].topics[ti].subtopics] });
  };

  const availableSections = () => {
    const allowed = taxonomyDoc?.sub_subjects || [];
    if (!allowed.length) return [];
    const have = new Set(blueprint.sections.map((s) => s.sub_subject));
    return allowed.filter((name) => !have.has(name));
  };

  const addSection = (subSubject) => {
    if (!subSubject) return;
    edit({ ...blueprint, sections: [{ sub_subject: subSubject, topics: [] }, ...blueprint.sections] });
  };

  const save = async () => {
    setError('');
    setMessage('');
    if (mixTotal(blueprint.difficulty) !== 100) return setError('Difficulty mix must add up to 100%.');
    setSaving(true);
    try {
      const saved = await api.generation.saveBlueprint(
        cleanBlueprint({ ...blueprint, subject, name: activeName }, mode)
      );
      setBlueprint(saved);
      setNames((prev) => (prev.includes(activeName) ? prev : [...prev, activeName].sort()));
      setDirty(false);
      setPlan(null);
      setMessage(`Blueprint "${activeName}" saved.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    setPlanError('');
    setPlanning(true);
    try {
      const result = await api.generation.planBlueprint(subject, {
        sub_subject: planSub || null,
        questions_per_quiz: planTotal ? Number(planTotal) : null,
        blueprint_name: activeName,
        quizzes: planQuizzes,
      });
      setPlan(result);
      setPlanShownQuiz(1);
      setCollapsedPreviewTopics(new Set(
        [...new Set(result.quiz_plans[0].slots.map((slot) => `${slot.sub_subject || ''}|${slot.topic}`))]
      ));
    } catch (err) {
      setPlanError(errorText(err));
    } finally {
      setPlanning(false);
    }
  };

  const weights = mode === 'weights';
  const example = BLUEPRINT_EXAMPLE.replace('"Science"', JSON.stringify(subject));
  const perQuiz = blueprint ? (weights ? blueprint.total_questions : countTotal(blueprint)) : 0;

  return (
    <>
      <StepCard
        icon={<TargetIcon size={20} />}
        title="Blueprint"
        tag={subject}
        subtitle="The shape of one quiz: how many questions come from each subtopic and the easy / medium / hard mix."
        actions={
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className={`${INPUT_CLS} w-auto max-w-[200px] py-1.5`}
                title="Which blueprint of this subject to edit"
                value={activeName}
                onChange={(e) => switchBlueprint(e.target.value)}
              >
                {(names.includes(activeName) ? names : [...names, activeName]).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button type="button" className={BTN_OUTLINE_SM} onClick={() => setDialog({ kind: 'new' })}>New</button>
              <button
                type="button"
                className={BTN_OUTLINE_SM}
                onClick={() => setDialog({ kind: 'delete' })}
                disabled={!names.includes(activeName) || names.length < 2}
                title={names.length < 2 ? "A subject needs at least one blueprint" : `Delete "${activeName}"`}
              >
                Delete
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className={BTN_OUTLINE_SM} onClick={buildStarter}>Build from structure</button>
              <input type="number" min="1" className={`${INPUT_CLS} w-16 py-1.5`} title="Questions per subtopic in the draft"
                value={defaultCount} onChange={(e) => setDefaultCount(Math.max(1, parseInt(e.target.value, 10) || 1))} />
              <span className="text-[11px] text-charcoal-400 dark:text-charcoal-500">per subtopic</span>
            </div>
            <JsonPanel
              title="Blueprint"
              example={example}
              validate={(data) =>
                validateBlueprintJson(data) ||
                (data.subject !== subject
                  ? `This JSON is for "${data.subject}", but the selected subject is "${subject}". Switch subject at the top, or fix "subject".`
                  : null)
              }
              getCurrent={() => (blueprint ? cleanBlueprint({ ...blueprint, subject }, mode) : JSON.parse(example))}
              onLoad={(data) => {
                const next = { difficulty: DEFAULT_MIX, ...data };
                edit(next);
                setMode(data.total_questions ? 'weights' : 'counts');
                setPlan(null);
                setCollapsedTopics(new Set(
                  next.sections.flatMap((s, si) => s.topics.map((t) => `${si}-${t.topic}`))
                ));
                setMessage('Loaded from JSON — review, then Save.');
              }}
              onSave={async (data) => {
                const saved = await api.generation.saveBlueprint(data);
                setBlueprint(saved);
                setMode(saved.total_questions ? 'weights' : 'counts');
                setDirty(false);
                setPlan(null);
                setCollapsedTopics(new Set(
                  saved.sections.flatMap((s, si) => s.topics.map((t) => `${si}-${t.topic}`))
                ));
                setMessage('Blueprint saved from JSON.');
              }}
            />
          </>
        }
        footerNote={
          blueprint
            ? weights
              ? 'Weights are relative to their siblings (empty = 1): sub-subjects 40 / 35 / 25 give 40% / 35% / 25% of each quiz.'
              : 'Only include subtopics that already have questions in the bank — anything else shows up as missing when you assemble.'
            : null
        }
        footer={
          blueprint && (
            <>
              {dirty && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                  Unsaved changes
                </span>
              )}
              <button type="button" className={BTN_OUTLINE} onClick={load} disabled={saving || !dirty}>Discard</button>
              <button type="button" className={BTN_PRIMARY} onClick={save} disabled={saving}>
                {saving ? <Busy label="Saving..." /> : 'Save blueprint'}
              </button>
            </>
          )
        }
      >
        <Alert type="success">{message}</Alert>
        <Alert type="error">{error}</Alert>

        {loading && <Busy label="Loading blueprint..." />}
        {!loading && !blueprint && (
          <Empty>No blueprint saved for {subject} yet — click <strong>Build from structure</strong> to start from your subtopics, or paste one via <strong>JSON</strong>.</Empty>
        )}

        {!loading && blueprint && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Section title="Quiz size">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Size by" hint={weights ? 'Set a total and relative weights' : 'Set the exact number per subtopic'}>
                    <Segmented
                      value={mode}
                      onChange={switchMode}
                      options={[{ value: 'counts', label: 'Exact counts' }, { value: 'weights', label: 'Total + weights' }]}
                    />
                  </Field>
                  <Field label="Questions per quiz" hint={weights ? 'Split across subtopics by weight' : 'Sum of the counts below'}>
                    <input
                      type="number"
                      min="1"
                      className={`${INPUT_CLS} max-w-[200px]`}
                      value={perQuiz ?? ''}
                      disabled={!weights}
                      onChange={(e) => edit({ ...blueprint, total_questions: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Difficulty">
                <DifficultyMix value={blueprint.difficulty || DEFAULT_MIX} onChange={(difficulty) => edit({ ...blueprint, difficulty })} label="Default mix for every quiz" />
              </Section>
            </div>

            <Section
              title="Breakdown"
              aside={
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" className={BTN_OUTLINE_SM} onClick={() => setCollapsedTopics(new Set())}>Expand all</button>
                  <button
                    type="button"
                    className={BTN_OUTLINE_SM}
                    onClick={() => setCollapsedTopics(new Set(
                      blueprint.sections.flatMap((s, si) => s.topics.map((t) => `${si}-${t.topic}`))
                    ))}
                  >
                    Collapse all
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Sub-subject · Topic · Subtopic</th>
                      <th className="px-3 py-2.5 w-[130px]">{weights ? 'Weight' : 'Questions'}</th>
                      <th className="px-3 py-2.5 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                    {blueprint.sections.map((s, si) => (
                      <React.Fragment key={`s${si}`}>
                        <tr className="bg-charcoal-50 dark:bg-charcoal-850/80 font-extrabold">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider">
                                {s.sub_subject || 'Whole subject'}
                              </span>
                              {s.difficulty && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[11px] font-bold">
                                  custom mix
                                </span>
                              )}
                              {availableTopics(si).length > 0 && (
                                <Picker
                                  width={260}
                                  placeholder="Add topic…"
                                  options={availableTopics(si)}
                                  onSelect={(t) => addTopic(si, t)}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">{weights && <NumberCell value={s.weight} step={0.5} min={0.1} onChange={(v) => patchSection(si, { weight: v })} />}</td>
                          <td className="px-3 py-2">
                            <button type="button" className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Remove section" onClick={() => removeSection(si)}><TrashIcon size={15} /></button>
                          </td>
                        </tr>
                        {s.topics.map((t, ti) => {
                          const key = `${si}-${t.topic}`;
                          const collapsed = collapsedTopics.has(key);
                          return (
                            <React.Fragment key={`t${si}-${t.topic}`}>
                              <tr className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                                <td className="px-3 py-2 pl-7 font-bold">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CollapseButton collapsed={collapsed} onClick={() => toggleTopic(key)} title={collapsed ? 'Expand' : 'Collapse'} />
                                    <span>
                                      {t.topic}
                                      <span className="font-normal ml-1.5 text-[0.78rem] text-charcoal-500 dark:text-charcoal-400">
                                        ({t.subtopics.length})
                                      </span>
                                      {t.difficulty && (
                                        <span className="ml-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[11px] font-bold">
                                          custom mix
                                        </span>
                                      )}
                                    </span>
                                    {availableSubtopics(si, ti).length > 0 && (
                                      <Picker
                                        width={240}
                                        placeholder="Add subtopic…"
                                        options={availableSubtopics(si, ti)}
                                        onSelect={(s) => addSubtopic(si, ti, s)}
                                      />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">{weights && <NumberCell value={t.weight} step={0.5} min={0.1} onChange={(v) => patchTopic(si, ti, { weight: v })} />}</td>
                                <td className="px-3 py-2">
                                  <button type="button" className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Remove topic" onClick={() => removeTopic(si, ti)}><TrashIcon size={15} /></button>
                                </td>
                              </tr>
                              {!collapsed && t.subtopics.map((st, sti) => (
                                <tr key={`st${si}-${t.topic}-${st.subtopic}`} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                                  <td className="px-3 py-2 pl-12 text-charcoal-500 dark:text-charcoal-400">{st.subtopic}</td>
                                  <td className="px-3 py-2">
                                    {weights ? (
                                      <NumberCell value={st.weight} step={0.5} min={0.1} onChange={(v) => patchSubtopic(si, ti, sti, { weight: v })} />
                                    ) : (
                                      <NumberCell value={st.count} onChange={(v) => patchSubtopic(si, ti, sti, { count: v })} />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button type="button" className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Remove subtopic" onClick={() => removeSubtopic(si, ti, sti)}><TrashIcon size={15} /></button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {availableSections().length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-2.5">
                  <Picker
                    width={260}
                    placeholder="Add sub-subject section…"
                    options={availableSections()}
                    onSelect={addSection}
                  />
                </div>
              )}
            </Section>
          </>
        )}
      </StepCard>

      {blueprint && (
        <StepCard
          icon={<EyeIcon size={20} />}
          title="Preview one quiz"
          tag="uses the saved blueprint"
          subtitle="The exact subtopic × difficulty breakdown of a single quiz. Nothing is created."
          footer={
            <button type="button" className={BTN_OUTLINE} onClick={preview} disabled={planning || dirty}>
              {planning ? <Busy label="Planning..." /> : dirty ? 'Save first to preview' : 'Preview'}
            </button>
          }
        >
          <Alert type="error">{planError}</Alert>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Sub-subject">
              <select className={INPUT_CLS} value={planSub} onChange={(e) => setPlanSub(e.target.value)}>
                <option value="">Whole blueprint</option>
                {blueprint.sections.filter((s) => s.sub_subject).map((s) => <option key={s.sub_subject} value={s.sub_subject}>{s.sub_subject} only</option>)}
              </select>
            </Field>
            <Field label="Questions per quiz" hint="Empty = blueprint size">
              <input type="number" min="1" className={INPUT_CLS} value={planTotal} placeholder={String(perQuiz || '')}
                onChange={(e) => setPlanTotal(e.target.value)} />
            </Field>
            <Field
              label="Quizzes to preview"
              hint="Each quiz rotates onto a different set of subtopics — plan the whole batch to see real coverage"
            >
              <input type="number" min="1" max="200" className={INPUT_CLS} value={planQuizzes}
                onChange={(e) => setPlanQuizzes(Math.max(1, parseInt(e.target.value, 10) || 1))} />
            </Field>
          </div>

          {plan && (() => {
            const shown = plan.quiz_plans[Math.min(planShownQuiz, plan.quiz_plans.length) - 1];
            return (
              <>
                <Stats
                  items={[
                    ...(plan.quizzes > 1 ? [{ label: 'Subtopics reached (whole batch)', value: `${plan.subtopics_reached}` }] : []),
                    { label: 'Questions in this quiz', value: shown.questions, tone: 'primary' },
                    { label: 'Easy', value: shown.by_difficulty.Easy, tone: 'success' },
                    { label: 'Medium', value: shown.by_difficulty.Medium, tone: 'warning' },
                    { label: 'Hard', value: shown.by_difficulty.Hard, tone: 'danger' },
                  ]}
                />

                {plan.quizzes > 1 && (
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    {plan.quiz_plans.map((qp) => (
                      <button
                        key={qp.quiz}
                        type="button"
                        className={
                          qp.quiz === planShownQuiz
                            ? 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-institutional-600 text-white shadow-sm'
                            : 'px-3 py-1.5 rounded-lg text-xs font-bold text-charcoal-600 dark:text-charcoal-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors'
                        }
                        onClick={() => setPlanShownQuiz(qp.quiz)}
                      >
                        Quiz #{qp.quiz}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <button type="button" className={BTN_OUTLINE_SM} onClick={() => setCollapsedPreviewTopics(new Set())}>Expand all</button>
                  <button
                    type="button"
                    className={BTN_OUTLINE_SM}
                    onClick={() => setCollapsedPreviewTopics(new Set(
                      [...new Set(shown.slots.map((slot) => `${slot.sub_subject || ''}|${slot.topic}`))]
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
                        <th className="px-3 py-2.5">Difficulty</th>
                        <th className="px-3 py-2.5 text-right">Questions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                      {(() => {
                        const byTopic = [];
                        const index = new Map();
                        for (const slot of shown.slots) {
                          const key = `${slot.sub_subject || ''}|${slot.topic}`;
                          if (!index.has(key)) {
                            index.set(key, byTopic.length);
                            byTopic.push({ key, sub_subject: slot.sub_subject, topic: slot.topic, rows: [] });
                          }
                          byTopic[index.get(key)].rows.push(slot);
                        }
                        return byTopic.map((group) => {
                          const collapsed = collapsedPreviewTopics.has(group.key);
                          const total = group.rows.reduce((sum, r) => sum + r.count, 0);
                          return (
                            <React.Fragment key={group.key}>
                              <tr className="bg-charcoal-50 dark:bg-charcoal-850/80 font-extrabold">
                                <td className="px-3 py-2">
                                  <CollapseButton collapsed={collapsed} onClick={() => togglePreviewTopic(group.key)} title={collapsed ? 'Expand' : 'Collapse'} />
                                  {group.sub_subject && <span className="text-charcoal-500 dark:text-charcoal-400 mr-1.5">{group.sub_subject} ·</span>}
                                  {group.topic}
                                  <span className="font-normal ml-1.5 text-[0.78rem] text-charcoal-500 dark:text-charcoal-400">
                                    ({group.rows.length} subtopic{group.rows.length === 1 ? '' : 's'})
                                  </span>
                                </td>
                                <td className="px-3 py-2" />
                                <td className="px-3 py-2 text-right">{total}</td>
                              </tr>
                              {!collapsed && group.rows.map((slot, i) => (
                                <tr key={i} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                                  <td className="px-3 py-2 pl-8 text-charcoal-500 dark:text-charcoal-400">{slot.subtopic}</td>
                                  <td className="px-3 py-2"><DifficultyBadge level={slot.difficulty} /></td>
                                  <td className="px-3 py-2 text-right">{slot.count}</td>
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
            );
          })()}
        </StepCard>
      )}

      <Dialog
        open={dialog?.kind === 'new'}
        title="New blueprint"
        body={`A second blueprint for ${subject} — give it the topics it should cover, its own size, weights and difficulty mix. Existing blueprints are untouched.`}
        prompt
        placeholder="e.g. Part A"
        confirmLabel="Create"
        error={dialogError}
        onConfirm={createBlueprint}
        onClose={closeDialog}
      />

      <Dialog
        open={dialog?.kind === 'delete'}
        title={`Delete "${activeName}"?`}
        body={`This removes the blueprint from ${subject}. Tests already assembled from it are kept.`}
        confirmLabel="Delete"
        danger
        busy={dialogBusy}
        error={dialogError}
        onConfirm={removeBlueprint}
        onClose={closeDialog}
      />

      <Dialog
        open={dialog?.kind === 'switch'}
        title="Discard unsaved changes?"
        body={`"${activeName}" has edits that have not been saved. Switching to "${dialog?.to}" will lose them.`}
        confirmLabel="Discard and switch"
        danger
        onConfirm={() => {
          const to = dialog.to;
          closeDialog();
          setMessage('');
          load(to);
        }}
        onClose={closeDialog}
      />
    </>
  );
};
