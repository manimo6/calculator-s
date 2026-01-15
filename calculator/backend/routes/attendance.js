const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  resolveCategoryForCourse,
} = require('../services/categoryAccessService');

const router = express.Router();

router.use(authMiddleware());
router.use(requirePermissions('tabs.attendance'));

const ALLOWED_STATUSES = new Set(['present', 'recorded', 'late', 'absent', 'pending']);

function formatDateOnly(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeRegistrationIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || '').split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadAccessContext(userId, setNames, bypassAccess = false) {
  const names = Array.from(new Set(setNames.filter(Boolean)));
  if (!names.length) {
    return { accessMap: new Map(), indexMap: new Map() };
  }
  const accessPromise = bypassAccess
    ? Promise.resolve([])
    : prisma.userCategoryAccess.findMany({
        where: { userId, courseConfigSetName: { in: names } },
        select: { courseConfigSetName: true, categoryKey: true, effect: true },
      });
  const setPromise = prisma.courseConfigSet.findMany({
    where: { name: { in: names } },
    select: { name: true, data: true },
  });
  const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
  return {
    accessMap: buildCategoryAccessMap(accessRows),
    indexMap: buildCourseConfigSetIndexMap(setRows),
  };
}

function isRegistrationAllowed(row, accessMap, indexMap, bypassAccess = false) {
  const setName = String(row?.courseConfigSetName || '').trim();
  if (!setName) return true;
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse(
    { courseId: row?.courseId, courseName: row?.course },
    index
  );
  return isCategoryAllowed(category, access);
}

// GET /api/attendance?month=YYYY-MM&registrationIds=...
router.get('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const month = String(req.query?.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        status: 'fail',
        message: 'month query param (YYYY-MM) is required',
      });
    }

    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);

    const registrationIds = normalizeRegistrationIds(req.query?.registrationIds);
    const registrationWhere = registrationIds.length
      ? { id: { in: registrationIds } }
      : {};
    const registrations = await prisma.registration.findMany({
      where: registrationWhere,
      select: { id: true, courseId: true, course: true, courseConfigSetName: true },
    });
    const setNames = registrations
      .map((row) => String(row.courseConfigSetName || '').trim())
      .filter(Boolean);
    const { accessMap, indexMap } = await loadAccessContext(authUser.id, setNames, isCategoryAccessBypassed(authUser));
    const allowedSet = new Set(
      registrations
        .filter((row) => isRegistrationAllowed(row, accessMap, indexMap, isCategoryAccessBypassed(authUser)))
        .map((row) => row.id)
    );
    const filteredIds = registrationIds.length
      ? registrationIds.filter((id) => allowedSet.has(id))
      : Array.from(allowedSet);
    if (filteredIds.length === 0) {
      return res.json({ status: 'success', results: [] });
    }

    const where = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (filteredIds.length) {
      where.registrationId = { in: filteredIds };
    }

    const rows = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const results = rows.map((row) => ({
      id: row.id,
      registrationId: row.registrationId,
      date: formatDateOnly(row.date),
      status: row.status,
    }));

    res.json({ status: 'success', results });
  } catch (error) {
    console.error('Failed to fetch attendance records:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to fetch attendance records',
    });
  }
});

// POST /api/attendance
router.post('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const entries = Array.isArray(req.body?.entries)
      ? req.body.entries
      : [req.body];

    if (!entries.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'entries are required',
      });
    }

    const normalized = entries
      .map((entry) => ({
        registrationId: String(entry?.registrationId || '').trim(),
        date: parseDateOnly(entry?.date),
        status: String(entry?.status || '').trim(),
      }))
      .filter((entry) => entry.registrationId && entry.date && entry.status);

    const invalid = entries.length !== normalized.length;
    if (invalid) {
      return res.status(400).json({
        status: 'fail',
        message: 'registrationId, date, status are required',
      });
    }

    for (const entry of normalized) {
      if (!ALLOWED_STATUSES.has(entry.status)) {
        return res.status(400).json({
          status: 'fail',
          message: `invalid status: ${entry.status}`,
        });
      }
    }

    const registrationIds = normalized.map((entry) => entry.registrationId);
    const registrations = await prisma.registration.findMany({
      where: { id: { in: registrationIds } },
      select: { id: true, courseId: true, course: true, courseConfigSetName: true },
    });
    const setNames = registrations
      .map((row) => String(row.courseConfigSetName || '').trim())
      .filter(Boolean);
    const { accessMap, indexMap } = await loadAccessContext(authUser.id, setNames, isCategoryAccessBypassed(authUser));
    const allowedSet = new Set(
      registrations
        .filter((row) => isRegistrationAllowed(row, accessMap, indexMap, isCategoryAccessBypassed(authUser)))
        .map((row) => row.id)
    );
    const denied = normalized.find((entry) => !allowedSet.has(entry.registrationId));
    if (denied) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let upserted = 0;
      let deleted = 0;

      for (const entry of normalized) {
        if (entry.status === 'pending') {
          const deletedRows = await tx.attendanceRecord.deleteMany({
            where: {
              registrationId: entry.registrationId,
              date: entry.date,
            },
          });
          deleted += Number(deletedRows.count || 0);
          continue;
        }

        await tx.attendanceRecord.upsert({
          where: {
            registrationId_date: {
              registrationId: entry.registrationId,
              date: entry.date,
            },
          },
          create: {
            id: uuidv4(),
            registrationId: entry.registrationId,
            date: entry.date,
            status: entry.status,
          },
          update: {
            status: entry.status,
          },
        });

        upserted += 1;
      }

      return { upserted, deleted };
    });

    res.json({ status: 'success', ...result });
  } catch (error) {
    console.error('Failed to save attendance records:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to save attendance records',
    });
  }
});

module.exports = router;
