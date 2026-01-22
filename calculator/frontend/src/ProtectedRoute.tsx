import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { getDefaultRoute, ROUTES } from './auth-routing';

type AuthUser = { mustChangePassword?: boolean } & Record<string, unknown>;
type ProtectedRouteProps = {
  allow?: ((user: AuthUser) => boolean) | null;
  children: React.ReactNode;
};

const LoadingFallback = () => <div style={{ padding: 20 }}>Loading...</div>;

export default function ProtectedRoute({ allow = null, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth() as { user: AuthUser | null; loading: boolean };
  const location = useLocation();

  if (loading) return <LoadingFallback />;
  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (user?.mustChangePassword && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  if (typeof allow === 'function' && user && !allow(user)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
}
