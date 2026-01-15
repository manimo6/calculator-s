const { prisma } = require('../db/prisma');
const { getEffectivePermissions } = require('../services/permissionService');

function normalizePermissionKeys(keys) {
  if (!keys) return [];
  if (Array.isArray(keys)) return keys.filter(Boolean);
  return [keys].filter(Boolean);
}

async function getRequestUser(req) {
  if (req.authUser) return req.authUser;
  const username = req.user?.username;
  if (!username) return null;
  const user = await prisma.user.findUnique({
    where: { username: String(username) },
    select: { id: true, username: true, role: true },
  });
  if (!user) return null;
  req.authUser = user;
  return user;
}

async function getPermissionsForRequest(req) {
  if (req.effectivePermissions) return req.effectivePermissions;
  const user = await getRequestUser(req);
  if (!user) return null;
  const permissions = await getEffectivePermissions({
    userId: user.id,
    roleName: user.role,
  });
  req.effectivePermissions = permissions;
  return permissions;
}

function requirePermissions(keys) {
  const required = normalizePermissionKeys(keys);
  return async (req, res, next) => {
    if (!required.length) return next();
    try {
      const permissions = await getPermissionsForRequest(req);
      if (!permissions) {
        return res.status(401).json({
          status: 'fail',
          message: 'Missing auth context.',
        });
      }
      const { allow, deny } = permissions;
      const blocked = required.find(
        (key) => deny.has(key) || !allow.has(key)
      );
      if (blocked) {
        return res.status(403).json({
          status: 'fail',
          message: 'Permission denied.',
        });
      }
      return next();
    } catch (error) {
      return res.status(500).json({
        status: 'fail',
        message: error.message || 'Permission check failed.',
      });
    }
  };
}

function requireAnyPermissions(keys) {
  const required = normalizePermissionKeys(keys);
  return async (req, res, next) => {
    if (!required.length) return next();
    try {
      const permissions = await getPermissionsForRequest(req);
      if (!permissions) {
        return res.status(401).json({
          status: 'fail',
          message: 'Missing auth context.',
        });
      }
      const { allow, deny } = permissions;
      const allowed = required.some((key) => allow.has(key) && !deny.has(key));
      if (!allowed) {
        return res.status(403).json({
          status: 'fail',
          message: 'Permission denied.',
        });
      }
      return next();
    } catch (error) {
      return res.status(500).json({
        status: 'fail',
        message: error.message || 'Permission check failed.',
      });
    }
  };
}

module.exports = {
  getRequestUser,
  getPermissionsForRequest,
  requirePermissions,
  requireAnyPermissions,
};
