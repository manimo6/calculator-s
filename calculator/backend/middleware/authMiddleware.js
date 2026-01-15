const { verify } = require('../services/authToken');
const { AUTH_COOKIE_NAME } = require('../services/authCookies');
const { prisma } = require('../db/prisma');

function authMiddleware(requiredRoles = [], options = {}) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || null;
      const token = headerToken || cookieToken;
      if (!token) return res.status(401).json({ status: '실패', message: '인증 토큰이 없습니다.' });

      const payload = await verify(token);
      if (payload?.tokenUse === 'refresh') {
        return res.status(401).json({ status: '?¤íŒ¨', message: 'Invalid token.' });
      }
      const user = await prisma.user.findUnique({
        where: { username: payload.username },
        select: { id: true, username: true, role: true, tokenVersion: true, mustChangePassword: true },
      });
      if (!user) {
        return res.status(401).json({ status: '?¤íŒ¨', message: 'Missing token.' });
      }
      const payloadVersion = Number.isInteger(payload.tokenVersion)
        ? payload.tokenVersion
        : null;
      if (payloadVersion === null || user.tokenVersion !== payloadVersion) {
        return res.status(401).json({ status: '?¤íŒ¨', message: 'Invalid token.' });
      }
      req.user = {
        ...payload,
        username: user.username,
        role: user.role,
        id: user.id,
        tokenVersion: user.tokenVersion,
        mustChangePassword: user.mustChangePassword,
      };
      req.authUser = { id: user.id, username: user.username, role: user.role };

      if (user.mustChangePassword && !options.allowPasswordChange) {
        return res.status(403).json({
          status: 'fail',
          message: 'Password change required.',
        });
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ status: '실패', message: '권한이 부족합니다.' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ status: '실패', message: error.message });
    }
  };
}

module.exports = { authMiddleware };
