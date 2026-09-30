import React, { useState } from 'react';
import { FileTextIcon } from '../Icons';
import { Alert, Busy } from './PipelineUI';
import { errorText } from './pipelineUtils';

// "JSON" header button + modal: paste / upload / export a payload in the API's own format.
export const JsonPanel = ({ title, example, getCurrent, validate, onLoad, onSave }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const show = () => {
    setText(JSON.stringify(getCurrent(), null, 2));
    setError('');
    setMessage('');
    setOpen(true);
  };

  const parse = () => {
    setError('');
    setMessage('');
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      setError(`Not valid JSON: ${err.message}`);
      return null;
    }
    const problem = validate?.(data);
    if (problem) {
      setError(problem);
      return null;
    }
    return data;
  };

  const readFile = async (file) => {
    if (!file) return;
    setText(await file.text());
    setError('');
    setMessage(`Loaded ${file.name}.`);
  };

  const load = () => {
    const data = parse();
    if (!data) return;
    onLoad(data);
    setOpen(false);
  };

  const save = async () => {
    const data = parse();
    if (!data) return;
    setSaving(true);
    try {
      await onSave(data);
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={show}>
        <FileTextIcon size={15} />
        <span>JSON</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => !saving && setOpen(false)}>
          <div className="modal-dialog-box pp" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{title} — JSON</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Same format as the API. Edit, paste, or load a .json file.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }} aria-label="Close">✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  Load .json file
                  <input type="file" accept="application/json,.json" style={{ display: 'none' }}
                    onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setText(JSON.stringify(getCurrent(), null, 2)); setError(''); setMessage('Showing the current setup.'); }}>
                  Current
                </button>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setText(example); setError(''); setMessage('Showing an example.'); }}>
                  Example
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={!text.trim()}>Download</button>
              </div>
              <Alert type="success">{message}</Alert>
              <Alert type="error">{error}</Alert>
              <textarea
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', minHeight: 340, resize: 'vertical' }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-secondary" onClick={load} disabled={!text.trim() || saving}>Load into editor</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!text.trim() || saving}>
                {saving ? <Busy label="Saving..." /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
