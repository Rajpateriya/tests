import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EyeIcon, TargetIcon, TrashIcon } from '../Icons';
import { Alert, Busy, DifficultyBadge, DifficultyMix, Empty, Field, Section, Segmented, Stats, StepCard } from './PipelineUI';
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
    className="form-input sm pp-num"
    value={value ?? ''}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
  />
);

export const BlueprintStep = ({ subject }) => {
  const [blueprint, setBlueprint] = useState(null);
  const [mode, setMode] = useState('counts');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultCount, setDefaultCount] = useState(2);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [planSub, setPlanSub] = useState('');
  const [planTotal, setPlanTotal] = useState('');
  const [plan, setPlan] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const bp = await api.generation.getBlueprint(subject);
      setBlueprint(bp);
      setMode(bp.total_questions ? 'weights' : 'counts');
      setDirty(false);
    } catch {
      setBlueprint(null);
    } finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (next) => {
    setBlueprint(next);
    setDirty(true);
    setMessage('');
  };

  const buildStarter = async () => {
    setError('');
    try {
      edit(await api.generation.starterBlueprint(subject, defaultCount));
      setMode('counts');
      setPlan(null);
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

  const save = async () => {
    setError('');
    setMessage('');
    if (mixTotal(blueprint.difficulty) !== 100) return setError('Difficulty mix must add up to 100%.');
    setSaving(true);
    try {
      const saved = await api.generation.saveBlueprint(cleanBlueprint({ ...blueprint, subject }, mode));
      setBlueprint(saved);
      setDirty(false);
      setPlan(null);
      setMessage('Blueprint saved.');
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
      setPlan(await api.generation.planBlueprint(subject, {
        sub_subject: planSub || null,
        questions_per_quiz: planTotal ? Number(planTotal) : null,
      }));
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
            <div className="pp-inline">
              <button type="button" className="btn btn-secondary btn-sm" onClick={buildStarter}>Build from structure</button>
              <input type="number" min="1" className="form-input sm pp-num" style={{ width: 56 }} title="Questions per subtopic in the draft"
                value={defaultCount} onChange={(e) => setDefaultCount(Math.max(1, parseInt(e.target.value, 10) || 1))} />
              <span className="pp-hint" style={{ marginTop: 0 }}>per subtopic</span>
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
                edit({ difficulty: DEFAULT_MIX, ...data });
                setMode(data.total_questions ? 'weights' : 'counts');
                setPlan(null);
                setMessage('Loaded from JSON — review, then Save.');
              }}
              onSave={async (data) => {
                const saved = await api.generation.saveBlueprint(data);
                setBlueprint(saved);
                setMode(saved.total_questions ? 'weights' : 'counts');
                setDirty(false);
                setPlan(null);
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
              {dirty && <span className="badge badge-medium">Unsaved changes</span>}
              <button type="button" className="btn btn-outline" onClick={load} disabled={saving || !dirty}>Discard</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
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
            <Section title="Quiz size">
              <div className="pp-grid cols-2">
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
                    className="form-input"
                    style={{ maxWidth: 200 }}
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

            <Section title="Breakdown">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sub-subject · Topic · Subtopic</th>
                      <th style={{ width: 130 }}>{weights ? 'Weight' : 'Questions'}</th>
                      <th style={{ width: 48 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {blueprint.sections.map((s, si) => (
                      <React.Fragment key={`s${si}`}>
                        <tr className="group-row">
                          <td>
                            <span className="badge badge-subject">{s.sub_subject || 'Whole subject'}</span>
                            {s.difficulty && <span className="badge badge-medium" style={{ marginLeft: 6 }}>custom mix</span>}
                          </td>
                          <td>{weights && <NumberCell value={s.weight} step={0.5} min={0.1} onChange={(v) => patchSection(si, { weight: v })} />}</td>
                          <td><button type="button" className="icon-btn" title="Remove section" onClick={() => removeSection(si)}><TrashIcon size={15} /></button></td>
                        </tr>
                        {s.topics.map((t, ti) => (
                          <React.Fragment key={`t${si}-${ti}`}>
                            <tr>
                              <td style={{ paddingLeft: '1.6rem', fontWeight: 700 }}>
                                {t.topic}
                                {t.difficulty && <span className="badge badge-medium" style={{ marginLeft: 6 }}>custom mix</span>}
                              </td>
                              <td>{weights && <NumberCell value={t.weight} step={0.5} min={0.1} onChange={(v) => patchTopic(si, ti, { weight: v })} />}</td>
                              <td><button type="button" className="icon-btn" title="Remove topic" onClick={() => removeTopic(si, ti)}><TrashIcon size={15} /></button></td>
                            </tr>
                            {t.subtopics.map((st, sti) => (
                              <tr key={`st${si}-${ti}-${sti}`}>
                                <td style={{ paddingLeft: '3.1rem', color: 'var(--text-secondary)' }}>{st.subtopic}</td>
                                <td>
                                  {weights ? (
                                    <NumberCell value={st.weight} step={0.5} min={0.1} onChange={(v) => patchSubtopic(si, ti, sti, { weight: v })} />
                                  ) : (
                                    <NumberCell value={st.count} onChange={(v) => patchSubtopic(si, ti, sti, { count: v })} />
                                  )}
                                </td>
                                <td><button type="button" className="icon-btn" title="Remove subtopic" onClick={() => removeSubtopic(si, ti, sti)}><TrashIcon size={15} /></button></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
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
            <button type="button" className="btn btn-secondary" onClick={preview} disabled={planning || dirty}>
              {planning ? <Busy label="Planning..." /> : dirty ? 'Save first to preview' : 'Preview'}
            </button>
          }
        >
          <Alert type="error">{planError}</Alert>
          <div className="pp-grid cols-3">
            <Field label="Sub-subject">
              <select className="form-input" value={planSub} onChange={(e) => setPlanSub(e.target.value)}>
                <option value="">Whole blueprint</option>
                {blueprint.sections.filter((s) => s.sub_subject).map((s) => <option key={s.sub_subject} value={s.sub_subject}>{s.sub_subject} only</option>)}
              </select>
            </Field>
            <Field label="Questions per quiz" hint="Empty = blueprint size">
              <input type="number" min="1" className="form-input" value={planTotal} placeholder={String(perQuiz || '')}
                onChange={(e) => setPlanTotal(e.target.value)} />
            </Field>
          </div>

          {plan && (
            <>
              <Stats
                items={[
                  { label: 'Questions per quiz', value: plan.questions_per_quiz, tone: 'primary' },
                  { label: 'Easy', value: plan.by_difficulty.Easy, tone: 'success' },
                  { label: 'Medium', value: plan.by_difficulty.Medium, tone: 'warning' },
                  { label: 'Hard', value: plan.by_difficulty.Hard, tone: 'danger' },
                ]}
              />
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Sub-subject</th><th>Topic</th><th>Subtopic</th><th>Difficulty</th><th className="num">Questions</th></tr>
                  </thead>
                  <tbody>
                    {plan.slots.map((slot, i) => (
                      <tr key={i}>
                        <td className="muted">{slot.sub_subject || '—'}</td>
                        <td className="muted">{slot.topic}</td>
                        <td>{slot.subtopic}</td>
                        <td><DifficultyBadge level={slot.difficulty} /></td>
                        <td className="num">{slot.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </StepCard>
      )}
    </>
  );
};
