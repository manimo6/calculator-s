import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLogin from '../features/admin/components/AdminLogin';
import { useAuth } from '../auth-context';
import { resolvePostLoginRedirect } from '../auth-routing';

const LoadingFallback = () => <div style={{ padding: 20 }}>Loading...</div>;

const LoginPage = () => {
  const { user, loading, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    const fromPath = location.state?.from?.pathname || '';
    const target = resolvePostLoginRedirect(user, fromPath);
    navigate(target, { replace: true });
  }, [loading, user, location.state, navigate]);

  const handleLogin = (userData) => {
    setUser(userData);
    const fromPath = location.state?.from?.pathname || '';
    const target = resolvePostLoginRedirect(userData, fromPath);
    navigate(target, { replace: true });
  };

  if (loading && !user) {
    return <LoadingFallback />;
  }

  return <AdminLogin onLogin={handleLogin} />;
};

export default LoginPage;
