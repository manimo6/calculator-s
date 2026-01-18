const express = require('express');
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
    const indexMap = buildCourseConfigSetIndexMap(setRows);
    const index = indexMap.get(setName);
    const courseCategory = course && index
      ? resolveCategoryForCourse({ courseName: course }, index)
      : '';

    const all = await prisma.courseNote.findMany();
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
          const s = search.toLowerCase();
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
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    res.json({ status: '?±ê³µ', results: filtered });
  } catch (err) {
    console.error('ê³¼ëª©ë³?ë©”ëª¨ ì¡°íšŒ ?¤ë¥˜:', err);
    res.status(500).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??' });
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
    const indexMap = buildCourseConfigSetIndexMap(setRows);
    const index = indexMap.get(setName);

    const courseList = Array.isArray(courses)
      ? courses.filter(Boolean)
      : course
        ? [course]
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

    // ?‘ì„±??ID ê°€?¸ì˜¤ê¸?
    const author = authUser?.username || '';

    const note = {
      id: uuidv4(),
      category: categoryKey,
      courses: courseList,
      title,
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      author, // DB ?€??
      updatedBy: author,
      updatedAt: now,
    };
    await prisma.courseNote.create({ data: note });
    res.json({ status: '?±ê³µ', note });
  } catch (err) {
    console.error('ê³¼ëª©ë³?ë©”ëª¨ ?ì„± ?¤ë¥˜:', err);
    res.status(500).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥??€?¥í•˜ì§€ ëª»í–ˆ?µë‹ˆ??' });
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
    const indexMap = buildCourseConfigSetIndexMap(setRows);
    const index = indexMap.get(setName);

    const existing = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.' });

    const courseList = Array.isArray(courses)
      ? courses.filter(Boolean)
      : course
        ? [course]
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
        // ?˜ì • ???‘ì„±?ëŠ” ë³€ê²½í•˜ì§€ ?ŠìŒ
      },
    });

    res.json({ status: '?±ê³µ', note: updated });
  } catch (err) {
    console.error('ê³¼ëª©ë³?ë©”ëª¨ ?˜ì • ?¤ë¥˜:', err);
    res.status(500).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥??˜ì •?˜ì? ëª»í–ˆ?µë‹ˆ??' });
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
    const indexMap = buildCourseConfigSetIndexMap(setRows);
    const index = indexMap.get(setName);

    const existing = await prisma.courseNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.' });
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
    res.json({ status: '?±ê³µ' });
  } catch (err) {
    console.error('ê³¼ëª©ë³?ë©”ëª¨ ?? œ ?¤ë¥˜:', err);
    res.status(500).json({ status: '?¤íŒ¨', message: 'ë©”ëª¨ë¥??? œ?˜ì? ëª»í–ˆ?µë‹ˆ??' });
  }
});

module.exports = router;






