import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldIcon,
  UserIcon,
  CpuIcon,
  LayersIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
  SearchIcon,
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  UserCheckIcon,
  UserXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  FlameIcon,
  LockIcon,
  CheckIcon,
} from '../components/Icons';

const EXAM_OPTIONS = [
  'SSC CGL',
  'SSC CHSL',
  'IBPS PO / Banking',
  'RRB NTPC',
  'State PSC',
  'UPSC CSAT',
  'Defence / CDS',
];

export const AdminStudioPage = ({ onTestCreated }) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'generator' | 'questions' | 'health'

  // Admin stats & health
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Paginated Users State (10 items per page)
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Edit User Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: 'student',
    is_active: true,
    coins_balance: 150,
    subscription_plan: 'FREE',
    subscription_status: 'INACTIVE',
    target_exams: [],
    phone_number: '',
    password: '',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto Mock Generator Form State
  const [genTitle, setGenTitle] = useState('');
  const [genType, setGenType] = useState('FULL');
  const [genExam, setGenExam] = useState('SSC CGL');
  const [genSubject, setGenSubject] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genNumQ, setGenNumQ] = useState(25);
  const [genDuration, setGenDuration] = useState(60);
  const [genPosMarks, setGenPosMarks] = useState(2.0);
  const [genNegMarks, setGenNegMarks] = useState(0.5);
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState('');

  // Question Bank search
  const [searchQ, setSearchQ] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // Show auto-dismissing toast
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load platform overview
  const loadOverviewData = async () => {
    setLoadingOverview(true);
    try {
      const [s, h, q] = await Promise.all([
        api.admin.getStats(),
        api.admin.getHealth(),
        api.questions.list(),
      ]);
      setStats(s);
      setHealth(h);
      setQuestions(q);
    } catch (err) {
      console.warn('Overview data fetch error:', err.message);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch paginated users from backend
  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const is_active = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : '';
      const res = await api.admin.getUsers({
        page,
        page_size: 10,
        search: searchQuery,
        role: roleFilter,
        is_active,
      });
      setUsers(res.items || []);
      setTotalUsers(res.total || 0);
      setCurrentPage(res.page || 1);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      showToast('error', `Failed to load users: ${err.message}`);
    } finally {
      setUsersLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadOverviewData();
  }, []);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);

  // Open Edit User Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'student',
      is_active: user.is_active !== undefined ? user.is_active : true,
      coins_balance: user.profile?.coins_balance ?? 150,
      subscription_plan: user.profile?.subscription_plan || 'FREE',
      subscription_status: user.profile?.subscription_status || 'INACTIVE',
      target_exams: user.profile?.target_exams || ['SSC CGL'],
      phone_number: user.profile?.phone_number || '',
      password: '',
    });
  };

  // Save changes to user profile
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
        coins_balance: parseInt(editForm.coins_balance, 10),
        subscription_plan: editForm.subscription_plan,
        subscription_status: editForm.subscription_status,
        target_exams: editForm.target_exams,
        phone_number: editForm.phone_number || null,
      };
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const updated = await api.admin.updateUser(selectedUser.id, payload);
      showToast('success', `User "${updated.full_name}" updated successfully!`);
      setSelectedUser(null);
      fetchUsers(currentPage);
      loadOverviewData();
    } catch (err) {
      showToast('error', `Update failed: ${err.message}`);
    } finally {
      setSavingUser(false);
    }
  };

  // Quick toggle role between student and admin
  const handleToggleRole = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot alter your own administrator role.');
      return;
    }
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    const actionLabel = newRole === 'admin' ? 'promote to Administrator' : 'demote to Student';
    if (!window.confirm(`Are you sure you want to ${actionLabel} for "${user.full_name}"?`)) {
      return;
    }

    try {
      await api.admin.updateUser(user.id, { role: newRole });
      showToast('success', `Role for "${user.full_name}" set to ${newRole.toUpperCase()}`);
      fetchUsers(currentPage);
    } catch (err) {
      showToast('error', `Role change failed: ${err.message}`);
    }
  };

  // Quick toggle active / suspended status
  const handleToggleStatus = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot deactivate your own account.');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await api.admin.updateUser(user.id, { is_active: newStatus });
      showToast('success', `User "${user.full_name}" is now ${newStatus ? 'ACTIVE' : 'SUSPENDED'}`);
      fetchUsers(currentPage);
    } catch (err) {
      showToast('error', `Status change failed: ${err.message}`);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    const isSelf = currentAdmin?.id === user.id || currentAdmin?.email === user.email;
    if (isSelf) {
      showToast('error', 'You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Permanently delete account for "${user.full_name}" (${user.email})? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.admin.deleteUser(user.id);
      showToast('success', `Account for "${user.full_name}" deleted.`);
      fetchUsers(currentPage);
      loadOverviewData();
    } catch (err) {
      showToast('error', `Delete failed: ${err.message}`);
    }
  };

  const toggleExamInEdit = (exam) => {
    setEditForm((prev) => {
      const exists = prev.target_exams.includes(exam);
      if (exists) {
        return {
          ...prev,
          target_exams: prev.target_exams.length > 1 ? prev.target_exams.filter((e) => e !== exam) : prev.target_exams,
        };
      }
      return { ...prev, target_exams: [...prev.target_exams, exam] };
    });
  };

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenSuccess('');
    try {
      const params = {
        title: genTitle || `${genExam} ${genType} Mock Test (${Date.now().toString().slice(-4)})`,
        test_type: genType,
        target_exam: genExam,
        num_questions: genNumQ,
        duration_minutes: genDuration,
        positive_marks: genPosMarks,
        negative_marks: genNegMarks,
      };
      if (genSubject) params.subject = genSubject;
      if (genTopic) params.topic = genTopic;

      const res = await api.admin.autoGenerateMock(params);
      setGenSuccess(`Mock Test "${res.title || params.title}" successfully compiled and published!`);
      setGenTitle('');
      if (onTestCreated) onTestCreated(res);
      loadOverviewData();
    } catch (err) {
      showToast('error', `Mock Test compilation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (searchQ) {
      const term = searchQ.toLowerCase();
      return (
        q.question_text?.toLowerCase().includes(term) ||
        q.subject?.toLowerCase().includes(term) ||
        q.topic?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 font-sans text-charcoal-900 dark:text-charcoal-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-md shadow-2xl">
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircleIcon size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangleIcon size={18} className="text-rose-600 shrink-0" />
            )}
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold uppercase tracking-wider">
            <ShieldIcon size={14} />
            <span>PrepMagnet Admin Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-950 dark:text-white">
            Administrative Command & User Governance Studio
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 dark:text-charcoal-400 max-w-2xl leading-relaxed">
            Real-time candidate profile management, role elevation, auto-compiled test suites, and live platform telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => {
              loadOverviewData();
              fetchUsers(currentPage);
              showToast('success', 'Admin studio synchronized with backend.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCwIcon size={14} className={loadingOverview || usersLoading ? 'animate-spin' : ''} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* 4 Live Stats Cards (All data directly from backend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
            <UserIcon size={24} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">Total Users</div>
            <div className="text-2xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-100">
              {stats?.total_users ?? (loadingOverview ? '...' : 0)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <CpuIcon size={24} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">Question Bank</div>
            <div className="text-2xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-100">
              {stats?.total_questions_in_bank ?? (loadingOverview ? '...' : 0)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <LayersIcon size={24} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">Configured Tests</div>
            <div className="text-2xl font-extrabold font-mono text-charcoal-900 dark:text-charcoal-100">
              {stats?.total_configured_tests ?? (loadingOverview ? '...' : 0)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircleIcon size={24} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">Completed Attempts</div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {stats?.completed_attempts ?? (loadingOverview ? '...' : 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-charcoal-200 dark:border-charcoal-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <UserIcon size={15} />
          <span>User Profiles & Governance ({totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'generator'
              ? 'bg-purple-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <SparklesIcon size={15} />
          <span>Automated Mock Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'questions'
              ? 'bg-purple-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <LayersIcon size={15} />
          <span>Question Bank Ingestion ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'health'
              ? 'bg-purple-600 text-white shadow-sm font-extrabold'
              : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
          }`}
        >
          <CpuIcon size={15} />
          <span>Infrastructure & Telemetry</span>
        </button>
      </div>

      {/* TAB 1: USER PROFILES & GOVERNANCE (Tabulate Dashboard Paginated 10 per page) */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-6 animate-fade-in">
          {/* Header Controls: Search & Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-charcoal-950 dark:text-white flex items-center gap-2">
                <span>User Profiles & Role Directory</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  {totalUsers} Registered
                </span>
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-0.5">
                Paginated live API of 10 users per page. Inspect candidate analytics, grant administrator privileges, or modify preferences.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-3.5 py-2 text-xs rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-56 sm:w-64"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="student">Student Aspirants</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Tabulate Dashboard Table */}
          <div className="overflow-x-auto rounded-2xl border border-charcoal-200 dark:border-charcoal-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-charcoal-50 dark:bg-charcoal-850/80 border-b border-charcoal-200 dark:border-charcoal-800 text-charcoal-500 dark:text-charcoal-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Candidate Profile</th>
                  <th className="py-3 px-3">Role & Access</th>
                  <th className="py-3 px-3">Account Status</th>
                  <th className="py-3 px-3">Exam Focus</th>
                  <th className="py-3 px-3">Coins & Streak</th>
                  <th className="py-3 px-3">Subscription</th>
                  <th className="py-3 px-3">Joined On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-150 dark:divide-charcoal-800 font-semibold">
                {usersLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading live user directory from backend...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-charcoal-400">
                      No candidate profiles found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentAdmin?.id === u.id || currentAdmin?.email === u.email;
                    const initials = u.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'PM';

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-charcoal-50/60 dark:hover:bg-charcoal-850/50 transition-colors"
                      >
                        {/* 1. Candidate Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-charcoal-900 dark:text-white flex items-center gap-1.5 truncate">
                                <span>{u.full_name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-charcoal-400 font-mono truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role & Access */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {u.role === 'admin' ? <ShieldIcon size={11} /> : <UserIcon size={11} />}
                              <span>{u.role}</span>
                            </span>

                            {!isSelf && (
                              <button
                                onClick={() => handleToggleRole(u)}
                                title={u.role === 'admin' ? 'Demote to Student' : 'Make Administrator'}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  u.role === 'admin'
                                    ? 'border-charcoal-300 dark:border-charcoal-700 text-charcoal-600 dark:text-charcoal-400 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                                    : 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900'
                                }`}
                              >
                                {u.role === 'admin' ? 'Make Student' : '⚡ Make Admin'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Account Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                u.is_active
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{u.is_active ? 'Active' : 'Suspended'}</span>
                            </span>

                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="text-[10px] font-semibold text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 underline cursor-pointer"
                              >
                                {u.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Exam Focus */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {u.profile?.target_exams?.slice(0, 2).map((exam, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 text-[10px] font-medium truncate"
                              >
                                {exam}
                              </span>
                            ))}
                            {(u.profile?.target_exams?.length || 0) > 2 && (
                              <span className="text-[10px] text-charcoal-400 font-mono">
                                +{(u.profile?.target_exams?.length || 0) - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Coins & Streak */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 text-[11px] font-mono">
                            <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span>🪙 {u.profile?.coins_balance ?? 0}</span>
                              <span className="text-[9px] text-charcoal-400 font-sans">coins</span>
                            </div>
                            <div className="text-charcoal-500 dark:text-charcoal-400 flex items-center gap-1 text-[10px]">
                              <FlameIcon size={12} className="text-orange-500" />
                              <span>{u.profile?.current_streak ?? 0}d streak</span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Subscription */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                u.profile?.subscription_plan === 'ELITE'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : u.profile?.subscription_plan === 'PRO'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                              }`}
                            >
                              {u.profile?.subscription_plan !== 'FREE' && <CrownIcon size={10} />}
                              <span>{u.profile?.subscription_plan || 'FREE'}</span>
                            </span>
                            <div className="text-[9px] text-charcoal-400 font-mono">
                              {u.profile?.subscription_status || 'INACTIVE'}
                            </div>
                          </div>
                        </td>

                        {/* 7. Joined On */}
                        <td className="py-3 px-3 font-mono text-[11px] text-charcoal-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-charcoal-700 dark:text-charcoal-300 transition-colors cursor-pointer"
                              title="Edit user profile"
                            >
                              <EditIcon size={13} />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                <TrashIcon size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (Strict 10 items per page) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs">
            <div className="text-charcoal-500 font-semibold">
              Showing{' '}
              <strong className="text-charcoal-900 dark:text-white font-mono">
                {totalUsers === 0 ? 0 : (currentPage - 1) * 10 + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-charcoal-900 dark:text-white font-mono">
                {Math.min(currentPage * 10, totalUsers)}
              </strong>{' '}
              of <strong className="text-charcoal-900 dark:text-white font-mono">{totalUsers}</strong> candidates
              (10 per page)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1 || usersLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 transition-all cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeftIcon size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    currentPage === pg
                      ? 'bg-purple-600 text-white shadow-xs font-extrabold'
                      : 'border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                disabled={currentPage >= totalPages || usersLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 disabled:opacity-40 transition-all cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-950/75 backdrop-blur-md animate-fade-in font-sans"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in relative overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-200 dark:border-charcoal-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <EditIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">
                    Edit Candidate Profile
                  </h3>
                  <p className="text-[11px] text-charcoal-400 font-mono">
                    ID: {selectedUser.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEdit} className="overflow-y-auto pr-1 space-y-4 text-xs font-semibold scrollbar-thin">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">
                    System Role ("Make Admin")
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={currentAdmin?.id === selectedUser.id}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  >
                    <option value="student">Student Aspirant</option>
                    <option value="admin">Administrator (Admin Studio Access)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Account Status</label>
                  <select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                    disabled={currentAdmin?.id === selectedUser.id}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Suspended (Access Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Coins Balance & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Coins Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.coins_balance}
                    onChange={(e) => setEditForm({ ...editForm, coins_balance: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Subscription Plan & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Subscription Plan</label>
                  <select
                    value={editForm.subscription_plan}
                    onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="FREE">FREE Tier</option>
                    <option value="PRO">PRO Pass</option>
                    <option value="ELITE">ELITE Pass</option>
                    <option value="NONE">NONE (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Subscription Status</label>
                  <select
                    value={editForm.subscription_status}
                    onChange={(e) => setEditForm({ ...editForm, subscription_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              {/* Target Exam Focus Pills */}
              <div className="space-y-1.5 text-left">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold">Target Exam Focus</label>
                <div className="flex flex-wrap gap-1.5">
                  {EXAM_OPTIONS.map((exam) => {
                    const isSelected = editForm.target_exams.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => toggleExamInEdit(exam)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'border border-charcoal-300 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 hover:border-purple-400'
                        }`}
                      >
                        {exam} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Force Password Reset by Admin (Optional) */}
              <div className="space-y-1 text-left p-3 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800">
                <label className="text-charcoal-700 dark:text-charcoal-300 font-bold flex items-center gap-1.5">
                  <LockIcon size={12} className="text-purple-600" />
                  <span>Assign New Password (Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal-200 dark:border-charcoal-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-charcoal-300 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 text-xs font-bold hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED MOCK GENERATOR */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
              <SparklesIcon size={18} className="text-purple-600" />
              <h2 className="text-base font-extrabold text-charcoal-950 dark:text-white">
                Dynamic Mock Test Generator
              </h2>
            </div>

            {genSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                ✓ {genSuccess}
              </div>
            )}

            <form onSubmit={handleAutoGenerate} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Mock Test Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. SSC CGL 2026 Tier-I Mega Mock 05"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Target Exam</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={genExam}
                    onChange={(e) => setGenExam(e.target.value)}
                  >
                    <option value="SSC CGL">SSC CGL</option>
                    <option value="SSC CHSL">SSC CHSL</option>
                    <option value="RRB NTPC">RRB NTPC</option>
                    <option value="IBPS PO">IBPS PO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Test Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={genType}
                    onChange={(e) => setGenType(e.target.value)}
                  >
                    <option value="FULL">FULL Mock</option>
                    <option value="SUBJECT">SUBJECT Mock</option>
                    <option value="TOPIC_MINI">TOPIC_MINI Mock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Subject (Optional)</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={genSubject}
                    onChange={(e) => setGenSubject(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="General Intelligence & Reasoning">Reasoning</option>
                    <option value="English Comprehension">English</option>
                    <option value="General Awareness">General Awareness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Topic (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Geometry, Syllogisms"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Questions</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    className="w-full px-2 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 font-mono"
                    value={genNumQ}
                    onChange={(e) => setGenNumQ(parseInt(e.target.value, 10) || 25)}
                  />
                </div>

                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">Mins</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    className="w-full px-2 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 font-mono"
                    value={genDuration}
                    onChange={(e) => setGenDuration(parseInt(e.target.value, 10) || 60)}
                  />
                </div>

                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">+ Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full px-2 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 font-mono"
                    value={genPosMarks}
                    onChange={(e) => setGenPosMarks(parseFloat(e.target.value) || 2.0)}
                  />
                </div>

                <div>
                  <label className="block text-charcoal-600 dark:text-charcoal-400 mb-1">- Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    className="w-full px-2 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 font-mono"
                    value={genNegMarks}
                    onChange={(e) => setGenNegMarks(parseFloat(e.target.value) || 0.5)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {generating ? 'Sampling & Compiling...' : '⚡ Auto-Compile & Publish Test'}
              </button>
            </form>
          </div>

          {/* Compilation Guidelines */}
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-charcoal-950 dark:text-white">
              Dynamic Mock Assembly Architecture
            </h3>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed">
              When auto-generating tests, the platform backend samples unique questions from MongoDB based on your specified target exam and taxonomy subject distributions.
            </p>
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2 text-xs">
              <div className="font-extrabold text-purple-900 dark:text-purple-200">
                Live Test Compilation Rules:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-purple-800 dark:text-purple-300">
                <li>Strict deduplication avoids repeating the same question twice in a test.</li>
                <li>Positive and negative marking rates apply automatically to student scorecards.</li>
                <li>Immediately published to Test Discovery and Student Dashboards upon generation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION BANK EXPLORER */}
      {activeTab === 'questions' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 shadow-card space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
            <div>
              <h2 className="text-base font-extrabold text-charcoal-950 dark:text-white">Question Bank Ingestion Explorer</h2>
              <p className="text-xs text-charcoal-500">
                Inspect questions ingested from the automated pipeline with complete solutions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 focus:outline-none"
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 dark:border-charcoal-700 bg-charcoal-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-charcoal-100 placeholder:text-charcoal-400 focus:outline-none"
                  placeholder="Search questions..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {q.subject}
                    </span>
                    <span className="text-charcoal-600 dark:text-charcoal-400">{q.topic}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-charcoal-300">
                    {q.difficulty}
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {q.question_text}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        opt.id === q.correct_option
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'bg-white dark:bg-charcoal-800 border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300'
                      }`}
                    >
                      <span>{opt.id}. {opt.text}</span>
                      {opt.id === q.correct_option && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CORRECT</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-charcoal-600 dark:text-charcoal-400 bg-white dark:bg-charcoal-900 p-3 rounded-xl border border-charcoal-200 dark:border-charcoal-800">
                  <strong>Explanation:</strong> {q.solution_explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INFRASTRUCTURE & TELEMETRY */}
      {activeTab === 'health' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-3xl p-6 sm:p-8 shadow-card space-y-5 animate-fade-in">
          <div className="flex items-center gap-2 pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
            <CpuIcon size={18} className="text-purple-600" />
            <h2 className="text-base font-extrabold text-charcoal-950 dark:text-white">
              System Infrastructure & Live Health
            </h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">MongoDB Database</div>
                <div className="text-[11px] text-charcoal-400">
                  Status: {health?.database?.status || 'Active'} (Mock: {health?.database?.is_mock ? 'In-Memory AsyncMongoMock' : 'Live Replica Set'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Connected
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">Redis In-Memory Cache</div>
                <div className="text-[11px] text-charcoal-400">
                  Status: {health?.cache?.status || 'Active'} (Fallback Memory: {health?.cache?.is_fallback ? 'Yes' : 'No'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Operational
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">Application Runtime</div>
                <div className="text-[11px] text-charcoal-400">
                  {health?.app || 'MockExam Platform API'} ({health?.environment || 'development'})
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
