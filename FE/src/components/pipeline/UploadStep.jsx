import React, { useState } from 'react';
import { api } from '../../services/api';
import { UploadIcon } from '../Icons';
import { CustomSelect } from '../CustomSelect';
import { Alert, BTN_PRIMARY, Busy, Dropzone, Field, INPUT_CLS, Section, Segmented, Stats, StepCard } from './PipelineUI';
import { errorText } from './pipelineUtils';

export const UploadStep = ({ subject, taxonomyDoc, targetExam, onUploaded }) => {
  const [kind, setKind] = useState('theory');
  const [subSubject, setSubSubject] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const subSubjects = taxonomyDoc?.sub_subjects || [];
  const isTheory = kind === 'theory';

  const upload = async () => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const args = { subject, subSubject: subSubject || null, files };
      const res = isTheory
        ? await api.generation.uploadTheory(args)
        : await api.generation.uploadPyq({ ...args, targetExam });
      setResult({ kind, ...res });
      setFiles([]);
      onUploaded();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const stats = (r) =>
    r.kind === 'theory'
      ? [
          { label: 'Chunks stored', value: r.chunks_ingested, tone: 'success' },
          { label: 'Already stored', value: r.chunks_duplicate },
          { label: 'Failed', value: r.chunks_failed, tone: r.chunks_failed ? 'danger' : '' },
          { label: 'Sub-subject unresolved', value: r.sub_subject_unresolved, tone: r.sub_subject_unresolved ? 'warning' : '' },
        ]
      : [
          { label: 'Questions stored', value: r.questions_ingested, tone: 'success' },
          { label: 'Duplicates skipped', value: r.duplicates_skipped },
          { label: 'Failed', value: r.questions_failed, tone: r.questions_failed ? 'danger' : '' },
          { label: 'Sub-subject unresolved', value: r.sub_subject_unresolved, tone: r.sub_subject_unresolved ? 'warning' : '' },
        ];

  return (
    <StepCard
      icon={<UploadIcon size={20} />}
      title="Upload content"
      tag={isTheory ? subject : `${subject} · ${targetExam}`}
      subtitle="Theory PDFs are the facts every question is grounded in. Past-year papers are optional — they teach the exam's tone and format."
      actions={
        <Segmented
          value={kind}
          onChange={(v) => { setKind(v); setResult(null); setError(''); }}
          options={[{ value: 'theory', label: 'Theory PDFs' }, { value: 'pyq', label: 'Past-year papers' }]}
        />
      }
      footerNote={
        isTheory
          ? 'Chunks already stored for this subject are skipped automatically, so re-uploading costs nothing.'
          : `Papers are stored for ${targetExam} — change the exam at the top of the page.`
      }
      footer={
        <button type="button" className={BTN_PRIMARY} onClick={upload} disabled={busy || !files.length}>
          {busy ? <Busy label="Uploading & tagging…" /> : `Upload ${files.length || ''} ${isTheory ? 'theory' : 'paper'} PDF${files.length === 1 ? '' : 's'}`}
        </button>
      }
    >
      <Alert type="error">{error}</Alert>

      <Section title="Where it goes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Sub-subject"
            hint={
              !subSubjects.length
                ? 'This subject has no sub-subjects.'
                : isTheory
                  ? 'A chapter belongs to one branch — pick it.'
                  : 'Leave on Auto for mixed papers: each question is tagged from the list.'
            }
          >
            <CustomSelect className={INPUT_CLS} value={subSubject} onChange={(e) => setSubSubject(e.target.value)} disabled={!subSubjects.length}>
              <option value="">{subSubjects.length ? 'Auto — LLM picks from the list' : '—'}</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </CustomSelect>
          </Field>
        </div>
      </Section>

      <Section title="Files">
        <Dropzone files={files} onFiles={setFiles} label={isTheory ? 'Drop theory PDFs here' : 'Drop past-year papers here'} />
      </Section>

      {isTheory && subSubjects.length > 0 && !subSubject && files.length > 0 && (
        <Alert type="warning">No sub-subject picked — the LLM will guess one per chunk. For a single-branch chapter, pick it above.</Alert>
      )}
      {busy && <Alert type="info">Reading and tagging the PDFs — this can take a few minutes for long chapters.</Alert>}

      {result && (
        <Section title="Result">
          <Alert type="success">
            {result.kind === 'theory' ? 'Theory' : 'Papers'} uploaded to {result.subject}
            {result.sub_subject ? ` → ${result.sub_subject}` : ''} · {result.files_processed} file{result.files_processed === 1 ? '' : 's'}
          </Alert>
          <div className="mt-3"><Stats items={stats(result)} /></div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">File</th>
                  {result.kind === 'theory' && <th className="px-3 py-2.5">Topic</th>}
                  <th className="px-3 py-2.5 text-right">Stored</th>
                  <th className="px-3 py-2.5 text-right">Skipped</th>
                  <th className="px-3 py-2.5 text-right">Failed</th>
                  <th className="px-3 py-2.5 text-right">Unresolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800">
                {result.per_file.map((f) => (
                  <tr key={f.source_pdf} className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50">
                    <td className="px-3 py-2">{f.source_pdf}</td>
                    {result.kind === 'theory' && <td className="px-3 py-2 text-charcoal-400 dark:text-charcoal-500">{f.topic || '—'}</td>}
                    <td className="px-3 py-2 text-right">{f.chunks_ingested ?? f.questions_ingested}</td>
                    <td className="px-3 py-2 text-right">{f.chunks_duplicate ?? f.duplicates_skipped}</td>
                    <td className="px-3 py-2 text-right">{f.chunks_failed ?? f.questions_failed}</td>
                    <td className="px-3 py-2 text-right">{f.sub_subject_unresolved}</td>
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
