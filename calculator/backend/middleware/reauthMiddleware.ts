const DEFAULT_REAUTH_TTL_SEC = 60 * 10;
const MIN_REAUTH_TTL_SEC = 60;
const MAX_REAUTH_TTL_SEC = 60 * 60;

const { AUTH_REAUTH_TTL_SEC: AUTH_REAUTH_TTL_RAW } = process.env;
const parsedReauthTtl = Number.parseInt(AUTH_REAUTH_TTL_RAW || '', 10);
const hasReauthOverride =
  typeof AUTH_REAUTH_TTL_RAW === 'string' && AUTH_REAUTH_TTL_RAW.trim() !== '';
const REAUTH_TTL_SEC = Number.isFinite(parsedReauthTtl)
  ? parsedReauthTtl
  : DEFAULT_REAUTH_TTL_SEC;

if (
  hasReauthOverride &&
  (REAUTH_TTL_SEC < MIN_REAUTH_TTL_SEC || REAUTH_TTL_SEC > MAX_REAUTH_TTL_SEC)
) {
  throw new Error('AUTH_REAUTH_TTL_SEC must be between 60 and 3600 seconds.');
}

function requireRecentAuth(): import('express').RequestHandler {
  return (req, res, next) => {
    const reauthAt = Number(req.user?.reauthAt || 0);
    if (!reauthAt) {
      return res.status(403).json({
        status: 'fail',
        message: 'Recent authentication required.',
      });
    }
    const now = Math.floor(Date.now() / 1000);
    if (now - reauthAt > REAUTH_TTL_SEC) {
      return res.status(403).json({
        status: 'fail',
        message: 'Recent authentication required.',
      });
    }
    return next();
  };
}

module.exports = { requireRecentAuth };
