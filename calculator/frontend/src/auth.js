import { apiClient } from './api-client.js';
import { clearAuth, getReauthAt, getToken, getUser, initAuthFromStorage, setAuth } from './auth-store.js';

const DEFAULT_REAUTH_TTL_SEC = 60 * 10;
const REAUTH_TTL_SEC = Number.parseInt(import.meta.env.VITE_AUTH_REAUTH_TTL_SEC, 10) || DEFAULT_REAUTH_TTL_SEC;

function decodeJwtPayload(token) {
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

  currentUser() {
    return getUser();
  },

  async restore() {
    try {
      const res = await apiClient.me();
      const user = res?.user || null;
      if (!user) {
        clearAuth();
        return null;
      }
      setAuth(getToken(), user);
      return user;
    } catch (err) {
      clearAuth();
      return null;
    }
  },

  async login(username, password) {
    const res = await apiClient.login({ username, password });
    if (!res?.user) {
      throw new Error(res?.message || 'Login failed.');
    }
    const payload = decodeJwtPayload(res?.token || '');
    setAuth(res?.token || '', res.user, Number(payload?.reauthAt || 0));
    return res.user;
  },

  async reauth(password) {
    const res = await apiClient.reauth({ password });
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
