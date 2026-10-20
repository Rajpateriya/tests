import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, isRealSession } from '../services/api';

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
        return u.role === 'admin' ? 'admin' : (u.role || 'user');
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
        if (u.role === 'admin') {
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
    if (user?.role === 'admin') {
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

        if (me.role === 'admin') {
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

  // api.js dispatches this when a silent token refresh fails (refresh token itself expired
  // or blacklisted): end the session here too, without another server call (both tokens are
  // already dead, and api.js has already cleared them from localStorage).
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setToken(null);
      setBaseRole(null);
      setSubscription({ plan: 'FREE', status: 'INACTIVE' });
      localStorage.removeItem('govexam_user');
      localStorage.removeItem('govexam_subscription');
      localStorage.removeItem('govexam_base_role');
    };
    window.addEventListener('govexam:session-expired', onExpired);
    return () => window.removeEventListener('govexam:session-expired', onExpired);
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password, rememberMe);
      const loggedUser = res.user;
      const accessToken = res.tokens?.access_token || 'demo-jwt-access-token';
      const isAdminAccount = loggedUser.role === 'admin';
      const realRole = isAdminAccount ? 'admin' : (loggedUser.role || 'user');
      setBaseRole(realRole);
      localStorage.setItem('govexam_base_role', realRole);

      setUser(loggedUser);
      setToken(accessToken);
      localStorage.setItem('govexam_token', accessToken);
      localStorage.setItem('govexam_user', JSON.stringify(loggedUser));
      // Kept so api.js can silently mint a new access token once this one expires.
      if (res.tokens?.refresh_token) {
        localStorage.setItem('govexam_refresh_token', res.tokens.refresh_token);
      } else {
        localStorage.removeItem('govexam_refresh_token');
      }

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

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.googleLogin(credential);
      const loggedUser = res.user;
      const accessToken = res.tokens?.access_token;
      const isAdminAccount = loggedUser.role === 'admin';
      const realRole = isAdminAccount ? 'admin' : (loggedUser.role || 'user');
      setBaseRole(realRole);
      localStorage.setItem('govexam_base_role', realRole);

      setUser(loggedUser);
      setToken(accessToken);
      localStorage.setItem('govexam_token', accessToken);
      localStorage.setItem('govexam_user', JSON.stringify(loggedUser));
      if (res.tokens?.refresh_token) {
        localStorage.setItem('govexam_refresh_token', res.tokens.refresh_token);
      } else {
        localStorage.removeItem('govexam_refresh_token');
      }

      if (isAdminAccount) {
        setSubscription({ plan: 'NONE', status: 'INACTIVE' });
        localStorage.removeItem('govexam_subscription');
      } else {
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
      setError(err.message || 'Google Sign-In failed');
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
      return res;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Tell the backend to blacklist this token (and the refresh token) too, so neither can be
    // reused after logout. Best-effort: a demo session or an unreachable backend must never
    // block clearing local state.
    if (isRealSession()) {
      const refreshToken = localStorage.getItem('govexam_refresh_token');
      api.auth.logout(refreshToken).catch((err) => console.warn('Logout call failed:', err.message));
    }
    setUser(null);
    setToken(null);
    setBaseRole(null);
    setSubscription({ plan: 'FREE', status: 'INACTIVE' });
    localStorage.removeItem('govexam_user');
    localStorage.removeItem('govexam_token');
    localStorage.removeItem('govexam_refresh_token');
    localStorage.removeItem('govexam_subscription');
    localStorage.removeItem('govexam_base_role');
  };

  const switchRole = async () => {
    // Role switching disabled in production RBAC mode
    console.warn('Role switching is disabled. User roles are strictly managed via backend.');
    return;
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

  const isRealAdmin = user?.role === 'admin';
  const canSwitchRole = false;
  const isPreviewingAsStudent = false;
  const coinsBalance = user?.profile?.coins_balance ?? 0;
  const currentStreak = user?.profile?.current_streak ?? 0;

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
        loginWithGoogle,
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
        isStudent: user?.role !== 'admin',
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
