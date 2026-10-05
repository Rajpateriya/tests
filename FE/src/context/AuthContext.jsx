import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('govexam_user');
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  });

  const [baseRole, setBaseRole] = useState(() => {
    const cached = localStorage.getItem('govexam_base_role');
    if (cached) return cached;
    const cachedUser = localStorage.getItem('govexam_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        return u.role === 'admin' || u.email === 'admin@gmail.com' ? 'admin' : 'student';
      } catch {
        return null;
      }
    }
    return null;
  });

  const [subscription, setSubscription] = useState(() => {
    const cachedUser = localStorage.getItem('govexam_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        // Administrators never have student passes
        if (u.role === 'admin' || u.email === 'admin@gmail.com') {
          return { plan: 'NONE', status: 'INACTIVE' };
        }
      } catch {
        // ignore
      }
    }
    const cached = localStorage.getItem('govexam_subscription');
    return cached ? JSON.parse(cached) : { plan: 'FREE', status: 'INACTIVE' };
  });

  const [token, setToken] = useState(() => localStorage.getItem('govexam_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('govexam_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('govexam_user');
    }
  }, [user]);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('govexam_token', token);
    } else {
      localStorage.removeItem('govexam_token');
    }
  }, [token]);

  // Sync subscription to localStorage (only for non-admin accounts)
  useEffect(() => {
    if (user?.role === 'admin' || user?.email === 'admin@gmail.com') {
      localStorage.removeItem('govexam_subscription');
    } else if (subscription && subscription.status === 'ACTIVE') {
      localStorage.setItem('govexam_subscription', JSON.stringify(subscription));
    }
  }, [subscription, user]);

  // Validate existing token or refresh profile from backend
  const refreshProfile = useCallback(async () => {
    const currentToken = localStorage.getItem('govexam_token');
    if (!currentToken) return;

    try {
      const me = await api.auth.getMe();
      if (me) {
        setUser((prev) => ({
          ...prev,
          ...me,
          profile: { ...(prev?.profile || {}), ...(me.profile || {}) },
        }));

        if (me.role === 'admin' || me.email === 'admin@gmail.com') {
          setSubscription({ plan: 'NONE', status: 'INACTIVE' });
          localStorage.removeItem('govexam_subscription');
        } else if (me.profile?.subscription_plan && me.profile?.subscription_status === 'ACTIVE') {
          setSubscription({
            plan: me.profile.subscription_plan,
            status: 'ACTIVE',
            expiresAt: me.profile.subscription_expires_at,
          });
        }
      }
    } catch (e) {
      console.warn('Token validation skipped or failed:', e.message);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token, refreshProfile]);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password, rememberMe);
      const loggedUser = res.user;
      const accessToken = res.tokens?.access_token || 'demo-jwt-access-token';
      const isAdminAccount = loggedUser.role === 'admin' || loggedUser.email === 'admin@gmail.com';

      const realRole = isAdminAccount ? 'admin' : 'student';
      setBaseRole(realRole);
      localStorage.setItem('govexam_base_role', realRole);

      setUser(loggedUser);
      setToken(accessToken);
      localStorage.setItem('govexam_token', accessToken);
      localStorage.setItem('govexam_user', JSON.stringify(loggedUser));

      if (rememberMe) {
        localStorage.setItem('govexam_remember_email', email);
      } else {
        localStorage.removeItem('govexam_remember_email');
      }

      if (isAdminAccount) {
        // Admin: clear student pass completely
        setSubscription({ plan: 'NONE', status: 'INACTIVE' });
        localStorage.removeItem('govexam_subscription');
      } else {
        // Student: populate active pass if exists
        if (loggedUser.profile?.subscription_plan && loggedUser.profile?.subscription_status === 'ACTIVE') {
          setSubscription({
            plan: loggedUser.profile.subscription_plan,
            status: 'ACTIVE',
            expiresAt: loggedUser.profile.subscription_expires_at,
          });
        } else {
          setSubscription({ plan: 'FREE', status: 'INACTIVE' });
          localStorage.removeItem('govexam_subscription');
        }
      }

      return loggedUser;
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
      await api.auth.register(data);
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
    setBaseRole(null);
    setSubscription({ plan: 'FREE', status: 'INACTIVE' });
    localStorage.removeItem('govexam_user');
    localStorage.removeItem('govexam_token');
    localStorage.removeItem('govexam_subscription');
    localStorage.removeItem('govexam_base_role');
  };

  // Only allowed if authenticated account is an administrator
  const switchRole = async (newRole) => {
    const isRealAdmin = baseRole === 'admin' || user?.email === 'admin@gmail.com';
    if (!isRealAdmin) {
      console.warn('Unauthorized role switch attempt blocked: only admin accounts can preview student mode.');
      return;
    }

    if (newRole === 'admin') {
      try {
        await login('admin@gmail.com', 'admin123');
      } catch {
        const adminUser = {
          id: 'admin-primary-id',
          email: 'admin@gmail.com',
          full_name: 'Platform Administrator',
          role: 'admin',
          is_active: true,
          profile: { target_exams: ['All Exams'], preferred_subjects: [], coins_balance: 500, current_streak: 10 },
        };
        setUser(adminUser);
        setToken('demo-admin-token');
      }
      setSubscription({ plan: 'NONE', status: 'INACTIVE' });
      localStorage.removeItem('govexam_subscription');
    } else {
      try {
        await login('student@gmail.com', 'student123');
      } catch {
        const studentUser = {
          id: 'student-primary-id',
          email: 'student@gmail.com',
          full_name: 'Alex Aspirant',
          role: 'student',
          is_active: true,
          profile: {
            target_exams: ['SSC CGL', 'SSC CHSL'],
            preferred_subjects: ['Quantitative Aptitude', 'General Intelligence & Reasoning'],
            coins_balance: 150,
            current_streak: 6,
            longest_streak: 14,
            subscription_plan: 'FREE',
            subscription_status: 'INACTIVE',
          },
        };
        setUser(studentUser);
        setToken('demo-student-token');
      }
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updated = await api.users.updateProfile(updates);
      setUser(updated);
      return updated;
    } catch (err) {
      setUser((prev) => ({
        ...prev,
        ...updates,
        profile: { ...prev?.profile, ...updates },
      }));
    }
  };

  const updateCoins = (newCoins) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: {
          ...(prev.profile || {}),
          coins_balance: newCoins,
        },
      };
    });
  };

  const upgradeSubscription = (plan, transactionId = `pay_${Date.now().toString(36)}`, durationDays = 30) => {
    // If admin is performing test upgrade
    const updated = {
      plan,
      status: 'ACTIVE',
      transactionId,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
    };
    setSubscription(updated);
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: {
          ...(prev.profile || {}),
          subscription_plan: plan,
          subscription_status: 'ACTIVE',
        },
      };
    });
    return updated;
  };

  const cancelSubscription = () => {
    const updated = { plan: 'FREE', status: 'INACTIVE' };
    setSubscription(updated);
  };

  const isRealAdmin = baseRole === 'admin' || user?.email === 'admin@gmail.com';
  const canSwitchRole = isRealAdmin;
  const isPreviewingAsStudent = isRealAdmin && user?.role === 'student';
  const coinsBalance = user?.profile?.coins_balance ?? 150;
  const currentStreak = user?.profile?.current_streak ?? 6;

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
        updateCoins,
        refreshProfile,
        coinsBalance,
        currentStreak,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        canSwitchRole,
        isPreviewingAsStudent,
        isPremium: !isRealAdmin && subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE' && subscription?.plan !== 'NONE',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
