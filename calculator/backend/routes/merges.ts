const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');

type WeekRange = { start: number; end: number }
type MergeInput = {
  id?: string | number
  name?: string
  courses?: unknown[]
  weekRanges?: unknown
  isActive?: boolean
  courseConfigSetName?: string
}
type CleanedMerge = {
  id: string
  name: string
  courses: string[]
  weekRanges: WeekRange[]
  isActive: boolean
  courseConfigSetName: string
}

const router = express.Router();

router.use(authMiddleware());

function normalizeWeekRanges(ranges: unknown): WeekRange[] {
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

function rangesOverlap(a: WeekRange[], b: WeekRange[]): boolean {
  for (const ra of a) {
    for (const rb of b) {
      if (ra.start <= rb.end && rb.start <= ra.end) return true;
    }
  }
  return false;
}

function validateNoWeekOverlap(merges: CleanedMerge[]): { valid: boolean; error?: string } {
  const courseMap = new Map<string, Array<{ mergeId: string; mergeName: string; weekRanges: WeekRange[] }>>();
  for (const merge of merges) {
    if (!merge.isActive) continue;
    for (const course of merge.courses) {
      if (!courseMap.has(course)) courseMap.set(course, []);
      courseMap.get(course)!.push({
        mergeId: merge.id,
        mergeName: merge.name,
        weekRanges: merge.weekRanges,
      });
    }
  }
  for (const [course, entries] of courseMap) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        const aRanges = a.weekRanges.length > 0 ? a.weekRanges : [{ start: 1, end: 9999 }];
        const bRanges = b.weekRanges.length > 0 ? b.weekRanges : [{ start: 1, end: 9999 }];
        if (rangesOverlap(aRanges, bRanges)) {
          return {
            valid: false,
            error: `"${course}" 과목이 "${a.mergeName}"과(와) "${b.mergeName}"에서 주차가 겹칩니다.`,
          };
        }
      }
    }
  }
  return { valid: true };
}

// 공유 합반 목록 조회 (referenceStartDate 포함)
router.get('/', requirePermissions('tabs.registrations'), async (_req, res) => {
  try {
    const merges = await prisma.mergeGroup.findMany({
      select: {
        id: true,
        name: true,
        courses: true,
        weekRanges: true,
        isActive: true,
        courseConfigSetName: true,
      },
      orderBy: { id: 'asc' },
    });

    const allCourses = new Set<string>();
    for (const m of merges) {
      for (const c of m.courses) allCourses.add(c);
    }

    let refDateMap = new Map<string, string | null>();
    if (allCourses.size > 0) {
      const rows: Array<{ course: string; minStart: Date | null }> = await prisma.$queryRawUnsafe(
        `SELECT course, MIN("startDate") as "minStart"
         FROM registrations
         WHERE course = ANY($1) AND "withdrawnAt" IS NULL
         GROUP BY course`,
        Array.from(allCourses)
      );
      for (const row of rows) {
        const dateStr = row.minStart
          ? row.minStart.toISOString().slice(0, 10)
          : null;
        refDateMap.set(row.course, dateStr);
      }
    }

    const result = merges.map((m) => {
      let earliest: string | null = null;
      for (const c of m.courses) {
        const d = refDateMap.get(c);
        if (d && (!earliest || d < earliest)) earliest = d;
      }
      return { ...m, referenceStartDate: earliest };
    });

    res.json({ status: '성공', merges: result });
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
    const merges: MergeInput[] = Array.isArray(req.body?.merges) ? req.body.merges : [];
    const cleaned: CleanedMerge[] = merges
      .filter((m) => m && Array.isArray(m.courses) && m.courses.length >= 2)
      .map((m) => ({
        id: String(m.id || Date.now().toString()),
        name: String(m.name || ''),
        courses: Array.from(new Set((m.courses || []).map(String).filter(Boolean))),
        weekRanges: normalizeWeekRanges(m.weekRanges),
        isActive: m.isActive !== false,
        courseConfigSetName: String(m.courseConfigSetName || ''),
      }));

    const overlap = validateNoWeekOverlap(cleaned);
    if (!overlap.valid) {
      return res.status(400).json({ status: '실패', message: overlap.error });
    }

    const now = new Date();
    await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      await tx.mergeGroup.deleteMany();
      if (cleaned.length > 0) {
        await tx.mergeGroup.createMany({
          data: cleaned.map((m) => ({
            id: m.id,
            name: m.name,
            courses: m.courses,
            weekRanges: JSON.parse(JSON.stringify(m.weekRanges)),
            isActive: m.isActive,
            courseConfigSetName: m.courseConfigSetName || null,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    });

    res.json({ status: '성공', merges: cleaned });
  } catch (err) {
    console.error('합반 저장 오류:', err);
    res.status(500).json({ status: '실패', message: '합반 정보를 저장하지 못했습니다.' });
  }
  }
);

module.exports = router;
