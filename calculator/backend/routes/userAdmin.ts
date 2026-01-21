const express = require('express') as typeof import('express');
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { buildCourseTreeIndex, normalizeKey } = require('../services/categoryAccessService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRecentAuth } = require('../middleware/reauthMiddleware');

const router = express.Router();
type PermissionEffect = 'allow' | 'deny'

const EFFECTS = new Set<PermissionEffect>(['allow', 'deny']);

function hashPassword(password: string, iterations = 100000, keylen = 32, digest = 'sha256') {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return {
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
    iterations,
    keylen,
    digest,
  };
}

// GET /api/users - 리스트(마스터/관리자만)
router.get('/', authMiddleware(['master', 'admin']), async (req, res) => {
  try {
    const safe = await prisma.user.findMany({
      select: { username: true, role: true },
      orderBy: { username: 'asc' },
    });
    res.json({ status: '성공', users: safe });
  } catch (error) {
    res.status(500).json({ status: '실패', message: '사용자 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/users - 생성/업데이트(마스터만)
router.post('/', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !role) {
      return res.status(400).json({ status: '실패', message: 'username, role이 필요합니다.' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });

    if (!existing) {
      const initialPassword = '0';
      await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          username,
          role,
          ...hashPassword(initialPassword),
          mustChangePassword: true,
        },
      });
    } else {
      const updateData = {
        role,
        ...(password ? { ...hashPassword(password), mustChangePassword: true } : {}),
        tokenVersion: { increment: 1 },
      };
      await prisma.user.update({ where: { username }, data: updateData });
    }

    res.json({ status: '성공', message: '계정이 생성/업데이트되었습니다.' });
  } catch (error) {
    console.error('계정 생성/업데이트 오류:', error);
    res.status(500).json({ status: '실패', message: '계정 저장 중 오류가 발생했습니다.' });
  }
});

// PUT /api/users/:username - 업데이트(마스터만)
router.put('/:username', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role } = req.body || {};
    if (!role) {
      return res.status(400).json({ status: '실패', message: 'role이 필요합니다.' });
    }
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) return res.status(404).json({ status: '실패', message: '계정을 찾을 수 없습니다.' });

    const updateData = {
      role,
      ...(password ? { ...hashPassword(password), mustChangePassword: true } : {}),
      tokenVersion: { increment: 1 },
    };
    await prisma.user.update({ where: { username }, data: updateData });
    res.json({ status: '성공', message: '계정이 업데이트되었습니다.' });
  } catch (error) {
    console.error('계정 업데이트 오류:', error);
    res.status(500).json({ status: '실패', message: '계정 저장 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/users/:username - 삭제(마스터만)
router.delete('/:username', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    await prisma.user.deleteMany({ where: { username } });
    res.json({ status: '성공', message: '계정이 삭제되었습니다.' });
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    res.status(500).json({ status: '실패', message: '계정 삭제 중 오류가 발생했습니다.' });
  }
});



// GET /api/users/:username/permissions (master only)
router.get('/:username/permissions', authMiddleware(['master']), async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' });
    }

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

    res.json({
      status: 'success',
      user: { username: user.username, role: user.role },
      permissions,
      categoryAccess,
    });
  } catch (error) {
    console.error('Failed to load user permissions:', error);
    res.status(500).json({ status: 'fail', message: 'Failed to load user permissions.' });
  }
});

// PUT /api/users/:username/permissions (master only)
router.put('/:username/permissions', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' });
    }

    const rawPermissions = Array.isArray(req.body?.permissions)
      ? req.body.permissions
      : [];
    const rawCategoryAccess = Array.isArray(req.body?.categoryAccess)
      ? req.body.categoryAccess
      : [];

    const permissionMap = new Map<string, PermissionEffect>();
    for (const row of rawPermissions) {
      const key = String(row?.key || '').trim();
      const effect = String(row?.effect || '').trim();
      if (!key || !EFFECTS.has(effect as PermissionEffect)) continue;
      permissionMap.set(key, effect as PermissionEffect);
    }

    const categorySetNames = Array.from(
      new Set(
        rawCategoryAccess
          .map((row: Record<string, unknown>) => normalizeKey(row?.courseConfigSetName))
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
      const setName = normalizeKey(row?.courseConfigSetName);
      const categoryKey = normalizeKey(row?.categoryKey);
      const effect = String(row?.effect || '').trim();
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
      const summary = invalidCategoryAccess
        .map((item) => `${item.courseConfigSetName}:${item.categoryKey}`)
        .join(", ");
      return res.status(400).json({
        status: "fail",
        message: `Invalid category keys: ${summary}`,
      });
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
      return res.status(400).json({
        status: 'fail',
        message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
      });
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
    const userCategoryRows = Array.from(categoryMap.values()).map(
      (row: { courseConfigSetName: string; categoryKey: string; effect: PermissionEffect }) => ({
      userId: user.id,
      ...row,
    })
    );

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

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Failed to update user permissions:', error);
    res.status(500).json({ status: 'fail', message: 'Failed to update user permissions.' });
  }
});

module.exports = router;
