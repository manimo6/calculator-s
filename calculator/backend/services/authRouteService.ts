const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { sign, verify } = require('./authToken');
const { getEffectivePermissions } = require('./permissionService');
const { issueRefreshToken, rotateRefreshToken } = require('./refreshTokenService');
const { hashPassword } = require('./passwordUtils');

type AuthUserRecord = {
  id: string
  username: string
  role: string
  tokenVersion: number
  mustChangePassword?: boolean | null
  salt?: string | null
  hash?: string | null
  iterations?: number | null
  keylen?: number | null
  digest?: string | null
}

function normalizeUsername(username: string | null | undefined) {
  if (!username) return '';
  return String(username).trim().toLowerCase();
}

function buildRateLimitKeys({
  ip,
  username,
  scope = 'login',
}: {
  ip: string
  username: string | null | undefined
  scope?: string
}) {
  const normalizedUsername = normalizeUsername(username);
  const keys = [];
  if (ip) keys.push(`${scope}:ip:${ip}`);
  if (normalizedUsername) {
    keys.push(`${scope}:user:${normalizedUsername}`);
    if (ip) keys.push(`${scope}:ipuser:${ip}:${normalizedUsername}`);
  }
  return keys;
}

function verifyPassword(user: AuthUserRecord | null, password: string) {
  if (!user || !password || !user.salt || !user.hash) return false;

  const iterations = Number(user.iterations) || 100000;
  const keylen = Number(user.keylen) || 32;
  const digest =
    typeof user.digest === 'string' && user.digest.trim() ? user.digest : 'sha256';

  const computed = crypto.pbkdf2Sync(
    password,
    Buffer.from(user.salt, 'base64'),
    iterations,
    keylen,
    digest
  );
  const stored = Buffer.from(user.hash, 'base64');
  return crypto.timingSafeEqual(computed, stored);
}

function resolveAuthToken(
  rawAuthHeader: string | string[] | null | undefined,
  cookieToken: string | null | undefined
) {
  const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return headerToken || cookieToken || null;
}

async function buildUserPayload(user: AuthUserRecord) {
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

async function issueAuthSession(user: AuthUserRecord, reauthAt: number) {
  const accessToken = await sign({
    username: user.username,
    role: user.role,
    reauthAt,
    tokenVersion: user.tokenVersion,
  });
  const { token: refreshToken } = await issueRefreshToken(user, prisma, reauthAt);
  const userPayload = await buildUserPayload(user);

  return {
    accessToken,
    refreshToken,
    userPayload,
  };
}

async function authenticateUserAndIssueSession({
  username,
  password,
}: {
  username: string
  password: string
}) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(user, password)) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  return issueAuthSession(user, nowSec);
}

async function loadSessionUserFromToken(token: string) {
  const payload = await verify(token);
  if (payload?.tokenUse === 'refresh') {
    return { status: 'invalid-token' as const };
  }

  const user = await prisma.user.findUnique({
    where: { username: payload.username },
  });
  if (!user) {
    return { status: 'missing-token' as const };
  }

  const payloadVersion = Number.isInteger(payload.tokenVersion)
    ? payload.tokenVersion
    : null;
  if (payloadVersion === null || user.tokenVersion !== payloadVersion) {
    return { status: 'invalid-token' as const };
  }

  const userPayload = await buildUserPayload(user);
  return {
    status: 'success' as const,
    userPayload,
  };
}

async function changePasswordAndIssueSession({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string
  currentPassword: string
  newPassword: string
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !verifyPassword(user, currentPassword)) {
    return { status: 'invalid-credentials' as const };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...hashPassword(newPassword),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  return {
    status: 'success' as const,
    ...(await issueAuthSession(updated, nowSec)),
  };
}

async function rotateRefreshSession(refreshToken: string, reauthAt: number) {
  const rotated = await rotateRefreshToken(refreshToken);
  const accessToken = await sign({
    username: rotated.user.username,
    role: rotated.user.role,
    reauthAt,
    tokenVersion: rotated.user.tokenVersion,
  });
  const userPayload = await buildUserPayload(rotated.user);

  return {
    accessToken,
    refreshToken: rotated.token,
    userPayload,
  };
}

module.exports = {
  authenticateUserAndIssueSession,
  buildRateLimitKeys,
  buildUserPayload,
  changePasswordAndIssueSession,
  issueAuthSession,
  loadSessionUserFromToken,
  resolveAuthToken,
  rotateRefreshSession,
  verifyPassword,
};
