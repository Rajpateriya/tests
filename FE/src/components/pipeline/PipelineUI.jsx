import React, { useRef, useState } from 'react';
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
