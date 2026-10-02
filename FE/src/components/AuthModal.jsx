import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, ShieldIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, SparklesIcon } from './Icons';

/**
 * AuthModal — Sleek, High-Trust Sign In & Registration Modal
 * - Quick 1-click Demo Login for Aspirant and Administrator.
 * - Tab switching between Sign In and Free Registration.
 * - WCAG AA accessible form controls with high contrast and focus rings.
 */
export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register, loading } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [targetExam, setTargetExam] = useState('SSC CGL');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          role: 'student',
          target_exams: [targetExam],
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handle1ClickDemo = async (role) => {
    setErrorMsg('');
    if (role === 'student') {
      setEmail('student@mockexam.com');
      setPassword('Student@123');
      try {
        await login('student@mockexam.com', 'Student@123');
        onClose();
      } catch (err) {
        setErrorMsg('Could not log in as demo student.');
      }
    } else {
      setEmail('admin@mockexam.com');
      setPassword('Admin@123');
      try {
        await login('admin@mockexam.com', 'Admin@123');
        onClose();
      } catch (err) {
        setErrorMsg('Could not log in as demo admin.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-lifted space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-institutional-600 text-white flex items-center justify-center font-bold text-xs">
              <SparklesIcon size={16} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100">
                {tab === 'login' ? 'Candidate Sign In' : 'Create Free Aspirant Account'}
              </h3>
              <p className="text-[11px] text-charcoal-500">
                GovExam Pro Academic Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200"
          >
            <XCircleIcon size={20} />
          </button>
        </div>

        {/* 1-Click Instant Demo Access Box */}
        <div className="p-3.5 rounded-xl bg-charcoal-50 dark:bg-charcoal-800/80 border border-charcoal-200 dark:border-charcoal-700 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
            <span>⚡ Instant Demo Access:</span>
            <span className="text-[10px] text-charcoal-400">1-click test login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handle1ClickDemo('student')}
              className="py-1.5 px-3 rounded-lg border border-charcoal-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-900 text-charcoal-800 dark:text-charcoal-200 hover:border-institutional-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <UserIcon size={13} className="text-institutional-600" />
              <span>Aspirant (Student)</span>
            </button>
            <button
              type="button"
              onClick={() => handle1ClickDemo('admin')}
              className="py-1.5 px-3 rounded-lg border border-charcoal-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-900 text-charcoal-800 dark:text-charcoal-200 hover:border-institutional-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <ShieldIcon size={13} className="text-purple-600" />
              <span>Administrator</span>
            </button>
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-lg text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-1.5 rounded-md transition-all ${
              tab === 'login'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-1.5 rounded-md transition-all ${
              tab === 'register'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
            }`}
          >
            Register Free
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
                  Primary Target Exam
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="SSC CGL">SSC CGL (Combined Graduate Level)</option>
                  <option value="SSC CHSL">SSC CHSL (10+2)</option>
                  <option value="RRB NTPC">RRB NTPC (Railways)</option>
                  <option value="IBPS PO">IBPS PO / Clerk</option>
                  <option value="State PSC">State PSC</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="candidate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In to Dashboard' : 'Complete Free Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
