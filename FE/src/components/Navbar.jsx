import React, { useState, useRef, useEffect } from 'react';
import { api, isRealSession } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, matchPath } from 'react-router';
import { ROUTES } from '../routes';
import {
  SunIcon,
  MoonIcon,
  SparklesIcon,
  BookOpenIcon,
  BarChart3Icon,
  ShieldIcon,
  LogOutIcon,
  UserIcon,
  ZapIcon,
  CrownIcon,
  CpuIcon,
  ChevronDownIcon,
  MailIcon,
  BellIcon,
  CheckCircleIcon,
} from './Icons';

// Bell: unread count pushed over a server-sent-events stream (no polling), a dropdown listing
// notifications, mark-read on click/"mark all".
const NotificationBell = ({ sessionKey, isAdmin }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refreshUnread = async () => {
    try {
      const { unread: n } = await api.notifications.getUnreadCount();
      setUnread(n);
    } catch {
      // not signed in against the real backend, or a transient error — stay quiet
    }
  };

  // Re-runs the instant a real session starts (login, or switching off the demo role): opens the
  // push stream, and closes it on logout/unmount. The server sends CONNECTED once the stream is
  // registered (and again after every reconnect), so re-reading the count then catches anything
  // missed while offline. Every later event is a new notification: re-read the count (and the
  // list, if the dropdown is open) rather than adding 1, so a race can never double-count.
  useEffect(() => {
    setItems([]);
    setUnread(0);
    if (!isRealSession()) return;
    const controller = new AbortController();
    api.notifications.stream(async (event) => {
      refreshUnread();
      if (event.type !== 'CONNECTED' && openRef.current) {
        try {
          setItems(await api.notifications.getMine());
        } catch {
          // keep the current list
        }
      }
    }, controller.signal);
    return () => controller.abort();
  }, [sessionKey]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const openDropdown = async () => {
    const next = !open;
    setOpen(next);
    // Refetch every time it's opened — a stale list would hide a notification that arrived
    // after the last time it was opened (e.g. a ticket raised since).
    if (next) {
      try {
        setItems(await api.notifications.getMine());
      } catch {
        setItems([]);
      }
    }
  };

  const handleMarkRead = async (n) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.notifications.markRead(n.id).catch(() => { }); // the next pushed event or reconnect reconciles this either way
    }
    setOpen(false);
    if (!n.ticket_id) return;
    // Admin: that ticket's row in Admin Studio's Support Tickets tab. Student: their own My
    // Tickets tab. Both pages read `?ticket=<id>` from the address and scroll to/highlight it.
    navigate(
      isAdmin
        ? `${ROUTES.admin}/support?ticket=${n.ticket_id}`
        : `${ROUTES.dashboard}/support?ticket=${n.ticket_id}`
    );
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      // the next pushed event or reconnect reconciles this either way
    }
  };

  if (!isRealSession()) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openDropdown}
        className="relative p-1.5 sm:p-2 rounded-full text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors focus:outline-none cursor-pointer"
        aria-label="Notifications"
      >
        <BellIcon size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-32px)] max-w-xs sm:w-80 max-h-96 overflow-y-auto bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-150 dark:border-charcoal-800">
            <span className="text-xs font-extrabold text-charcoal-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-institutional-600 dark:text-institutional-400 hover:underline cursor-pointer">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-charcoal-400">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-charcoal-50 dark:hover:bg-charcoal-800/60 transition-colors cursor-pointer ${!n.is_read ? 'bg-institutional-50/60 dark:bg-institutional-950/30' : ''
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-institutional-600' : 'bg-transparent'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-charcoal-900 dark:text-white">{n.title}</div>
                    <div className="text-[11px] text-charcoal-500 dark:text-charcoal-400 mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-charcoal-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {n.is_read && <CheckCircleIcon size={13} className="text-emerald-500 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Floating Pill Navbar — Modern, Slim & Architecturally Aware
 * - Floats gracefully at the top of the viewport (detached, rounded-full, frosted glassmorphism).
 * - Role-tailored navigation items:
 *   - Guest: Mock Tests, Pricing/Passes, Features, Sign In, Join Free.
 *   - Student: Dashboard, Mock Tests, Passes, Scorecards (Hidden from Admin tools).
 *   - Admin: Admin Studio, AI Pipeline, Test Catalog, Candidate Preview.
 * - Interactive User Dropdown with quick 1-click role switcher (Student <-> Admin).
 * - Persistent Live Exam Resume pill badge.
 */
export const Navbar = ({ activeAttempt, onOpenAuthModal }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // True when the address is on (or, unless `end`, under) the given route — drives the active highlight.
  const isOn = (path, end = false) => !!matchPath({ path, end }, pathname);
  const { theme, toggleTheme } = useTheme();
  const { user, logout, switchRole, isAdmin, canSwitchRole, isPreviewingAsStudent, subscription } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const formatPlanTitle = (planId) => {
    if (!planId || planId === 'FREE' || planId === 'NONE') return '';
    if (planId === 'PASS_7_DAYS') return '7-Day Sprint Pass';
    if (planId === 'PASS_MONTHLY') return 'Monthly Pro Pass';
    if (planId === 'PASS_ANNUAL') return 'Annual Elite Pass';
    return `${planId.replace(/_/g, ' ')} Pass`;
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sections with their own tabs (/dashboard/<tab>, /admin/<tab>, /ai-pipeline/<step>) are not re-entered
  // from inside themselves, so a click never resets the tab or leaves an extra history entry.
  const SECTION_ROOTS = [ROUTES.dashboard, ROUTES.admin, ROUTES.pipeline];
  const handleNavClick = (path) => {
    if (!isOn(path, !SECTION_ROOTS.includes(path))) navigate(path);
    setMobileMenuOpen(false);
  };

  const handleContactClick = () => {
    setMobileMenuOpen(false);
    if (isOn(ROUTES.home, true)) {
      const el = document.getElementById('contact-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(ROUTES.home);
      setTimeout(() => {
        const el = document.getElementById('contact-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }
  };

  return (
    <>
      {/* Admin Preview Mode Persistent Banner */}
      {isPreviewingAsStudent && (
        <div className="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-purple-800 via-indigo-850 to-purple-900 text-white text-[11px] py-1 px-4 text-center flex items-center justify-center gap-3 font-semibold shadow-md border-b border-purple-600/40">
          <span>👁️ <strong>Admin Preview Mode:</strong> You are previewing the platform as a Candidate / Student</span>
          <button
            onClick={() => {
              switchRole('admin');
              navigate(ROUTES.admin);
            }}
            className="px-2.5 py-0.5 rounded bg-white text-purple-950 font-extrabold text-[10px] hover:bg-purple-100 transition-colors shadow-xs"
          >
            Exit Preview (Back to Admin Studio) →
          </button>
        </div>
      )}
      <nav
        className={`fixed ${isPreviewingAsStudent ? 'top-8 sm:top-9' : 'top-3 sm:top-4'} inset-x-0 mx-auto w-[94%] max-w-5xl z-50 flex items-center justify-between px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-charcoal-200/80 dark:border-charcoal-800/80 bg-white/85 dark:bg-charcoal-900/85 backdrop-blur-md shadow-lg shadow-charcoal-950/5 transition-all`}
        aria-label="Main Navigation"
      >
        {/* 1. BRAND EMBLEM (Sleek, Compact) */}
        <div
          onClick={() => handleNavClick(ROUTES.home)}
          className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
        >
          <div className="w-8 h-8 rounded-full bg-institutional-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
            <SparklesIcon size={16} />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-charcoal-900 dark:text-charcoal-100">
              PrepMagnet
            </span>
            <span className={`hidden xs:inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-mono tracking-wider ${!user
              ? 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
              : isAdmin
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800'
              }`}>
              {!user ? 'PRO' : isAdmin ? 'ADMIN' : 'USER'}
            </span>
          </div>
        </div>

        {/* 2. CENTER NAVIGATION ITEMS (Tailored strictly by user role - Desktop only) */}
        <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
          {/* --- GUEST VIEW (Before Login) --- */}
          {!user && (
            <>
              <button
                onClick={() => handleNavClick(ROUTES.home)}
                className={`px-3 py-1.5 rounded-full transition-colors ${isOn(ROUTES.home, true)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                Mock Tests
              </button>
              <button
                onClick={() => handleNavClick(ROUTES.courses)}
                className={`px-3 py-1.5 rounded-full transition-colors ${isOn(ROUTES.courses)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                Courses & Quizzes
              </button>
              <button
                onClick={() => handleNavClick(ROUTES.typing)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${isOn(ROUTES.typing)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <span>⌨️ Typing Master</span>
              </button>
              <button
                onClick={handleContactClick}
                className="px-3 py-1.5 rounded-full text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60 transition-colors"
              >
                Contact
              </button>
            </>
          )}

          {/* --- STUDENT VIEW (Logged in as Aspirant) --- */}
          {user && !isAdmin && (
            <>
              <button
                onClick={() => handleNavClick(ROUTES.dashboard)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isOn(ROUTES.dashboard)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <BarChart3Icon size={14} />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick(ROUTES.courses)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isOn(ROUTES.courses)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <SparklesIcon size={14} className="text-amber-500" />
                <span>Courses</span>
              </button>

              <button
                onClick={() => handleNavClick(ROUTES.typing)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${isOn(ROUTES.typing)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <span>⌨️ Typing Master</span>
              </button>

              <button
                onClick={handleContactClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60 transition-all"
              >
                <MailIcon size={14} />
                <span>Contact</span>
              </button>
            </>
          )}

          {/* --- ADMIN VIEW (Logged in as Administrator) --- */}
          {user && isAdmin && (
            <>
              <button
                onClick={() => handleNavClick(ROUTES.admin)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isOn(ROUTES.admin)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <ShieldIcon size={14} />
                <span>Admin Studio</span>
              </button>

              <button
                onClick={() => handleNavClick(ROUTES.pipeline)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isOn(ROUTES.pipeline)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <CpuIcon size={14} />
                <span>AI Pipeline</span>
              </button>

              <button
                onClick={() => handleNavClick(ROUTES.courses)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isOn(ROUTES.courses)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <SparklesIcon size={14} />
                <span>Courses</span>
              </button>

              <button
                onClick={() => handleNavClick(ROUTES.typing)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${isOn(ROUTES.typing)
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
                  }`}
              >
                <span>⌨️ Typing Master</span>
              </button>
            </>
          )}
        </div>

        {/* 3. RIGHT ACTIONS (Auth trigger, Theme toggle, Avatar / Dropdown / Hamburger) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Active Attempt Warning / Quick Resume Button (Desktop) */}
          {activeAttempt && !isOn(ROUTES.exam) && (
            <button
              onClick={() => handleNavClick(ROUTES.exam)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors animate-pulse"
            >
              <ZapIcon size={12} className="text-amber-600 fill-amber-600" />
              <span>Resume Exam</span>
            </button>
          )}

          {/* Student GovCoins Wallet Pill (Desktop) */}
          {user && !isAdmin && (
            <button
              onClick={() => handleNavClick(ROUTES.courses)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-100/90 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200/80 transition-colors shadow-sm group"
              title="Your GovCoins wallet: Redeem for instant discount on exam courses!"
            >
              <span className="text-xs group-hover:scale-110 transition-transform">🪙</span>
              <span className="font-mono font-extrabold">{user?.profile?.coins_balance ?? 0}</span>
              <span className="text-[10px] text-amber-750 dark:text-amber-400 font-semibold">Coins</span>
            </button>
          )}

          {/* Notifications Bell */}
          <NotificationBell sessionKey={user?.id} isAdmin={isAdmin} />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-full text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors focus:outline-none"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          {/* --- IF GUEST: Desktop Sign In & Register Buttons --- */}
          {!user ? (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuthModal('login')}
                className="px-3 py-1.5 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:text-charcoal-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuthModal('register')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 rounded-full transition-colors shadow-sm cursor-pointer"
              >
                Join Free
              </button>
            </div>
          ) : (
            /* --- IF LOGGED IN: Desktop Profile Avatar & Role Menu Dropdown --- */
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 sm:pl-2.5 rounded-full border border-charcoal-200 dark:border-charcoal-750 bg-charcoal-50/80 dark:bg-charcoal-800/80 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 transition-colors text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <span className="hidden sm:inline font-bold text-charcoal-800 dark:text-charcoal-200 max-w-[90px] truncate">
                  {user.full_name?.split(' ')[0] || 'User'}
                </span>
                <div className="w-6 h-6 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 overflow-hidden">
                  {user?.profile?.avatar_url ? (
                    <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : user.full_name ? (
                    user.full_name.charAt(0).toUpperCase()
                  ) : (
                    'U'
                  )}
                </div>
                <ChevronDownIcon size={13} className="text-charcoal-400 mr-0.5" />
              </button>

              {/* Profile & Role Dropdown Sheet */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-lifted z-50 p-3 space-y-3 animate-fade-in text-xs">
                  {/* User Info Header */}
                  <div className="pb-2.5 border-b border-charcoal-150 dark:border-charcoal-800 space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden shadow-xs border border-charcoal-200 dark:border-charcoal-700">
                        {user?.profile?.avatar_url ? (
                          <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : user.full_name ? (
                          user.full_name.charAt(0).toUpperCase()
                        ) : (
                          'U'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-charcoal-900 dark:text-charcoal-100 truncate">
                          {user.full_name}
                        </div>
                        <div className="text-[11px] text-charcoal-500 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <ShieldIcon size={11} />
                          <span>Platform Administrator</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-100 dark:bg-institutional-950/50 text-institutional-800 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                          <UserIcon size={11} />
                          <span>User</span>
                        </span>
                      )}

                      {!isAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 font-mono">
                          🪙 {user?.profile?.coins_balance ?? 0} Coins
                        </span>
                      )}

                      {!isAdmin && subscription?.status === 'ACTIVE' && subscription?.plan && subscription?.plan !== 'FREE' && subscription?.plan !== 'NONE' && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CrownIcon size={10} className="text-amber-500" />
                          <span>{formatPlanTitle(subscription.plan)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Navigation Shortcuts */}
                  <div className="space-y-1 pt-1 border-t border-charcoal-150 dark:border-charcoal-800">
                    {!isAdmin ? (
                      <>
                        <button
                          onClick={() => {
                            handleNavClick(ROUTES.dashboard);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          Performance Dashboard
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick(`${ROUTES.dashboard}/courses`);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          Enrolled Courses
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick(ROUTES.typing);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          Typing Master Mock Test
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            handleNavClick(ROUTES.admin);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          Admin Studio Hub
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick(`${ROUTES.admin}/courses/new`);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          Create Course
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick(ROUTES.pipeline);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                        >
                          AI Question Pipeline
                        </button>
                      </>
                    )}
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-2 border-t border-charcoal-150 dark:border-charcoal-800">
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                        navigate(ROUTES.home);
                      }}
                      className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1.5"
                    >
                      <LogOutIcon size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-full text-charcoal-600 dark:text-charcoal-300 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors focus:outline-none"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <div className="w-4 h-3.5 flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-current rounded transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`w-full h-0.5 bg-current rounded transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-full h-0.5 bg-current rounded transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* 4. MODERN MOBILE FULL-FEATURED NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div
            className="md:hidden fixed top-3 inset-x-3 sm:inset-x-6 max-w-md mx-auto z-50 bg-white dark:bg-charcoal-900 border border-charcoal-200/90 dark:border-charcoal-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            {/* Header: Brand & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-150 dark:border-charcoal-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-institutional-600 text-white flex items-center justify-center font-bold text-xs">
                  <SparklesIcon size={14} />
                </div>
                <span className="font-extrabold text-base tracking-tight text-charcoal-900 dark:text-charcoal-100">
                  PrepMagnet
                </span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-mono tracking-wider ${
                  !user
                    ? 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
                    : isAdmin
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800'
                }`}>
                  {!user ? 'PRO' : isAdmin ? 'ADMIN' : 'USER'}
                </span>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors font-bold text-sm"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* If Active Attempt: Persistent Resume Button */}
            {activeAttempt && !isOn(ROUTES.exam) && (
              <button
                onClick={() => handleNavClick(ROUTES.exam)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-xs shadow-xs animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <ZapIcon size={16} className="text-amber-600 fill-amber-600 shrink-0" />
                  <span>Resume Active Exam Simulation</span>
                </div>
                <span className="text-[11px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  Live →
                </span>
              </button>
            )}

            {/* Logged In User Profile Card */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-charcoal-50/80 dark:bg-charcoal-850 border border-charcoal-200 dark:border-charcoal-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-institutional-600 text-white font-extrabold flex items-center justify-center text-base shrink-0 overflow-hidden shadow-xs border border-charcoal-200 dark:border-charcoal-700">
                    {user?.profile?.avatar_url ? (
                      <img src={user.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : user.full_name ? (
                      user.full_name.charAt(0).toUpperCase()
                    ) : (
                      'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-charcoal-900 dark:text-charcoal-100 truncate">
                      {user.full_name}
                    </div>
                    <div className="text-xs text-charcoal-500 truncate">{user.email}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-charcoal-200/60 dark:border-charcoal-800">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <ShieldIcon size={11} />
                      <span>Administrator</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-100 dark:bg-institutional-950/50 text-institutional-800 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                      <UserIcon size={11} />
                      <span>Verified Aspirant</span>
                    </span>
                  )}

                  {!isAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 font-mono">
                      🪙 {user?.profile?.coins_balance ?? 0} Coins
                    </span>
                  )}

                  {!isAdmin && subscription?.status === 'ACTIVE' && subscription?.plan && subscription?.plan !== 'FREE' && subscription?.plan !== 'NONE' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CrownIcon size={10} className="text-amber-500" />
                      <span>{formatPlanTitle(subscription.plan)}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Guest Welcome Banner & Action Buttons */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-institutional-50 to-indigo-50/50 dark:from-institutional-950/40 dark:to-indigo-950/20 border border-institutional-200 dark:border-institutional-800/60 space-y-3">
                <div>
                  <h4 className="font-black text-sm text-charcoal-900 dark:text-white">
                    Ace Your Exam Preparation
                  </h4>
                  <p className="text-xs text-charcoal-600 dark:text-charcoal-400 mt-0.5">
                    Real TCS iON simulations, live percentiles & smart drills.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal('login');
                    }}
                    className="py-2.5 px-3 rounded-xl border border-charcoal-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-100 font-bold text-xs hover:bg-charcoal-50 text-center transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal('register');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-institutional-600 hover:bg-institutional-700 text-white font-extrabold text-xs shadow-md text-center transition-colors"
                  >
                    Join Free
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1 text-xs font-semibold">
              <div className="text-[10px] font-black uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500 px-3 pt-2">
                Navigation
              </div>

              {/* Student or Guest Navigation Links */}
              {!isAdmin ? (
                <>
                  {user && (
                    <button
                      onClick={() => handleNavClick(ROUTES.dashboard)}
                      className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                        isOn(ROUTES.dashboard)
                          ? 'bg-institutional-50 text-institutional-700 dark:bg-institutional-950/60 dark:text-institutional-300 font-bold'
                          : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BarChart3Icon size={16} />
                        <span>Performance Dashboard</span>
                      </div>
                      <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                    </button>
                  )}

                  <button
                    onClick={() => handleNavClick(ROUTES.home)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.home, true)
                        ? 'bg-institutional-50 text-institutional-700 dark:bg-institutional-950/60 dark:text-institutional-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpenIcon size={16} />
                      <span>Mock Tests Library</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick(ROUTES.courses)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.courses)
                        ? 'bg-institutional-50 text-institutional-700 dark:bg-institutional-950/60 dark:text-institutional-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SparklesIcon size={16} className="text-amber-500" />
                      <span>Courses & Quizzes</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick(ROUTES.typing)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.typing)
                        ? 'bg-institutional-50 text-institutional-700 dark:bg-institutional-950/60 dark:text-institutional-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>⌨️</span>
                      <span>Typing Master Test</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={handleContactClick}
                    className="w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <MailIcon size={16} />
                      <span>Contact Support Desk</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>
                </>
              ) : (
                /* Admin Navigation Links */
                <>
                  <button
                    onClick={() => handleNavClick(ROUTES.admin)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.admin)
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldIcon size={16} />
                      <span>Admin Studio Hub</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick(ROUTES.pipeline)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.pipeline)
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CpuIcon size={16} />
                      <span>AI Question Pipeline</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick(ROUTES.courses)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.courses)
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SparklesIcon size={16} />
                      <span>Courses Management</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={() => handleNavClick(ROUTES.typing)}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors ${
                      isOn(ROUTES.typing)
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                        : 'text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>⌨️</span>
                      <span>Typing Master</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>

                  <button
                    onClick={handleContactClick}
                    className="w-full text-left py-2.5 px-3.5 rounded-xl flex items-center justify-between text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <MailIcon size={16} />
                      <span>Contact Support Desk</span>
                    </div>
                    <ChevronDownIcon size={14} className="-rotate-90 text-charcoal-400" />
                  </button>
                </>
              )}
            </div>

            {/* User Logged-in Actions / Sign Out */}
            {user && (
              <div className="pt-3 border-t border-charcoal-150 dark:border-charcoal-800 space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate(ROUTES.home);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOutIcon size={15} />
                  <span>Sign Out of PrepMagnet</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
