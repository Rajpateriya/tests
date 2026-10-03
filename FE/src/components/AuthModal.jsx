import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  SparklesIcon,
  BookOpenIcon,
} from './Icons';

/**
 * AuthModal — Modern, High-Trust Sign In & Registration Modal
 * - Exact default credentials supported & 1-click filled:
 *   - Admin: admin@gmail.com / admin123 (Routes directly to Admin Flow)
 *   - Student: student@gmail.com / student123 (Routes directly to Student Profile Dashboard)
 * - Explicit role selection during Registration (Student vs Admin).
 * - High-contrast glassmorphism with instant visual role indicators.
 */
export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register, loading } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'admin'
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
          role,
          target_exams: role === 'student' ? [targetExam] : ['All Exams'],
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handle1ClickDemo = async (selectedRole) => {
    setErrorMsg('');
    if (selectedRole === 'student') {
      setEmail('student@gmail.com');
      setPassword('student123');
      try {
        await login('student@gmail.com', 'student123');
        onClose();
      } catch (err) {
        setErrorMsg('Could not log in as demo student.');
      }
    } else {
      setEmail('admin@gmail.com');
      setPassword('admin123');
      try {
        await login('admin@gmail.com', 'admin123');
        onClose();
      } catch (err) {
        setErrorMsg('Could not log in as demo admin.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-institutional-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-charcoal-150 dark:border-charcoal-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-institutional-700 to-institutional-500 text-white flex items-center justify-center shadow-md">
              <SparklesIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-charcoal-900 dark:text-charcoal-100 tracking-tight">
                {tab === 'login' ? 'Welcome to GovExam' : 'Create Free Account'}
              </h3>
              <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                {tab === 'login' ? 'Role-Based Authentication Engine' : 'Join 45,000+ government job rankers'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
          >
            <XCircleIcon size={20} />
          </button>
        </div>

        {/* 1-Click Instant Demo Credentials Access */}
        <div className="p-3.5 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850/80 border border-charcoal-200/90 dark:border-charcoal-750 space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
            <span className="flex items-center gap-1.5 font-bold">
              <span>⚡ Default Accounts</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">(1-Click)</span>
            </span>
            <span className="text-[10px] text-charcoal-400">Auto-routes to flow</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Student 1-Click */}
            <button
              type="button"
              onClick={() => handle1ClickDemo('student')}
              className="group p-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:border-institutional-500 text-left transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-850 dark:text-charcoal-100 group-hover:text-institutional-600 dark:group-hover:text-institutional-400">
                <UserIcon size={13} className="text-institutional-600 shrink-0" />
                <span>Student Aspirant</span>
              </div>
              <div className="text-[10px] text-charcoal-500 font-mono mt-0.5 truncate">
                student@gmail.com
              </div>
              <div className="text-[9px] text-charcoal-400 font-mono">
                pass: student123
              </div>
            </button>

            {/* Admin 1-Click */}
            <button
              type="button"
              onClick={() => handle1ClickDemo('admin')}
              className="group p-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:border-purple-500 text-left transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-850 dark:text-charcoal-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                <ShieldIcon size={13} className="text-purple-600 shrink-0" />
                <span>Admin Studio</span>
              </div>
              <div className="text-[10px] text-charcoal-500 font-mono mt-0.5 truncate">
                admin@gmail.com
              </div>
              <div className="text-[9px] text-charcoal-400 font-mono">
                pass: admin123
              </div>
            </button>
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-charcoal-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-2 rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-950 dark:text-charcoal-50 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-2 rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-950 dark:text-charcoal-50 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
            }`}
          >
            Register Free
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertTriangleIcon size={16} className="text-rose-600 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              {/* Role Selection Tabs */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
                  Select Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'student'
                        ? 'border-institutional-500 bg-institutional-50/80 dark:bg-institutional-950/40 text-institutional-700 dark:text-institutional-300 shadow-sm'
                        : 'border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                    }`}
                  >
                    <UserIcon size={13} />
                    <span>Student Aspirant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'admin'
                        ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                    }`}
                  >
                    <ShieldIcon size={13} />
                    <span>Administrator</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Aspirant"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-sm"
                />
              </div>

              {role === 'student' && (
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
                    Primary Target Examination
                  </label>
                  <select
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-sm"
                  >
                    <option value="SSC CGL">SSC CGL (Combined Graduate Level)</option>
                    <option value="SSC CHSL">SSC CHSL (10+2)</option>
                    <option value="RRB NTPC">RRB NTPC (Railways)</option>
                    <option value="IBPS PO">IBPS PO / Clerk (Banking)</option>
                    <option value="State PSC">State Civil Services / PSC</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-charcoal-700 dark:text-charcoal-300">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="candidate@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-sm"
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
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : tab === 'login' ? (
              <span>Sign In to Platform</span>
            ) : (
              <span>Complete Account Registration</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
