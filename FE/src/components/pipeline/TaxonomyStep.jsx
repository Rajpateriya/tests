import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LayersIcon, PlusIcon, TrashIcon } from '../Icons';
import { Alert, Busy, Empty, Field, INPUT_CLS, Section, Segmented, StepCard, BTN_PRIMARY } from './PipelineUI';
import { JsonPanel } from './JsonPanel';
import {
  TAXONOMY_EXAMPLE,
  editorToPayload,
  errorText,
  payloadToEditor,
  treeToEditor,
  validateTaxonomyJson,
} from './pipelineUtils';

const EMPTY = { hasSubSubjects: true, subSubjects: [{ name: '', topics: [] }], topics: [] };

const SubtopicChips = ({ subtopics, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim();
    if (value && !subtopics.some((s) => s.toLowerCase() === value.toLowerCase())) onChange([...subtopics, value]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {subtopics.map((s) => (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-200"
          key={s}
        >
          {s}
          <button type="button" title="Remove subtopic" className="text-charcoal-400 hover:text-rose-600 ml-1" onClick={() => onChange(subtopics.filter((x) => x !== s))}>×</button>
        </span>
      ))}
      <input
        className={`${INPUT_CLS} w-48`}
        placeholder="+ Subtopic, press Enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
};

const TopicList = ({ topics, onChange }) => {
  const update = (i, patch) => onChange(topics.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  return (
    <>
      {topics.map((topic, i) => (
        <div className="p-3 rounded-xl border border-charcoal-200 dark:border-charcoal-800 bg-charcoal-50/60 dark:bg-charcoal-850/40 space-y-2.5" key={i}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider">
              Topic
            </span>
            <input
              className={`${INPUT_CLS} flex-1 min-w-[180px]`}
              placeholder="e.g. Chemical Reactions and Equations"
              value={topic.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <span className="text-[11px] font-semibold text-charcoal-400 dark:text-charcoal-500 whitespace-nowrap">
              {topic.subtopics.length} subtopic{topic.subtopics.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Remove topic"
              onClick={() => onChange(topics.filter((_, idx) => idx !== i))}
            >
              <TrashIcon size={16} />
            </button>
          </div>
          <SubtopicChips subtopics={topic.subtopics} onChange={(subtopics) => update(i, { subtopics })} />
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-300 transition-colors"
        onClick={() => onChange([...topics, { name: '', subtopics: [] }])}
      >
        <PlusIcon size={15} />
        Add topic
      </button>
    </>
  );
};

export const TaxonomyStep = ({ subject, taxonomyDoc, onSaved }) => {
  const [name, setName] = useState(subject || '');
  const [editor, setEditor] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(subject || '');
  }, [subject]);

  useEffect(() => {
    setEditor(taxonomyDoc ? treeToEditor(taxonomyDoc) : EMPTY);
  }, [taxonomyDoc]);

  const setMode = (withSubs) => {
    if (withSubs === editor.hasSubSubjects) return;
    setEditor(
      withSubs
        ? { hasSubSubjects: true, subSubjects: [{ name: '', topics: editor.topics }], topics: [] }
        : { hasSubSubjects: false, subSubjects: [], topics: editor.subSubjects.flatMap((s) => s.topics) }
    );
  };

  const updateSub = (i, patch) =>
    setEditor({ ...editor, subSubjects: editor.subSubjects.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const save = async () => {
    setError('');
    setMessage('');
    if (!name.trim()) return setError('Give the subject a name.');
    if (editor.hasSubSubjects && !editor.subSubjects.some((s) => s.name.trim())) {
      return setError('Add at least one sub-subject, or switch to "Topics only".');
    }
    setSaving(true);
    try {
      const res = await api.generation.setTaxonomy(editorToPayload(name.trim(), editor));
      setMessage(`Saved "${res.subject}"${res.sub_subjects.length ? ` — ${res.sub_subjects.join(', ')}` : ''} (${res.topics} topics).`);
      onSaved(res.subject);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const subtopicTotal = (editor.hasSubSubjects ? editor.subSubjects.flatMap((s) => s.topics) : editor.topics)
    .reduce((n, t) => n + t.subtopics.length, 0);

  return (
    <StepCard
      icon={<LayersIcon size={20} />}
      title="Subject structure"
      tag={subject || 'New subject'}
      subtitle="Sub-subjects, topics and subtopics. Uploads are tagged against this list, and generation covers every subtopic in it."
      actions={
        <JsonPanel
          title="Subject structure"
          example={TAXONOMY_EXAMPLE}
          validate={validateTaxonomyJson}
          getCurrent={() => editorToPayload(name.trim() || 'Science', editor)}
          onLoad={(data) => {
            setName(data.subject.trim());
            setEditor(payloadToEditor(data));
            setMessage('Loaded from JSON — review below, then Save.');
          }}
          onSave={async (data) => {
            const res = await api.generation.setTaxonomy({ ...data, subject: data.subject.trim() });
            setMessage(`Saved "${res.subject}" from JSON (${res.topics} topics).`);
            onSaved(res.subject);
          }}
        />
      }
      footerNote="Saving replaces the whole structure. Subtopics added automatically by uploads are already shown — keep them unless you mean to drop them."
      footer={
        <button type="button" className={BTN_PRIMARY} onClick={save} disabled={saving}>
          {saving ? <Busy label="Saving..." /> : 'Save structure'}
        </button>
      }
    >
      <Alert type="success">{message}</Alert>
      <Alert type="error">{error}</Alert>

      <Section title="Subject">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Subject name" hint={subject ? 'Renaming creates a separate subject.' : 'e.g. Science, Quantitative Aptitude'}>
            <input className={INPUT_CLS} placeholder="e.g. Science" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Organised as" hint={editor.hasSubSubjects ? 'Science → Physics / Chemistry / Biology → topics' : 'Topics directly under the subject'}>
            <Segmented
              value={editor.hasSubSubjects ? 'subs' : 'topics'}
              onChange={(v) => setMode(v === 'subs')}
              options={[{ value: 'subs', label: 'Sub-subjects' }, { value: 'topics', label: 'Topics only' }]}
            />
          </Field>
        </div>
      </Section>

      <Section title={`Structure · ${subtopicTotal} subtopic${subtopicTotal === 1 ? '' : 's'}`}>
        <div className="space-y-3">
          {editor.hasSubSubjects ? (
            <>
              {editor.subSubjects.map((sub, i) => (
                <div className="p-3.5 rounded-2xl border border-charcoal-200 dark:border-charcoal-800 space-y-3" key={i}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider">
                      Sub-subject
                    </span>
                    <input
                      className={`${INPUT_CLS} flex-1 min-w-[180px]`}
                      placeholder="e.g. Chemistry"
                      value={sub.name}
                      onChange={(e) => updateSub(i, { name: e.target.value })}
                    />
                    <span className="text-[11px] font-semibold text-charcoal-400 dark:text-charcoal-500 whitespace-nowrap">
                      {sub.topics.length} topic{sub.topics.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remove sub-subject"
                      onClick={() => setEditor({ ...editor, subSubjects: editor.subSubjects.filter((_, idx) => idx !== i) })}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="space-y-2.5 pl-1">
                    {!sub.topics.length && <Empty>No topics yet — they can also be filled in automatically when you upload theory for {sub.name || 'this sub-subject'}.</Empty>}
                    <TopicList topics={sub.topics} onChange={(topics) => updateSub(i, { topics })} />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-300 transition-colors"
                onClick={() => setEditor({ ...editor, subSubjects: [...editor.subSubjects, { name: '', topics: [] }] })}
              >
                <PlusIcon size={15} />
                Add sub-subject
              </button>
            </>
          ) : (
            <div className="space-y-2.5">
              <TopicList topics={editor.topics} onChange={(topics) => setEditor({ ...editor, topics })} />
            </div>
          )}
        </div>
      </Section>
    </StepCard>
  );
};
