import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UserIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  SparklesIcon,
  BookOpenIcon,
  CheckIcon,
  LockIcon,
  KeyIcon,
  ArrowLeftIcon,
  MailIcon,
} from './Icons';

/**
 * AuthModal — Modern, High-Trust Sign In, Registration & Password Recovery Modal
 * Features:
 * - Remember Me checkbox with local storage persistence and extended backend token duration
 * - Fully functional 2-step Forgot Password & OTP reset flow with backend verification
 * - 1-Click demo logins for instant testing
 * - Multi-select Primary Target Examination during registration
 * - Fluid, responsive layout with accessible state transitions
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
  const { login, register, loading: authLoading } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login' | 'register' | 'forgot_request' | 'forgot_reset' | 'forgot_success'
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedExams, setSelectedExams] = useState(['SSC CGL']);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Forgot Password state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devResetCode, setDevResetCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill remembered email and sync tab on modal open
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
      const savedEmail = localStorage.getItem('govexam_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const toggleExam = (examId) => {
    setSelectedExams((prev) => {
      if (prev.includes(examId)) {
        return prev.length > 1 ? prev.filter((e) => e !== examId) : prev;
      } else {
        return [...prev, examId];
      }
    });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (tab === 'login') {
        await login(email, password, rememberMe);
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

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await api.auth.forgotPassword(email);
      if (res?.reset_code) {
        setDevResetCode(res.reset_code);
        setResetCode(res.reset_code); // Auto-fill for convenience
      }
      setSuccessMsg(res?.message || 'Verification code generated! Please check your email.');
      setTab('forgot_reset');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await api.auth.resetPassword({
        email,
        reset_code: resetCode.trim(),
        new_password: newPassword,
      });
      setSuccessMsg(res?.message || 'Password updated successfully!');
      setTab('forgot_success');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please check your code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handle1ClickDemo = async (selectedRole) => {
    setErrorMsg('');
    setSuccessMsg('');
    const demoEmail = selectedRole === 'student' ? 'student@gmail.com' : 'admin@gmail.com';
    const demoPass = selectedRole === 'student' ? 'student123' : 'admin123';
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      await login(demoEmail, demoPass, rememberMe);
      onClose();
    } catch (err) {
      setErrorMsg(`Could not log in as demo ${selectedRole}: ${err.message}`);
    }
  };

  const isForgotMode = ['forgot_request', 'forgot_reset', 'forgot_success'].includes(tab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-4 animate-scale-in relative overflow-hidden transition-all duration-300 ease-out max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-charcoal-800 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shrink-0">
              {isForgotMode ? <KeyIcon size={18} /> : <SparklesIcon size={18} />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>
                  {tab === 'login' && 'Welcome to PrepMagnet'}
                  {tab === 'register' && 'Join PrepMagnet Free'}
                  {tab === 'forgot_request' && 'Forgot Password'}
                  {tab === 'forgot_reset' && 'Reset Password'}
                  {tab === 'forgot_success' && 'Password Changed!'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tab === 'login' && 'Role-Based Authentication Engine with Remember Me'}
                {tab === 'register' && 'Empowering 45,000+ government job rankers'}
                {tab === 'forgot_request' && 'Enter your email to receive a secure 6-digit OTP code'}
                {tab === 'forgot_reset' && 'Enter the OTP verification code and choose a new password'}
                {tab === 'forgot_success' && 'Your account security credentials have been updated'}
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

        {/* Tab Toggle: Sign In vs Register (Hidden during forgot password flow) */}
        {!isForgotMode && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
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
                setSuccessMsg('');
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
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <AlertTriangleIcon size={16} className="text-rose-600 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {/* 1-Click Instant Demo Credentials Access */}
          {tab === 'login' && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-charcoal-850/80 border border-slate-200 dark:border-charcoal-750 space-y-2 relative z-10 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>⚡ Quick Demo Credentials</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                    (1-Click Access)
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">Auto-routes to flow</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                  <div className="text-[9px] text-slate-400 font-mono">pass: student123</div>
                </button>

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
                  <div className="text-[9px] text-slate-400 font-mono">pass: admin123</div>
                </button>
              </div>
            </div>
          )}

          {/* Standard Login & Register Form */}
          {!isForgotMode && (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {tab === 'register' && (
                <>
                  {/* Role Selection */}
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

                  {/* Multi-Select Target Exam (Student only) */}
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

              {/* Sign In Options: Remember Me Checkbox & Forgot Password Link */}
              {tab === 'login' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="rememberMeCheckbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-charcoal-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot_request');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {authLoading ? (
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
          )}

          {/* Forgot Password Flow — Step 1: Request Code */}
          {tab === 'forgot_request' && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4 text-left">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                Enter your registered account email. The system will issue a secure 6-digit OTP code to verify and reset your password.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Registered Email Address
                </label>
                <div className="relative">
                  <MailIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="candidate@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMsg('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeftIcon size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Code...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Flow — Step 2: Enter Code & New Password */}
          {tab === 'forgot_reset' && (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-3.5 text-left">
              {devResetCode && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold">Test Code: </span>
                    <code className="font-mono bg-white dark:bg-charcoal-900 px-2 py-0.5 rounded font-extrabold text-emerald-600 dark:text-emerald-400">
                      {devResetCode}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetCode(devResetCode)}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 704320"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-mono font-extrabold tracking-widest rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Confirm New Password
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot_request');
                    setErrorMsg('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeftIcon size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Set New Password</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Flow — Step 3: Success Screen */}
          {tab === 'forgot_success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircleIcon size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Password Reset Successful!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your password for <strong className="text-slate-800 dark:text-slate-200">{email}</strong> has been updated. You can now sign in with your new credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setPassword('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>

        {/* Footer info: Switch between login and register */}
        {!isForgotMode && (
          <div className="pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {tab === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMsg('');
                  }}
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
                  onClick={() => {
                    setTab('login');
                    setErrorMsg('');
                  }}
                  className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
                >
                  Sign In here
                </button>
              </span>
            )}
          </div>
        )}

        {isForgotMode && tab !== 'forgot_success' && (
          <div className="pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span>Remembered your password? </span>
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
