import React from 'react';
import { ClockIcon, ShieldIcon, CheckCircleIcon, ArrowRightIcon, XCircleIcon } from './Icons';

/**
 * TestRulesModal — Pre-Exam Instructions & TCS iON Guidelines Modal
 * - Clean academic layout with duration, question count, marking scheme.
 * - Legend overview and instruction list.
 * - Primary "Proceed to Exam Room" action.
 */
export const TestRulesModal = ({ test, isOpen, onClose, onStartExam }) => {
  if (!isOpen || !test) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-lifted space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-50 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                {test.test_type} Mock
              </span>
              <span className="text-xs text-charcoal-400 font-medium">• {test.target_exam}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-charcoal-900 dark:text-charcoal-100">
              {test.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200"
          >
            <XCircleIcon size={20} />
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-charcoal-50 dark:bg-charcoal-800/60 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-center font-mono">
          <div>
            <div className="text-[10px] text-charcoal-500 uppercase font-semibold">Duration</div>
            <div className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100 mt-0.5">
              {test.duration_minutes}m
            </div>
          </div>
          <div>
            <div className="text-[10px] text-charcoal-500 uppercase font-semibold">Questions</div>
            <div className="text-sm font-bold text-charcoal-900 dark:text-charcoal-100 mt-0.5">
              {test.total_questions}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Correct</div>
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              +{test.positive_marks_per_q}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Penalty</div>
            <div className="text-sm font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              -{test.negative_marks_per_q}
            </div>
          </div>
        </div>

        {/* Instructions List */}
        <div className="space-y-2 text-xs text-charcoal-600 dark:text-charcoal-400">
          <h4 className="font-bold text-charcoal-900 dark:text-charcoal-200 uppercase text-[11px] tracking-wider">
            Exam Instructions & Protocols:
          </h4>
          <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>The timer is synchronized with the server and will count down continuously.</li>
            <li>Use the <strong>Question Palette</strong> to jump directly to any question.</li>
            <li>Click <strong>Save & Next</strong> to confirm your selection (marked in Green).</li>
            <li>Click <strong>Mark for Review</strong> to flag questions you wish to reconsider later.</li>
            <li>Switching browser tabs will register an integrity alert.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              onStartExam(test);
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>Begin Mock Exam</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
