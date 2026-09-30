import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LayersIcon, PlusIcon, TrashIcon } from '../Icons';
import { Alert, Busy, Empty, Field, Section, Segmented, StepCard } from './PipelineUI';
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
    <div className="pp-chips">
      {subtopics.map((s) => (
        <span className="chip" key={s}>
          {s}
          <button type="button" title="Remove subtopic" onClick={() => onChange(subtopics.filter((x) => x !== s))}>×</button>
        </span>
      ))}
      <input
        className="form-input sm"
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
        <div className="pp-topic" key={i}>
          <div className="pp-topic-head">
            <span className="badge badge-topic">Topic</span>
            <input
              className="form-input sm"
              placeholder="e.g. Chemical Reactions and Equations"
              value={topic.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <span className="pp-branch-meta">{topic.subtopics.length} subtopic{topic.subtopics.length === 1 ? '' : 's'}</span>
            <button type="button" className="icon-btn" title="Remove topic" onClick={() => onChange(topics.filter((_, idx) => idx !== i))}>
              <TrashIcon size={16} />
            </button>
          </div>
          <SubtopicChips subtopics={topic.subtopics} onChange={(subtopics) => update(i, { subtopics })} />
        </div>
      ))}
      <button type="button" className="pp-link-btn" onClick={() => onChange([...topics, { name: '', subtopics: [] }])}>
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
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <Busy label="Saving..." /> : 'Save structure'}
        </button>
      }
    >
      <Alert type="success">{message}</Alert>
      <Alert type="error">{error}</Alert>

      <Section title="Subject">
        <div className="pp-grid cols-2">
          <Field label="Subject name" hint={subject ? 'Renaming creates a separate subject.' : 'e.g. Science, Quantitative Aptitude'}>
            <input className="form-input" placeholder="e.g. Science" value={name} onChange={(e) => setName(e.target.value)} />
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
        <div className="pp-tree">
          {editor.hasSubSubjects ? (
            <>
              {editor.subSubjects.map((sub, i) => (
                <div className="pp-branch" key={i}>
                  <div className="pp-branch-head">
                    <span className="badge badge-subject">Sub-subject</span>
                    <input
                      className="form-input sm"
                      placeholder="e.g. Chemistry"
                      value={sub.name}
                      onChange={(e) => updateSub(i, { name: e.target.value })}
                    />
                    <span className="pp-branch-meta">{sub.topics.length} topic{sub.topics.length === 1 ? '' : 's'}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Remove sub-subject"
                      onClick={() => setEditor({ ...editor, subSubjects: editor.subSubjects.filter((_, idx) => idx !== i) })}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="pp-branch-body">
                    {!sub.topics.length && <Empty>No topics yet — they can also be filled in automatically when you upload theory for {sub.name || 'this sub-subject'}.</Empty>}
                    <TopicList topics={sub.topics} onChange={(topics) => updateSub(i, { topics })} />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="pp-link-btn"
                onClick={() => setEditor({ ...editor, subSubjects: [...editor.subSubjects, { name: '', topics: [] }] })}
              >
                <PlusIcon size={15} />
                Add sub-subject
              </button>
            </>
          ) : (
            <div className="pp-branch">
              <div className="pp-branch-body">
                <TopicList topics={editor.topics} onChange={(topics) => setEditor({ ...editor, topics })} />
              </div>
            </div>
          )}
        </div>
      </Section>
    </StepCard>
  );
};
