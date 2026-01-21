const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { v4: uuidv4 } = require('uuid');
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

    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const accessPromise = bypassCategoryAccess
      ? Promise.resolve([])
      : prisma.userCategoryAccess.findMany({
          where: { userId: authUser.id, courseConfigSetName: setName },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const setPromise = prisma.courseConfigSet.findMany({
      where: { name: { in: [setName] } },
      select: { name: true, data: true },
    });
    const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
    const access = getAccessForSet(
      buildCategoryAccessMap(accessRows),
      setName,
      bypassCategoryAccess
    );
    const indexMap = buildCourseConfigSetIndexMap(
      setRows as Array<{ name?: string; data?: Record<string, unknown> }>
    );
    const index = indexMap.get(setName);
    const courseCategory = course && index
      ? resolveCategoryForCourse({ courseName: course }, index)
      : '';

    const all: CourseNoteRow[] = await prisma.courseNote.findMany({
      where: { courseConfigSetName: setName },
    });
    const filtered = all
      .map((n) => ({
        ...n,
        courses: Array.isArray(n.courses)
          ? n.courses
          : n.course
            ? [n.course]
            : [],
      }))
      .filter((n) => {
        if (category && n.category !== category) return false;
        if (!isCategoryAllowed(n.category, access)) return false;
        if (course && !n.courses.includes(course)) {
          if (n.courses.length === 0) {
            if (!category && (!courseCategory || n.category !== courseCategory)) {
              return false;
            }
          } else {
            return false;
          }
        }
        if (search) {
          const s = String(search).toLowerCase();
          const hay = `${n.title || ''} ${n.content || ''} ${Array.isArray(n.tags) ? n.tags.join(' ') : ''}`.toLowerCase();
          if (!hay.includes(s)) return false;
        }
        if (index && Array.isArray(n.courses) && n.courses.length) {
          const deniedCourse = n.courses.find((c) => {
            const mappedCategory = resolveCategoryForCourse({ courseName: c }, index);
            return !isCategoryAllowed(mappedCategory, access);
          });
          if (deniedCourse) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
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
    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const accessPromise = bypassCategoryAccess
      ? Promise.resolve([])
      : prisma.userCategoryAccess.findMany({
          where: { userId: authUser.id, courseConfigSetName: setName },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const setPromise = prisma.courseConfigSet.findMany({
      where: { name: { in: [setName] } },
      select: { name: true, data: true },
    });
    const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
    const access = getAccessForSet(buildCategoryAccessMap(accessRows), setName, bypassCategoryAccess);
    const indexMap = buildCourseConfigSetIndexMap(
      setRows as Array<{ name?: string; data?: Record<string, unknown> }>
    );
    const index = indexMap.get(setName);

    const courseList = Array.isArray(courses)
      ? courses.filter(Boolean).map(String)
      : course
        ? [String(course)]
        : [];
    const categoryKey = String(category || '').trim();
    if (!title) {
      return res.status(400).json({ status: 'fail', message: 'Title is required.' });
    }
    if (categoryKey && !isCategoryAllowed(categoryKey, access)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }
    if (index && courseList.length) {
      const deniedCourse = courseList.find((c) => {
        const mappedCategory = resolveCategoryForCourse({ courseName: c }, index);
        return !isCategoryAllowed(mappedCategory, access);
      });
      if (deniedCourse) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }
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
    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const accessPromise = bypassCategoryAccess
      ? Promise.resolve([])
      : prisma.userCategoryAccess.findMany({
          where: { userId: authUser.id, courseConfigSetName: setName },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const setPromise = prisma.courseConfigSet.findMany({
      where: { name: { in: [setName] } },
      select: { name: true, data: true },
    });
    const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
    const access = getAccessForSet(buildCategoryAccessMap(accessRows), setName, bypassCategoryAccess);
    const indexMap = buildCourseConfigSetIndexMap(
      setRows as Array<{ name?: string; data?: Record<string, unknown> }>
    );
    const index = indexMap.get(setName);

    const existing: CourseNoteRow | null = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '실패', message: '메모를 찾을 수 없습니다.' });
    if (existing.courseConfigSetName !== setName) {
      return res.status(404).json({ status: 'fail', message: 'Note not found.' });
    }

    const courseList = Array.isArray(courses)
      ? courses.filter(Boolean).map(String)
      : course
        ? [String(course)]
        : existing.courses || [];
    const normalizedCategory = category !== undefined ? String(category || '').trim() : undefined;
    const finalCategory = normalizedCategory !== undefined ? normalizedCategory : String(existing.category || '').trim();
    if (finalCategory && !isCategoryAllowed(finalCategory, access)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }
    if (index && courseList.length) {
      const deniedCourse = courseList.find((c) => {
        const mappedCategory = resolveCategoryForCourse({ courseName: c }, index);
        return !isCategoryAllowed(mappedCategory, access);
      });
      if (deniedCourse) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }
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
    const bypassCategoryAccess = isCategoryAccessBypassed(authUser);
    const accessPromise = bypassCategoryAccess
      ? Promise.resolve([])
      : prisma.userCategoryAccess.findMany({
          where: { userId: authUser.id, courseConfigSetName: setName },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const setPromise = prisma.courseConfigSet.findMany({
      where: { name: { in: [setName] } },
      select: { name: true, data: true },
    });
    const [accessRows, setRows] = await Promise.all([accessPromise, setPromise]);
    const access = getAccessForSet(buildCategoryAccessMap(accessRows), setName, bypassCategoryAccess);
    const indexMap = buildCourseConfigSetIndexMap(
      setRows as Array<{ name?: string; data?: Record<string, unknown> }>
    );
    const index = indexMap.get(setName);

    const existing: CourseNoteRow | null = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '실패', message: '메모를 찾을 수 없습니다.' });
    if (existing.courseConfigSetName !== setName) {
      return res.status(404).json({ status: 'fail', message: 'Note not found.' });
    }
    if (!isCategoryAllowed(existing.category, access)) {
      return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
    }
    if (index && Array.isArray(existing.courses) && existing.courses.length) {
      const deniedCourse = existing.courses.find((c) => {
        const mappedCategory = resolveCategoryForCourse({ courseName: c }, index);
        return !isCategoryAllowed(mappedCategory, access);
      });
      if (deniedCourse) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }
    }
    await prisma.courseNote.delete({ where: { id } });
    res.json({ status: '성공' });
  } catch (err) {
    console.error('과목별 메모 삭제 오류:', err);
    res.status(500).json({ status: '실패', message: '메모를 삭제하지 못했습니다.' });
  }
});

module.exports = router;






