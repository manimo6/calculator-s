const { prisma } = require('../db/prisma');

const EFFECT_ALLOW = 'allow';
const EFFECT_DENY = 'deny';
const OVERRIDE_LOCKED_KEYS = new Set(['tabs.attendance']);

async function getRolePermissionKeys(roleName) {
  if (!roleName) return new Set();
  const role = await prisma.role.findUnique({
    where: { name: String(roleName) },
    select: {
      id: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  const keys = role?.rolePermissions?.map((row) => row.permission?.key).filter(Boolean) || [];
  return new Set(keys);
}

async function getUserPermissionOverrides(userId) {
  if (!userId) return [];
  return prisma.userPermission.findMany({
    where: { userId: String(userId) },
    select: { permission: { select: { key: true } }, effect: true },
  });
}

function applyOverrides(baseAllowSet, overrides) {
  const allow = new Set(baseAllowSet || []);
  const deny = new Set();
  for (const row of overrides || []) {
    const key = row?.permission?.key;
    if (!key) continue;
    if (OVERRIDE_LOCKED_KEYS.has(key)) {
      // Keep attendance tab role-based for now; remove from OVERRIDE_LOCKED_KEYS to re-enable user overrides.
      continue;
    }
    if (row.effect === EFFECT_DENY) {
      allow.delete(key);
      deny.add(key);
      continue;
    }
    if (row.effect === EFFECT_ALLOW) {
      allow.add(key);
    }
  }
  return { allow, deny };
}

async function getEffectivePermissions({ userId, roleName }) {
  const baseAllow = await getRolePermissionKeys(roleName);
  const overrides = await getUserPermissionOverrides(userId);
  return applyOverrides(baseAllow, overrides);
}

async function canUser({ userId, roleName, permissionKey }) {
  if (!permissionKey) return false;
  const { allow, deny } = await getEffectivePermissions({ userId, roleName });
  if (deny.has(permissionKey)) return false;
  return allow.has(permissionKey);
}

async function getUserCategoryAccess(userId, courseConfigSetName) {
  if (!userId || !courseConfigSetName) {
    return { allow: new Set(), deny: new Set(), hasRules: false };
  }
  const rows = await prisma.userCategoryAccess.findMany({
    where: {
      userId: String(userId),
      courseConfigSetName: String(courseConfigSetName),
    },
    select: { categoryKey: true, effect: true },
  });
  const allow = new Set();
  const deny = new Set();
  for (const row of rows || []) {
    const key = row?.categoryKey;
    if (!key) continue;
    if (row.effect === EFFECT_DENY) {
      deny.add(key);
      continue;
    }
    if (row.effect === EFFECT_ALLOW) {
      allow.add(key);
    }
  }
  return { allow, deny, hasRules: rows.length > 0 };
}

module.exports = {
  EFFECT_ALLOW,
  EFFECT_DENY,
  getRolePermissionKeys,
  getUserPermissionOverrides,
  getEffectivePermissions,
  canUser,
  getUserCategoryAccess,
};
