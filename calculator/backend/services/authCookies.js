const crypto = require('crypto');
const { TOKEN_TTL_SEC } = require('./authToken');
const { REFRESH_TOKEN_TTL_SEC } = require('./refreshTokenService');

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.NODE_ENV || '').toLowerCase() === 'production';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

function buildCookieOptions({ httpOnly }) {
  return {
    httpOnly,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
}

function getAccessMaxAgeMs() {
  return TOKEN_TTL_SEC * 1000;
}

function getRefreshMaxAgeMs() {
  return REFRESH_TOKEN_TTL_SEC * 1000;
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const csrfToken = createCsrfToken();
  const accessMaxAge = getAccessMaxAgeMs();
  const refreshMaxAge = getRefreshMaxAgeMs();
  res.cookie(AUTH_COOKIE_NAME, accessToken, {
    ...buildCookieOptions({ httpOnly: true }),
    maxAge: accessMaxAge,
  });
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...buildCookieOptions({ httpOnly: true }),
      maxAge: refreshMaxAge,
    });
  }
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...buildCookieOptions({ httpOnly: false }),
    maxAge: refreshMaxAge,
  });
  return csrfToken;
}

function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions({ httpOnly: true }));
  res.clearCookie(REFRESH_COOKIE_NAME, buildCookieOptions({ httpOnly: true }));
  res.clearCookie(CSRF_COOKIE_NAME, buildCookieOptions({ httpOnly: false }));
}

function ensureCsrfCookie(req, res) {
  if (req.cookies?.[CSRF_COOKIE_NAME]) return;
  const maxAge = getRefreshMaxAgeMs();
  res.cookie(CSRF_COOKIE_NAME, createCsrfToken(), {
    ...buildCookieOptions({ httpOnly: false }),
    maxAge,
  });
}

module.exports = {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  buildCookieOptions,
  setAuthCookies,
  clearAuthCookies,
  ensureCsrfCookie,
};
