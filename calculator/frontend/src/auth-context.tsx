import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from './auth';
import type { AuthUser } from './auth-routing';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(auth.currentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    auth
      .restore()
      .then((nextUser) => {
        if (!alive) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleLogin = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser || null);
  }, []);

  const handleLogout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setUser: handleLogin,
      logout: handleLogout,
    }),
    [user, loading, handleLogin, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
