const { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } = require('../services/authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/reauth']);

function csrfMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  const method = req.method || '';
  const path = req.path || '';
  if (SAFE_METHODS.has(method)) return next();
  if (EXEMPT_PATHS.has(path)) return next();

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
