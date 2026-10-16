import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { DatabaseIcon, RefreshCwIcon, SearchIcon } from '../Icons';
import { Alert, BTN_OUTLINE_SM, Busy, DifficultyBadge, Empty, Field, INPUT_CLS, StepCard } from './PipelineUI';
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
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs font-semibold text-charcoal-500 dark:text-charcoal-400">
        {total ? `Showing ${from}–${to} of ${total}` : 'No questions'}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" className={BTN_OUTLINE_SM} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        {pageList(page, pages).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap${i}`} className="px-1 text-xs text-charcoal-400 dark:text-charcoal-500">…</span>
          ) : n === page ? (
            <span key={n} className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-extrabold text-charcoal-900 dark:text-white">
              {n}
            </span>
          ) : (
            <button type="button" key={n} className={BTN_OUTLINE_SM} onClick={() => onPage(n)}>
              {n}
            </button>
          )
        )}
        <button type="button" className={BTN_OUTLINE_SM} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
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
        <button type="button" className={BTN_OUTLINE_SM} onClick={load} disabled={loading}>
          <RefreshCwIcon size={14} />
          <span>Refresh</span>
        </button>
      }
    >
      <Alert type="error">{error}</Alert>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {subSubjects.length > 0 && (
          <Field label="Sub-subject">
            <select className={INPUT_CLS} value={subSubject} onChange={(e) => { setTopic(''); setSubtopic(''); change(setSubSubject)(e.target.value); }}>
              <option value="">All</option>
              {subSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Topic">
          <select className={INPUT_CLS} value={topic} onChange={(e) => { setSubtopic(''); change(setTopic)(e.target.value); }}>
            <option value="">All</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Subtopic">
          <select className={INPUT_CLS} value={subtopic} onChange={(e) => change(setSubtopic)(e.target.value)}>
            <option value="">All</option>
            {subtopics.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className={INPUT_CLS} value={difficulty} onChange={(e) => change(setDifficulty)(e.target.value)}>
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </Field>
        <Field label="Exam">
          <select className={INPUT_CLS} value={exam} onChange={(e) => change(setExam)(e.target.value)}>
            <option value="">All exams</option>
            {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className={INPUT_CLS} value={source} onChange={(e) => change(setSource)(e.target.value)}>
            <option value="">All</option>
            <option value="theory">From theory</option>
            <option value="ai_knowledge">AI knowledge</option>
          </select>
        </Field>
        <Field label="Per page">
          <select className={INPUT_CLS} value={pageSize} onChange={(e) => change(setPageSize)(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Search question text">
          <form className="flex items-center gap-2" onSubmit={submitSearch}>
            <input className={INPUT_CLS} placeholder="Type, then press Enter" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <button
              type="submit"
              title="Search"
              className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-500 dark:text-charcoal-400 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
            >
              <SearchIcon size={16} />
            </button>
          </form>
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-bold text-institutional-600 dark:text-institutional-400 hover:underline"
        >
          Clear filters
        </button>
      </div>

      {loading && !data && <Busy label="Loading questions..." />}
      {data && !items.length && !loading && <Empty>No questions match these filters.</Empty>}

      {data && data.total > 0 && (
        <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={setPage} />
      )}

      <div className={`flex flex-col gap-4 ${loading && data ? 'opacity-55' : ''}`}>
        {items.map((q) => (
          <div key={q.id} className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-4 shadow-subtle">
            <div className="flex items-center gap-2 flex-wrap">
              {q.sub_subject && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider">
                  {q.sub_subject}
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 text-[10px] font-extrabold uppercase tracking-wider">
                {q.topic}{q.subtopic ? ` › ${q.subtopic}` : ''}
              </span>
              <DifficultyBadge level={q.difficulty} />
              {q.target_exam && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                  {q.target_exam}
                </span>
              )}
              {q.source === 'ai_knowledge' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-extrabold uppercase tracking-wider">
                  AI knowledge
                </span>
              )}
              <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                {q.used_in_tests ? `used in ${q.used_in_tests} test${q.used_in_tests === 1 ? '' : 's'}` : 'not used yet'}
              </span>
            </div>
            <div className="text-sm font-semibold text-charcoal-900 dark:text-white mt-2.5">{q.question_text}</div>
            <div className="mt-2 space-y-1">
              {q.options?.map((opt) => (
                <div
                  key={opt.id}
                  className={`text-xs px-2.5 py-1.5 rounded-lg ${
                    opt.id === q.correct_option
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'text-charcoal-600 dark:text-charcoal-300'
                  }`}
                >
                  <strong>{opt.id}.</strong> {opt.text}
                </div>
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-bold text-charcoal-500 dark:text-charcoal-400 mt-2">Explanation</summary>
              <div className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-1.5 leading-relaxed">{q.solution_explanation}</div>
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
