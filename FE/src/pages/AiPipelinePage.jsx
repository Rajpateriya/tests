import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CpuIcon, RefreshCwIcon, ShieldIcon } from '../components/Icons';
import { Alert, Busy, Field } from '../components/pipeline/PipelineUI';
import { EXAMS, errorText } from '../components/pipeline/pipelineUtils';
import { TaxonomyStep } from '../components/pipeline/TaxonomyStep';
import { UploadStep } from '../components/pipeline/UploadStep';
import { GenerateStep } from '../components/pipeline/GenerateStep';
import { QuestionsStep } from '../components/pipeline/QuestionsStep';
import { BlueprintStep } from '../components/pipeline/BlueprintStep';
import { AssembleStep } from '../components/pipeline/AssembleStep';
import { ReviewStep } from '../components/pipeline/ReviewStep';

const STEPS = [
  { id: 'structure', label: 'Structure', desc: 'Topics & subtopics' },
  { id: 'upload', label: 'Upload', desc: 'Theory & past papers' },
  { id: 'generate', label: 'Generate', desc: 'Fill the bank' },
  { id: 'questions', label: 'Questions', desc: 'Browse the bank' },
  { id: 'blueprint', label: 'Blueprint', desc: 'Shape one quiz' },
  { id: 'assemble', label: 'Assemble', desc: 'Create tests' },
  { id: 'review', label: 'Review', desc: 'Flagged questions' },
];

const CountChip = ({ n, noun }) => (
  <span className="pp-stat-chip"><strong>{n}</strong> {noun}{n === 1 ? '' : 's'}</span>
);

const AdminSignIn = () => {
  const { login, loading, token } = useAuth();
  const [email, setEmail] = useState('admin@mockexam.com');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    await login(email, password);
  };

  return (
    <div className="card pp-card" style={{ maxWidth: 460, margin: '2rem auto 0' }}>
      <div className="pp-card-head">
        <div className="pp-card-title">
          <div className="pp-card-icon"><ShieldIcon size={20} /></div>
          <div>
            <h2>Sign in as admin</h2>
            <p>The pipeline talks to the real backend, so it needs a real admin session — the demo Admin switch in the navbar isn't enough.</p>
          </div>
        </div>
      </div>
      <form className="pp-card-body" onSubmit={submit}>
        {tried && !loading && token?.startsWith('demo') && (
          <Alert type="error">Sign-in failed — check the password and that the backend is running on port 8000.</Alert>
        )}
        <Field label="Email">
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !password}>
          {loading ? <Busy label="Signing in..." /> : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

// Address: /ai-pipeline/<step>?subject=<subject>&exam=<exam>, so a refresh or back keeps the step and subject.
const readAddress = () => {
  const stepId = window.location.pathname.split('/')[2];
  const q = new URLSearchParams(window.location.search);
  return {
    step: STEPS.some((s) => s.id === stepId) ? stepId : 'structure',
    subject: q.get('subject') || '',
    exam: q.get('exam') || 'SSC CGL',
  };
};

export const AiPipelinePage = ({ onGoToMocks }) => {
  const { user, token } = useAuth();
  const isRealAdmin = user?.role === 'admin' && !!token && !token.startsWith('demo');

  const [boot] = useState(readAddress);
  const [step, setStep] = useState(boot.step);
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState(boot.subject);
  const [targetExam, setTargetExam] = useState(boot.exam);

  // Address bar follows the step (new history entry) and the subject/exam (replaces the entry).
  const lastStep = React.useRef(null);
  useEffect(() => {
    const q = new URLSearchParams();
    if (subject) q.set('subject', subject);
    q.set('exam', targetExam);
    const want = `/ai-pipeline/${step}?${q.toString()}`;
    const have = window.location.pathname + window.location.search;
    if (have !== want) {
      const push = lastStep.current !== null && lastStep.current !== step;
      window.history[push ? 'pushState' : 'replaceState'](null, '', want);
    }
    lastStep.current = step;
  }, [step, subject, targetExam]);

  // Back/forward: follow the address
  useEffect(() => {
    const onPop = () => {
      if (!window.location.pathname.startsWith('/ai-pipeline/')) return;
      const a = readAddress();
      setStep(a.step);
      setSubject(a.subject);
      setTargetExam(a.exam);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [taxonomyDoc, setTaxonomyDoc] = useState(null);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const loadSubjects = useCallback(async (select) => {
    setLoadingSubjects(true);
    setError('');
    try {
      const list = await api.generation.listTaxonomies();
      setSubjects(list);
      setSubject((current) => select ?? (current || list[0]?.subject || ''));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  const loadDoc = useCallback(async () => {
    if (!subject) return setTaxonomyDoc(null);
    try {
      setTaxonomyDoc(await api.generation.getTaxonomy(subject));
    } catch {
      setTaxonomyDoc(null);
    }
  }, [subject]);

  useEffect(() => {
    if (isRealAdmin) loadSubjects();
  }, [isRealAdmin, loadSubjects]);

  useEffect(() => {
    if (isRealAdmin) loadDoc();
  }, [isRealAdmin, loadDoc]);

  const refreshAll = () => {
    loadSubjects(subject || undefined);
    loadDoc();
  };

  if (!isRealAdmin) {
    return (
      <div className="main-content pp">
        <AdminSignIn />
      </div>
    );
  }

  const needsSubject = step !== 'structure' && step !== 'review' && !subject;
  const props = { subject, taxonomyDoc, targetExam };
  const tree = taxonomyDoc?.tree || [];

  return (
    <div className="main-content pp">
      <div className="hero-banner" style={{ padding: '1.4rem 1.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div className="pp-tag" style={{ marginLeft: 0, marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CpuIcon size={13} />
            AI Question Pipeline
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>From textbook PDF to ready-to-take mock</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 720 }}>
            Define the subject, upload theory, generate grounded questions into the bank, shape a quiz with a blueprint, and assemble tests.
          </p>
        </div>
      </div>

      <div className="card pp-workspace" style={{ marginBottom: '1.25rem' }}>
        <div className="pp-context">
          <Field label="Subject">
            <select
              className="form-input"
              value={subject}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '__new__') {
                  setSubject('');
                  setStep('structure');
                } else {
                  setSubject(value);
                }
              }}
            >
              {!subject && <option value="">{subjects.length ? 'New subject' : 'No subjects yet'}</option>}
              {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.subject}</option>)}
              <option value="__new__">+ New subject…</option>
            </select>
          </Field>
          <Field label="Exam">
            <select className="form-input" value={targetExam} onChange={(e) => setTargetExam(e.target.value)}>
              {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <div className="pp-context-stats">
            {loadingSubjects ? (
              <Busy label="Loading..." />
            ) : taxonomyDoc ? (
              <>
                {taxonomyDoc.sub_subjects?.length > 0 && <CountChip n={taxonomyDoc.sub_subjects.length} noun="sub-subject" />}
                <CountChip n={tree.length} noun="topic" />
                <CountChip n={tree.reduce((n, e) => n + e.subtopics.length, 0)} noun="subtopic" />
              </>
            ) : (
              <span className="pp-stat-chip">{subject ? 'No structure yet' : 'Create a subject to begin'}</span>
            )}
            <button type="button" className="icon-btn" title="Reload subjects" onClick={refreshAll}>
              <RefreshCwIcon size={16} />
            </button>
          </div>
        </div>

        <div className="pp-stepper">
          {STEPS.map((s, i) => (
            <button
              type="button"
              key={s.id}
              className={`pp-step ${step === s.id ? 'active' : ''}`}
              onClick={() => setStep(s.id)}
            >
              <span className="pp-step-dot">{i + 1}</span>
              <span className="pp-step-label">{s.label}</span>
              <span className="pp-step-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {needsSubject ? (
        <Alert type="info">Pick a subject above, or create one in the Structure step first.</Alert>
      ) : (
        <>
          {step === 'structure' && (
            <TaxonomyStep
              subject={subject}
              taxonomyDoc={taxonomyDoc}
              onSaved={(saved) => {
                loadSubjects(saved);
                if (saved === subject) loadDoc();
              }}
            />
          )}
          {step === 'upload' && <UploadStep {...props} onUploaded={loadDoc} />}
          {step === 'generate' && <GenerateStep {...props} onGenerated={() => {}} />}
          {step === 'questions' && <QuestionsStep {...props} />}
          {step === 'blueprint' && <BlueprintStep {...props} />}
          {step === 'assemble' && <AssembleStep {...props} onAssembled={() => {}} onGoToMocks={onGoToMocks} />}
          {step === 'review' && <ReviewStep subject={subject} onChanged={() => {}} />}
        </>
      )}
    </div>
  );
};
