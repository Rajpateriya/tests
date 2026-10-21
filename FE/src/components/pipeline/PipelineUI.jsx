import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadIcon } from '../Icons';
import { LEVELS, mixTotal } from './pipelineUtils';

/* Shared Tailwind class strings — same tokens AdminStudioPage.jsx uses
   (charcoal / institutional palette, rounded-xl/2xl/3xl, shadow-card/subtle),
   so the pipeline finally matches the rest of the app instead of its own
   separate index.css system. Exported so step files build matching inputs/
   buttons without re-typing these strings everywhere. */
export const INPUT_CLS =
  'w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 active:bg-institutional-800 text-white text-xs font-extrabold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_OUTLINE =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_DANGER =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_PRIMARY_SM =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-[11px] font-extrabold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_OUTLINE_SM =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-charcoal-300 dark:border-charcoal-700 text-[11px] font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const ALERT_STYLES = {
  success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
  error: 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
  warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
  info: 'bg-institutional-50 dark:bg-institutional-950/30 border-institutional-300 dark:border-institutional-800 text-institutional-900 dark:text-institutional-200',
};

export const Alert = ({ type = 'info', children }) =>
  children ? (
    <div className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed ${ALERT_STYLES[type] || ALERT_STYLES.info}`}>
      {children}
    </div>
  ) : null;

// One card shape for every step: header (icon, title, context tag, actions), body, optional footer.
export const StepCard = ({ icon, title, subtitle, tag, actions, footer, footerNote, children }) => (
  <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-card overflow-hidden">
    <div className="flex items-start justify-between gap-4 flex-wrap p-5 sm:p-6 border-b border-charcoal-150 dark:border-charcoal-800">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-institutional-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white tracking-tight">
            {title}
            {tag && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-institutional-50 dark:bg-institutional-950/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800 text-[10px] font-extrabold uppercase tracking-wider">
                {tag}
              </span>
            )}
          </h2>
          {subtitle && <p className="mt-1 text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>

    <div className="p-5 sm:p-6 space-y-5">{children}</div>

    {(footer || footerNote) && (
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 py-4 border-t border-charcoal-150 dark:border-charcoal-800 bg-charcoal-50/60 dark:bg-charcoal-850/40">
        <span className="text-xs text-charcoal-500 dark:text-charcoal-400">{footerNote}</span>
        <div className="flex items-center gap-2 flex-wrap">{footer}</div>
      </div>
    )}
  </div>
);

export const Section = ({ title, aside, children }) => (
  <div className="space-y-2.5">
    {title && (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
          {title}
        </span>
        {aside}
      </div>
    )}
    {children}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-bold text-charcoal-700 dark:text-charcoal-300">{label}</label>}
    {children}
    {hint && <div className="text-[11px] text-charcoal-400 dark:text-charcoal-500">{hint}</div>}
  </div>
);

export const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex p-1 rounded-xl bg-charcoal-100 dark:bg-charcoal-800 gap-1" role="tablist">
    {options.map((o) => (
      <button
        type="button"
        key={o.value}
        role="tab"
        aria-selected={value === o.value}
        className={
          value === o.value
            ? 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-institutional-600 text-white shadow-sm'
            : 'px-3 py-1.5 rounded-lg text-xs font-bold text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-200/60 dark:hover:bg-charcoal-700 transition-colors'
        }
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const STAT_TONE = {
  primary: 'text-institutional-600 dark:text-institutional-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
};

export const Stats = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
    {items.map(({ label, value, tone }) => (
      <div
        key={label}
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-subtle"
      >
        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500 truncate">
          {label}
        </div>
        <div className={`mt-0.5 text-lg sm:text-2xl font-extrabold font-mono ${tone ? STAT_TONE[tone] || '' : 'text-charcoal-950 dark:text-white'}`}>
          {value}
        </div>
      </div>
    ))}
  </div>
);

export const Busy = ({ label }) => (
  <span className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 dark:text-charcoal-300">
    <span className="w-4 h-4 border-2 border-institutional-600 border-t-transparent rounded-full animate-spin shrink-0" />
    {label}
  </span>
);

export const Empty = ({ children }) => (
  <div className="py-10 px-4 text-center text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 border-2 border-dashed border-charcoal-200 dark:border-charcoal-700 rounded-2xl">
    {children}
  </div>
);

/** Small chevron used to collapse/expand a group (topic row, etc.). Replaces the
 *  old global `.collapse-btn` CSS class with a Tailwind-based component so every
 *  pipeline file shares one definition instead of repeating the hover styling. */
export const CollapseButton = ({ collapsed, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="inline-flex items-center justify-center w-5 h-5 rounded-md mr-1.5 text-charcoal-400 hover:text-institutional-600 hover:bg-institutional-50 dark:hover:bg-institutional-950/40 transition-colors"
    style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.1s' }}
  >
    ▾
  </button>
);

/** A searchable "add from list" control. Native <select> renders every option at
 *  its native width, which overflows the viewport once names run long or the list
 *  runs into the hundreds (e.g. a taxonomy topic with 100+ subtopics) — this keeps
 *  the dropdown's own width fixed and the option list scrollable and filterable. */
export const Picker = ({ options, placeholder = 'Add…', onSelect, width = 280 }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // The panel is portaled to <body> with position:fixed, so it can't be clipped by
  // a scrolling ancestor (e.g. a table wrapper's overflow-x: auto, which forces
  // overflow-y to clip too) — only the trigger's own coordinates decide where it sits.
  const place = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScrollOrResize = () => place();
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${INPUT_CLS} text-left text-charcoal-400 dark:text-charcoal-500 cursor-pointer`}
        style={{ width }}
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
      >
        + {placeholder}
      </button>
      {open && rect && createPortal(
        <div
          ref={panelRef}
          className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 rounded-xl shadow-2xl overflow-hidden"
          style={{
            position: 'fixed', top: rect.top, left: rect.left,
            width: Math.max(rect.width, 220), maxWidth: 'calc(100vw - 16px)',
            zIndex: 1000,
          }}
        >
          <input
            autoFocus
            className="w-full px-3 py-2 text-sm bg-transparent border-0 border-b border-charcoal-200 dark:border-charcoal-700 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-0"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs font-semibold text-charcoal-400 dark:text-charcoal-500">No matches.</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => { onSelect(opt); setOpen(false); }}
                className="px-3 py-1.5 text-xs font-medium text-charcoal-700 dark:text-charcoal-200 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis hover:bg-institutional-50 dark:hover:bg-institutional-950/40"
              >
                {opt}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

/** In-app replacement for window.prompt / window.confirm.
 *  Pass `prompt` for a text field; omit it for a plain confirm. */
export const Dialog = ({
  open,
  title,
  body,
  prompt,
  placeholder,
  initialValue = '',
  confirmLabel = 'OK',
  danger = false,
  error = '',
  busy = false,
  onConfirm,
  onClose,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;
  const submit = () => {
    if (prompt && !value.trim()) return;
    onConfirm(value.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl w-full shadow-2xl space-y-4 animate-scale-in"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 space-y-3">
          {body && <p className="text-sm text-charcoal-500 dark:text-charcoal-400 leading-relaxed">{body}</p>}
          {prompt && (
            <input
              autoFocus
              className={INPUT_CLS}
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') onClose();
              }}
            />
          )}
          <Alert type="error">{error}</Alert>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 pt-0">
          <button type="button" className={BTN_OUTLINE} onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className={danger ? BTN_DANGER : BTN_PRIMARY}
            onClick={submit}
            disabled={busy || (prompt && !value.trim())}
          >
            {busy ? <Busy label="Working..." /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const DIFF_BADGE = {
  easy: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  medium: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  hard: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export const DifficultyBadge = ({ level }) => {
  const key = (level || 'medium').toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${DIFF_BADGE[key] || DIFF_BADGE.medium}`}>
      {level}
    </span>
  );
};

const LEVEL_DOT = { easy: 'bg-emerald-500', medium: 'bg-amber-500', hard: 'bg-rose-500' };
const LEVEL_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const DifficultyMix = ({ value, onChange, label = 'Difficulty mix' }) => {
  const total = mixTotal(value);
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-charcoal-700 dark:text-charcoal-300">{label}</div>
      <div className="grid grid-cols-3 gap-3">
        {LEVELS.map((level) => (
          <label key={level} className="space-y-1.5 block">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 dark:text-charcoal-400">
              <i className={`w-2 h-2 rounded-full shrink-0 ${LEVEL_DOT[level]}`} />
              {LEVEL_LABELS[level]}
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                className={`${INPUT_CLS} pr-7`}
                value={value[level] ?? ''}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    onChange({ ...value, [level]: '' });
                    return;
                  }
                  const n = parseInt(raw, 10);
                  if (!isNaN(n)) {
                    onChange({ ...value, [level]: Math.min(100, Math.max(0, n)) });
                  }
                }}
                onBlur={() => {
                  if (value[level] === '' || typeof value[level] !== 'number') {
                    onChange({ ...value, [level]: 0 });
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-400">%</span>
            </div>
          </label>
        ))}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-charcoal-100 dark:bg-charcoal-800" aria-hidden="true">
        {LEVELS.map((level) => (
          <div key={level} className={LEVEL_DOT[level]} style={{ width: `${Math.min(100, value[level] || 0)}%` }} />
        ))}
      </div>
      <div className={`text-xs font-bold ${total === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {total === 100 ? '✓ Adds up to 100%' : `Adds up to ${total}% — must be exactly 100%`}
      </div>
    </div>
  );
};

export const Dropzone = ({ files, onFiles, accept = '.pdf,application/pdf', label = 'Drop PDF files here', note }) => {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  // Adds to the current selection (skipping repeats) so files can be picked in several rounds.
  const pick = (list) => {
    const incoming = Array.from(list || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    const same = (a, b) => a.name === b.name && a.size === b.size;
    onFiles([...files, ...incoming.filter((f, i) => !files.some((x) => same(x, f)) && incoming.findIndex((y) => same(y, f)) === i)]);
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          over
            ? 'border-institutional-500 bg-institutional-50/60 dark:bg-institutional-950/20'
            : 'border-charcoal-300 dark:border-charcoal-700 hover:border-institutional-400 dark:hover:border-institutional-600'
        }`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files);
        }}
      >
        <UploadIcon size={26} className="text-institutional-500" />
        <strong className="text-sm font-extrabold text-charcoal-800 dark:text-charcoal-100">{label}</strong>
        <small className="text-xs text-charcoal-400 dark:text-charcoal-500">{note || 'or click to browse — you can select several at once'}</small>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={`${f.name}-${f.size}`}
              className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-xs font-semibold text-charcoal-700 dark:text-charcoal-200"
            >
              {f.name}
              <span className="text-charcoal-400 dark:text-charcoal-500 font-medium">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                title="Remove file"
                onClick={() => onFiles(files.filter((x) => x !== f))}
                className="w-4 h-4 rounded-full flex items-center justify-center text-charcoal-500 dark:text-charcoal-400 hover:bg-charcoal-300 dark:hover:bg-charcoal-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
