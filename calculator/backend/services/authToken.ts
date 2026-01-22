const { TextEncoder } = require('util');

const { AUTH_SECRET: AUTH_SECRET_RAW, AUTH_TOKEN_TTL_SEC: AUTH_TOKEN_TTL_RAW } = process.env;
const MIN_SECRET_LENGTH = 32;
const INVALID_SECRET_VALUES = new Set(['CHANGE_ME', 'changeme-secret']);
const AUTH_SECRET = typeof AUTH_SECRET_RAW === 'string' ? AUTH_SECRET_RAW.trim() : '';
const DEFAULT_TOKEN_TTL_SEC = 60 * 60 * 4;
const MIN_TOKEN_TTL_SEC = 60 * 5;
const MAX_TOKEN_TTL_SEC = 60 * 60 * 12;
const parsedTokenTtl = Number.parseInt(AUTH_TOKEN_TTL_RAW || '', 10);
const hasTokenTtlOverride = typeof AUTH_TOKEN_TTL_RAW === 'string' && AUTH_TOKEN_TTL_RAW.trim() !== '';
const TOKEN_TTL_SEC = Number.isFinite(parsedTokenTtl) ? parsedTokenTtl : DEFAULT_TOKEN_TTL_SEC;

if (
  !AUTH_SECRET ||
  AUTH_SECRET.length < MIN_SECRET_LENGTH ||
  INVALID_SECRET_VALUES.has(AUTH_SECRET)
) {
  throw new Error('AUTH_SECRET is required and must be at least 32 characters.');
}
if (
  hasTokenTtlOverride &&
  (TOKEN_TTL_SEC < MIN_TOKEN_TTL_SEC || TOKEN_TTL_SEC > MAX_TOKEN_TTL_SEC)
) {
  throw new Error('AUTH_TOKEN_TTL_SEC must be between 300 and 43200 seconds.');
}

const encoder = new TextEncoder();
const SECRET_KEY = encoder.encode(AUTH_SECRET);
let joseModulePromise: Promise<typeof import('jose')> | null = null;

async function getJose() {
  if (!joseModulePromise) {
    joseModulePromise = import('jose');
  }
  return joseModulePromise;
}

async function sign(payload: Record<string, unknown>, expiresInSec = TOKEN_TTL_SEC) {
  const { SignJWT } = await getJose();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .sign(SECRET_KEY);
}

async function verify(token: string) {
  if (!token) throw new Error('Missing token.');
  try {
    const { jwtVerify } = await getJose();
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (err) {
    throw new Error('Invalid token.');
  }
}

module.exports = { sign, verify, TOKEN_TTL_SEC };
