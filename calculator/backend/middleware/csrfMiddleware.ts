const { CSRF_COOKIE_NAME, ensureCsrfCookie } = require('../services/authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  const method = req.method || '';

  // GET/HEAD/OPTIONS 요청은 CSRF 검증 불필요, 대신 CSRF 쿠키 사전 발급
  if (SAFE_METHODS.has(method)) {
    ensureCsrfCookie(req, res);
    return next();
  }

  // 모든 POST/PUT/PATCH/DELETE는 CSRF 토큰 필수 (login, reauth 포함)
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      status: '실패',
      message: 'CSRF 토큰이 유효하지 않습니다.',
    });
  }
  return next();
}

module.exports = { csrfMiddleware };
