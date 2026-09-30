import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, ShieldIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';

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
      setErrorMsg(err.message || 'Authentication error');
    }
  };

  const fillDemo = (role) => {
    if (role === 'student') {
      setEmail('student@mockexam.com');
      setPassword('Student@123');
      setFullName('Rajesh Kumar');
    } else {
      setEmail('admin@mockexam.com');
      setPassword('Admin@123');
      setFullName('System Administrator');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-badge" style={{ width: '30px', height: '30px' }}>
              <UserIcon size={16} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {tab === 'login' ? 'Sign In to GovExam Pro' : 'Create Free Account'}
            </h3>
          </div>
          <button onClick={onClose} style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tab-pills" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`tab-pill ${tab === 'login' ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => setTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-pill ${tab === 'register' ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => setTab('register')}
            >
              Register
            </button>
          </div>

          {/* Quick Demo Pre-fill helper */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-light)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              ⚡ 1-Click Demo Fill:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fillDemo('student')}
              >
                Student
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fillDemo('admin')}
              >
                Admin
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangleIcon size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Exam</label>
                  <select
                    className="form-input"
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                  >
                    <option value="SSC CGL">SSC CGL (Combined Graduate Level)</option>
                    <option value="SSC CHSL">SSC CHSL (10+2)</option>
                    <option value="RRB NTPC">RRB NTPC (Railways)</option>
                    <option value="IBPS PO">IBPS PO / Clerk</option>
                    <option value="State PSC">State PSC / Constable</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {loading ? 'Processing...' : tab === 'login' ? 'Sign In to Dashboard' : 'Register & Start Mock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
