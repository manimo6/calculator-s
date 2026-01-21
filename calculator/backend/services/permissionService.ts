const { prisma } = require('../db/prisma');

const EFFECT_ALLOW = 'allow';
const EFFECT_DENY = 'deny';
const OVERRIDE_LOCKED_KEYS = new Set(['tabs.attendance']);

type PermissionRow = {
  permission?: { key?: string }
  effect?: string
}

async function getRolePermissionKeys(roleName: string | null | undefined): Promise<Set<string>> {
  if (!roleName) return new Set();
  const role = await prisma.role.findUnique({
    where: { name: String(roleName) },
    select: {
      id: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  const keys = role?.rolePermissions
    ?.map((row: { permission?: { key?: string } }) => row.permission?.key)
    .filter(Boolean) || [];
  return new Set(keys);
}

async function getUserPermissionOverrides(userId: string | number | null | undefined): Promise<PermissionRow[]> {
  if (!userId) return [];
  return prisma.userPermission.findMany({
    where: { userId: String(userId) },
    select: { permission: { select: { key: true } }, effect: true },
  });
}

function applyOverrides(baseAllowSet: Iterable<string>, overrides: PermissionRow[]) {
  const allow = new Set<string>(baseAllowSet || []);
  const deny = new Set<string>();
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

async function getEffectivePermissions({
  userId,
  roleName,
}: {
  userId: string | number | null | undefined
  roleName: string | null | undefined
}) {
  const baseAllow = await getRolePermissionKeys(roleName);
  const overrides = await getUserPermissionOverrides(userId);
  return applyOverrides(baseAllow, overrides);
}

async function canUser({
  userId,
  roleName,
  permissionKey,
}: {
  userId: string | number | null | undefined
  roleName: string | null | undefined
  permissionKey: string | null | undefined
}) {
  if (!permissionKey) return false;
  const { allow, deny } = await getEffectivePermissions({ userId, roleName });
  if (deny.has(permissionKey)) return false;
  return allow.has(permissionKey);
}

async function getUserCategoryAccess(
  userId: string | number | null | undefined,
  courseConfigSetName: string | null | undefined
) {
  if (!userId || !courseConfigSetName) {
    return { allow: new Set<string>(), deny: new Set<string>(), hasRules: false };
  }
  const rows = await prisma.userCategoryAccess.findMany({
    where: {
      userId: String(userId),
      courseConfigSetName: String(courseConfigSetName),
    },
    select: { categoryKey: true, effect: true },
  });
  const allow = new Set<string>();
  const deny = new Set<string>();
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
