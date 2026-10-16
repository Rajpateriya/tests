import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CpuIcon, RefreshCwIcon, ShieldIcon } from '../components/Icons';
import { Alert, Busy, Field, INPUT_CLS, BTN_PRIMARY } from '../components/pipeline/PipelineUI';
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
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300">
    <strong className="font-extrabold">{n}</strong> {noun}{n === 1 ? '' : 's'}
  </span>
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
    <div className="max-w-[460px] mx-auto mt-8 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-card p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-institutional-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldIcon size={20} />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white tracking-tight">Sign in as admin</h2>
          <p className="mt-1 text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400">
            The pipeline talks to the real backend, so it needs a real admin session — the demo Admin switch in the navbar isn't enough.
          </p>
        </div>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        {tried && !loading && token?.startsWith('demo') && (
          <Alert type="error">Sign-in failed — check the password and that the backend is running on port 8000.</Alert>
        )}
        <Field label="Email">
          <input className={INPUT_CLS} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className={INPUT_CLS} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <button type="submit" className={`${BTN_PRIMARY} w-full`} disabled={loading || !password}>
          {loading ? <Busy label="Signing in..." /> : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

// Address: /ai-pipeline/<step>?subject=<subject>&exam=<exam>, so a refresh or back keeps the step and subject.
const readAddress = ({ pathname, search }) => {
  const stepId = pathname.split('/')[2];
  const q = new URLSearchParams(search);
  return {
    step: STEPS.some((s) => s.id === stepId) ? stepId : 'structure',
    subject: q.get('subject') || '',
    exam: q.get('exam') || 'SSC CGL',
  };
};

export const AiPipelinePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRealAdmin = user?.role === 'admin' && !!token && !token.startsWith('demo');

  const [boot] = useState(() => readAddress(location));
  const [step, setStep] = useState(boot.step);
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState(boot.subject);
  const [targetExam, setTargetExam] = useState(boot.exam);

  // Address follows the step (new history entry) and the subject/exam (replaces the entry).
  const lastStep = useRef(null);
  const lastWritten = useRef(null); // the address this page itself just navigated to
  useEffect(() => {
    const q = new URLSearchParams();
    if (subject) q.set('subject', subject);
    q.set('exam', targetExam);
    const want = `${ROUTES.pipeline}/${step}?${q.toString()}`;
    const have = location.pathname + location.search;
    if (have !== want) {
      const push = lastStep.current !== null && lastStep.current !== step;
      lastWritten.current = want;
      navigate(want, { replace: !push });
    }
    lastStep.current = step;
  }, [step, subject, targetExam]);

  // Back/forward (or a link from elsewhere): follow the address. Changes this page wrote itself are skipped.
  useEffect(() => {
    const have = location.pathname + location.search;
    if (have === lastWritten.current) {
      lastWritten.current = null;
      return;
    }
    if (!location.pathname.startsWith(`${ROUTES.pipeline}/`)) return;
    const a = readAddress(location);
    setStep(a.step);
    setSubject(a.subject);
    setTargetExam(a.exam);
  }, [location.pathname, location.search]);
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
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminSignIn />
      </div>
    );
  }

  const needsSubject = step !== 'structure' && step !== 'review' && !subject;
  const props = { subject, taxonomyDoc, targetExam };
  const tree = taxonomyDoc?.tree || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-card p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
          <CpuIcon size={13} />
          AI Question Pipeline
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-charcoal-950 dark:text-white tracking-tight">From textbook PDF to ready-to-take mock</h1>
        <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400 max-w-2xl">
          Define the subject, upload theory, generate grounded questions into the bank, shape a quiz with a blueprint, and assemble tests.
        </p>
      </div>

      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-card p-5 sm:p-6 space-y-5">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-48">
            <Field label="Subject">
              <select
                className={INPUT_CLS}
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
          </div>
          <div className="w-44">
            <Field label="Exam">
              <select className={INPUT_CLS} value={targetExam} onChange={(e) => setTargetExam(e.target.value)}>
                {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {loadingSubjects ? (
              <Busy label="Loading..." />
            ) : taxonomyDoc ? (
              <>
                {taxonomyDoc.sub_subjects?.length > 0 && <CountChip n={taxonomyDoc.sub_subjects.length} noun="sub-subject" />}
                <CountChip n={tree.length} noun="topic" />
                <CountChip n={tree.reduce((n, e) => n + e.subtopics.length, 0)} noun="subtopic" />
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-[11px] font-bold text-charcoal-600 dark:text-charcoal-300">
                {subject ? 'No structure yet' : 'Create a subject to begin'}
              </span>
            )}
            <button
              type="button"
              title="Reload subjects"
              onClick={refreshAll}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-charcoal-400 hover:text-institutional-600 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 transition-colors"
            >
              <RefreshCwIcon size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isDone = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group px-1"
                >
                  <span className={
                    isActive
                      ? 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 bg-institutional-600 border-institutional-600 text-white shadow-sm transition-colors'
                      : isDone
                      ? 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 bg-institutional-50 dark:bg-institutional-950/40 border-institutional-400 dark:border-institutional-700 text-institutional-600 dark:text-institutional-400 transition-colors'
                      : 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 bg-white dark:bg-charcoal-900 border-charcoal-300 dark:border-charcoal-700 text-charcoal-400 dark:text-charcoal-500 group-hover:border-charcoal-400 transition-colors'
                  }>
                    {i + 1}
                  </span>
                  <span className={
                    isActive
                      ? 'text-[10px] font-extrabold uppercase tracking-wide text-institutional-600 dark:text-institutional-400 whitespace-nowrap'
                      : 'text-[10px] font-bold uppercase tracking-wide text-charcoal-400 dark:text-charcoal-500 whitespace-nowrap group-hover:text-charcoal-600 dark:group-hover:text-charcoal-300'
                  }>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="flex-1 h-0.5 min-w-[12px] sm:min-w-[24px] bg-charcoal-200 dark:bg-charcoal-700 mt-[-14px]" />
                )}
              </React.Fragment>
            );
          })}
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
          {step === 'assemble' && <AssembleStep {...props} onAssembled={() => {}} onGoToMocks={() => navigate(ROUTES.home)} />}
          {step === 'review' && <ReviewStep subject={subject} onChanged={() => {}} />}
        </>
      )}
    </div>
  );
};
