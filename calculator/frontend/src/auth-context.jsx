import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from './auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.currentUser());
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

  const handleLogin = useCallback((nextUser) => {
    setUser(nextUser || null);
  }, []);

  const handleLogout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  const value = useMemo(
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
