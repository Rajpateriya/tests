import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LayersIcon, RefreshCwIcon } from '../Icons';
import { Alert, Busy, DifficultyBadge, Empty, Field, Section, Stats, StepCard } from './PipelineUI';
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

export const AssembleStep = ({ subject, taxonomyDoc, targetExam, onAssembled, onGoToMocks }) => {
  const [bank, setBank] = useState(null);
  const [bankError, setBankError] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [subSubject, setSubSubject] = useState('');
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

  const loadBank = useCallback(async () => {
    setBankError('');
    setBankLoading(true);
    try {
      setBank(await api.generation.bank(subject, targetExam));
    } catch (err) {
      setBankError(errorText(err));
    } finally {
      setBankLoading(false);
    }
  }, [subject, targetExam]);

  useEffect(() => {
    loadBank();
  }, [loadBank]);

  const subSubjects = taxonomyDoc?.sub_subjects || [];

  const assemble = async () => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await api.generation.assemble({
        target_exam: targetExam,
        subject,
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
      footerNote={`${quizzes} quiz${quizzes === 1 ? '' : 'zes'} of ${perQuiz || 'blueprint-size'} questions from ${subSubject || 'the whole subject'}, ${duration} min, +${posMarks} / −${negMarks}.`}
      footer={
        <>
          {result?.created > 0 && onGoToMocks && (
            <button type="button" className="btn btn-outline" onClick={onGoToMocks}>View in Mock Tests</button>
          )}
          <button type="button" className="btn btn-primary" onClick={assemble} disabled={busy}>
            {busy ? <Busy label="Assembling..." /> : `Assemble ${quizzes} quiz${quizzes === 1 ? '' : 'zes'}`}
          </button>
        </>
      }
    >
      <Alert type="error">{error}</Alert>

      <Section
        title="Question bank"
        aside={
          <span className="pp-inline" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600, flexWrap: 'wrap' }}>
            {bank && (
              <>
                <span className="pp-stat-chip"><strong>{bank.total}</strong> approved</span>
                <span className="pp-stat-chip"><strong>{bank.unused}</strong> unused</span>
                <span className="pp-stat-chip"><strong>{bank.pending_review}</strong> awaiting review</span>
              </>
            )}
            <button type="button" className="icon-btn" title="Refresh bank" onClick={loadBank} disabled={bankLoading}>
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
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sub-subject</th>
                  <th>Topic</th>
                  <th>Subtopic</th>
                  {LEVEL_NAMES.map((l) => <th key={l} className="num">{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {bankRows.map((r) => (
                  <tr key={`${r.sub_subject}|${r.topic}|${r.subtopic}`}>
                    <td className="muted">{r.sub_subject || '—'}</td>
                    <td className="muted">{r.topic}</td>
                    <td>{r.subtopic}</td>
                    {LEVEL_NAMES.map((l) => {
                      const cell = r.cells[l];
                      return (
                        <td key={l} className={`num ${cell?.unused ? '' : 'zero'}`} title="unused / total">
                          {cell ? `${cell.unused} / ${cell.count}` : '0 / 0'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {bankRows.length > 0 && <div className="pp-hint" style={{ marginTop: '0.4rem' }}>Each cell is unused / total. Red cells have no fresh questions left.</div>}
      </Section>

      <Section title="What to build">
        <div className="pp-grid cols-4">
          <Field label="Sub-subject">
            <select className="form-input" value={subSubject} onChange={(e) => setSubSubject(e.target.value)} disabled={!subSubjects.length}>
              <option value="">Whole subject</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s} only</option>)}
            </select>
          </Field>
          <Field label="Quizzes">
            <input type="number" min="1" max="200" className="form-input" value={quizzes} onChange={intInput(setQuizzes)} />
          </Field>
          <Field label="Questions per quiz" hint="Empty = blueprint size">
            <input type="number" min="1" className="form-input" value={perQuiz} placeholder="Blueprint"
              onChange={(e) => setPerQuiz(e.target.value)} />
          </Field>
          <Field label="Max tests per question" hint="1 = never repeat a question">
            <input type="number" min="1" className="form-input" value={maxReuse} onChange={intInput(setMaxReuse)} />
          </Field>
        </div>
      </Section>

      <Section title="Test settings">
        <div className="pp-grid cols-4">
          <Field label="Title prefix" hint="Tests are numbered #1, #2, …">
            <input className="form-input" value={titlePrefix} placeholder={`${subSubject || subject} Mock`}
              onChange={(e) => setTitlePrefix(e.target.value)} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" min="1" className="form-input" value={duration} onChange={intInput(setDuration)} />
          </Field>
          <Field label="Marks per correct">
            <input type="number" step="0.5" min="0.5" className="form-input" value={posMarks}
              onChange={(e) => setPosMarks(parseFloat(e.target.value) || 2)} />
          </Field>
          <Field label="Negative marks">
            <input type="number" step="0.25" min="0" className="form-input" value={negMarks}
              onChange={(e) => setNegMarks(Math.max(0, parseFloat(e.target.value) || 0))} />
          </Field>
        </div>
      </Section>

      {result && (
        <Section title="Result">
          <Alert type={result.not_created ? 'warning' : 'success'}>
            Created {result.created} of {result.requested} quiz{result.requested === 1 ? '' : 'zes'}, {result.questions_per_quiz} questions each.
            {result.not_created ? ` The bank supports ${result.max_possible} — see what's missing below.` : ' They now appear under Mock Tests.'}
          </Alert>
          <div style={{ marginTop: '0.75rem' }}>
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
            <div className="data-table-wrap" style={{ marginTop: '0.75rem' }}>
              <table className="data-table">
                <thead><tr><th>Test</th><th className="num">Questions</th><th>ID</th></tr></thead>
                <tbody>
                  {result.tests.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.title}</td>
                      <td className="num">{t.total_questions}</td>
                      <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{t.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.substituted?.length > 0 && (
            <>
              <div className="pp-section-title" style={{ marginTop: '1rem' }}>
                <span>Filled from another difficulty</span>
              </div>
              <Alert type="info">
                Where a subtopic had no unused questions at the blueprint's difficulty, the nearest other difficulty of the same subtopic was used instead, so the quizzes keep their size and topics. Their difficulty mix is slightly different from the blueprint.
              </Alert>
              <div className="data-table-wrap" style={{ marginTop: '0.6rem' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Topic</th><th>Subtopic</th><th>Wanted</th><th>Used instead</th><th className="num">Questions</th></tr>
                  </thead>
                  <tbody>
                    {result.substituted.map((s, i) => (
                      <tr key={i}>
                        <td className="muted">{s.topic}</td>
                        <td>{s.subtopic}</td>
                        <td><DifficultyBadge level={s.wanted} /></td>
                        <td><DifficultyBadge level={s.used} /></td>
                        <td className="num">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {result.missing.length > 0 && (
            <>
              <div className="pp-section-title" style={{ marginTop: '1rem' }}>
                <span>Subtopics too short at every difficulty — generate more, then assemble again</span>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Sub-subject</th><th>Topic</th><th>Subtopic</th><th className="num">Needed / quiz</th><th className="num">Unused left</th></tr>
                  </thead>
                  <tbody>
                    {result.missing.map((m, i) => (
                      <tr key={i}>
                        <td className="muted">{m.sub_subject || '—'}</td>
                        <td className="muted">{m.topic}</td>
                        <td>{m.subtopic}</td>
                        <td className="num">{m.needed_per_quiz}</td>
                        <td className="num zero">{m.available}</td>
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
