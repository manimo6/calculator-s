const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const {
  filterCourseNotes,
  isCourseNoteAllowed,
  loadCourseNoteAccessContext,
  normalizeCourseList,
} = require('../services/courseNoteAccessService');

type CourseNoteRow = {
  id: string
  courseConfigSetName?: string
  category?: string
  courses?: string[]
  course?: string
  title?: string
  content?: string
  tags?: string[]
  author?: string
  updatedBy?: string
  updatedAt?: Date | string | null
}

const router = express.Router();

router.use(authMiddleware());
router.use(requirePermissions('tabs.course_notes'));

// GET /api/course-notes
router.get('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const { category, course, search, courseConfigSetName } = req.query || {};
    const setName = String(courseConfigSetName || '').trim();
    if (!setName) {
      return res.status(400).json({
        status: 'fail',
        message: 'courseConfigSetName is required.',
      });
    }

    const { access, index } = await loadCourseNoteAccessContext(authUser, setName);

    const all: CourseNoteRow[] = await prisma.courseNote.findMany({
      where: { courseConfigSetName: setName },
    });
    const filtered = filterCourseNotes(all, {
      category,
      course,
      search,
      access,
      index,
    });
    res.json({ status: '성공', results: filtered });
  } catch (err) {
    console.error('과목별 메모 조회 오류:', err);
    res.status(500).json({ status: '실패', message: '메모를 불러오지 못했습니다.' });
  }
});

// POST /api/course-notes (Auth Required)
router.post('/', async (req, res) => {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const {
      category,
      courses,
      course,
      title,
      content,
      tags,
      courseConfigSetName,
    } = req.body || {};
    const setName = String(courseConfigSetName || '').trim();
    if (!setName) {
      return res.status(400).json({
        status: 'fail',
        message: 'courseConfigSetName is required.',
      });
    }
    const { access, index } = await loadCourseNoteAccessContext(authUser, setName);
    const courseList = normalizeCourseList(courses, course);
    const categoryKey = String(category || '').trim();
    if (!title) {
      return res.status(400).json({ status: 'fail', message: 'Title is required.' });
    }
    if (!isCourseNoteAllowed({ category: categoryKey, courses: courseList }, access, index)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }
    const now = new Date();

    // 생성자 ID 가져오기
    const author = authUser?.username || '';

    const note: CourseNoteRow = {
      id: uuidv4(),
      courseConfigSetName: setName,
      category: categoryKey,
      courses: courseList,
      title,
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      author, // DB 작성자
      updatedBy: author,
      updatedAt: now,
    };
    await prisma.courseNote.create({ data: note });
    res.json({ status: '성공', note });
  } catch (err) {
    console.error('과목별 메모 생성 오류:', err);
    res.status(500).json({ status: '실패', message: '메모를 생성하지 못했습니다.' });
  }
});

// PUT /api/course-notes/:id (Auth Required)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }

    const {
      category,
      courses,
      course,
      title,
      content,
      tags,
      courseConfigSetName,
    } = req.body || {};
    const setName = String(courseConfigSetName || '').trim();
    if (!setName) {
      return res.status(400).json({
        status: 'fail',
        message: 'courseConfigSetName is required.',
      });
    }
    const { access, index } = await loadCourseNoteAccessContext(authUser, setName);

    const existing: CourseNoteRow | null = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '실패', message: '메모를 찾을 수 없습니다.' });
    if (existing.courseConfigSetName !== setName) {
      return res.status(404).json({ status: 'fail', message: 'Note not found.' });
    }

    const courseList = normalizeCourseList(courses, course, existing.courses || []);
    const normalizedCategory = category !== undefined ? String(category || '').trim() : undefined;
    const finalCategory = normalizedCategory !== undefined ? normalizedCategory : String(existing.category || '').trim();
    if (!isCourseNoteAllowed({ category: finalCategory, courses: courseList }, access, index)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }

    const updated = await prisma.courseNote.update({
      where: { id },
      data: {
        courses: courseList,
        ...(normalizedCategory !== undefined ? { category: normalizedCategory } : {}),
        ...(title ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
        updatedBy: authUser?.username || '',
        // 수정 시 작성자는 변경하지 않음
      },
    });

    res.json({ status: '성공', note: updated });
  } catch (err) {
    console.error('과목별 메모 수정 오류:', err);
    res.status(500).json({ status: '실패', message: '메모를 수정하지 못했습니다.' });
  }
});

// DELETE /api/course-notes/:id (Auth Required)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authUser = await getRequestUser(req);
    if (!authUser) {
      return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
    }
    const setName = String(req.query?.courseConfigSetName || '').trim();
    if (!setName) {
      return res.status(400).json({
        status: 'fail',
        message: 'courseConfigSetName is required.',
      });
    }
    const { access, index } = await loadCourseNoteAccessContext(authUser, setName);

    const existing: CourseNoteRow | null = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '실패', message: '메모를 찾을 수 없습니다.' });
    if (existing.courseConfigSetName !== setName) {
      return res.status(404).json({ status: 'fail', message: 'Note not found.' });
    }
    if (!isCourseNoteAllowed(existing, access, index)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }
    await prisma.courseNote.delete({ where: { id } });
    res.json({ status: '성공' });
  } catch (err) {
    console.error('과목별 메모 삭제 오류:', err);
    res.status(500).json({ status: '실패', message: '메모를 삭제하지 못했습니다.' });
  }
});

module.exports = router;






