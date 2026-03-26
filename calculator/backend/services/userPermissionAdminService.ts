const { prisma } = require('../db/prisma');
const { buildCourseTreeIndex, normalizeKey } = require('./categoryAccessService');

type PermissionEffect = 'allow' | 'deny'

const EFFECTS = new Set<PermissionEffect>(['allow', 'deny']);

async function loadManagedUserPermissions(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;

  const [permissionRows, categoryAccess] = await Promise.all([
    prisma.userPermission.findMany({
      where: { userId: user.id },
      select: { effect: true, permission: { select: { key: true } } },
    }),
    prisma.userCategoryAccess.findMany({
      where: { userId: user.id },
      select: { courseConfigSetName: true, categoryKey: true, effect: true },
    }),
  ]);

  const permissions = permissionRows
    .map((row: { permission?: { key?: string }; effect?: string }) => ({
      key: row.permission?.key,
      effect: row.effect,
    }))
    .filter(
      (row: { key?: string; effect?: string }) =>
        Boolean(row.key) && EFFECTS.has(row.effect as PermissionEffect)
    );

  return {
    user: { username: user.username, role: user.role, id: user.id },
    permissions,
    categoryAccess,
  };
}

async function saveManagedUserPermissions({
  username,
  rawPermissions,
  rawCategoryAccess,
}: {
  username: string
  rawPermissions: unknown[]
  rawCategoryAccess: unknown[]
}) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return { status: 'missing-user' as const };
  }

  const permissionMap = new Map<string, PermissionEffect>();
  for (const row of rawPermissions) {
    const key = String((row as Record<string, unknown>)?.key || '').trim();
    const effect = String((row as Record<string, unknown>)?.effect || '').trim();
    if (!key || !EFFECTS.has(effect as PermissionEffect)) continue;
    permissionMap.set(key, effect as PermissionEffect);
  }

  const categorySetNames = Array.from(
    new Set(
      rawCategoryAccess
        .map((row) => normalizeKey((row as Record<string, unknown>)?.courseConfigSetName))
        .filter(Boolean)
    )
  );

  const setRows = categorySetNames.length
    ? await prisma.courseConfigSet.findMany({
        where: { name: { in: categorySetNames } },
        select: { name: true, data: true },
      })
    : [];

  const categoriesBySet = new Map<string, Set<string>>();
  for (const row of setRows) {
    const tree = Array.isArray(row?.data?.courseTree) ? row.data.courseTree : [];
    const index = buildCourseTreeIndex(tree);
    categoriesBySet.set(normalizeKey(row.name), index.categories || new Set());
  }

  const categoryMap = new Map<
    string,
    { courseConfigSetName: string; categoryKey: string; effect: PermissionEffect }
  >();
  const invalidCategoryAccess: Array<{ courseConfigSetName: string; categoryKey: string }> = [];

  for (const row of rawCategoryAccess) {
    const setName = normalizeKey((row as Record<string, unknown>)?.courseConfigSetName);
    const categoryKey = normalizeKey((row as Record<string, unknown>)?.categoryKey);
    const effect = String((row as Record<string, unknown>)?.effect || '').trim();
    if (!setName || !categoryKey || !EFFECTS.has(effect as PermissionEffect)) continue;
    const validCategories = categoriesBySet.get(setName);
    if (!validCategories || !validCategories.has(categoryKey)) {
      invalidCategoryAccess.push({ courseConfigSetName: setName, categoryKey });
      continue;
    }
    categoryMap.set(`${setName}::${categoryKey}`, {
      courseConfigSetName: setName,
      categoryKey,
      effect: effect as PermissionEffect,
    });
  }

  if (invalidCategoryAccess.length) {
    return {
      status: 'invalid-category' as const,
      summary: invalidCategoryAccess
        .map((item) => `${item.courseConfigSetName}:${item.categoryKey}`)
        .join(', '),
    };
  }

  const keys = Array.from(permissionMap.keys());
  const permissionRows = keys.length
    ? await prisma.permission.findMany({
        where: { key: { in: keys } },
        select: { id: true, key: true },
      })
    : [];
  const idByKey = new Map(
    permissionRows.map((row: { key: string; id: string }) => [row.key, row.id])
  );
  const invalidKeys = keys.filter((key) => !idByKey.has(key));
  if (invalidKeys.length) {
    return {
      status: 'invalid-permission' as const,
      keys: invalidKeys,
    };
  }

  const userPermissionRows = keys
    .map((key) => {
      const permissionId = idByKey.get(key);
      const effect = permissionMap.get(key);
      if (!permissionId || !effect) return null;
      return { userId: user.id, permissionId, effect };
    })
    .filter(
      (row): row is { userId: string; permissionId: string; effect: PermissionEffect } =>
        Boolean(row)
    );
  const userCategoryRows = Array.from(categoryMap.values()).map((row) => ({
    userId: user.id,
    ...row,
  }));

  await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
    await tx.userPermission.deleteMany({ where: { userId: user.id } });
    await tx.userCategoryAccess.deleteMany({ where: { userId: user.id } });
    if (userPermissionRows.length) {
      await tx.userPermission.createMany({ data: userPermissionRows });
    }
    if (userCategoryRows.length) {
      await tx.userCategoryAccess.createMany({ data: userCategoryRows });
    }
    await tx.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  return { status: 'success' as const };
}

module.exports = {
  loadManagedUserPermissions,
  saveManagedUserPermissions,
};
