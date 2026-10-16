import React, { useState } from 'react';
import { FileTextIcon } from '../Icons';
import { Alert, Busy, BTN_OUTLINE, BTN_OUTLINE_SM, BTN_PRIMARY, INPUT_CLS } from './PipelineUI';
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
      <button type="button" className={BTN_OUTLINE_SM} onClick={show}>
        <FileTextIcon size={15} />
        <span>JSON</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl w-full shadow-2xl space-y-4 animate-scale-in"
            style={{ maxWidth: 820 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 pb-0">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">{title} — JSON</h3>
                <p className="mt-1 text-xs text-charcoal-500 dark:text-charcoal-400">
                  Same format as the API. Edit, paste, or load a .json file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5 flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <label className={`${BTN_OUTLINE} cursor-pointer`}>
                  Load .json file
                  <input type="file" accept="application/json,.json" className="hidden"
                    onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                <button type="button" className={BTN_OUTLINE}
                  onClick={() => { setText(JSON.stringify(getCurrent(), null, 2)); setError(''); setMessage('Showing the current setup.'); }}>
                  Current
                </button>
                <button type="button" className={BTN_OUTLINE}
                  onClick={() => { setText(example); setError(''); setMessage('Showing an example.'); }}>
                  Example
                </button>
                <button type="button" className={BTN_OUTLINE} onClick={download} disabled={!text.trim()}>Download</button>
              </div>
              <Alert type="success">{message}</Alert>
              <Alert type="error">{error}</Alert>
              <textarea
                className={`${INPUT_CLS} font-mono text-xs`}
                style={{ minHeight: 340, resize: 'vertical' }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="flex items-center justify-end gap-2 p-5 pt-0">
              <button type="button" className={BTN_OUTLINE} onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button type="button" className={BTN_OUTLINE} onClick={load} disabled={!text.trim() || saving}>Load into editor</button>
              <button type="button" className={BTN_PRIMARY} onClick={save} disabled={!text.trim() || saving}>
                {saving ? <Busy label="Saving..." /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
