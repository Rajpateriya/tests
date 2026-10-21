import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UserIcon,
  ShieldIcon,
  TargetIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon, 
  CameraIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
  SparklesIcon,
  PhoneIcon,
  MailIcon,
  RefreshCwIcon,
} from './Icons';

const STANDARD_TARGET_EXAMS = [
  { id: 'SSC CGL', label: 'SSC CGL', badge: 'SSC' },
  { id: 'IBPS PO / Banking', label: 'IBPS / SBI Banking', badge: 'Banking' },
  { id: 'RRB NTPC', label: 'RRB NTPC', badge: 'Railways' },
  { id: 'State PSC', label: 'State PSC / PCS', badge: 'PSC' },
  { id: 'UPSC CSAT', label: 'UPSC CSAT', badge: 'Civil Services' },
  { id: 'Defence / CDS', label: 'Defence (CDS / NDA)', badge: 'Defence' },
];

const PREFERRED_SUBJECTS_LIST = [
  'Quantitative Aptitude',
  'Reasoning & Intelligence',
  'English Language',
  'General Awareness',
  'Computer Knowledge',
];

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=AspirantTitan',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ScholarEagle',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ExamMaster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberHero',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaRank',
];

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedExams, setSelectedExams] = useState([]);
  const [customExamInput, setCustomExamInput] = useState('');
  const [preferredSubjects, setPreferredSubjects] = useState([]);

  // OTP Reset Flow State (Strict 2-step verification: OTP verified FIRST, then password fields open)
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify' | 'new_password' | 'success'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Populate user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.profile?.phone_number || '');
      setAvatarUrl(user.profile?.avatar_url || '');

      const initialExams = user.profile?.target_exams || user.target_exams || [];
      setSelectedExams(Array.isArray(initialExams) ? [...initialExams] : ['SSC CGL']);

      const initialSubjects = user.profile?.preferred_subjects || [];
      setPreferredSubjects(Array.isArray(initialSubjects) ? [...initialSubjects] : []);

      // Reset password states
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setResetStep('request');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, user]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Toggle Exam Selection
  const toggleExam = (examId) => {
    setSelectedExams((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  // Add Custom Exam Tag
  const handleAddCustomExam = (e) => {
    e.preventDefault();
    const trimmed = customExamInput.trim();
    if (!trimmed) return;
    if (!selectedExams.includes(trimmed)) {
      setSelectedExams((prev) => [...prev, trimmed]);
    }
    setCustomExamInput('');
  };

  // Remove Exam Tag
  const handleRemoveExam = (examId) => {
    setSelectedExams((prev) => prev.filter((id) => id !== examId));
  };

  // Toggle Preferred Subject
  const toggleSubject = (sub) => {
    setPreferredSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // Handle Photo Upload with Client-Side Canvas Compression
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);

        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        setAvatarUrl(compressed);
        setErrorMsg('');
      };
      img.onerror = () => {
        setErrorMsg('Could not process selected image. Try another.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter a valid full name (at least 2 characters).');
      return;
    }

    if (selectedExams.length === 0) {
      setErrorMsg('Please select at least one primary target exam.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        target_exams: selectedExams,
        preferred_subjects: preferredSubjects,
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl || null,
      };

      await updateProfile(payload);
      setSuccessMsg('Profile and exam preferences successfully updated!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 1: Dispatch 6-digit OTP using the dedicated send-otp API (identical to registration flow)
  const handleSendResetOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSendingOtp(true);
    try {
      // Calls the dedicated sendOtp endpoint (/api/v1/auth/send-otp)
      await api.auth.sendOtp(user.email);
      setResetStep('verify');
      setResendCooldown(60);
      setSuccessMsg(`A 6-digit verification code has been dispatched to ${user.email}`);
    } catch (err) {
      console.warn('sendOtp failed, attempting forgotPassword fallback:', err);
      try {
        await api.auth.forgotPassword(user.email);
        setResetStep('verify');
        setResendCooldown(60);
        setSuccessMsg(`A 6-digit verification code has been dispatched to ${user.email}`);
      } catch (err2) {
        console.error('Failed to send reset OTP:', err2);
        setErrorMsg(err2.message || err.message || 'Failed to send OTP code. Please try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify the 6-digit OTP code FIRST before revealing password reset fields
  const handleVerifyResetOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanCode = resetCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsVerifyingOtp(true);
    try {
      const res = await api.auth.verifyResetCode(user.email, cleanCode);
      setSuccessMsg(res?.message || 'OTP verified successfully! Please enter your new password.');
      setResetStep('new_password');
    } catch (err) {
      console.error('Failed to verify OTP:', err);
      setErrorMsg(err.message || 'Invalid or expired 6-digit verification code. Please request a new code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 3: Set and confirm new password (ONLY accessible after OTP is verified)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.auth.resetPassword({
        email: user.email,
        reset_code: resetCode.trim(),
        new_password: newPassword,
      });

      setSuccessMsg(res?.message || 'Password successfully updated in database!');
      setResetStep('success');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg(err.message || 'Failed to update password. Please check your verification code and try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto animate-scale-in flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-profile-title"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-150 dark:border-charcoal-800 bg-charcoal-50/60 dark:bg-charcoal-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-institutional-100 dark:bg-institutional-950/80 text-institutional-600 dark:text-institutional-400 flex items-center justify-center shadow-xs">
              <UserIcon size={18} />
            </div>
            <div>
              <h2 id="modal-profile-title" className="text-base font-extrabold text-charcoal-900 dark:text-white tracking-tight">
                Profile & Target Exams
              </h2>
              <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                Update your personal info, chosen exam goals, and account security
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
            aria-label="Close modal"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-charcoal-150 dark:border-charcoal-800 px-6 bg-white dark:bg-charcoal-900">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-institutional-600 text-institutional-700 dark:text-institutional-400'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200'
            }`}
          >
            <TargetIcon size={15} />
            <span>Profile & Selected Exams</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'border-institutional-600 text-institutional-700 dark:text-institutional-400'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200'
            }`}
          >
            <KeyIcon size={15} />
            <span>Reset Password (OTP)</span>
          </button>

        </div>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertTriangleIcon size={16} className="shrink-0 text-rose-600" />
            <span className="flex-1">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="font-bold text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircleIcon size={16} className="shrink-0 text-emerald-600" />
            <span className="flex-1">{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="font-bold text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* =========================================================================
              TAB 1: PROFILE & EXAM SELECTION
              ========================================================================= */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar Selector & Upload */}
              <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/80 dark:border-charcoal-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-charcoal-800 dark:text-charcoal-200">
                    Profile Avatar
                  </span>
                  <span className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                    Upload image or pick an avatar
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-institutional-600 text-white font-extrabold text-xl flex items-center justify-center overflow-hidden shadow-sm border-2 border-institutional-500/40">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <span>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-institutional-600 hover:bg-institutional-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105"
                      title="Upload from device"
                    >
                      <CameraIcon size={11} />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {/* Preset Avatars */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-[11px] font-semibold text-charcoal-600 dark:text-charcoal-400 mb-1.5">
                      Or pick a candidate badge avatar:
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(preset)}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer hover:scale-110 ${
                            avatarUrl === preset
                              ? 'border-institutional-600 ring-2 ring-institutional-500/30'
                              : 'border-charcoal-200 dark:border-charcoal-700 hover:border-charcoal-400'
                          }`}
                        >
                          <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-contain rounded-lg" />
                        </button>
                      ))}
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1 py-0.5"
                        >
                          Reset to Initial
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-profile-name" className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 flex items-center gap-1.5">
                    <UserIcon size={13} className="text-charcoal-400" />
                    <span>Candidate Full Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-profile-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-xs font-semibold text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500/20 focus:border-institutional-600 transition-colors"
                  />
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MailIcon size={13} className="text-charcoal-400" />
                      <span>Registered Email</span>
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <CheckCircleIcon size={11} /> Verified
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200/80 dark:border-charcoal-800 bg-charcoal-100/60 dark:bg-charcoal-850 text-xs font-medium text-charcoal-600 dark:text-charcoal-400 flex items-center justify-between select-none">
                    <span className="truncate">{user.email}</span>
                    <LockIcon size={12} className="text-charcoal-400 shrink-0 ml-2" />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="edit-profile-phone" className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200 flex items-center gap-1.5">
                    <PhoneIcon size={13} className="text-charcoal-400" />
                    <span>Phone Number (Optional)</span>
                  </label>
                  <input
                    id="edit-profile-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-xs font-semibold text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-institutional-500/20 focus:border-institutional-600 transition-colors"
                  />
                </div>
              </div>

              {/* =========================================================================
                  PRIMARY TARGET EXAM SELECTION (CRITICAL USER REQUEST)
                  ========================================================================= */}
              <div className="space-y-3 pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TargetIcon size={15} className="text-amber-500" />
                    <span className="text-xs font-extrabold text-charcoal-900 dark:text-white">
                      Selected Target Examination(s)
                    </span>
                    <span className="text-rose-500">*</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-institutional-100 dark:bg-institutional-950/80 text-institutional-700 dark:text-institutional-300">
                    {selectedExams.length} Selected
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 dark:text-charcoal-400">
                  Select the competitive examinations you are preparing for. We personalize your mock series, percentile tracking, and questions based on these targets.
                </p>

                {/* Standard Exam Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {STANDARD_TARGET_EXAMS.map((exam) => {
                    const isSelected = selectedExams.includes(exam.id);
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => toggleExam(exam.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-institutional-50 dark:bg-institutional-950/70 border-institutional-500 text-institutional-900 dark:text-institutional-100 shadow-xs'
                            : 'bg-white dark:bg-charcoal-800/80 border-charcoal-200 dark:border-charcoal-750 text-charcoal-700 dark:text-charcoal-300 hover:border-charcoal-400 dark:hover:border-charcoal-600'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-bold truncate">{exam.label}</div>
                          <div className="text-[10px] text-charcoal-400 font-mono mt-0.5">{exam.badge}</div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-institutional-600 text-white'
                              : 'border border-charcoal-300 dark:border-charcoal-600 group-hover:border-charcoal-400'
                          }`}
                        >
                          {isSelected && <CheckIcon size={10} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom / Other Exam Tag */}
                <div className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customExamInput}
                      onChange={(e) => setCustomExamInput(e.target.value)}
                      placeholder="Add other exam (e.g. AFCAT, SBI Clerk, Delhi Police)..."
                      className="flex-1 px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-xs font-semibold text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 focus:outline-none focus:ring-1 focus:ring-institutional-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomExam}
                      className="px-3.5 py-2 rounded-xl bg-charcoal-100 dark:bg-charcoal-800 hover:bg-charcoal-200 dark:hover:bg-charcoal-750 text-charcoal-800 dark:text-charcoal-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PlusIcon size={13} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Selected Exams Tag Pills */}
                {selectedExams.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-bold text-charcoal-500 mr-1">Your Targets:</span>
                    {selectedExams.map((exam) => (
                      <span
                        key={exam}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs"
                      >
                        <TargetIcon size={12} className="text-amber-600" />
                        <span>{exam}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExam(exam)}
                          className="hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                          title="Remove exam"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Subjects Section */}
              <div className="space-y-2 pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                <div className="text-xs font-extrabold text-charcoal-800 dark:text-charcoal-200">
                  Focus Subjects (Optional)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PREFERRED_SUBJECTS_LIST.map((sub) => {
                    const isSelected = preferredSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-institutional-600 text-white border-institutional-600 shadow-xs'
                            : 'bg-charcoal-50 dark:bg-charcoal-800/80 text-charcoal-700 dark:text-charcoal-300 border-charcoal-200 dark:border-charcoal-700 hover:border-charcoal-400'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-750 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon size={14} />
                      <span>Save Profile & Targets</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              TAB 2: EXCLUSIVE OTP PASSWORD RESET (NO DIRECT OPTION)
              ========================================================================= */}
          {activeTab === 'password' && (
            <div className="space-y-5">
              {/* Informational Guidance Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-institutional-50 to-indigo-50/50 dark:from-institutional-950/40 dark:to-indigo-950/30 border border-institutional-200/80 dark:border-institutional-850 space-y-1.5">
                <div className="font-extrabold text-xs text-institutional-900 dark:text-institutional-200 flex items-center gap-2">
                  <MailIcon size={15} className="text-institutional-600 dark:text-institutional-400" />
                  <span>Two-Step Security: Email OTP Verification</span>
                </div>
                <p className="text-[11px] text-charcoal-600 dark:text-charcoal-400 leading-relaxed">
                  To protect your account, resetting your password requires verifying a 6-digit code sent to your registered email address: <strong className="text-charcoal-900 dark:text-charcoal-100">{user.email}</strong>. The option to choose a new password will open only after OTP verification.
                </p>
              </div>

              {/* STEP 1: Request OTP */}
              {resetStep === 'request' && (
                <div className="p-6 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/80 dark:border-charcoal-800 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-institutional-100 dark:bg-institutional-950/80 text-institutional-600 dark:text-institutional-400 flex items-center justify-center mx-auto shadow-sm">
                    <KeyIcon size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                      Request Verification OTP
                    </h4>
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1 max-w-sm mx-auto">
                      Click below to generate and dispatch an actual 6-digit one-time code to <strong>{user.email}</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={isSendingOtp}
                    className="px-6 py-3 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                  >
                    {isSendingOtp ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Code to {user.email}...</span>
                      </>
                    ) : (
                      <>
                        <MailIcon size={15} />
                        <span>Send 6-Digit OTP to {user.email}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Verify OTP (NO password fields visible here) */}
              {resetStep === 'verify' && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/80 dark:border-charcoal-800 space-y-3">
                    <div className="text-xs text-charcoal-600 dark:text-charcoal-400">
                      We dispatched a 6-digit verification code to <strong className="text-charcoal-900 dark:text-white">{user.email}</strong>. Enter it below to unlock the password reset form.
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                          6-Digit Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={handleSendResetOtp}
                          disabled={resendCooldown > 0 || isSendingOtp}
                          className="text-[11px] font-bold text-institutional-600 dark:text-institutional-400 disabled:opacity-50 hover:underline cursor-pointer"
                        >
                          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        required
                        autoFocus
                        className="w-full px-3.5 py-3 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-center tracking-[0.35em] font-mono text-lg font-black text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-institutional-500/20 focus:border-institutional-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request');
                        setResetCode('');
                        setErrorMsg('');
                      }}
                      className="text-xs font-bold text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200 cursor-pointer"
                    >
                      ← Back / Request new code
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifyingOtp || resetCode.trim().length !== 6}
                      className="px-6 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon size={14} />
                          <span>Verify OTP Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: OTP Verified — Reset Password Form Now Open */}
              {resetStep === 'new_password' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-fade-in">
                  {/* Verified Banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                    <CheckCircleIcon size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-extrabold">OTP Verified Successfully!</div>
                      <div className="text-[11px] opacity-90">Verification confirmed. Please choose a new secure password.</div>
                    </div>
                  </div>

                  {/* New Password & Confirm Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                        New Password (min 6 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          required
                          minLength={6}
                          autoFocus
                          className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-xs font-semibold text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 pr-10 focus:outline-none focus:ring-2 focus:ring-institutional-500/20 focus:border-institutional-600 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                        >
                          {showNewPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal-800 dark:text-charcoal-200">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 dark:border-charcoal-750 bg-white dark:bg-charcoal-800 text-xs font-semibold text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 pr-10 focus:outline-none focus:ring-2 focus:ring-institutional-500/20 focus:border-institutional-600 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                        >
                          {showConfirmPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {newPassword && confirmPassword && (
                    <div className="text-[11px] font-semibold">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircleIcon size={12} /> Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-500">Passwords do not match yet</span>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request');
                        setResetCode('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-bold text-charcoal-500 hover:text-charcoal-800 dark:hover:text-charcoal-200 cursor-pointer"
                    >
                      ← Cancel / Start Over
                    </button>

                    <button
                      type="submit"
                      disabled={isChangingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                      className="px-6 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon size={14} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success Screen */}
              {resetStep === 'success' && (
                <div className="p-6 rounded-2xl bg-charcoal-50/70 dark:bg-charcoal-850/60 border border-charcoal-200/80 dark:border-charcoal-800 text-center space-y-4 animate-scale-in">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircleIcon size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-charcoal-900 dark:text-white">
                      Password Successfully Updated!
                    </h4>
                    <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1 max-w-sm mx-auto">
                      Your password has been securely updated in the database. You can continue using your account seamlessly.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setResetStep('request');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <span>Return to Profile Details</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
