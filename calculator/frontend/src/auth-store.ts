const REAUTH_KEY = 'reauthAt';

let cachedToken = '';
let cachedUser: Record<string, unknown> | null = null;
let cachedReauthAt = 0;

export function initAuthFromStorage() {
  cachedToken = '';
  cachedUser = null;
  cachedReauthAt = 0;
  try {
    const raw = sessionStorage.getItem(REAUTH_KEY);
    cachedReauthAt = Number(raw) || 0;
  } catch (e) {
    cachedReauthAt = 0;
  }
}

export function setAuth(token: string | null | undefined, user: Record<string, unknown> | null, reauthAt: number = 0) {
  cachedToken = token || '';
  cachedUser = user || null;
  if (typeof reauthAt === 'number' && reauthAt > 0) {
    cachedReauthAt = reauthAt;
    try {
      sessionStorage.setItem(REAUTH_KEY, String(reauthAt));
    } catch (e) {
      /* ignore storage errors */
    }
  }
}

export function setToken(token: string | null | undefined) {
  cachedToken = token || '';
}

export function clearAuth() {
  cachedToken = '';
  cachedUser = null;
  cachedReauthAt = 0;
  try {
    sessionStorage.removeItem(REAUTH_KEY);
  } catch (e) {
    /* ignore storage errors */
  }
}

export function getToken() {
  return cachedToken;
}

export function getUser() {
  return cachedUser;
}

export function getReauthAt() {
  return cachedReauthAt;
}
