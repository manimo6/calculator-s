const express = require('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware());

function normalizeWeekRanges(ranges) {
  if (!Array.isArray(ranges)) return [];
  const cleaned = ranges
    .map((range) => ({
      start: Number(range?.start),
      end: Number(range?.end),
    }))
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 1 &&
        range.end >= range.start
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);
  return cleaned;
}

// 공유 합반 목록 조회
router.get('/', requirePermissions('tabs.registrations'), async (_req, res) => {
  try {
    const merges = await prisma.mergeGroup.findMany({
      select: { id: true, name: true, courses: true, weekRanges: true },
      orderBy: { id: 'asc' },
    });
    res.json({ status: '성공', merges });
  } catch (err) {
    console.error('합반 조회 오류:', err);
    res.status(500).json({ status: '실패', message: '합반 목록을 불러오지 못했습니다.' });
  }
});

// 전체 합반 목록 저장 (덮어쓰기)
router.put(
  '/',
  requirePermissions(['tabs.registrations', 'registrations.merges.manage']),
  async (req, res) => {
  try {
    const merges = Array.isArray(req.body?.merges) ? req.body.merges : [];
    const cleaned = merges
      .filter(m => m && Array.isArray(m.courses) && m.courses.length >= 2)
      .map(m => ({
        id: m.id || Date.now().toString(),
        name: m.name || '',
        courses: Array.from(new Set(m.courses.filter(Boolean))),
        weekRanges: normalizeWeekRanges(m.weekRanges),
      }));
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.mergeGroup.deleteMany();
      if (cleaned.length > 0) {
        await tx.mergeGroup.createMany({
          data: cleaned.map((m) => ({
            id: String(m.id),
            name: String(m.name || ''),
            courses: Array.from(new Set((m.courses || []).map(String).filter(Boolean))),
            weekRanges: Array.isArray(m.weekRanges) ? m.weekRanges : [],
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    });

    const saved = cleaned;
    res.json({ status: '성공', merges: saved });
  } catch (err) {
    console.error('합반 저장 오류:', err);
    res.status(500).json({ status: '실패', message: '합반 정보를 저장하지 못했습니다.' });
  }
  }
);

module.exports = router;
