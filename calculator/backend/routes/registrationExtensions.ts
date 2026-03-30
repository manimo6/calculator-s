const express = require('express') as typeof import('express');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getSafeErrorMessage } = require('../utils/apiError');
const { formatDateOnly } = require('../utils/dateUtils');
const {
  parseStrictDateOnly,
  parseWeeks,
  parseTuitionFee,
  normalizeRegistrationIds,
  computeEndDate,
} = require('../utils/parsers');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const {
  isCategoryAccessBypassed,
  loadAccessContext,
  isRegistrationAllowed,
} = require('../services/categoryAccessService');

type RegistrationRow = {
  id: string | number
  courseId?: string
  course?: string
  courseConfigSetName?: string
}
type ExtensionRow = {
  id: string
  registrationId: string
  startDate: Date
  weeks?: number | null
  tuitionFee?: number | null
  createdAt?: Date | null
}

const router = express.Router();

router.use(authMiddleware());
router.use(
  requirePermissions(['tabs.registrations', 'registrations.installments.view'])
);


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
    const registrations: RegistrationRow[] = await prisma.registration.findMany({
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
    const allowedIds = new Set<string | number>(
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

    const rows: ExtensionRow[] = await prisma.registrationExtension.findMany({
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
    const message = getSafeErrorMessage(error, '연장 기록을 불러오지 못했습니다.');
    console.error('Failed to fetch registration extensions:', error);
    res.status(500).json({
      status: 'fail',
      message,
    });
  }
});

router.post('/query', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const registrationIds = normalizeRegistrationIds(req.body?.registrationIds);
    const registrationWhere = registrationIds.length
      ? { id: { in: registrationIds } }
      : {};
    const registrations: RegistrationRow[] = await prisma.registration.findMany({
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
    const allowedIds = new Set<string | number>(
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

    const rows: ExtensionRow[] = await prisma.registrationExtension.findMany({
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
    const message = getSafeErrorMessage(error, '연장 기록을 불러오지 못했습니다.');
    console.error('Failed to fetch registration extensions:', error);
    res.status(500).json({ status: 'fail', message });
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
    const startDate = parseStrictDateOnly(req.body?.startDate);
    const endDate = parseStrictDateOnly(req.body?.endDate);
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
      : parseStrictDateOnly(
          computeEndDate(registration.startDate, nextWeeks, registration.skipWeeks)
        );

    // 연장 휴강 주차 병합 (프론트에서 등록 전체 기준으로 변환된 값)
    const incomingSkipWeeks = Array.isArray(req.body?.skipWeeks)
      ? (req.body.skipWeeks as unknown[]).map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    const existingSkipWeeks = Array.isArray(registration.skipWeeks) ? registration.skipWeeks : [];
    const mergedSkipWeeks = incomingSkipWeeks.length > 0
      ? Array.from(new Set([...existingSkipWeeks, ...incomingSkipWeeks])).sort((a: number, b: number) => a - b)
      : undefined;

    // 연장 녹화 날짜 병합
    const incomingRecordingDates = Array.isArray(req.body?.recordingDates)
      ? (req.body.recordingDates as unknown[]).filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      : [];
    const existingRecordingDates = Array.isArray(registration.recordingDates) ? registration.recordingDates : [];
    const mergedRecordingDates = incomingRecordingDates.length > 0
      ? Array.from(new Set([...existingRecordingDates, ...incomingRecordingDates])).sort()
      : undefined;

    const result = await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
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
          ...(mergedSkipWeeks ? { skipWeeks: mergedSkipWeeks } : {}),
          ...(mergedRecordingDates ? { recordingDates: mergedRecordingDates } : {}),
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
    const message = getSafeErrorMessage(error, '연장 등록에 실패했습니다.');
    console.error('Failed to create registration extension:', error);
    res.status(500).json({
      status: 'fail',
      message,
    });
  }
});

module.exports = router;
