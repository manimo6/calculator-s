/**
 * 기존 등록 데이터의 discount 필드를 역산으로 채우는 일회성 스크립트.
 *
 * 실행: npx ts-node scripts/backfillDiscount.ts
 *
 * 로직:
 *   1. CourseConfigSet에서 courseInfo.fee (주당 수강료) 조회
 *   2. registration.tuitionFee와 비교하여 할인율 역산
 *   3. 0%, 5%, 10%, 15%, 20%, 25% 중 가장 가까운 값으로 저장
 */

const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const prisma = new PrismaClient();

const DISCOUNT_OPTIONS = [0, 0.05, 0.1, 0.15, 0.2, 0.25];

type CourseInfoEntry = { fee?: number; days?: number[]; endDay?: number; name?: string };
type CourseInfoMap = Record<string, CourseInfoEntry | undefined>;
type CourseTreeItem = { val: string; label: string };
type CourseTreeGroup = { cat: string; items: CourseTreeItem[] };

function buildFeeMap(data: unknown): Map<string, { weeklyFee: number; label: string }> {
  const map = new Map<string, { weeklyFee: number; label: string }>();
  if (!data || typeof data !== "object") return map;
  const d = data as Record<string, unknown>;
  const courseInfo = (d.courseInfo || {}) as CourseInfoMap;
  const courseTree = (d.courseTree || []) as CourseTreeGroup[];

  // courseTree label → val → courseInfo.fee
  for (const group of courseTree) {
    for (const item of group.items || []) {
      const info = courseInfo[item.val];
      if (info?.fee && info.fee > 0) {
        map.set(item.val, { weeklyFee: info.fee, label: item.label });
      }
    }
  }
  // courseInfo 직접 키도 추가
  for (const [key, info] of Object.entries(courseInfo)) {
    if (info?.fee && info.fee > 0 && !map.has(key)) {
      map.set(key, { weeklyFee: info.fee, label: info.name || key });
    }
  }
  return map;
}

function findWeeklyFee(
  courseId: string | null,
  courseName: string | null,
  feeMap: Map<string, { weeklyFee: number; label: string }>
): number | null {
  // courseId로 직접 조회
  if (courseId && feeMap.has(courseId)) {
    return feeMap.get(courseId)!.weeklyFee;
  }
  // courseName으로 longest prefix match
  if (!courseName) return null;
  let bestFee: number | null = null;
  let bestLen = 0;
  feeMap.forEach((entry) => {
    if (courseName.startsWith(entry.label) && entry.label.length > bestLen) {
      bestFee = entry.weeklyFee;
      bestLen = entry.label.length;
    }
  });
  return bestFee;
}

function closestDiscount(raw: number): number {
  let best = 0;
  let bestDiff = Math.abs(raw - 0);
  for (const d of DISCOUNT_OPTIONS) {
    const diff = Math.abs(raw - d);
    if (diff < bestDiff) {
      best = d;
      bestDiff = diff;
    }
  }
  return best;
}

function reverseDiscount(
  tuitionFee: number,
  weeklyFee: number,
  weeks: number,
  recordingDays: number,
  totalDays: number
): number {
  const baseFee = weeklyFee * weeks;
  if (baseFee <= 0) return 0;

  if (recordingDays > 0 && recordingDays < totalDays) {
    // calculateRecordingFee 역산:
    // total = recordingCost + normalCost
    // recordingCost = dailyFee * recordingDays * 0.4
    // normalCost = dailyFee * normalDays * (1 - discount)
    const dailyFee = baseFee / totalDays;
    const recordingCost = dailyFee * recordingDays * 0.4;
    const normalDays = totalDays - recordingDays;
    const normalCost = tuitionFee - recordingCost;
    if (normalDays > 0 && dailyFee > 0) {
      const oneMinusDiscount = normalCost / (dailyFee * normalDays);
      const rawDiscount = 1 - oneMinusDiscount;
      return closestDiscount(rawDiscount);
    }
  }

  // 녹화 없는 경우: tuitionFee = baseFee * (1 - discount)
  const rawDiscount = 1 - tuitionFee / baseFee;
  return closestDiscount(rawDiscount);
}

async function main() {
  console.log("=== Backfill Discount ===");

  // 1. 모든 CourseConfigSet 로드
  const configSets = await prisma.courseConfigSet.findMany();
  const configMap = new Map<string, Map<string, { weeklyFee: number; label: string }>>();
  for (const cs of configSets) {
    configMap.set(cs.name, buildFeeMap(cs.data));
  }

  // 2. discount = 0인 등록만 대상
  const registrations = await prisma.registration.findMany({
    where: { discount: 0 },
    select: {
      id: true,
      courseId: true,
      course: true,
      courseConfigSetName: true,
      tuitionFee: true,
      weeks: true,
      recordingDates: true,
    },
  });

  console.log(`대상 등록: ${registrations.length}건`);

  let updated = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const tuitionFee = reg.tuitionFee;
    const weeks = reg.weeks;
    if (!tuitionFee || !weeks || weeks <= 0) {
      skipped++;
      continue;
    }

    // courseConfigSet에서 weeklyFee 찾기
    const feeMap = configMap.get(reg.courseConfigSetName || "") || new Map();
    const weeklyFee = findWeeklyFee(reg.courseId, reg.course, feeMap);
    if (!weeklyFee) {
      skipped++;
      continue;
    }

    const recordingDays = Array.isArray(reg.recordingDates) ? reg.recordingDates.length : 0;
    // totalDays 근사값: weeks × 5 (주 5일 기본). courseInfo.days가 없어서 근사.
    // 정확한 계산은 어렵지만 할인율 역산에는 충분.
    const totalDays = weeks * 5;

    const discount = reverseDiscount(tuitionFee, weeklyFee, weeks, recordingDays, totalDays);

    if (discount > 0) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { discount },
      });
      updated++;
      console.log(
        `  [${reg.course}] ${reg.id.slice(0, 8)}... fee=${tuitionFee} weekly=${weeklyFee} weeks=${weeks} → discount=${Math.round(discount * 100)}%`
      );
    } else {
      skipped++;
    }
  }

  console.log(`\n완료: ${updated}건 업데이트, ${skipped}건 스킵`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
