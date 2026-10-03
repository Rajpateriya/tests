import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  SparklesIcon,
  BookOpenIcon,
  CheckIcon,
} from './Icons';

/**
 * AuthModal — Modern, High-Trust Sign In & Registration Modal
 * - Exact default credentials supported & 1-click filled:
 *   - Admin: admin@gmail.com / admin123 (Routes directly to Admin Flow)
 *   - Student: student@gmail.com / student123 (Routes directly to Student Profile Dashboard)
 * - Multi-select Primary Target Examination during registration (SSC CGL, Banking, RRB, State PSC, UPSC, Defence)
 * - Fluid, height-stabilized layout with smooth micro-animations and zero awkward jumping
 * - Platform Name: PrepMagnet
 */

const TARGET_EXAM_OPTIONS = [
  { id: 'SSC CGL', label: 'SSC CGL', badge: 'SSC' },
  { id: 'IBPS PO / Banking', label: 'IBPS / SBI Banking', badge: 'Banking' },
  { id: 'RRB NTPC', label: 'RRB NTPC', badge: 'Railways' },
  { id: 'State PSC', label: 'State PSC / PCS', badge: 'PSC' },
  { id: 'UPSC CSAT', label: 'UPSC CSAT', badge: 'Civil Services' },
  { id: 'Defence / CDS', label: 'Defence (CDS / NDA)', badge: 'Defence' },
];

export const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const { login, register, loading } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedExams, setSelectedExams] = useState(['SSC CGL']);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync tab whenever modal opens or initialTab prop changes
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const toggleExam = (examId) => {
    setSelectedExams((prev) => {
      if (prev.includes(examId)) {
        // Keep at least one exam selected
        return prev.length > 1 ? prev.filter((e) => e !== examId) : prev;
      } else {
        return [...prev, examId];
      }
    });
  };

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
          target_exams: role === 'student' ? selectedExams : ['All Exams'],
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-4 animate-scale-in relative overflow-hidden transition-all duration-300 ease-out max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-charcoal-800 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shrink-0">
              <SparklesIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>{tab === 'login' ? 'Welcome to PrepMagnet' : 'Join PrepMagnet Free'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tab === 'login'
                  ? 'Role-Based Authentication Engine'
                  : 'Empowering 45,000+ government job rankers'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <XCircleIcon size={20} />
          </button>
        </div>

        {/* Tab Toggle: Sign In vs Register (Fluid Animated Tabs) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-charcoal-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-charcoal-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register Free
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <AlertTriangleIcon size={16} className="text-rose-600 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body with smooth sizing */}
        <div className="overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {/* 1-Click Instant Demo Credentials Access (Shown prominently in login, and as a quick-switch in register) */}
          {tab === 'login' && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-charcoal-850/80 border border-slate-200 dark:border-charcoal-750 space-y-2 relative z-10 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>⚡ Default Accounts</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                    (1-Click Access)
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">Auto-routes to flow</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Student 1-Click */}
                <button
                  type="button"
                  onClick={() => handle1ClickDemo('student')}
                  className="group p-2.5 rounded-xl border border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-charcoal-800 text-left transition-all hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    <UserIcon size={13} className="text-blue-600 shrink-0" />
                    <span>Student Aspirant</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                    student@gmail.com
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    pass: student123
                  </div>
                </button>

                {/* Admin 1-Click */}
                <button
                  type="button"
                  onClick={() => handle1ClickDemo('admin')}
                  className="group p-2.5 rounded-xl border border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-charcoal-800 text-left transition-all hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    <ShieldIcon size={13} className="text-purple-600 shrink-0" />
                    <span>Admin Studio</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                    admin@gmail.com
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    pass: admin123
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'register' && (
              <>
                {/* Role Selection Tabs */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'student'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30 shadow-xs'
                          : 'border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <UserIcon size={13} className={role === 'student' ? 'text-blue-600' : ''} />
                      <span>Student Aspirant</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/30 shadow-xs'
                          : 'border-slate-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <ShieldIcon size={13} className={role === 'admin' ? 'text-purple-600' : ''} />
                      <span>Administrator</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Aspirant"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all hover:border-blue-400"
                  />
                </div>

                {/* Multi-Select Primary Target Examination (Student only) */}
                {role === 'student' && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span>Target Examinations</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          (Select 1 or more)
                        </span>
                      </label>
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        {selectedExams.length} selected
                      </span>
                    </div>

                    {/* Multi-select interactive pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TARGET_EXAM_OPTIONS.map((exam) => {
                        const isSelected = selectedExams.includes(exam.id);
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => toggleExam(exam.id)}
                            className={`p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer transform active:scale-95 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/40'
                                : 'border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-800 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-charcoal-750'
                            }`}
                          >
                            <span className="truncate">{exam.label}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 text-[10px]">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="candidate@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all hover:border-blue-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all hover:border-blue-400"
              />
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : tab === 'login' ? (
                <span>Sign In to Platform</span>
              ) : (
                <span>Create Free Account & Start Mocks</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          {tab === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setTab('register')}
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
              >
                Register for Free
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
              >
                Sign In here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
