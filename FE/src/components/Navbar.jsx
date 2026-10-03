import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
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
} from './Icons';

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
export const Navbar = ({ currentView, setCurrentView, activeAttempt, onOpenAuthModal }) => {
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

  const handleNavClick = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleContactClick = () => {
    setMobileMenuOpen(false);
    if (currentView === 'discovery') {
      const el = document.getElementById('contact-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setCurrentView('discovery');
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
              setCurrentView('admin');
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
        onClick={() => handleNavClick(user ? (isAdmin ? 'admin' : 'dashboard') : 'discovery')}
        className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
      >
        <div className="w-8 h-8 rounded-full bg-institutional-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
          <SparklesIcon size={16} />
        </div>
        <div className="flex items-center gap-1">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-charcoal-900 dark:text-charcoal-100">
            GovExam
          </span>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-mono tracking-wider ${
            !user
              ? 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400'
              : isAdmin
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : 'bg-institutional-100 dark:bg-institutional-900/60 text-institutional-700 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800'
          }`}>
            {!user ? 'PRO' : isAdmin ? 'ADMIN' : 'STUDENT'}
          </span>
        </div>
      </div>

      {/* 2. CENTER NAVIGATION ITEMS (Tailored strictly by user role) */}
      <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
        {/* --- GUEST VIEW (Before Login) --- */}
        {!user && (
          <>
            <button
              onClick={() => handleNavClick('discovery')}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                currentView === 'discovery'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              Mock Tests
            </button>
            <button
              onClick={() => handleNavClick('subscription')}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                currentView === 'subscription'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              Passes & Pricing
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
              onClick={() => handleNavClick('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'dashboard'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <BarChart3Icon size={14} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleNavClick('discovery')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'discovery'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <BookOpenIcon size={14} />
              <span>Test Library</span>
            </button>

            <button
              onClick={() => handleNavClick('subscription')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'subscription'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <CrownIcon size={14} className="text-amber-500" />
              <span>Passes</span>
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
              onClick={() => handleNavClick('admin')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'admin'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <ShieldIcon size={14} />
              <span>Admin Studio</span>
            </button>

            <button
              onClick={() => handleNavClick('pipeline')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'pipeline'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <CpuIcon size={14} />
              <span>AI Pipeline</span>
            </button>

            <button
              onClick={() => handleNavClick('discovery')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'discovery'
                  ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 font-bold shadow-sm'
                  : 'text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-200 hover:bg-charcoal-100/60 dark:hover:bg-charcoal-800/60'
              }`}
            >
              <BookOpenIcon size={14} />
              <span>Test Catalog</span>
            </button>
          </>
        )}
      </div>

      {/* 3. RIGHT ACTIONS (Auth trigger, Theme toggle, Avatar / Dropdown) */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Active Attempt Warning / Quick Resume Button */}
        {activeAttempt && currentView !== 'exam' && (
          <button
            onClick={() => handleNavClick('exam')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors animate-pulse"
          >
            <ZapIcon size={12} className="text-amber-600 fill-amber-600" />
            <span>Resume Exam</span>
          </button>
        )}

        {/* Student GovCoins Wallet Pill */}
        {user && !isAdmin && (
          <button
            onClick={() => handleNavClick('subscription')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-100/90 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200/80 transition-colors shadow-sm group"
            title="Your GovCoins wallet: Redeem on subscription passes!"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">🪙</span>
            <span className="font-mono font-extrabold">{user?.profile?.coins_balance ?? 150}</span>
            <span className="text-[10px] text-amber-750 dark:text-amber-400 font-semibold">Coins</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-full text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 transition-colors focus:outline-none"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>

        {/* --- IF GUEST: Show Sign In & Register Buttons --- */}
        {!user ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 text-xs font-bold text-charcoal-700 dark:text-charcoal-300 hover:text-charcoal-950 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-institutional-600 hover:bg-institutional-700 rounded-full transition-colors shadow-sm"
            >
              Join Free
            </button>
          </div>
        ) : (
          /* --- IF LOGGED IN: Profile Avatar & Role Menu Dropdown --- */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 sm:pl-2.5 rounded-full border border-charcoal-200 dark:border-charcoal-750 bg-charcoal-50/80 dark:bg-charcoal-800/80 hover:bg-charcoal-100 dark:hover:bg-charcoal-750 transition-colors text-xs font-semibold focus:outline-none"
            >
              <span className="hidden sm:inline font-bold text-charcoal-800 dark:text-charcoal-200 max-w-[90px] truncate">
                {user.full_name?.split(' ')[0] || 'User'}
              </span>
              <div className="w-6 h-6 rounded-full bg-institutional-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDownIcon size={13} className="text-charcoal-400 mr-0.5" />
            </button>

            {/* Profile & Role Dropdown Sheet */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl shadow-lifted z-50 p-3 space-y-3 animate-fade-in text-xs">
                {/* User Info Header */}
                <div className="pb-2.5 border-b border-charcoal-150 dark:border-charcoal-800 space-y-1">
                  <div className="font-bold text-charcoal-900 dark:text-charcoal-100 truncate">
                    {user.full_name}
                  </div>
                  <div className="text-[11px] text-charcoal-500 truncate">{user.email}</div>
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <ShieldIcon size={11} />
                        <span>Platform Administrator</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-institutional-100 dark:bg-institutional-950/50 text-institutional-800 dark:text-institutional-300 border border-institutional-200 dark:border-institutional-800">
                        <UserIcon size={11} />
                        <span>Student Aspirant</span>
                      </span>
                    )}

                    {!isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 font-mono">
                        🪙 {user?.profile?.coins_balance ?? 150} Coins
                      </span>
                    )}

                    {/* Active Subscription Pass: Strictly for students only, NEVER for admin */}
                    {!isAdmin && subscription?.status === 'ACTIVE' && subscription?.plan && subscription?.plan !== 'FREE' && subscription?.plan !== 'NONE' && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <CrownIcon size={10} className="text-amber-500" />
                        <span>{formatPlanTitle(subscription.plan)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Switcher: Strictly ONLY visible if this account is a real Administrator! Never for regular students */}
                {canSwitchRole && (
                  <div className="space-y-1.5 p-2 rounded-xl bg-charcoal-50 dark:bg-charcoal-850 border border-charcoal-200/80 dark:border-charcoal-750">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-charcoal-500 dark:text-charcoal-400 tracking-wider">
                        Admin Preview Mode
                      </span>
                      <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase">
                        Superuser
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 bg-charcoal-200/60 dark:bg-charcoal-800 p-1 rounded-lg text-center font-bold text-[11px]">
                      <button
                        onClick={() => {
                          switchRole('student');
                          setCurrentView('dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                          !isAdmin
                            ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-charcoal-100 shadow-xs'
                            : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
                        }`}
                      >
                        <UserIcon size={12} />
                        <span>Student View</span>
                      </button>
                      <button
                        onClick={() => {
                          switchRole('admin');
                          setCurrentView('admin');
                          setUserDropdownOpen(false);
                        }}
                        className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                          isAdmin
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
                        }`}
                      >
                        <ShieldIcon size={12} />
                        <span>Admin Studio</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Shortcuts */}
                <div className="space-y-1 pt-1 border-t border-charcoal-150 dark:border-charcoal-800">
                  {!isAdmin ? (
                    <>
                      <button
                        onClick={() => {
                          handleNavClick('dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                      >
                        Performance Portfolio
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick('subscription');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                      >
                        Passes & Subscriptions
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleNavClick('admin');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 font-medium"
                      >
                        Admin Studio Hub
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick('pipeline');
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
                      setCurrentView('discovery');
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

        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-100 dark:hover:bg-charcoal-800"
          aria-label="Toggle mobile menu"
        >
          <div className="w-4 h-3.5 flex flex-col justify-between">
            <span className="w-full h-0.5 bg-current rounded" />
            <span className="w-full h-0.5 bg-current rounded" />
            <span className="w-full h-0.5 bg-current rounded" />
          </div>
        </button>
      </div>

      {/* 4. MOBILE DROPDOWN DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 mx-auto w-full bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-800 rounded-2xl p-4 shadow-lifted space-y-2 text-xs font-semibold animate-fade-in">
          {!user ? (
            <>
              <button
                onClick={() => handleNavClick('discovery')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Mock Tests Library
              </button>
              <button
                onClick={() => handleNavClick('subscription')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Passes & Pricing
              </button>
              <button
                onClick={handleContactClick}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Contact Support Desk
              </button>
              <div className="pt-2 border-t border-charcoal-200 dark:border-charcoal-800 flex gap-2">
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 text-center rounded-lg bg-institutional-600 text-white font-bold"
                >
                  Sign In / Register
                </button>
              </div>
            </>
          ) : !isAdmin ? (
            <>
              <button
                onClick={() => handleNavClick('dashboard')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('discovery')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Test Library
              </button>
              <button
                onClick={() => handleNavClick('subscription')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Passes
              </button>
              <button
                onClick={handleContactClick}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Contact Support Desk
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Admin Studio
              </button>
              <button
                onClick={() => handleNavClick('pipeline')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                AI Pipeline
              </button>
              <button
                onClick={() => handleNavClick('discovery')}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-charcoal-50 dark:hover:bg-charcoal-800"
              >
                Test Catalog
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  </>
  );
};
