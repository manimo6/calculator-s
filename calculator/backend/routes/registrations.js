const express = require('express');
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

const router = express.Router();

router.use(authMiddleware());

function formatDateOnly(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
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

function addDays(date, days) {
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
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

function normalizeCourseId(value) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function normalizeCourseConfigSetName(value) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function parseWeeks(value) {
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

function isCourseNameAllowed(courseName, setName, accessMap, indexMap, bypassAccess = false) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse({ courseName }, index);
  return isCategoryAllowed(category, access);
}

function isCourseAllowed(course, setName, accessMap, indexMap, bypassAccess = false) {
  const access = getAccessForSet(accessMap, setName, bypassAccess);
  const index = indexMap.get(setName);
  if (!index) return true;
  const category = resolveCategoryForCourse(course, index);
  return isCategoryAllowed(category, access);
}
function isCourseInSet(course, setName, indexMap) {
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

// GET /api/registrations - ?„ì²´ ?™ìƒ ê¸°ë¡(ë¬´í˜?´ì§•) ë°˜í™˜
router.get(
  '/',
  requireAnyPermissions(['tabs.registrations', 'tabs.attendance']),
  async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const rows = await prisma.registration.findMany({
      orderBy: [
        { timestamp: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
    const filteredRows = rows;
    const rootIds = Array.from(
      new Set(
        filteredRows
          .map((row) => row.transferFromId || row.id)
          .filter(Boolean)
      )
    );
    const noteRows = rootIds.length
      ? await prisma.registrationNote.findMany({
          where: { registrationId: { in: rootIds } },
          select: { registrationId: true, content: true, updatedAt: true },
        })
      : [];
    const noteMap = new Map(
      noteRows.map((note) => [note.registrationId, note])
    );


    const results = filteredRows.map((row) => {
      const weeks = row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '';
      const startDate = formatDateOnly(row.startDate);
      const endDate = row.endDate
        ? formatDateOnly(row.endDate)
        : computeEndDate(row.startDate, row.weeks, row.skipWeeks);

      const rootId = row.transferFromId || row.id;
      const note = noteMap.get(rootId);

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
        transferAt: formatDateOnly(row.transferAt),
        note: note ? note.content : '',
        noteUpdatedAt: note && note.updatedAt ? note.updatedAt.toISOString() : '',
        weeks,
        tuitionFee: row.tuitionFee ?? null,
        excludeMath: !!row.excludeMath,
        recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
        skipWeeks: Array.isArray(row.skipWeeks) ? row.skipWeeks.filter((w) => Number.isInteger(w)) : [],
      };
    });

    res.json({ status: '?±ê³µ', results });
  } catch (error) {
    console.error('?±ë¡?„í™© ?°ì´??ì¡°íšŒ ?¤ë¥˜:', error);
    res.status(500).json({
      status: '?¤íŒ¨',
      message: error.message || '?±ë¡?„í™© ?°ì´?°ë? ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??',
    });
  }
  }
);

// POST /api/registrations/:id/transfer - Àü¹İ Ã³¸®
router.post(
  '/:id/transfer',
  requirePermissions(['tabs.registrations', 'registrations.transfers.manage']),
  async (req, res) => {
    const { id } = req.params;
    const rawTransferDate = req.body?.transferDate;
    const transferAt = parseDateOnly(rawTransferDate);
    const courseName = String(req.body?.course || '').trim();
    const courseId = normalizeCourseId(req.body?.courseId);
    const courseConfigSetName = normalizeCourseConfigSetName(req.body?.courseConfigSetName);
    const nextWeeks = parseWeeks(req.body?.weeks);

    if (!transferAt) {
      return res.status(400).json({
        status: 'fail',
        message: 'Àü¹İÀÏ Çü½ÄÀÌ ¿Ã¹Ù¸£Áö ¾Ê½À´Ï´Ù.',
      });
    }

    if (!courseName) {
      return res.status(400).json({
        status: 'fail',
        message: 'Àü¹İ ´ë»ó °ú¸ñÀ» ¼±ÅÃÇØ¾ß ÇÕ´Ï´Ù.',
      });
    }

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const existing = await prisma.registration.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ status: 'fail', message: 'ÇØ´ç ID¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù.' });
      }

      if (existing.transferToId) {
        return res.status(400).json({ status: 'fail', message: 'ÀÌ¹Ì Àü¹İ Ã³¸®µÈ ±â·ÏÀÔ´Ï´Ù.' });
      }

      if (existing.withdrawnAt) {
        return res.status(400).json({ status: 'fail', message: 'Åğ¿ø Ã³¸®µÈ ±â·ÏÀº Àü¹İÇÒ ¼ö ¾ø½À´Ï´Ù.' });
      }

      const startDate = parseDateOnly(existing.startDate);
      if (startDate && transferAt.getTime() <= startDate.getTime()) {
        return res.status(400).json({
          status: 'fail',
          message: 'Àü¹İÀÏÀº ½ÃÀÛÀÏ ÀÌÈÄ·Î¸¸ °¡´ÉÇÕ´Ï´Ù.',
        });
      }

      const effectiveSetName =
        courseConfigSetName ||
        normalizeCourseConfigSetName(existing.courseConfigSetName) ||
        '';
      if (!effectiveSetName) {
        return res.status(400).json({
          status: 'fail',
          message: '¼³Á¤ ¼¼Æ®°¡ ¾ø¾î Àü¹İ °ú¸ñÀ» ¼±ÅÃÇÒ ¼ö ¾ø½À´Ï´Ù.',
        });
      }

      const { accessMap, indexMap } = await loadAccessContext(
        authUser.id,
        [normalizeCourseConfigSetName(existing.courseConfigSetName), effectiveSetName]
          .filter(Boolean),
        isCategoryAccessBypassed(authUser)
      );
      if (!isCourseInSet({ courseId, courseName }, effectiveSetName, indexMap)) {
        return res.status(400).json({
          status: 'fail',
          message: '¼³Á¤ ¼¼Æ®¿¡ ¾ø´Â °ú¸ñÀÔ´Ï´Ù.',
        });
      }

      if (!isRegistrationAllowed(existing, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      if (effectiveSetName) {
        const allowed = isCourseAllowed(
          { courseId, courseName },
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

      const created = await prisma.$transaction(async (tx) => {
        const newRecord = await tx.registration.create({
          data: {
            id: transferId,
            timestamp: now,
            name: existing.name,
            course: courseName,
            courseId,
            courseConfigSetName: effectiveSetName || null,
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
      console.error('Àü¹İ Ã³¸® ¿À·ù:', error);
      res.status(500).json({
        status: 'fail',
        message: error.message || 'Àü¹İ Ã³¸®¿¡ ½ÇÆĞÇß½À´Ï´Ù.',
      });
    }
  }
);

// POST /api/registrations/:id/transfer/cancel - Àü¹İ Ãë¼Ò
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
        return res.status(404).json({ status: 'fail', message: 'ÇØ´ç ID¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù.' });
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
          message: 'Àü¹İ Ã³¸®µÈ ±â·ÏÀÌ ¾Æ´Õ´Ï´Ù.',
        });
      }

      if (!original || !transfer) {
        return res.status(404).json({
          status: 'fail',
          message: 'Àü¹İ ±â·ÏÀ» Ã£À» ¼ö ¾ø½À´Ï´Ù.',
        });
      }

      if (transfer.transferToId) {
        return res.status(400).json({
          status: 'fail',
          message: 'ÀÌ¹Ì Àü¹İµÈ ±â·ÏÀº Ãë¼ÒÇÒ ¼ö ¾ø½À´Ï´Ù.',
        });
      }

      if (transfer.withdrawnAt) {
        return res.status(400).json({
          status: 'fail',
          message: 'Åğ¿ø Ã³¸®µÈ Àü¹İ ±â·ÏÀº Ãë¼ÒÇÒ ¼ö ¾ø½À´Ï´Ù.',
        });
      }

      const { accessMap, indexMap } = await loadAccessContext(authUser.id, [
        normalizeCourseConfigSetName(original.courseConfigSetName),
        normalizeCourseConfigSetName(transfer.courseConfigSetName),
      ].filter(Boolean), isCategoryAccessBypassed(authUser));
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

      await prisma.$transaction(async (tx) => {
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
      console.error('Àü¹İ Ãë¼Ò ¿À·ù:', error);
      res.status(500).json({
        status: 'fail',
        message: error.message || 'Àü¹İ Ãë¼Ò¿¡ ½ÇÆĞÇß½À´Ï´Ù.',
      });
    }
  }
);
// PUT /api/registrations/:id/note - ÇĞ»ı ¸Ş¸ğ ÀúÀå/»èÁ¦
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
        return res.status(404).json({ status: 'fail', message: 'ÇØ´ç ID¸¦ Ã£À» ¼ö ¾ø½À´Ï´Ù.' });
      }

      const rootId = existing.transferFromId || existing.id;
      const root = existing.transferFromId
        ? await prisma.registration.findUnique({ where: { id: rootId } })
        : existing;

      if (!root) {
        return res.status(404).json({ status: 'fail', message: '¿øº» ±â·ÏÀ» Ã£À» ¼ö ¾ø½À´Ï´Ù.' });
      }

      const { accessMap, indexMap } = await loadAccessContext(authUser.id, [
        normalizeCourseConfigSetName(root.courseConfigSetName),
      ].filter(Boolean), isCategoryAccessBypassed(authUser));
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
      console.error('ÇĞ»ı ¸Ş¸ğ ÀúÀå ¿À·ù:', error);
      res.status(500).json({
        status: 'fail',
        message: error.message || '¸Ş¸ğ ÀúÀå¿¡ ½ÇÆĞÇß½À´Ï´Ù.',
      });
    }
  }
);
// PATCH /api/registrations/:id/withdrawal - ì¤‘ë„?´ì› ? ì§œ ?…ë°?´íŠ¸/ë³µêµ¬
router.patch(
  '/:id/withdrawal',
  requirePermissions('tabs.registrations'),
  async (req, res) => {
  const { id } = req.params;
  const raw = req.body?.withdrawnAt;
  const withdrawnAt = raw === null || raw === '' ? null : parseDateOnly(raw);

  if (raw !== null && raw !== '' && !withdrawnAt) {
    return res.status(400).json({
      status: '?¤íŒ¨',
      message: '?´ì›???•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.',
    });
  }

  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: '?¤íŒ¨', message: '?´ë‹¹ IDë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.' });
    }

    const { accessMap, indexMap } = await loadAccessContext(authUser.id, [
      String(existing.courseConfigSetName || '').trim(),
    ], isCategoryAccessBypassed(authUser));
    if (!isRegistrationAllowed(existing, accessMap, indexMap, isCategoryAccessBypassed(authUser))) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: { withdrawnAt },
    });

    res.json({
      status: '?±ê³µ',
      withdrawnAt: formatDateOnly(updated.withdrawnAt),
    });
  } catch (error) {
    console.error('ì¤‘ë„?´ì› ?…ë°?´íŠ¸ ?¤ë¥˜:', error);
    res.status(500).json({
      status: '?¤íŒ¨',
      message: error.message || 'ì¤‘ë„?´ì› ì²˜ë¦¬???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
    });
  }
  }
);

// GET /api/registrations/course-names - ?¤ì • ?¸íŠ¸ë³??˜ì—…ëª?ëª©ë¡
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
        status: '?¤íŒ¨',
        message: '?¤ì • ?¸íŠ¸ê°€ ?„ìš”?©ë‹ˆ??',
      });
    }

    const rows = await prisma.registration.groupBy({
      by: ['course'],
      where: { courseConfigSetName },
      _count: { course: true },
    });

    const results = rows
      .map((row) => ({
        course: row.course || '',
        count: Number(row._count?.course || 0),
      }))
      .sort((a, b) => a.course.localeCompare(b.course, 'ko-KR'));

    res.json({ status: '?±ê³µ', results });
  } catch (error) {
    console.error('?˜ì—…ëª?ëª©ë¡ ì¡°íšŒ ?¤ë¥˜:', error);
    res.status(500).json({
      status: '?¤íŒ¨',
      message: error.message || '?˜ì—…ëª?ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??',
    });
  }
  }
);

// PATCH /api/registrations/course-names - ?¤ì • ?¸íŠ¸ë³??˜ì—…ëª??¼ê´„ ë³€ê²?
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
        status: '?¤íŒ¨',
        message: '?¤ì • ?¸íŠ¸ê°€ ?„ìš”?©ë‹ˆ??',
      });
    }

    const changeMap = new Map();
    for (const change of changes) {
      const from = String(change?.from || '').trim();
      const to = String(change?.to || '').trim();
      if (!from || !to || from === to) continue;
      changeMap.set(from, to);
    }

    const normalized = Array.from(changeMap.entries()).map(([from, to]) => ({ from, to }));
    if (normalized.length === 0) {
      return res.json({ status: '?±ê³µ', updated: 0, details: [] });
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

    const counts = await prisma.registration.groupBy({
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

    res.json({ status: '?±ê³µ', updated, details });
  } catch (error) {
    console.error('?˜ì—…ëª??¼ê´„ ë³€ê²??¤ë¥˜:', error);
    res.status(500).json({
      status: '?¤íŒ¨',
      message: error.message || '?˜ì—…ëª?ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
    });
  }
  }
);

module.exports = router;










