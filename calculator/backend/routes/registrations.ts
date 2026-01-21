const express = require('express') as typeof import('express');
const { Prisma } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getRequestUser,
  requirePermissions,
  requireAnyPermissions,
} = require('../middleware/permissionMiddleware');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  resolveCategoryForCourse,
} = require('../services/categoryAccessService');

type RegistrationRow = {
  id?: string
  name?: string
  course?: string
  courseName?: string
  courseId?: string
  courseConfigSetName?: string
  weeks?: number | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  skipWeeks?: unknown[]
  timestamp?: Date | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  transferDate?: Date | string | null
  transferAt?: Date | string | null
  tuitionFee?: number | null
  excludeMath?: boolean
  recordingDates?: unknown[]
} & Record<string, unknown>
type CourseInput = { courseId?: string; courseName?: string; course?: string }

const router = express.Router();

router.use(authMiddleware());

function formatDateOnly(date: string | number | Date | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(date: string | number | Date, days: number) {
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function computeEndDate(startDate: string | number | Date | null | undefined, weeks: number | null | undefined, skipWeeks: unknown[] = []) {
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

function normalizeCourseId(value: unknown) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function normalizeCourseConfigSetName(value: unknown) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function parseWeeks(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const i = Math.trunc(value);
    return i > 0 ? i : null;
  }
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

async function loadAccessContext(
  userId: string,
  setNames: string[],
  bypassAccess = false
): Promise<{
  accessMap: ReturnType<typeof buildCategoryAccessMap>
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>
}> {
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

function isRegistrationAllowed(
  row: RegistrationRow,
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
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

function isCourseNameAllowed(
  courseName: string,
  setName: string,
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse({ courseName }, index);
  return isCategoryAllowed(category, access);
}

function isCourseAllowed(
  course: CourseInput,
  setName: string,
  accessMap: ReturnType<typeof buildCategoryAccessMap>,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>,
  bypassAccess = false
) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse(course, index);
  return isCategoryAllowed(category, access);
}
function isCourseInSet(
  course: CourseInput,
  setName: string,
  indexMap: ReturnType<typeof buildCourseConfigSetIndexMap>
) {
  if (!setName) return false;
  const index = indexMap.get(setName);
  if (!index) return false;
  const courseId = normalizeCourseId(course?.courseId);
  if (courseId && index.idToCategory.has(courseId)) return true;
  const courseName = String(course?.courseName || course?.course || '').trim();
  if (!courseName) return false;
  if (index.labelToCategory.has(courseName)) return true;
  for (const base of index.labelBases || []) {
    if (courseName.startsWith(base)) return true;
  }
  return false;
}

// GET /api/registrations - 전체 학생 기록(무페이징) 반환
router.get(
  '/',
  requireAnyPermissions(['tabs.registrations', 'tabs.attendance']),
  async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const rows: RegistrationRow[] = await prisma.registration.findMany({
      orderBy: [
        { timestamp: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const setNames = rows
      .map((row: RegistrationRow) => String(row.courseConfigSetName || '').trim())
      .filter(Boolean);
    const { accessMap, indexMap } = await loadAccessContext(
      authUser.id,
      setNames,
      bypassCategoryAccess
    );
    const filteredRows = rows.filter((row: RegistrationRow) =>
      isRegistrationAllowed(row, accessMap, indexMap, bypassCategoryAccess)
    );
    const rootIds = Array.from(
      new Set(
        filteredRows
          .map((row: RegistrationRow) => row.transferFromId || row.id)
          .filter(Boolean)
      )
    );
    const noteRows: Array<{ registrationId: string; content: string; updatedAt: Date }> = rootIds.length
      ? await prisma.registrationNote.findMany({
          where: { registrationId: { in: rootIds } },
          select: { registrationId: true, content: true, updatedAt: true },
        })
      : [];
    const noteMap = new Map<string, { content: string; updatedAt: Date }>(
      noteRows.map((note) => [note.registrationId, note])
    );


    const results = filteredRows.map((row: RegistrationRow) => {
      const weeks = row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '';
      const startDate = formatDateOnly(row.startDate);
      const endDate = row.endDate
        ? formatDateOnly(row.endDate)
        : computeEndDate(row.startDate, row.weeks, row.skipWeeks);

    const rootId = row.transferFromId || row.id || '';
    const note = noteMap.get(String(rootId));

      return {
        id: row.id || '',
        timestamp: row.timestamp ? row.timestamp.toISOString() : '',
        name: row.name || '',
        course: row.course || '',
        courseId: row.courseId || '',
        courseConfigSetName: row.courseConfigSetName || '',
        startDate,
        endDate,
        withdrawnAt: formatDateOnly(row.withdrawnAt),
        transferFromId: row.transferFromId || '',
        transferToId: row.transferToId || '',
        transferAt: formatDateOnly(row.transferAt as string | number | Date | null | undefined),
        note: note ? note.content : '',
        noteUpdatedAt: note && note.updatedAt ? note.updatedAt.toISOString() : '',
        weeks,
        tuitionFee: row.tuitionFee ?? null,
        excludeMath: !!row.excludeMath,
        recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
        skipWeeks: Array.isArray(row.skipWeeks)
          ? row.skipWeeks.filter((w: unknown) => Number.isInteger(w))
          : [],
      };
    });

    res.json({ status: '성공', results });
  } catch (error) {
    const message = error instanceof Error ? error.message : '등록 현황 상세를 불러오지 못했습니다.';
    console.error('등록 현황 상세 조회 오류:', error);
    res.status(500).json({
      status: '실패',
      message,
    });
  }
  }
);

// POST /api/registrations/:id/transfer - 전반 처리
router.post(
  '/:id/transfer',
  requirePermissions(['tabs.registrations', 'registrations.transfers.manage']),
  async (req, res) => {
    const { id } = req.params;
    const rawTransferDate = req.body?.transferDate;
    const transferAt = parseDateOnly(rawTransferDate);
    const courseName = String(req.body?.course || '').trim();
    const courseId = normalizeCourseId(req.body?.courseId);
    const safeCourseId = courseId || undefined;
    const courseConfigSetName = normalizeCourseConfigSetName(req.body?.courseConfigSetName);
    const nextWeeks = parseWeeks(req.body?.weeks);

    if (!transferAt) {
      return res.status(400).json({
        status: 'fail',
        message: '전반일 형식이 올바르지 않습니다.',
      });
    }

    if (!courseName) {
      return res.status(400).json({
        status: 'fail',
        message: '전반 과목을 입력해야 합니다.',
      });
    }

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const existing = await prisma.registration.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ status: 'fail', message: '해당 ID를 찾을 수 없습니다.' });
      }

      if (existing.transferToId) {
        return res.status(400).json({ status: 'fail', message: '이미 전반 처리된 기록입니다.' });
      }

      if (existing.withdrawnAt) {
        return res.status(400).json({ status: 'fail', message: '퇴원 처리된 기록은 전반할 수 없습니다.' });
      }

      const startDate = parseDateOnly(existing.startDate);
      if (startDate && transferAt.getTime() <= startDate.getTime()) {
        return res.status(400).json({
          status: 'fail',
          message: '전반일은 시작일 이후여야 합니다.',
        });
      }

      const effectiveSetName =
        courseConfigSetName ||
        normalizeCourseConfigSetName(existing.courseConfigSetName) ||
        '';
      if (!effectiveSetName) {
        return res.status(400).json({
          status: 'fail',
          message: '설정 세트 정보를 확인할 수 없습니다.',
        });
      }

      const setNameCandidates = [
        normalizeCourseConfigSetName(existing.courseConfigSetName),
        effectiveSetName,
      ].filter((name): name is string => Boolean(name));
      const { accessMap, indexMap } = await loadAccessContext(
        authUser.id,
        setNameCandidates,
        isCategoryAccessBypassed(authUser)
      );
      if (!isCourseInSet({ courseId: safeCourseId, courseName }, effectiveSetName, indexMap)) {
        return res.status(400).json({
          status: 'fail',
          message: '설정 세트에 없는 과목입니다.',
        });
      }

      if (!isRegistrationAllowed(existing, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      if (effectiveSetName) {
        const allowed = isCourseAllowed(
          { courseId: safeCourseId, courseName },
          effectiveSetName,
          accessMap,
          indexMap,
          isCategoryAccessBypassed(authUser)
        );
        if (!allowed) {
          return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
        }
      }

      const transferId = uuidv4();
      const now = new Date();
      const oldEndDate = addDays(transferAt, -1);

      const created = await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
        const newRecord = await tx.registration.create({
          data: {
            id: transferId,
            timestamp: now,
            name: existing.name,
            course: courseName,
            courseId: safeCourseId,
            courseConfigSetName: effectiveSetName || undefined,
            startDate: transferAt,
            endDate: null,
            withdrawnAt: null,
            weeks: nextWeeks ?? existing.weeks,
            tuitionFee: existing.tuitionFee,
            skipWeeks: Array.isArray(existing.skipWeeks) ? existing.skipWeeks : [],
            recordingDates: [],
            excludeMath: !!existing.excludeMath,
            transferFromId: existing.id,
            transferAt,
            createdAt: now,
            updatedAt: now,
          },
        });

        await tx.registration.update({
          where: { id: existing.id },
          data: {
            endDate: oldEndDate,
            transferToId: transferId,
            transferAt,
            updatedAt: now,
          },
        });

        return newRecord;
      });

      res.json({
        status: 'success',
        record: {
          id: created.id,
          course: created.course || '',
          startDate: formatDateOnly(created.startDate),
          transferFromId: created.transferFromId || '',
        },
      });
    } catch (error) {
      console.error('전반 처리 오류:', error);
      const message = error instanceof Error ? error.message : '전반 처리에 실패했습니다.';
      res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

// POST /api/registrations/:id/transfer/cancel - 전반 취소
router.post(
  '/:id/transfer/cancel',
  requirePermissions(['tabs.registrations', 'registrations.transfers.manage']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const existing = await prisma.registration.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ status: 'fail', message: '해당 ID를 찾을 수 없습니다.' });
      }

      let original = null;
      let transfer = null;

      if (existing.transferFromId) {
        transfer = existing;
        original = await prisma.registration.findUnique({
          where: { id: existing.transferFromId },
        });
      } else if (existing.transferToId) {
        original = existing;
        transfer = await prisma.registration.findUnique({
          where: { id: existing.transferToId },
        });
      } else {
        return res.status(400).json({
          status: 'fail',
          message: '전반 처리된 기록이 아닙니다.',
        });
      }

      if (!original || !transfer) {
        return res.status(404).json({
          status: 'fail',
          message: '전반 기록을 찾을 수 없습니다.',
        });
      }

      if (transfer.transferToId) {
        return res.status(400).json({
          status: 'fail',
          message: '이미 전반된 기록은 취소할 수 없습니다.',
        });
      }

      if (transfer.withdrawnAt) {
        return res.status(400).json({
          status: 'fail',
          message: '퇴원 처리된 기록은 취소할 수 없습니다.',
        });
      }

      const cancelSetNames = [
        normalizeCourseConfigSetName(original.courseConfigSetName),
        normalizeCourseConfigSetName(transfer.courseConfigSetName),
      ].filter((name): name is string => Boolean(name));
      const { accessMap, indexMap } = await loadAccessContext(
        authUser.id,
        cancelSetNames,
        isCategoryAccessBypassed(authUser)
      );
      if (
        !isRegistrationAllowed(original, accessMap, indexMap, isCategoryAccessBypassed(authUser)) ||
        !isRegistrationAllowed(transfer, accessMap, indexMap, isCategoryAccessBypassed(authUser))
      ) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      const now = new Date();
      const restoredEndDate = parseDateOnly(
        computeEndDate(original.startDate, original.weeks, original.skipWeeks)
      );

    await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
        await tx.registration.delete({ where: { id: transfer.id } });
        await tx.registration.update({
          where: { id: original.id },
          data: {
            endDate: restoredEndDate,
            transferToId: null,
            transferAt: null,
            updatedAt: now,
          },
        });
      });

      res.json({
        status: 'success',
        record: {
          id: original.id,
          endDate: formatDateOnly(restoredEndDate),
        },
      });
    } catch (error) {
      console.error('전반 취소 오류:', error);
      const message = error instanceof Error ? error.message : '전반 취소에 실패했습니다.';
      res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);
// PUT /api/registrations/:id/note - 학생 메모 저장/수정
router.put(
  '/:id/note',
  requirePermissions('tabs.registrations'),
  async (req, res) => {
    const { id } = req.params;
    const content = String(req.body?.content || '').trim();

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const existing = await prisma.registration.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ status: 'fail', message: '해당 ID를 찾을 수 없습니다.' });
      }

      const rootId = existing.transferFromId || existing.id;
      const root = existing.transferFromId
        ? await prisma.registration.findUnique({ where: { id: rootId } })
        : existing;

      if (!root) {
        return res.status(404).json({ status: 'fail', message: '전반 기록을 찾을 수 없습니다.' });
      }

      const noteSetNames = [
        normalizeCourseConfigSetName(root.courseConfigSetName),
      ].filter((name): name is string => Boolean(name));
      const { accessMap, indexMap } = await loadAccessContext(
        authUser.id,
        noteSetNames,
        isCategoryAccessBypassed(authUser)
      );
      if (!isRegistrationAllowed(root, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      if (!content) {
        await prisma.registrationNote.deleteMany({ where: { registrationId: rootId } });
        return res.json({ status: 'success', note: '' });
      }

      const saved = await prisma.registrationNote.upsert({
        where: { registrationId: rootId },
        update: { content },
        create: { registrationId: rootId, content },
      });

      res.json({
        status: 'success',
        note: saved.content,
        noteUpdatedAt: saved.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('학생 메모 저장 오류:', error);
      const message = error instanceof Error ? error.message : '메모 저장에 실패했습니다.';
      res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);
// PATCH /api/registrations/:id/withdrawal - 중도퇴원 날짜 업데이트/복구
router.patch(
  '/:id/withdrawal',
  requirePermissions('tabs.registrations'),
  async (req, res) => {
  const { id } = req.params;
  const raw = req.body?.withdrawnAt;
  const withdrawnAt = raw === null || raw === '' ? null : parseDateOnly(raw);

  if (raw !== null && raw !== '' && !withdrawnAt) {
    return res.status(400).json({
      status: '실패',
      message: '퇴원일 형식이 올바르지 않습니다.',
    });
  }

  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: '실패', message: '해당 ID를 찾을 수 없습니다.' });
    }

    const withdrawalSetNames = [
      String(existing.courseConfigSetName || '').trim(),
    ].filter((name): name is string => Boolean(name));
    const { accessMap, indexMap } = await loadAccessContext(
      authUser.id,
      withdrawalSetNames,
      isCategoryAccessBypassed(authUser)
    );
    if (!isRegistrationAllowed(existing, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: { withdrawnAt },
    });

    res.json({
      status: '성공',
      withdrawnAt: formatDateOnly(updated.withdrawnAt),
    });
  } catch (error) {
    console.error('중도퇴원 업데이트 오류:', error);
    const message = error instanceof Error ? error.message : '중도퇴원 처리에 실패했습니다.';
    res.status(500).json({
      status: '실패',
      message,
    });
  }
  }
);

// GET /api/registrations/course-names - 설정 세트별 수업명 목록
router.get(
  '/course-names',
  requireAnyPermissions(['tabs.registrations', 'tabs.attendance']),
  async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const courseConfigSetName = String(req.query?.courseConfigSetName || '').trim();
    if (!courseConfigSetName) {
      return res.status(400).json({
        status: '실패',
        message: '설정 세트가 필요합니다.',
      });
    }

    const rows: Array<{ course: string | null; _count: { course: number } }> =
      await prisma.registration.groupBy({
      by: ['course'],
      where: { courseConfigSetName },
      _count: { course: true },
    });

    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const { accessMap, indexMap } = await loadAccessContext(
      authUser.id,
      [courseConfigSetName],
      bypassCategoryAccess
    );
    const allowedRows = rows.filter((row: { course: string | null }) =>
      isCourseNameAllowed(
        row.course || '',
        courseConfigSetName,
        accessMap,
        indexMap,
        bypassCategoryAccess
      )
    );

    const results = allowedRows
      .map((row: { course: string | null; _count: { course: number } }) => ({
        course: row.course || '',
        count: Number(row._count?.course || 0),
      }))
      .sort((a: { course: string }, b: { course: string }) =>
        a.course.localeCompare(b.course, 'ko-KR')
      );

    res.json({ status: '성공', results });
  } catch (error) {
    console.error('수업명 목록 조회 오류:', error);
    const message = error instanceof Error ? error.message : '수업명 목록을 불러오지 못했습니다.';
    res.status(500).json({
      status: '실패',
      message,
    });
  }
  }
);

// PATCH /api/registrations/course-names - 설정 세트별 수업명 일괄 변경
router.patch(
  '/course-names',
  requirePermissions('tabs.registrations'),
  async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const courseConfigSetName = String(req.body?.courseConfigSetName || '').trim();
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];

    if (!courseConfigSetName) {
      return res.status(400).json({
        status: '실패',
        message: '설정 세트가 필요합니다.',
      });
    }

    const changeMap = new Map<string, string>();
    for (const change of changes) {
      const from = String(change?.from || '').trim();
      const to = String(change?.to || '').trim();
      if (!from || !to || from === to) continue;
      changeMap.set(from, to);
    }

    const normalized = Array.from(changeMap.entries()).map(([from, to]) => ({ from, to }));
    if (normalized.length === 0) {
      return res.json({ status: '성공', updated: 0, details: [] });
    }

    const fromList = normalized.map((item) => item.from);
    const { accessMap, indexMap } = await loadAccessContext(authUser.id, [
      courseConfigSetName,
    ], isCategoryAccessBypassed(authUser));
    const forbidden = fromList.find(
      (course) =>
        !isCourseNameAllowed(course, courseConfigSetName, accessMap, indexMap, isCategoryAccessBypassed(authUser))
    );
    if (forbidden) {
      return res.status(403).json({
        status: 'fail',
        message: 'Permission denied.',
      });
    }

    const counts: Array<{ course: string | null; _count: { course: number } }> =
      await prisma.registration.groupBy({
      by: ['course'],
      where: { courseConfigSetName, course: { in: fromList } },
      _count: { course: true },
    });

    const caseItems = normalized.map((item) =>
      Prisma.sql`WHEN ${item.from} THEN ${item.to}`
    );
    const inItems = normalized.map((item) => Prisma.sql`${item.from}`);

    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "registrations"
        SET "course" = CASE "course"
          ${Prisma.join(caseItems, Prisma.sql` `)}
          ELSE "course"
        END
        WHERE "courseConfigSetName" = ${courseConfigSetName}
          AND "course" IN (${Prisma.join(inItems)});
      `
    );

    const details = normalized.map((item) => {
      const match = counts.find((row) => row.course === item.from);
      return {
        from: item.from,
        to: item.to,
        updated: Number(match?._count?.course || 0),
      };
    });
    const updated = details.reduce((sum, item) => sum + item.updated, 0);

    res.json({ status: '성공', updated, details });
  } catch (error) {
    console.error('수업명 일괄 변경 오류:', error);
    const message = error instanceof Error ? error.message : '수업명 변경에 실패했습니다.';
    res.status(500).json({
      status: '실패',
      message,
    });
  }
  }
);

module.exports = router;
