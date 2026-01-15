const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { prisma } = require('../db/prisma');
const { PAGE_SIZE } = require('../config');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware());

function formatDateOnly(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseWeeks(value) {
  if (value === undefined || value === null) return null;
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

function parseSkipWeeks(value) {
  if (!Array.isArray(value)) return [];
  const set = new Set();
  for (const raw of value) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 1) {
      set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function normalizeRecordingDates(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function parseExcludeMath(value) {
  if (value === true || value === 'true') return true;
  if (value === 1 || value === '1') return true;
  return false;
}

function normalizeCourseId(value) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function normalizeCourseConfigSetName(value) {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function buildCourseIdentity(courseId, courseName) {
  const id = normalizeCourseId(courseId);
  if (id) return `id:${id}`;
  const name = String(courseName ?? '').trim();
  return name ? `name:${name}` : '';
}

function extractCourseLabelPrefixes(courseTreeValue) {
  if (!Array.isArray(courseTreeValue)) return [];
  const out = new Set();
  for (const group of courseTreeValue) {
    const items = Array.isArray(group?.items) ? group.items : [];
    for (const item of items) {
      const label = String(item?.label ?? '').trim();
      if (label) out.add(label);
    }
  }
  return Array.from(out);
}

// GET /api/students
router.get('/', async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/students 요청. Query:`, req.query);
  try {
    const { page = 1, searchTerm = '', courseConfigSetName = '' } = req.query;
    const normalizedSearchTerm = String(searchTerm || '').trim();
    const normalizedCourseConfigSetName = String(courseConfigSetName || '').trim();

    const baseWhere = {
      ...(normalizedSearchTerm
        ? { name: { contains: normalizedSearchTerm, mode: 'insensitive' } }
        : {}),
    };

    let where = baseWhere;
    if (normalizedCourseConfigSetName) {
      let legacyCoursePrefixes = [];
      try {
        const currentCourseConfig = await prisma.courseConfig.findUnique({
          where: { key: 'courses' },
          select: { data: true },
        });
        const activeSetName = String(
          currentCourseConfig?.data?.courseConfigSetName || ''
        ).trim();
        if (activeSetName === normalizedCourseConfigSetName) {
          legacyCoursePrefixes = extractCourseLabelPrefixes(
            currentCourseConfig?.data?.courseTree
          );
        }
      } catch {
        legacyCoursePrefixes = [];
      }

      const legacyCourseFilters = legacyCoursePrefixes.map((prefix) => ({
        course: { startsWith: prefix },
      }));

      where = {
        ...baseWhere,
        OR: [
          { courseConfigSetName: normalizedCourseConfigSetName },
          ...(legacyCourseFilters.length
            ? [{ courseConfigSetName: null, OR: legacyCourseFilters }]
            : []),
        ],
      };
    }

    const currentPage = Math.max(1, Number(page) || 1);

    const totalResults = await prisma.registration.count({ where });
    const totalPages = Math.ceil(totalResults / PAGE_SIZE) || 1;

    const rows = await prisma.registration.findMany({
      where,
      orderBy: [
        { timestamp: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const results = rows.map((row) => ({
      id: row.id || '',
      timestamp: row.timestamp ? row.timestamp.toISOString() : '',
      name: row.name || '',
      course: row.course || '',
      courseId: row.courseId || '',
      courseConfigSetName: row.courseConfigSetName || '',
      startDate: formatDateOnly(row.startDate),
      endDate: formatDateOnly(row.endDate),
      withdrawnAt: formatDateOnly(row.withdrawnAt),
      transferFromId: row.transferFromId || '',
      transferToId: row.transferToId || '',
      transferAt: formatDateOnly(row.transferAt),
      weeks: row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '',
      tuitionFee: row.tuitionFee ?? null,
      excludeMath: !!row.excludeMath,
      recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
      skipWeeks: Array.isArray(row.skipWeeks) ? row.skipWeeks.filter((w) => Number.isInteger(w)) : [],
    }));

    console.log(`[${new Date().toISOString()}] 쿼리 성공. ${results.length}개의 결과 반환`);
    res.json({
      results,
      currentPage,
      totalPages,
      totalResults,
    });
  } catch (error) {
    console.error('API /api/students 처리 중 오류 발생:', error);
    res.status(500).json({
      message: '서버에서 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

// GET /api/students/:id - 단일 기록 조회
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[${new Date().toISOString()}] GET /api/students/${id} 요청`);

  try {
    const row = await prisma.registration.findUnique({ where: { id } });
    if (!row) {
      return res.status(404).json({ status: '실패', message: '해당 ID를 찾을 수 없습니다.' });
    }

    const record = {
      id: row.id || '',
      timestamp: row.timestamp ? row.timestamp.toISOString() : '',
      name: row.name || '',
      course: row.course || '',
      courseId: row.courseId || '',
      courseConfigSetName: row.courseConfigSetName || '',
      startDate: formatDateOnly(row.startDate),
      endDate: formatDateOnly(row.endDate),
      withdrawnAt: formatDateOnly(row.withdrawnAt),
      transferFromId: row.transferFromId || '',
      transferToId: row.transferToId || '',
      transferAt: formatDateOnly(row.transferAt),
      weeks: row.weeks !== null && row.weeks !== undefined ? String(row.weeks) : '',
      tuitionFee: row.tuitionFee ?? null,
      excludeMath: !!row.excludeMath,
      recordingDates: Array.isArray(row.recordingDates) ? row.recordingDates.filter(Boolean) : [],
      skipWeeks: Array.isArray(row.skipWeeks) ? row.skipWeeks.filter((w) => Number.isInteger(w)) : [],
    };

    res.json({ status: '성공', record });
  } catch (error) {
    console.error(`API /api/students/${id} 처리 중 오류:`, error);
    res.status(500).json({ status: '실패', message: '서버에서 오류가 발생했습니다.', error: error.message });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  const newRecords = Array.isArray(req.body) ? req.body : [req.body];
  console.log(`[${new Date().toISOString()}] POST /api/students 요청. Count: ${newRecords.length}`);

  if (newRecords.length === 0) {
    return res.status(400).json({ status: '실패', message: '추가할 데이터가 없습니다.' });
  }

  for (const record of newRecords) {
    if (!record?.name || !record?.course) {
      return res.status(400).json({ status: '실패', message: '모든 기록에 필수 정보(이름, 과목)가 포함되어야 합니다.' });
    }
  }

  try {
    const conditions = newRecords.map((r) => {
      const base = {
        name: r.name,
        courseConfigSetName: normalizeCourseConfigSetName(r.courseConfigSetName),
      };
      const courseId = normalizeCourseId(r.courseId);
      if (courseId) {
        return { ...base, courseId };
      }
      return { ...base, course: r.course };
    });
    const existingRows = await prisma.registration.findMany({
      where: { OR: conditions },
      select: { id: true, name: true, course: true, courseId: true, courseConfigSetName: true },
    });

    const existingByKey = new Map(
      existingRows.map((r) => [
        `${r.courseConfigSetName || ''}||${r.name}||${buildCourseIdentity(r.courseId, r.course)}`,
        r,
      ])
    );

    const duplicates = [];
    for (const newRecord of newRecords) {
      const configSetName = normalizeCourseConfigSetName(newRecord.courseConfigSetName) || '';
      const courseIdentity = buildCourseIdentity(newRecord.courseId, newRecord.course);
      const existing = existingByKey.get(
        `${configSetName}||${newRecord.name}||${courseIdentity}`
      );
      if (existing) {
        duplicates.push({
          name: newRecord.name,
          course: newRecord.course,
          courseId: newRecord.courseId || '',
          courseConfigSetName: configSetName,
          id: existing.id,
        });
      }
    }

    if (duplicates.length > 0) {
      console.log(`[${new Date().toISOString()}] 중복 기록 발견: ${duplicates.length}건`);
      return res.status(200).json({
        status: '중복',
        message: '이미 존재하는 데이터가 포함되어 있어 추가가 취소되었습니다.',
        duplicates,
      });
    }

    const timestamp = new Date();
    const createdIds = [];

    const rowsToCreate = newRecords.map((record) => {
      const id = uuidv4();
      createdIds.push(id);

      return {
        id,
        timestamp,
        name: record.name,
        course: record.course,
        courseId: normalizeCourseId(record.courseId),
        courseConfigSetName: normalizeCourseConfigSetName(record.courseConfigSetName),
        startDate: parseDateOnly(record.startDate),
        endDate: parseDateOnly(record.endDate),
        withdrawnAt: parseDateOnly(record.withdrawnAt),
        weeks: parseWeeks(record.weeks),
        tuitionFee: parseTuitionFee(record.tuitionFee),
        skipWeeks: parseSkipWeeks(record.skipWeeks),
        excludeMath: parseExcludeMath(record.excludeMath),
        recordingDates: normalizeRecordingDates(record.recordingDates),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

    await prisma.registration.createMany({ data: rowsToCreate });

    console.log(`[${new Date().toISOString()}] ${createdIds.length}건 추가 완료.`);
    res.json({ status: '성공', message: '데이터가 추가되었습니다.', ids: createdIds });
  } catch (error) {
    console.error('API /api/students 처리 중 오류 발생:', error);
    res.status(500).json({ status: '실패', message: '서버에서 오류가 발생했습니다.', error: error.message });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateRecord = Array.isArray(req.body) ? req.body[0] : req.body;
  console.log(`[${new Date().toISOString()}] PUT /api/students/${id} 요청`);

  if (!updateRecord || !updateRecord.name || !updateRecord.course) {
    return res.status(400).json({ status: '실패', message: '필수 정보(이름, 과목)가 포함되어야 합니다.' });
  }

  try {
    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ status: '실패', message: '해당 ID를 찾을 수 없습니다.' });
    }

    const timestamp = new Date();
    const hasCourseConfigSetName = Object.prototype.hasOwnProperty.call(
      updateRecord,
      'courseConfigSetName'
    );
    const hasSkipWeeks = Object.prototype.hasOwnProperty.call(updateRecord, 'skipWeeks');
    const hasExcludeMath = Object.prototype.hasOwnProperty.call(updateRecord, 'excludeMath');
    const hasCourseId = Object.prototype.hasOwnProperty.call(updateRecord, 'courseId');
    const hasTuitionFee = Object.prototype.hasOwnProperty.call(updateRecord, 'tuitionFee');
    const hasWithdrawnAt = Object.prototype.hasOwnProperty.call(updateRecord, 'withdrawnAt');
    await prisma.registration.update({
      where: { id },
      data: {
        timestamp,
        name: updateRecord.name,
        course: updateRecord.course,
        ...(hasCourseId ? { courseId: normalizeCourseId(updateRecord.courseId) } : {}),
        ...(hasCourseConfigSetName
          ? { courseConfigSetName: normalizeCourseConfigSetName(updateRecord.courseConfigSetName) }
          : {}),
        startDate: parseDateOnly(updateRecord.startDate),
        endDate: parseDateOnly(updateRecord.endDate),
        weeks: parseWeeks(updateRecord.weeks),
        ...(hasTuitionFee ? { tuitionFee: parseTuitionFee(updateRecord.tuitionFee) } : {}),
        ...(hasWithdrawnAt ? { withdrawnAt: parseDateOnly(updateRecord.withdrawnAt) } : {}),
        ...(hasSkipWeeks ? { skipWeeks: parseSkipWeeks(updateRecord.skipWeeks) } : {}),
        ...(hasExcludeMath ? { excludeMath: parseExcludeMath(updateRecord.excludeMath) } : {}),
        recordingDates: normalizeRecordingDates(updateRecord.recordingDates),
        updatedAt: timestamp,
      },
    });

    console.log(`[${new Date().toISOString()}] ID ${id} 업데이트 완료.`);
    res.json({ status: '성공', message: '업데이트되었습니다.' });
  } catch (error) {
    console.error(`API /api/students/${id} 업데이트 중 오류:`, error);
    res.status(500).json({ status: '실패', message: '서버에서 업데이트 처리 중 오류가 발생했습니다.', error: error.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[${new Date().toISOString()}] DELETE /api/students/${id} 요청`);

  try {
    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) {
      console.log(`[${new Date().toISOString()}] 삭제 대상 ID ${id}를 찾지 못함.`);
      return res.status(404).json({ status: '실패', message: '해당 ID를 찾을 수 없습니다.' });
    }

    await prisma.registration.delete({ where: { id } });

    console.log(`[${new Date().toISOString()}] ID ${id} 삭제 완료.`);
    res.json({ status: '성공', message: '삭제되었습니다.' });
  } catch (error) {
    console.error(`API /api/students/${id} 처리 중 오류:`, error);
    res.status(500).json({ status: '실패', message: '서버에서 삭제 처리 중 오류가 발생했습니다.', error: error.message });
  }
});

module.exports = router;
