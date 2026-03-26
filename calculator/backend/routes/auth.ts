const express = require('express') as typeof import('express');
const { verify } = require('../services/authToken');
const { isRateLimited } = require('../services/rateLimiter');
const { authMiddleware } = require('../middleware/authMiddleware');
const { revokeRefreshToken } = require('../services/refreshTokenService');
const {
  AUTH_MESSAGES,
  fail,
  getClientIp,
  sendSessionSuccess,
} = require('../services/authHttpService');
const {
  authenticateUserAndIssueSession,
  buildRateLimitKeys,
  changePasswordAndIssueSession,
  loadSessionUserFromToken,
  resolveAuthToken,
  rotateRefreshSession,
} = require('../services/authRouteService');
const {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  ensureCsrfCookie,
} = require('../services/authCookies');

const router = express.Router();

const RATE_LIMIT_WINDOW_MS = 30 * 1000;
const RATE_LIMIT_MAX = 10;

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = getClientIp(req);
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'login' });

  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return fail(res, 429, AUTH_MESSAGES.loginRateLimited);
  }

  if (!username || !password) {
    return fail(res, 400, AUTH_MESSAGES.missingCredentials);
  }

  try {
    const session = await authenticateUserAndIssueSession({ username, password });
    if (!session) {
      return fail(res, 401, AUTH_MESSAGES.invalidCredentials);
    }

    return sendSessionSuccess({ res, session, rateLimitKeys });
  } catch (error) {
    console.error('\uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958:', error);
    return fail(res, 500, AUTH_MESSAGES.serverError);
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = resolveAuthToken(
      req.headers.authorization,
      req.cookies?.[AUTH_COOKIE_NAME] || null
    );

    if (!token) {
      return fail(res, 401, AUTH_MESSAGES.missingToken);
    }

    const sessionUser = await loadSessionUserFromToken(token);
    if (sessionUser.status === 'missing-token') {
      return fail(res, 401, AUTH_MESSAGES.missingToken);
    }
    if (sessionUser.status === 'invalid-token') {
      return fail(res, 401, AUTH_MESSAGES.invalidToken);
    }

    ensureCsrfCookie(req, res);
    return res.json({ status: 'success', user: sessionUser.userPayload });
  } catch (error) {
    const message = error instanceof Error ? error.message : AUTH_MESSAGES.invalidToken;
    return fail(res, 401, message);
  }
});

router.post('/reauth', authMiddleware(), async (req, res) => {
  const { password } = req.body || {};
  const ip = getClientIp(req);
  const username = req.user?.username;
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'reauth' });

  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return fail(res, 429, AUTH_MESSAGES.reauthRateLimited);
  }

  if (!password) {
    return fail(res, 400, AUTH_MESSAGES.missingPassword);
  }

  try {
    const session = await authenticateUserAndIssueSession({ username, password });
    if (!session) {
      return fail(res, 401, AUTH_MESSAGES.invalidCredentials);
    }

    return sendSessionSuccess({ res, session, rateLimitKeys });
  } catch (error) {
    console.error('\uC7AC\uC778\uC99D \uC2E4\uD328:', error);
    return fail(res, 500, AUTH_MESSAGES.serverError);
  }
});

router.post('/password', authMiddleware([], { allowPasswordChange: true }), async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const ip = getClientIp(req);
  const username = req.user?.username;
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'password' });

  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return fail(res, 429, AUTH_MESSAGES.passwordRateLimited);
  }

  if (!currentPassword || !newPassword) {
    return fail(res, 400, AUTH_MESSAGES.passwordFieldsRequired);
  }

  const normalizedNew = String(newPassword || '').trim();
  if (!normalizedNew || normalizedNew === '0') {
    return fail(res, 400, AUTH_MESSAGES.invalidNewPassword);
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      return fail(res, 401, AUTH_MESSAGES.missingAuth);
    }

    const session = await changePasswordAndIssueSession({
      userId,
      currentPassword,
      newPassword: normalizedNew,
    });
    if (session.status !== 'success') {
      return fail(res, 401, AUTH_MESSAGES.invalidCredentials);
    }

    return sendSessionSuccess({ res, session, rateLimitKeys });
  } catch (error) {
    console.error('\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC2E4\uD328:', error);
    return fail(res, 500, AUTH_MESSAGES.passwordChangeFailed);
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    clearAuthCookies(res);
    return fail(res, 401, AUTH_MESSAGES.missingRefreshToken);
  }

  let payload = null;
  try {
    payload = await verify(refreshToken);
  } catch (error) {
    clearAuthCookies(res);
    return fail(res, 401, AUTH_MESSAGES.invalidRefreshToken);
  }

  const ip = getClientIp(req);
  const username = payload?.username;
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'refresh' });

  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return fail(res, 429, AUTH_MESSAGES.refreshRateLimited);
  }

  try {
    const session = await rotateRefreshSession(refreshToken, Number(payload?.reauthAt || 0));
    return sendSessionSuccess({ res, session, rateLimitKeys });
  } catch (error) {
    clearAuthCookies(res);
    return fail(res, 401, AUTH_MESSAGES.invalidRefreshToken);
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  return res.json({ status: 'success' });
});

module.exports = router;
