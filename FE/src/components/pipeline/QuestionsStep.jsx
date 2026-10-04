import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { DatabaseIcon, RefreshCwIcon, SearchIcon } from '../Icons';
import { Alert, Busy, DifficultyBadge, Empty, Field, StepCard } from './PipelineUI';
import { EXAMS, errorText, topicsFor } from './pipelineUtils';

const PAGE_SIZES = [10, 20, 50];

// 1 … 4 5 [6] 7 8 … 20
function pageList(current, pages) {
  const wanted = new Set([1, pages, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

const Pager = ({ page, pages, total, pageSize, onPage }) => {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pp-pager">
      <span className="pp-pager-info">{total ? `Showing ${from}–${to} of ${total}` : 'No questions'}</span>
      <div className="pp-pager-btns">
        <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        {pageList(page, pages).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap${i}`} className="pp-pager-gap">…</span>
          ) : (
            <button
              type="button"
              key={n}
              className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          )
        )}
        <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
};

export const QuestionsStep = ({ subject, taxonomyDoc, targetExam }) => {
  const [subSubject, setSubSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [exam, setExam] = useState(targetExam);
  const [source, setSource] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const subSubjects = taxonomyDoc?.sub_subjects || [];
  const topics = topicsFor(taxonomyDoc, subSubject);
  const subtopics = (taxonomyDoc?.tree || [])
    .filter((e) => (!subSubject || e.sub_subject === subSubject) && (!topic || e.topic === topic))
    .flatMap((e) => e.subtopics)
    .filter((s, i, all) => all.indexOf(s) === i);

  // Any filter change goes back to page 1.
  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.generation.browseQuestions({
        subject, sub_subject: subSubject, topic, subtopic, difficulty,
        target_exam: exam, source, search, page, page_size: pageSize,
      });
      if (mine === requestId.current) {
        setData(res);
        if (res.page !== page) setPage(res.page);
      }
    } catch (err) {
      if (mine === requestId.current) setError(errorText(err));
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [subject, subSubject, topic, subtopic, difficulty, exam, source, search, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // A different subject or page-level exam starts a fresh browse.
  useEffect(() => {
    setSubSubject(''); setTopic(''); setSubtopic(''); setDifficulty('');
    setSource(''); setSearchText(''); setSearch(''); setPage(1);
  }, [subject]);

  useEffect(() => {
    setExam(targetExam);
    setPage(1);
  }, [targetExam]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchText.trim());
  };

  const clearAll = () => {
    setSubSubject(''); setTopic(''); setSubtopic(''); setDifficulty('');
    setSource(''); setSearchText(''); setSearch(''); setExam(targetExam); setPage(1);
  };

  const items = data?.items || [];

  return (
    <StepCard
      icon={<DatabaseIcon size={20} />}
      title="Question bank"
      tag={data ? `${data.total} question${data.total === 1 ? '' : 's'}` : subject}
      subtitle="Every question saved for this subject, newest first. Filter by where it sits in the structure, difficulty, exam or source."
      actions={
        <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCwIcon size={14} />
          <span>Refresh</span>
        </button>
      }
    >
      <Alert type="error">{error}</Alert>

      <div className="pp-grid cols-4">
        {subSubjects.length > 0 && (
          <Field label="Sub-subject">
            <select className="form-input" value={subSubject} onChange={(e) => { setTopic(''); setSubtopic(''); change(setSubSubject)(e.target.value); }}>
              <option value="">All</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Topic">
          <select className="form-input" value={topic} onChange={(e) => { setSubtopic(''); change(setTopic)(e.target.value); }}>
            <option value="">All</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Subtopic">
          <select className="form-input" value={subtopic} onChange={(e) => change(setSubtopic)(e.target.value)}>
            <option value="">All</option>
            {subtopics.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className="form-input" value={difficulty} onChange={(e) => change(setDifficulty)(e.target.value)}>
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </Field>
        <Field label="Exam">
          <select className="form-input" value={exam} onChange={(e) => change(setExam)(e.target.value)}>
            <option value="">All exams</option>
            {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className="form-input" value={source} onChange={(e) => change(setSource)(e.target.value)}>
            <option value="">All</option>
            <option value="theory">From theory</option>
            <option value="ai_knowledge">AI knowledge</option>
          </select>
        </Field>
        <Field label="Per page">
          <select className="form-input" value={pageSize} onChange={(e) => change(setPageSize)(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Search question text">
          <form className="pp-inline" style={{ display: 'flex' }} onSubmit={submitSearch}>
            <input className="form-input" placeholder="Type, then press Enter" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <button type="submit" className="icon-btn" title="Search"><SearchIcon size={16} /></button>
          </form>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="pp-link-btn" onClick={clearAll}>Clear filters</button>
      </div>

      {loading && !data && <Busy label="Loading questions..." />}
      {data && !items.length && !loading && <Empty>No questions match these filters.</Empty>}

      {data && data.total > 0 && (
        <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={setPage} />
      )}

      <div style={{ opacity: loading && data ? 0.55 : 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((q) => (
          <div key={q.id} className="pp-question">
            <div className="pp-inline" style={{ flexWrap: 'wrap' }}>
              {q.sub_subject && <span className="badge badge-subject">{q.sub_subject}</span>}
              <span className="badge badge-topic">{q.topic}{q.subtopic ? ` › ${q.subtopic}` : ''}</span>
              <DifficultyBadge level={q.difficulty} />
              {q.target_exam && <span className="badge badge-medium">{q.target_exam}</span>}
              {q.source === 'ai_knowledge' && <span className="badge badge-hard">AI knowledge</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {q.used_in_tests ? `used in ${q.used_in_tests} test${q.used_in_tests === 1 ? '' : 's'}` : 'not used yet'}
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.65rem' }}>{q.question_text}</div>
            <div className="pp-options">
              {q.options?.map((opt) => (
                <div key={opt.id} className={`pp-option ${opt.id === q.correct_option ? 'correct' : ''}`}>
                  <strong>{opt.id}.</strong> {opt.text}
                </div>
              ))}
            </div>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Explanation</summary>
              <div className="pp-explain" style={{ marginTop: '0.4rem' }}>{q.solution_explanation}</div>
            </details>
          </div>
        ))}
      </div>

      {data && data.total > pageSize && (
        <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      )}
    </StepCard>
  );
};
