const REAUTH_KEY = 'reauthAt';

let cachedToken = '';
let cachedUser = null;
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

export function setAuth(token, user, reauthAt) {
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

export function setToken(token) {
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
