import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context.jsx';
import { getDefaultRoute, ROUTES } from './auth-routing.js';

const LoadingFallback = () => <div style={{ padding: 20 }}>Loading...</div>;

export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingFallback />;
  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (user?.mustChangePassword && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  if (typeof allow === 'function' && !allow(user)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
}
