const { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } = require('../services/authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/reauth']);

function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();

  const authCookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (!authCookie) return next();

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      status: 'fail',
      message: 'Invalid CSRF token.',
    });
  }
  return next();
}

module.exports = { csrfMiddleware };
