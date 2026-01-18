const express = require('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRecentAuth } = require('../middleware/reauthMiddleware');
const {
  getRequestUser,
  requirePermissions,
  requireAnyPermissions,
} = require('../middleware/permissionMiddleware');
const {
  buildCategoryAccessMap,
  filterCourseConfigSetData,
  getAccessForSet,
  getAllowedCategories,
  isCategoryAccessBypassed,
  mergeCourseConfigSetData,
  normalizeKey,
} = require('../services/categoryAccessService');

const router = express.Router();

// GET /api/course-config-sets (legacy alias: /api/presets)
router.get(
  '/',
  authMiddleware(),
  requireAnyPermissions([
    'tabs.courses',
    'tabs.registrations',
    'tabs.attendance',
    'tabs.course_notes',
  ]),
  async (req, res) => {
    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
      const rows = await prisma.courseConfigSet.findMany({
        select: { name: true, data: true },
      });

      const setNames = rows.map((row) => row.name).filter(Boolean);
      const accessRows = bypassCategoryAccess || setNames.length === 0
        ? []
        : await prisma.userCategoryAccess.findMany({
            where: { userId: authUser.id, courseConfigSetName: { in: setNames } },
            select: { courseConfigSetName: true, categoryKey: true, effect: true },
          });
      const accessMap = buildCategoryAccessMap(accessRows);

      const courseConfigSets = {};
      for (const row of rows) {
        const access = getAccessForSet(accessMap, row.name, bypassCategoryAccess);
        courseConfigSets[row.name] = filterCourseConfigSetData(row.data || {}, access);
      }

      res.json(courseConfigSets);
    } catch (error) {
      console.error('Error reading courseConfigSets:', error);
      res
        .status(500)
        .json({ status: 'fail', message: 'Failed to load course config sets.' });
    }
  }
);

// POST /api/course-config-sets (legacy alias: /api/presets)
router.post('/', authMiddleware(), requirePermissions('tabs.courses'), async (req, res) => {
  try {
    const { name, data } = req.body;

    if (!name || !data) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'name and data are required.' });
    }

    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const accessRows = bypassCategoryAccess
      ? []
      : await prisma.userCategoryAccess.findMany({
          where: { userId: authUser.id, courseConfigSetName: name },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const access = getAccessForSet(
      buildCategoryAccessMap(accessRows),
      name,
      bypassCategoryAccess
    );

    let nextData = data;
    if (access.hasRules) {
      const allowedCategories = getAllowedCategories(access);
      if (!allowedCategories || allowedCategories.size === 0) {
        return res.status(403).json({
          status: 'fail',
          message: 'No allowed categories for this config set.',
        });
      }
      const tree = Array.isArray(data?.courseTree) ? data.courseTree : [];
      const forbidden = tree.find(
        (group) => !allowedCategories.has(normalizeKey(group?.cat))
      );
      if (forbidden) {
        return res.status(403).json({
          status: 'fail',
          message: 'Attempted to modify restricted categories.',
        });
      }

      const existing = await prisma.courseConfigSet.findUnique({
        where: { name },
        select: { data: true },
      });
      nextData = mergeCourseConfigSetData(existing?.data || {}, data, access);
    }

    await prisma.courseConfigSet.upsert({
      where: { name },
      create: { name, data: nextData },
      update: { data: nextData },
    });

    const tree = Array.isArray(nextData?.courseTree) ? nextData.courseTree : [];
    const validCategories = new Set(
      tree.map((group) => normalizeKey(group?.cat)).filter(Boolean)
    );
    if (validCategories.size) {
      await prisma.userCategoryAccess.deleteMany({
        where: {
          courseConfigSetName: name,
          categoryKey: { notIn: Array.from(validCategories) },
        },
      });
    } else {
      await prisma.userCategoryAccess.deleteMany({
        where: { courseConfigSetName: name },
      });
    }

    res.json({
      status: 'success',
      message: `Saved course config set '${name}'.`,
    });
  } catch (error) {
    console.error('Error saving courseConfigSet:', error);
    res
      .status(500)
      .json({ status: 'fail', message: 'Failed to save course config set.' });
  }
});

// DELETE /api/course-config-sets/:name (legacy alias: /api/presets/:name)
router.delete(
  '/:name',
  authMiddleware(['master']),
  requireRecentAuth(),
  requirePermissions('tabs.courses'),
  async (req, res) => {
    try {
      const { name } = req.params;

      const existing = await prisma.courseConfigSet.findUnique({ where: { name } });
      if (!existing) {
        return res
          .status(404)
          .json({ status: 'fail', message: `Not found: '${name}'.` });
      }

      await prisma.courseConfigSet.delete({ where: { name } });

      res.json({
        status: 'success',
        message: `Deleted course config set '${name}'.`,
      });
    } catch (error) {
      console.error('Error deleting courseConfigSet:', error);
      res
        .status(500)
        .json({ status: 'fail', message: 'Failed to delete course config set.' });
    }
  }
);

module.exports = router;
