const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { sign, verify } = require('./authToken');

const DEFAULT_REFRESH_TTL_SEC = 60 * 60 * 24 * 7;
const MIN_REFRESH_TTL_SEC = 60 * 60;
const MAX_REFRESH_TTL_SEC = 60 * 60 * 24 * 30;
const { REFRESH_TOKEN_TTL_SEC: REFRESH_TTL_RAW } = process.env;
const parsedTtl = Number.parseInt(REFRESH_TTL_RAW, 10);
const hasOverride = typeof REFRESH_TTL_RAW === 'string' && REFRESH_TTL_RAW.trim() !== '';
const REFRESH_TOKEN_TTL_SEC = Number.isFinite(parsedTtl) ? parsedTtl : DEFAULT_REFRESH_TTL_SEC;

if (
  hasOverride &&
  (REFRESH_TOKEN_TTL_SEC < MIN_REFRESH_TTL_SEC || REFRESH_TOKEN_TTL_SEC > MAX_REFRESH_TTL_SEC)
) {
  throw new Error('REFRESH_TOKEN_TTL_SEC must be between 3600 and 2592000 seconds.');
}

function getRefreshExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);
}

async function issueRefreshToken(user, tx = prisma) {
  const id = crypto.randomUUID();
  const token = await sign(
    {
      tokenUse: 'refresh',
      jti: id,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    },
    REFRESH_TOKEN_TTL_SEC
  );
  const record = await tx.refreshToken.create({
    data: {
      id,
      userId: user.id,
      tokenVersion: user.tokenVersion,
      expiresAt: getRefreshExpiry(),
    },
  });
  return { token, record };
}

async function revokeRefreshTokenById(id, tx = prisma) {
  if (!id) return null;
  return tx.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

async function revokeAllRefreshTokensForUser(userId, tx = prisma) {
  if (!userId) return null;
  return tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function rotateRefreshToken(token) {
  if (!token) {
    throw new Error('Missing refresh token.');
  }

  let payload;
  try {
    payload = await verify(token);
  } catch (error) {
    throw new Error('Invalid refresh token.');
  }

  if (payload?.tokenUse !== 'refresh' || !payload?.jti || !payload?.sub) {
    throw new Error('Invalid refresh token.');
  }

  const record = await prisma.refreshToken.findUnique({
    where: { id: String(payload.jti) },
    include: { user: true },
  });
  if (!record || !record.user || record.userId !== payload.sub) {
    throw new Error('Invalid refresh token.');
  }
  const payloadVersion = Number.isInteger(payload.tokenVersion)
    ? payload.tokenVersion
    : null;
  if (payloadVersion === null || payloadVersion !== record.tokenVersion) {
    await revokeRefreshTokenById(record.id);
    throw new Error('Invalid refresh token.');
  }
  if (record.revokedAt) {
    await prisma.$transaction(async (tx) => {
      await revokeAllRefreshTokensForUser(record.userId, tx);
      await tx.user.update({
        where: { id: record.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    });
    throw new Error('Invalid refresh token.');
  }
  if (record.expiresAt <= new Date()) {
    await revokeRefreshTokenById(record.id);
    throw new Error('Invalid refresh token.');
  }
  if (record.tokenVersion !== record.user.tokenVersion) {
    await revokeRefreshTokenById(record.id);
    throw new Error('Invalid refresh token.');
  }

  return prisma.$transaction(async (tx) => {
    const issued = await issueRefreshToken(record.user, tx);
    await tx.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedById: issued.record.id },
    });
    return { user: record.user, token: issued.token, record: issued.record };
  });
}

async function revokeRefreshToken(token) {
  if (!token) return null;
  let payload;
  try {
    payload = await verify(token);
  } catch (error) {
    return null;
  }
  if (payload?.tokenUse !== 'refresh' || !payload?.jti) return null;
  return revokeRefreshTokenById(String(payload.jti));
}

module.exports = {
  REFRESH_TOKEN_TTL_SEC,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
};
