import React from 'react';
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
} from './Icons';


export const Navbar = ({ currentView, setCurrentView, activeAttempt, onOpenAuthModal }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, switchRole, isAdmin, subscription } = useAuth();


  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div className="brand" onClick={() => setCurrentView('discovery')}>
          <div className="brand-badge">
            <SparklesIcon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>GovExam</span>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>PRO</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
              MOCK TEST & ANALYTICS
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          <button
            className={`nav-link ${currentView === 'discovery' ? 'active' : ''}`}
            onClick={() => setCurrentView('discovery')}
          >
            <BookOpenIcon size={18} />
            <span>Mock Tests</span>
          </button>

          <button
            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <BarChart3Icon size={18} />
            <span>My Analytics</span>
          </button>

          <button
            className={`nav-link ${currentView === 'subscription' ? 'active' : ''}`}
            onClick={() => setCurrentView('subscription')}
          >
            <CrownIcon size={18} style={{ color: '#F59E0B' }} />
            <span>Plans & Passes</span>
          </button>

          <button
            className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            <ShieldIcon size={18} />
            <span>Admin Studio</span>
          </button>

          <button
            className={`nav-link ${currentView === 'pipeline' ? 'active' : ''}`}
            onClick={() => setCurrentView('pipeline')}
          >
            <CpuIcon size={18} />
            <span>AI Pipeline</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Try Premium Button / Active Badge */}
          {subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE' ? (
            <button
              className="btn btn-sm"
              onClick={() => setCurrentView('subscription')}
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: 'white',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                gap: '0.4rem',
              }}
            >
              <CrownIcon size={15} />
              <span>{subscription.plan} PASS</span>
            </button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => setCurrentView('subscription')}
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                color: 'white',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                gap: '0.4rem',
                animation: 'pulse 2.5s infinite',
              }}
            >
              <CrownIcon size={15} />
              <span>Try Premium</span>
            </button>
          )}

          {/* Active Attempt Warning / Shortcut */}
          {activeAttempt && currentView !== 'exam' && (
            <button
              className="btn btn-warning btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setCurrentView('exam')}
            >
              <ZapIcon size={14} />
              <span>Resume Exam</span>
            </button>
          )}


          {/* Quick Demo Switcher Pill */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '0.2rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
            }}
          >
            <button
              onClick={() => switchRole('student')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                background: !isAdmin ? 'var(--primary)' : 'transparent',
                color: !isAdmin ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              Student
            </button>
            <button
              onClick={() => switchRole('admin')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                background: isAdmin ? 'var(--primary)' : 'transparent',
                color: isAdmin ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              Admin
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </button>

          {/* User Profile / Logout */}
          {user ? (
            <div className="user-menu">
              <div className="user-avatar">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user.full_name?.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{ marginLeft: '0.25rem', color: 'var(--text-muted)', display: 'flex' }}
              >
                <LogOutIcon size={15} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuthModal}>
              <UserIcon size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
