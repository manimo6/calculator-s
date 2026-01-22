import { apiClient } from './api-client';
import { clearAuth, getReauthAt, getToken, getUser, initAuthFromStorage, setAuth } from './auth-store';
import type { AuthUser } from './auth-routing';

const DEFAULT_REAUTH_TTL_SEC = 60 * 10;
const REAUTH_TTL_SEC = Number.parseInt(import.meta.env.VITE_AUTH_REAUTH_TTL_SEC, 10) || DEFAULT_REAUTH_TTL_SEC;

type AuthApiResponse = {
  user?: AuthUser;
  token?: string;
  message?: string;
};

function decodeJwtPayload(token: string) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

export const auth = {
  init() {
    initAuthFromStorage();
  },

  currentUser(): AuthUser | null {
    return getUser() as AuthUser | null;
  },

  async restore(): Promise<AuthUser | null> {
    try {
      const res = (await apiClient.me()) as AuthApiResponse;
      const user = res?.user || null;
      if (!user) {
        clearAuth();
        return null;
      }
      setAuth(getToken(), user);
      return user;
    } catch (err) {
      const status = typeof err === 'object' && err !== null
        ? Number((err as { status?: number; statusCode?: number }).status || (err as { statusCode?: number }).statusCode)
        : 0;
      if (status === 401) {
        try {
          await apiClient.refresh();
          const res = (await apiClient.me()) as AuthApiResponse;
          const user = res?.user || null;
          if (!user) {
            clearAuth();
            return null;
          }
          setAuth(getToken(), user);
          return user;
        } catch (refreshError) {
          clearAuth();
          return null;
        }
      }
      clearAuth();
      return null;
    }
  },

  async login(username: string, password: string) {
    const res = (await apiClient.login({ username, password })) as AuthApiResponse;
    if (!res?.user) {
      throw new Error(res?.message || 'Login failed.');
    }
    const payload = decodeJwtPayload(res?.token || '');
    setAuth(res?.token || '', res.user, Number(payload?.reauthAt || 0));
    return res.user;
  },

  async reauth(password: string) {
    const res = (await apiClient.reauth({ password })) as AuthApiResponse;
    if (!res?.user) {
      throw new Error(res?.message || 'Reauth failed.');
    }
    const payload = decodeJwtPayload(res?.token || '');
    setAuth(res?.token || '', res.user, Number(payload?.reauthAt || 0));
    return res.user;
  },

  hasRecentReauth() {
    const reauthAt = Number(getReauthAt() || 0);
    if (!reauthAt) return false;
    const now = Math.floor(Date.now() / 1000);
    return now - reauthAt <= REAUTH_TTL_SEC;
  },

  logout() {
    apiClient.logout().catch(() => {});
    clearAuth();
  },
};
