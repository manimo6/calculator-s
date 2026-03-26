const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { PAGE_SIZE } = require('../config');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateStudentQuery,
  validateStudentBody,
  validateStudentUpdate,
} = require('../validators/studentValidator');
const { getSafeErrorMessage } = require('../utils/apiError');
const { formatDateOnly, parseDateOnly, normalizeCourseId, normalizeCourseConfigSetName } = require('../utils/dateUtils');
const {
  parseWeeks,
  parseTuitionFee,
  parseSkipWeeks,
  normalizeRecordingDates,
  parseExcludeMath,
} = require('../utils/parsers');
const {
  buildCourseIdentity,
  buildExistingStudentMap,
  buildStudentCreateRows,
  buildStudentUpdateData,
  buildStudentWhereClause,
  findStudentDuplicates,
  formatStudentRecord,
  formatStudentResults,
} = require('../services/studentRouteService');

type RegistrationRow = {
  id?: string
  name?: string
  course?: string
  courseId?: string
  courseConfigSetName?: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  withdrawnAt?: Date | string | null
  transferFromId?: string | null
  transferToId?: string | null
  transferAt?: Date | string | null
  weeks?: number | null
  tuitionFee?: number | null
  excludeMath?: boolean
  recordingDates?: unknown[]
  skipWeeks?: unknown[]
  timestamp?: Date | null
}

const router = express.Router();

router.use(authMiddleware());

// GET /api/students
router.get('/', validateStudentQuery, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/students 요청. Query:`, req.query);
  try {
    const { page = 1, searchTerm = '', courseConfigSetName = '' } = req.query;
    const normalizedSearchTerm = String(searchTerm || '').trim();
    const normalizedCourseConfigSetName = String(courseConfigSetName || '').trim();

    const where = await buildStudentWhereClause({
      searchTerm: normalizedSearchTerm,
      courseConfigSetName: normalizedCourseConfigSetName,
    });

    const currentPage = Math.max(1, Number(page) || 1);

    const totalResults = await prisma.registration.count({ where });
    const totalPages = Math.ceil(totalResults / PAGE_SIZE) || 1;

    const rows: RegistrationRow[] = await prisma.registration.findMany({
      where,
      orderBy: [
        { timestamp: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const results = formatStudentResults(rows);

    console.log(`[${new Date().toISOString()}] 쿼리 성공. ${results.length}개의 결과 반환`);
    res.json({
      results,
      currentPage,
      totalPages,
      totalResults,
    });
  } catch (error) {
    const message = getSafeErrorMessage(error, '서버에서 오류가 발생했습니다.');
    console.error('API /api/students 처리 중 오류 발생:', error);
    res.status(500).json({
      message,
      error: message,
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

    const record = formatStudentRecord(row);

    res.json({ status: '성공', record });
  } catch (error) {
    const message = getSafeErrorMessage(error, '서버에서 오류가 발생했습니다.');
    console.error(`API /api/students/${id} 처리 중 오류:`, error);
    res.status(500).json({ status: '실패', message, error: message });
  }
});

// POST /api/students
router.post('/', ...validateStudentBody, async (req, res) => {
  type StudentRecord = Record<string, unknown> & {
    name?: string
    course?: string
    courseId?: string
    courseConfigSetName?: string
    startDate?: unknown
    endDate?: unknown
    withdrawnAt?: unknown
    weeks?: unknown
    tuitionFee?: unknown
    skipWeeks?: unknown
    excludeMath?: unknown
    recordingDates?: unknown
  }

  const newRecords: StudentRecord[] = Array.isArray(req.body) ? req.body : [req.body];
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
    const conditions = newRecords.map((r: StudentRecord) => {
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
    const existingRows: RegistrationRow[] = await prisma.registration.findMany({
      where: { OR: conditions },
      select: { id: true, name: true, course: true, courseId: true, courseConfigSetName: true },
    });

    const existingByKey = buildExistingStudentMap(existingRows);
    const duplicates = findStudentDuplicates(newRecords, existingByKey);

    if (duplicates.length > 0) {
      console.log(`[${new Date().toISOString()}] 중복 기록 발견: ${duplicates.length}건`);
      return res.status(200).json({
        status: '중복',
        message: '이미 존재하는 데이터가 포함되어 있어 추가가 취소되었습니다.',
        duplicates,
      });
    }

    const timestamp = new Date();
    const { createdIds, rowsToCreate } = buildStudentCreateRows(newRecords, timestamp);

    await prisma.registration.createMany({ data: rowsToCreate });

    console.log(`[${new Date().toISOString()}] ${createdIds.length}건 추가 완료.`);
    res.json({ status: '성공', message: '데이터가 추가되었습니다.', ids: createdIds });
  } catch (error) {
    const message = getSafeErrorMessage(error, '서버에서 오류가 발생했습니다.');
    console.error('API /api/students 처리 중 오류 발생:', error);
    res.status(500).json({ status: '실패', message, error: message });
  }
});

// PUT /api/students/:id
router.put('/:id', validateStudentUpdate, async (req, res) => {
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

    if (existing.transferFromId || existing.transferToId) {
      return res.status(400).json({ status: '실패', message: '전반 이력이 있는 등록은 수정할 수 없습니다. 전반취소 후 다시 등록해 주세요.' });
    }

    const timestamp = new Date();
    await prisma.registration.update({
      where: { id },
      data: buildStudentUpdateData(updateRecord, timestamp),
    });

    console.log(`[${new Date().toISOString()}] ID ${id} 업데이트 완료.`);
    res.json({ status: '성공', message: '업데이트되었습니다.' });
  } catch (error) {
    const message = getSafeErrorMessage(error, '서버에서 업데이트 처리 중 오류가 발생했습니다.');
    console.error(`API /api/students/${id} 업데이트 중 오류:`, error);
    res.status(500).json({ status: '실패', message, error: message });
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

    if (existing.transferFromId || existing.transferToId) {
      return res.status(400).json({ status: '실패', message: '전반 이력이 있는 등록은 삭제할 수 없습니다. 전반취소를 이용해 주세요.' });
    }

    await prisma.registration.delete({ where: { id } });

    console.log(`[${new Date().toISOString()}] ID ${id} 삭제 완료.`);
    res.json({ status: '성공', message: '삭제되었습니다.' });
  } catch (error) {
    const message = getSafeErrorMessage(error, '서버에서 삭제 처리 중 오류가 발생했습니다.');
    console.error(`API /api/students/${id} 처리 중 오류:`, error);
    res.status(500).json({ status: '실패', message, error: message });
  }
});

module.exports = router;
