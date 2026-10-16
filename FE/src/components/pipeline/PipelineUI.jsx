import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadIcon } from '../Icons';
import { LEVELS, mixTotal } from './pipelineUtils';

const LEVEL_COLORS = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--danger)' };
const LEVEL_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const Alert = ({ type = 'info', children }) =>
  children ? <div className={`pipeline-alert ${type}`}>{children}</div> : null;

// One card shape for every step: header (icon, title, context tag, actions), body, optional footer.
export const StepCard = ({ icon, title, subtitle, tag, actions, footer, footerNote, children }) => (
  <div className="card pp-card">
    <div className="pp-card-head">
      <div className="pp-card-title">
        <div className="pp-card-icon">{icon}</div>
        <div>
          <h2>
            {title}
            {tag && <span className="pp-tag">{tag}</span>}
          </h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="pp-card-actions">{actions}</div>}
    </div>
    <div className="pp-card-body">{children}</div>
    {(footer || footerNote) && (
      <div className="pp-card-foot">
        <span className="pp-card-foot-note">{footerNote}</span>
        <div className="pp-card-foot-actions">{footer}</div>
      </div>
    )}
  </div>
);

export const Section = ({ title, aside, children }) => (
  <div>
    {title && (
      <div className="pp-section-title">
        <span>{title}</span>
        {aside}
      </div>
    )}
    {children}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    {children}
    {hint && <div className="pp-hint">{hint}</div>}
  </div>
);

export const Segmented = ({ options, value, onChange }) => (
  <div className="pp-seg" role="tablist">
    {options.map((o) => (
      <button
        type="button"
        key={o.value}
        role="tab"
        aria-selected={value === o.value}
        className={value === o.value ? 'active' : ''}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const Stats = ({ items }) => (
  <div className="pp-stats">
    {items.map(({ label, value, tone }) => (
      <div className={`pp-stat ${tone || ''}`} key={label}>
        <div className="pp-stat-label">{label}</div>
        <div className="pp-stat-value">{value}</div>
      </div>
    ))}
  </div>
);

export const Busy = ({ label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
    <span className="spinner" />
    {label}
  </span>
);

export const Empty = ({ children }) => <div className="pp-empty">{children}</div>;

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
  // a scrolling ancestor (e.g. the table wrapper's overflow-x: auto, which forces
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
        className="form-input sm"
        style={{ width, textAlign: 'left', color: 'var(--text-muted)', cursor: 'pointer' }}
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
      >
        + {placeholder}
      </button>
      {open && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left,
            width: Math.max(rect.width, 220), maxWidth: 'calc(100vw - 16px)',
            background: 'var(--bg-elevated, #fff)',
            border: '1px solid var(--border, #ddd)', borderRadius: 'var(--radius-sm)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'hidden',
          }}
        >
          <input
            autoFocus
            className="form-input sm"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border, #ddd)', borderRadius: 0 }}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div className="muted" style={{ padding: '0.5rem 0.65rem', fontSize: '0.82rem' }}>No matches.</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => { onSelect(opt); setOpen(false); }}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-bg, rgba(59,130,246,0.1))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal-dialog-box pp" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }} aria-label="Close">✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {body && <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</p>}
          {prompt && (
            <input
              autoFocus
              className="form-input"
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
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
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

export const DifficultyBadge = ({ level }) => (
  <span className={`badge badge-${(level || 'medium').toLowerCase()}`}>{level}</span>
);

export const DifficultyMix = ({ value, onChange, label = 'Difficulty mix' }) => {
  const total = mixTotal(value);
  return (
    <div className="pp-mix">
      <div className="form-label" style={{ marginBottom: 0 }}>{label}</div>
      <div className="pp-mix-inputs">
        {LEVELS.map((level) => (
          <label className="pp-mix-field" key={level}>
            <span>
              <i style={{ background: LEVEL_COLORS[level] }} />
              {LEVEL_LABELS[level]}
            </span>
            <div className="pp-mix-input">
              <input
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={value[level]}
                onChange={(e) => onChange({ ...value, [level]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </div>
          </label>
        ))}
      </div>
      <div className="pp-mix-bar" aria-hidden="true">
        {LEVELS.map((level) => (
          <div key={level} style={{ width: `${Math.min(100, value[level] || 0)}%`, background: LEVEL_COLORS[level] }} />
        ))}
      </div>
      <div className="pp-mix-status" style={{ color: total === 100 ? 'var(--success)' : 'var(--danger)' }}>
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
    <div>
      <div
        className={`pp-drop ${over ? 'over' : ''}`}
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
        <UploadIcon size={26} />
        <strong>{label}</strong>
        <small>{note || 'or click to browse — you can select several at once'}</small>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <div className="pp-chips">
          {files.map((f) => (
            <span className="chip" key={`${f.name}-${f.size}`}>
              {f.name}
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" title="Remove file" onClick={() => onFiles(files.filter((x) => x !== f))}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
