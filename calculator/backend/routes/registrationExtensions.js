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
router.use(
  requirePermissions(['tabs.registrations', 'registrations.installments.view'])
);

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

function parseWeeks(value) {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function parseTuitionFee(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const i = Math.trunc(value);
    return i >= 0 ? i : null;
  }
  const s = String(value).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 0 ? i : null;
}

function computeEndDate(startDate, weeks, skipWeeks = []) {
  if (!startDate || !weeks) return '';
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return '';
  const skipCount = Array.isArray(skipWeeks) ? skipWeeks.length : 0;
  const scheduleWeeks = Number(weeks) + Number(skipCount || 0);
  if (!Number.isFinite(scheduleWeeks) || scheduleWeeks <= 0) return '';
  const end = new Date(s);
  end.setUTCDate(s.getUTCDate() + scheduleWeeks * 7 - 1);
  return formatDateOnly(end);
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

router.get('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const registrationIds = normalizeRegistrationIds(req.query?.registrationIds);
    const registrationWhere = registrationIds.length
      ? { id: { in: registrationIds } }
      : {};
    const registrations = await prisma.registration.findMany({
      where: registrationWhere,
      select: { id: true, courseId: true, course: true, courseConfigSetName: true },
    });
    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const setNames = registrations
      .map((row) => String(row.courseConfigSetName || '').trim())
      .filter(Boolean);
    const { accessMap, indexMap } = await loadAccessContext(
      authUser.id,
      setNames,
      bypassCategoryAccess
    );
    const allowedIds = new Set(
      registrations
        .filter((row) => isRegistrationAllowed(row, accessMap, indexMap, bypassCategoryAccess))
        .map((row) => row.id)
    );
    const filteredIds = registrationIds.length
      ? registrationIds.filter((id) => allowedIds.has(id))
      : registrations.map((row) => row.id).filter((id) => allowedIds.has(id));
    if (filteredIds.length === 0) {
      return res.json({ status: 'success', results: [] });
    }
    const where = { registrationId: { in: filteredIds } };

    const rows = await prisma.registrationExtension.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
    });

    const results = rows.map((row) => ({
      id: row.id,
      registrationId: row.registrationId,
      startDate: formatDateOnly(row.startDate),
      weeks: row.weeks ?? null,
      tuitionFee: row.tuitionFee ?? null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
    }));

    res.json({ status: 'success', results });
  } catch (error) {
    console.error('Failed to fetch registration extensions:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to fetch registration extensions',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const registrationId = String(req.body?.registrationId || '').trim();
    const extendWeeks = parseWeeks(req.body?.weeks ?? req.body?.extendWeeks);
    const startDate = parseDateOnly(req.body?.startDate);
    const endDate = parseDateOnly(req.body?.endDate);
    const tuitionFee = parseTuitionFee(req.body?.tuitionFee);

    if (!registrationId || !extendWeeks) {
      return res.status(400).json({
        status: 'fail',
        message: 'registrationId and weeks are required',
      });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      return res.status(404).json({
        status: 'fail',
        message: 'Registration not found',
      });
    }

    const { accessMap, indexMap } = await loadAccessContext(authUser.id, [
      String(registration.courseConfigSetName || '').trim(),
    ], isCategoryAccessBypassed(authUser));
    if (!isRegistrationAllowed(registration, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }

    const baseWeeks = Number(registration.weeks || 0);
    const nextWeeks = baseWeeks + extendWeeks;
    const computedEndDate = endDate
      ? endDate
      : parseDateOnly(
          computeEndDate(registration.startDate, nextWeeks, registration.skipWeeks)
        );

    const result = await prisma.$transaction(async (tx) => {
      const extension = await tx.registrationExtension.create({
        data: {
          id: uuidv4(),
          registrationId,
          startDate,
          weeks: extendWeeks,
          tuitionFee,
        },
      });

      const updated = await tx.registration.update({
        where: { id: registrationId },
        data: {
          weeks: nextWeeks || null,
          endDate: computedEndDate || registration.endDate,
        },
      });

      return {
        extension,
        registration: {
          id: updated.id,
          weeks: updated.weeks ?? null,
          endDate: formatDateOnly(updated.endDate),
        },
      };
    });

    if (!result) {
      return res.status(404).json({
        status: 'fail',
        message: 'Registration not found',
      });
    }

    res.json({
      status: 'success',
      extension: {
        id: result.extension.id,
        registrationId: result.extension.registrationId,
        startDate: formatDateOnly(result.extension.startDate),
        weeks: result.extension.weeks ?? null,
        tuitionFee: result.extension.tuitionFee ?? null,
        createdAt: result.extension.createdAt.toISOString(),
      },
      registration: result.registration,
    });
  } catch (error) {
    console.error('Failed to create registration extension:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to create registration extension',
    });
  }
});

module.exports = router;
