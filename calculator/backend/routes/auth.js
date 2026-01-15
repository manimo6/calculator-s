const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { sign, verify } = require('../services/authToken');
const { getEffectivePermissions } = require('../services/permissionService');
const { isRateLimited, clearAttempts } = require('../services/rateLimiter');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../services/refreshTokenService');
const {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
  ensureCsrfCookie,
} = require('../services/authCookies');

const router = express.Router();

const RATE_LIMIT_WINDOW_MS = 30 * 1000;
const RATE_LIMIT_MAX = 10;

function hashPassword(password, iterations = 100000, keylen = 32, digest = 'sha256') {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return {
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
    iterations,
    keylen,
    digest,
  };
}

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || '';
}

function normalizeUsername(username) {
  if (!username) return '';
  return String(username).trim().toLowerCase();
}

function buildRateLimitKeys({ ip, username, scope = 'login' }) {
  const normalizedUsername = normalizeUsername(username);
  const keys = [];
  if (ip) keys.push(`${scope}:ip:${ip}`);
  if (normalizedUsername) {
    keys.push(`${scope}:user:${normalizedUsername}`);
    if (ip) keys.push(`${scope}:ipuser:${ip}:${normalizedUsername}`);
  }
  return keys;
}

function verifyPassword(user, password) {
  if (!user || !password) return false;
  const { salt, hash, iterations = 100000, keylen = 32, digest = 'sha256' } = user;
  const computed = crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), iterations, keylen, digest);
  const stored = Buffer.from(hash, 'base64');
  return crypto.timingSafeEqual(computed, stored);
}

async function buildUserPayload(user) {
  const { allow, deny } = await getEffectivePermissions({
    userId: user.id,
    roleName: user.role,
  });
  const categoryAccess = await prisma.userCategoryAccess.findMany({
    where: { userId: user.id },
    select: { courseConfigSetName: true, categoryKey: true, effect: true },
  });
  return {
    username: user.username,
    role: user.role,
    permissions: Array.from(allow),
    permissionDenies: Array.from(deny),
    categoryAccess,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = getClientIp(req);
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'login' });
  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many login attempts. Please try again later.',
    });
  }

  if (!username || !password) {
    return res.status(400).json({ status: '실패', message: '아이디와 비밀번호가 필요합니다.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(user, password)) {
      return res.status(401).json({ status: '실패', message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      username: user.username,
      role: user.role,
      reauthAt: nowSec,
      tokenVersion: user.tokenVersion,
    });
    const { token: refreshToken } = await issueRefreshToken(user);
    setAuthCookies(res, { accessToken, refreshToken });
    await clearAttempts(rateLimitKeys);
    const userPayload = await buildUserPayload(user);

    res.json({
      status: '성공',
      token: accessToken,
      user: userPayload,
    });
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    res.status(500).json({ status: '실패', message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || null;
    const token = headerToken || cookieToken;
    if (!token) return res.status(401).json({ status: '실패', message: '토큰이 없습니다.' });

    const payload = await verify(token);
    if (payload?.tokenUse === 'refresh') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token.',
      });
    }
    const user = await prisma.user.findUnique({
      where: { username: payload.username },
    });
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Missing token.',
      });
    }
    const payloadVersion = Number.isInteger(payload.tokenVersion)
      ? payload.tokenVersion
      : null;
    if (payloadVersion === null || user.tokenVersion !== payloadVersion) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token.',
      });
    }
    const userPayload = await buildUserPayload(user);
    ensureCsrfCookie(req, res);
    res.json({ status: '성공', user: userPayload });
  } catch (error) {
    res.status(401).json({ status: '실패', message: error.message });
  }
});

// POST /api/auth/reauth
router.post('/reauth', authMiddleware(), async (req, res) => {
  const { password } = req.body || {};
  const ip = getClientIp(req);
  const username = req.user?.username;
  const rateLimitKeys = buildRateLimitKeys({ ip, username, scope: 'reauth' });
  if (await isRateLimited(rateLimitKeys, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many login attempts. Please try again later.',
    });
  }
  if (!password) {
    return res.status(400).json({ status: 'fail', message: 'Password is required.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(user, password)) {
      return res.status(401).json({ status: 'fail', message: 'Invalid credentials.' });
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      username: user.username,
      role: user.role,
      reauthAt: nowSec,
      tokenVersion: user.tokenVersion,
    });
    setAuthCookies(res, { accessToken });
    const userPayload = await buildUserPayload(user);
    await clearAttempts(rateLimitKeys);
    res.json({ status: 'success', token: accessToken, user: userPayload });
  } catch (error) {
    console.error('Reauth failed:', error);
    res.status(500).json({ status: 'fail', message: 'Failed to reauthenticate.' });
  }
});

// POST /api/auth/password
router.post('/password', authMiddleware([], { allowPasswordChange: true }), async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ status: 'fail', message: 'Current and new passwords are required.' });
  }
  const normalizedNew = String(newPassword || '').trim();
  if (!normalizedNew || normalizedNew === '0') {
    return res.status(400).json({ status: 'fail', message: 'Invalid new password.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !verifyPassword(user, currentPassword)) {
      return res.status(401).json({ status: 'fail', message: 'Invalid credentials.' });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...hashPassword(normalizedNew),
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      username: updated.username,
      role: updated.role,
      reauthAt: nowSec,
      tokenVersion: updated.tokenVersion,
    });
    const { token: refreshToken } = await issueRefreshToken(updated);
    setAuthCookies(res, { accessToken, refreshToken });
    const userPayload = await buildUserPayload(updated);
    return res.json({ status: 'success', token: accessToken, user: userPayload });
  } catch (error) {
    console.error('Password change failed:', error);
    return res.status(500).json({ status: 'fail', message: 'Failed to change password.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ status: 'fail', message: 'Missing refresh token.' });
  }
  try {
    const rotated = await rotateRefreshToken(refreshToken);
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      username: rotated.user.username,
      role: rotated.user.role,
      reauthAt: nowSec,
      tokenVersion: rotated.user.tokenVersion,
    });
    setAuthCookies(res, { accessToken, refreshToken: rotated.token });
    const userPayload = await buildUserPayload(rotated.user);
    return res.json({ status: 'success', token: accessToken, user: userPayload });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ status: 'fail', message: 'Invalid refresh token.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ status: 'success' });
});

module.exports = router;
