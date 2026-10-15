import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ROUTES } from '../routes';
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
  EyeIcon,
  EyeOffIcon,
  RefreshCwIcon,
  FileTextIcon,
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
  const navigate = useNavigate();
  const { login, register, loading: authLoading } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login' | 'register' | 'verify_email' | 'forgot_request' | 'forgot_reset' | 'forgot_success'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedExams, setSelectedExams] = useState(['SSC CGL']);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModalType, setLegalModalType] = useState(null); // 'terms' | 'privacy' | null
  
  // OTP verification state
  const [otpCode, setOtpCode] = useState('');

  // Forgot Password state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devResetCode, setDevResetCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Resend OTP countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Pre-fill remembered email and sync tab on modal open
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
      setAgreedToTerms(false);
      setLegalModalType(null);
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

    if (tab === 'register' && !agreedToTerms) {
      setErrorMsg('You must agree to the Terms & Conditions and Privacy Policy to create an account.');
      return;
    }

    try {
      if (tab === 'login') {
        const loggedUser = await login(email, password, rememberMe);
        onClose();
        if (loggedUser?.role === 'admin') {
          navigate(ROUTES.admin);
        } else {
          navigate(ROUTES.dashboard);
        }
      } else {
        const res = await register({
          email,
          password,
          full_name: fullName,
          target_exams: selectedExams,
        });
        setOtpCode('');
        setTab('verify_email');
        setSuccessMsg(res?.message || 'A 6-digit verification code has been sent to your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await api.auth.forgotPassword(cleanEmail);
      if (res?.reset_code) {
        setDevResetCode(res.reset_code);
        setResetCode(res.reset_code); // Auto-fill in dev
      } else {
        setResetCode('');
      }
      setResendCooldown(30);
      setSuccessMsg(res?.message || 'A 6-digit verification code has been dispatched to your email.');
      setTab('forgot_otp');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset code. Please ensure this email is registered.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    const cleanCode = resetCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await api.auth.verifyResetCode(email.toLowerCase().trim(), cleanCode);
      setSuccessMsg(res?.message || 'Verification code confirmed. Please set your new password.');
      setTab('forgot_new_password');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired 6-digit verification code. Please request a new code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (resendCooldown > 0 || isProcessing) return;
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await api.auth.forgotPassword(email.toLowerCase().trim());
      if (res?.reset_code) {
        setDevResetCode(res.reset_code);
        setResetCode(res.reset_code);
      }
      setResendCooldown(30);
      setSuccessMsg('A new 6-digit OTP verification code has been dispatched to your email.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
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
        email: email.toLowerCase().trim(),
        reset_code: resetCode.trim(),
        new_password: newPassword,
      });
      setSuccessMsg(res?.message || 'Password successfully updated in database!');
      setTab('forgot_success');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please verify your OTP code and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isForgotMode = ['forgot_request', 'forgot_otp', 'forgot_new_password', 'forgot_reset', 'forgot_success', 'verify_email'].includes(tab);


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-3xl max-w-lg w-full p-4 sm:p-7 shadow-2xl space-y-3.5 sm:space-y-4 animate-scale-in relative overflow-hidden transition-all duration-300 ease-out max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-charcoal-800 relative z-10 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shrink-0">
              {isForgotMode ? <KeyIcon size={17} /> : <SparklesIcon size={17} />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>
                  {tab === 'login' && 'Welcome to PrepMagnet'}
                  {tab === 'register' && 'Join PrepMagnet Free'}
                  {tab === 'verify_email' && 'Verify Your Email'}
                  {tab === 'forgot_request' && 'Forgot Password'}
                  {tab === 'forgot_otp' && 'Verify OTP Code'}
                  {tab === 'forgot_new_password' && 'Set New Password'}
                  {tab === 'forgot_reset' && 'Reset Password'}
                  {tab === 'forgot_success' && 'Password Changed!'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                {tab === 'login' && 'Role-Based Authentication Engine with Remember Me'}
                {tab === 'register' && 'Empowering 45,000+ government job rankers'}
                {tab === 'verify_email' && 'Enter the 6-digit OTP sent to your email'}
                {tab === 'forgot_request' && 'Enter your email to receive a secure 6-digit OTP code'}
                {tab === 'forgot_otp' && 'Enter the 6-digit verification code sent to your email'}
                {tab === 'forgot_new_password' && 'Enter your new password to update your account in the database'}
                {tab === 'forgot_reset' && 'Enter the OTP verification code and choose a new password'}
                {tab === 'forgot_success' && 'Your password has been updated in database. Please sign in.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 shrink-0 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
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
          {/* Standard Login & Register Form */}
          {!isForgotMode && (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {tab === 'register' && (
                <>
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

                  {/* Multi-Select Target Exam */}
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

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {TARGET_EXAM_OPTIONS.map((exam) => {
                        const isSelected = selectedExams.includes(exam.id);
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => toggleExam(exam.id)}
                            className={`p-1.5 sm:p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-1 cursor-pointer transform active:scale-95 min-w-0 ${
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

              {/* Mandatory Terms & Conditions / Privacy Policy Checkbox for Registration */}
              {tab === 'register' && (
                <div
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
                    errorMsg && !agreedToTerms
                      ? 'bg-rose-50/90 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/30'
                      : 'bg-slate-50/80 dark:bg-charcoal-800/50 border border-slate-200/80 dark:border-charcoal-700/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="registerTermsAgree"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked && errorMsg.includes('agree')) {
                        setErrorMsg('');
                      }
                    }}
                    required
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-charcoal-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                  />
                  <label
                    htmlFor="registerTermsAgree"
                    className="text-xs text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none text-left"
                  >
                    I agree to PrepMagnet's{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModalType('terms');
                      }}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModalType('privacy');
                      }}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    . <span className="text-rose-500 font-bold" title="Mandatory requirement">*</span>
                  </label>
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

          {/* Email OTP Verification after Registration */}
          {tab === 'verify_email' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!otpCode.trim() || otpCode.length !== 6) {
                  setErrorMsg('Please enter the 6-digit OTP.');
                  return;
                }
                setErrorMsg('');
                setIsProcessing(true);
                try {
                  await api.auth.verifyOtp(email, otpCode.trim());
                  if (password) {
                    const loggedUser = await login(email, password, rememberMe);
                    onClose();
                    if (loggedUser?.role === 'admin') {
                      navigate(ROUTES.admin);
                    } else {
                      navigate(ROUTES.dashboard);
                    }
                  } else {
                    setTab('login');
                    setSuccessMsg('Email verified successfully! Please sign in with your credentials.');
                  }
                } catch (err) {
                  setErrorMsg(err.message || 'Invalid or expired OTP. Please try again.');
                } finally {
                  setIsProcessing(false);
                }
              }}
              className="space-y-4 text-left"
            >
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                We sent a 6-digit OTP to <strong>{email}</strong>. Enter it below to activate your account.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 483920"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono font-extrabold tracking-widest rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={async () => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    try {
                      await api.auth.sendOtp(email);
                      setSuccessMsg('A new OTP has been sent to your email.');
                    } catch (err) {
                      setErrorMsg(err.message || 'Failed to resend OTP.');
                    }
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  Resend OTP
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeftIcon size={13} />
                  <span>Change details / Re-register</span>
                </button>
              </div>
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

          {/* Forgot Password Flow — Step 2: Verify OTP Code */}
          {tab === 'forgot_otp' && (
            <form onSubmit={handleVerifyResetOtp} className="space-y-4 text-left">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                We sent a 6-digit verification code to <strong className="text-slate-900 dark:text-white">{email}</strong>. Enter it below to verify your identity.
              </div>

              {devResetCode && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold">Test OTP: </span>
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
                  6-Digit OTP Verification Code
                </label>
                <div className="relative">
                  <KeyIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 704320"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono font-extrabold tracking-[0.3em] rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                  type="button"
                  disabled={resendCooldown > 0 || isProcessing}
                  onClick={handleResendResetOtp}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCwIcon size={13} className={isProcessing ? "animate-spin" : ""} />
                  <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isProcessing || resetCode.trim().length !== 6}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <span>Verify OTP Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Flow — Step 3: New Password Popup/Screen */}
          {(tab === 'forgot_new_password' || tab === 'forgot_reset') && (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-3.5 text-left">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed flex items-center gap-2">
                <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
                <span>OTP Verified! Choose a new, secure password for <strong className="text-slate-900 dark:text-white">{email}</strong>.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Confirm New Password
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot_otp');
                    setErrorMsg('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeftIcon size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isProcessing || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password in DB...</span>
                    </>
                  ) : (
                    <span>Update Password & Save</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Flow — Step 4: Success Screen */}
          {tab === 'forgot_success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-300 dark:border-emerald-800">
                <CheckCircleIcon size={36} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Password Updated Successfully!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your password for <strong className="text-slate-800 dark:text-slate-200">{email}</strong> has been updated in the database. Please sign in again with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetCode('');
                  setErrorMsg('');
                  setSuccessMsg('Password updated successfully! Please enter your new password to sign in.');
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <LockIcon size={14} />
                <span>Proceed to Sign In</span>
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

      {/* Legal Document Popup Modal (Terms & Conditions / Privacy Policy) */}
      {legalModalType && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/80 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setLegalModalType(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 rounded-2xl sm:rounded-3xl max-w-lg sm:max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-scale-in relative overflow-hidden transition-all duration-300 ease-out max-h-[88vh] flex flex-col text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-charcoal-800 shrink-0 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shrink-0">
                  {legalModalType === 'terms' ? <FileTextIcon size={18} /> : <ShieldIcon size={18} />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {legalModalType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PrepMagnet Legal Policy • Last updated October 2026
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalType(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                aria-label="Close policy popup"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Quick Document Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-charcoal-800 rounded-xl text-xs font-bold text-center shrink-0">
              <button
                type="button"
                onClick={() => setLegalModalType('terms')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  legalModalType === 'terms'
                    ? 'bg-white dark:bg-charcoal-900 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                onClick={() => setLegalModalType('privacy')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  legalModalType === 'privacy'
                    ? 'bg-white dark:bg-charcoal-900 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Privacy Policy
              </button>
            </div>

            {/* Document Content Scrollable Body */}
            <div className="overflow-y-auto pr-2 space-y-3.5 scrollbar-thin text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-left flex-1">
              {legalModalType === 'terms' ? (
                <>
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                    <p className="font-semibold mb-1">Key Summary</p>
                    <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90">
                      By registering an account with PrepMagnet, you agree to access testing materials solely for personal competitive exam preparation, maintain single-user credential security, and respect platform intellectual property.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">1. Acceptance &amp; Eligibility</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      By creating an account or accessing tests, you represent that you are at least 18 years old (or have parental/guardian consent if a minor) and legally competent to enter into binding agreements under the Indian Contract Act, 1872.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">2. User Account &amp; Single-Candidate Security</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Your account credentials are confidential and strictly for single-user use. Simultaneous multi-device exam sessions or credential sharing may lead to automated session termination and security flags.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">3. Mock Tests &amp; AI Analytics</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      PrepMagnet provides computer-based mock tests, live scoring, percentile calculators, and AI diagnostic feedback. While curated according to official exam patterns (SSC, Banking, Railways, State PSC, Defence), tests are simulations and do not guarantee final government selection.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">4. Payments &amp; Razorpay Gateway</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      All subscription payments are securely transacted through Razorpay. Due to immediate digital delivery and unlock of test series content, purchases are subject to PrepMagnet's strict digital access and refund policy.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">5. Intellectual Property &amp; Honor Code</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      All mock questions, explanations, typing master passages, algorithms, and interface elements are proprietary to PrepMagnet. Scraping, redistributing, or using unauthorized automated bots is strictly prohibited.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">6. Governing Law &amp; Grievance Redressal</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      These Terms are governed by the laws of India. For any grievances, reach out to grievance@prepmagnet.in or support@prepmagnet.in.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                    <p className="font-semibold mb-1">Privacy &amp; Data Protection (DPDPA 2023)</p>
                    <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90">
                      PrepMagnet respects your privacy and complies with the Digital Personal Data Protection Act, 2023. We never sell your personal information or test history to third parties.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">1. Information We Collect</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      We collect your name, email address, password hash (bcrypt), selected target examinations, mock test answer submissions, typing speed scores, and login timestamps to personalize your learning trajectory.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">2. How We Use Your Data</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Your data is utilized to calculate all-India ranks, compute speed &amp; accuracy metrics, send email OTP verifications, and provide AI-driven weakness recommendations.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">3. Payment Information &amp; Razorpay</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      PrepMagnet does not capture or store debit/credit card numbers or UPI MPINs. All transactions are processed through Razorpay's PCI-DSS Level 1 compliant secure tokenized infrastructure.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">4. Data Encryption &amp; Security</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      All data in transit is encrypted with TLS 1.3. User passwords and confidential credentials are cryptographic hashes stored securely in our PostgreSQL database with strict role-based access.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">5. Your Rights &amp; Data Deletion</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Under DPDPA, you have the right to access your personal data, request corrections, or request account deletion by emailing privacy@prepmagnet.in.
                    </p>
                  </div>
                </>
              )}

              {/* View Full Page in New Tab Link */}
              <div className="pt-2 border-t border-slate-150 dark:border-charcoal-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Need complete unabridged legal text?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    window.open(legalModalType === 'terms' ? ROUTES.terms : ROUTES.privacy, '_blank');
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Page</span>
                  <span>↗</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-150 dark:border-charcoal-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLegalModalType(null)}
                className="py-2 px-4 rounded-xl border border-slate-300 dark:border-charcoal-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setErrorMsg('');
                  setLegalModalType(null);
                }}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckIcon size={14} />
                <span>Agree &amp; Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
