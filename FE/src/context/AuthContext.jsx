import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('govexam_user');
    return cached ? JSON.parse(cached) : {
      id: 'demo-student-id',
      email: 'student@mockexam.com',
      full_name: 'Rajesh Kumar',
      role: 'student',
      is_active: true,
      profile: {
        target_exams: ['SSC CGL', 'SSC CHSL'],
        preferred_subjects: ['Quantitative Aptitude', 'General Intelligence'],
      }
    };
  });

  const [subscription, setSubscription] = useState(() => {
    const cached = localStorage.getItem('govexam_subscription');
    return cached ? JSON.parse(cached) : { plan: 'FREE', status: 'INACTIVE' };
  });

  const [token, setToken] = useState(() => localStorage.getItem('govexam_token') || 'demo-token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('govexam_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('govexam_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('govexam_token', token);
    } else {
      localStorage.removeItem('govexam_token');
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      setToken(res.tokens.access_token);
      return res.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.register(data);
      // Auto login after register
      return await login(data.email, data.password);
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('govexam_user');
    localStorage.removeItem('govexam_token');
  };

  const switchRole = (newRole) => {
    if (newRole === 'admin') {
      setUser({
        id: 'demo-admin-id',
        email: 'admin@mockexam.com',
        full_name: 'Platform Administrator',
        role: 'admin',
        is_active: true,
        profile: { target_exams: ['All Exams'], preferred_subjects: [] },
      });
    } else {
      setUser({
        id: 'demo-student-id',
        email: 'student@mockexam.com',
        full_name: 'Rajesh Kumar',
        role: 'student',
        is_active: true,
        profile: { target_exams: ['SSC CGL'], preferred_subjects: ['Quantitative Aptitude'] },
      });
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updated = await api.users.updateProfile(updates);
      setUser(updated);
      return updated;
    } catch (err) {
      setUser(prev => ({
        ...prev,
        ...updates,
        profile: { ...prev.profile, ...updates },
      }));
    }
  };

  useEffect(() => {
    if (subscription) {
      localStorage.setItem('govexam_subscription', JSON.stringify(subscription));
    }
  }, [subscription]);

  const upgradeSubscription = (plan, transactionId = `pay_${Date.now().toString(36)}`) => {
    const updated = {
      plan, // 'BASIC' | 'PRO' | 'MAX'
      status: 'ACTIVE',
      transactionId,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setSubscription(updated);
    return updated;
  };

  const cancelSubscription = () => {
    const updated = { plan: 'FREE', status: 'INACTIVE' };
    setSubscription(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        subscription,
        upgradeSubscription,
        cancelSubscription,
        loading,
        error,
        login,
        register,
        logout,
        switchRole,
        updateProfile,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isPremium: subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE',
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => useContext(AuthContext);
