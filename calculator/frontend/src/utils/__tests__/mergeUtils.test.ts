import { describe, it, expect } from "vitest"
import {
  getCurrentWeek,
  isWeekInMergeRanges,
  isMergeActiveToday,
  getActiveMergesToday,
  getMergedCourseSet,
  validateNoWeekOverlap,
  getMergeReferenceDate,
  type MergeEntry,
} from "../mergeUtils"

const baseMerge = (overrides: Partial<MergeEntry> = {}): MergeEntry => ({
  id: "1",
  name: "C반",
  courses: ["수학A", "수학B"],
  weekRanges: [],
  isActive: true,
  courseConfigSetName: "간트차트",
  referenceStartDate: "2025-03-03",
  ...overrides,
})

// ===== getCurrentWeek =====
describe("getCurrentWeek", () => {
  it("기준일 당일은 1주차", () => {
    expect(getCurrentWeek("2025-03-03", new Date("2025-03-03"))).toBe(1)
  })

  it("기준일로부터 7일 후는 2주차", () => {
    expect(getCurrentWeek("2025-03-03", new Date("2025-03-10"))).toBe(2)
  })

  it("기준일로부터 6일 후는 아직 1주차", () => {
    expect(getCurrentWeek("2025-03-03", new Date("2025-03-09"))).toBe(1)
  })

  it("기준일 이전이면 0 반환", () => {
    expect(getCurrentWeek("2025-03-03", new Date("2025-03-01"))).toBe(0)
  })

  it("5주차 계산", () => {
    expect(getCurrentWeek("2025-03-03", new Date("2025-03-31"))).toBe(5)
  })
})

// ===== isWeekInMergeRanges =====
describe("isWeekInMergeRanges", () => {
  it("빈 weekRanges면 항상 true (전체 합반)", () => {
    expect(isWeekInMergeRanges([], 5)).toBe(true)
  })

  it("범위 내 주차면 true", () => {
    expect(isWeekInMergeRanges([{ start: 1, end: 3 }], 2)).toBe(true)
  })

  it("범위 밖 주차면 false", () => {
    expect(isWeekInMergeRanges([{ start: 1, end: 3 }], 4)).toBe(false)
  })

  it("여러 범위 중 하나에 포함되면 true", () => {
    const ranges = [{ start: 1, end: 2 }, { start: 6, end: 6 }]
    expect(isWeekInMergeRanges(ranges, 6)).toBe(true)
  })

  it("여러 범위 사이 갭은 false", () => {
    const ranges = [{ start: 1, end: 2 }, { start: 6, end: 6 }]
    expect(isWeekInMergeRanges(ranges, 4)).toBe(false)
  })
})

// ===== isMergeActiveToday =====
describe("isMergeActiveToday", () => {
  it("isActive=false면 비활성", () => {
    const merge = baseMerge({ isActive: false })
    expect(isMergeActiveToday(merge, [], new Date("2025-03-05"))).toBe(false)
  })

  it("referenceStartDate 없으면 비활성", () => {
    const merge = baseMerge({ referenceStartDate: null })
    expect(isMergeActiveToday(merge, [], new Date("2025-03-05"))).toBe(false)
  })

  it("weekRanges 비어있으면 항상 활성 (전체 합반)", () => {
    const merge = baseMerge({ weekRanges: [] })
    expect(isMergeActiveToday(merge, [], new Date("2025-03-05"))).toBe(true)
  })

  it("합반 주차에는 활성", () => {
    const merge = baseMerge({
      weekRanges: [{ start: 1, end: 2 }, { start: 6, end: 6 }],
    })
    expect(isMergeActiveToday(merge, [], new Date("2025-03-05"))).toBe(true) // 1주차
  })

  it("개별 주차에는 비활성", () => {
    const merge = baseMerge({
      weekRanges: [{ start: 1, end: 2 }, { start: 6, end: 6 }],
    })
    expect(isMergeActiveToday(merge, [], new Date("2025-03-17"))).toBe(false) // 3주차
  })

  it("개강 전이면 비활성", () => {
    const merge = baseMerge()
    expect(isMergeActiveToday(merge, [], new Date("2025-03-01"))).toBe(false)
  })
})

// ===== getActiveMergesToday =====
describe("getActiveMergesToday", () => {
  it("오늘 활성인 합반만 필터링", () => {
    const merges = [
      baseMerge({ id: "1", weekRanges: [{ start: 1, end: 2 }] }),
      baseMerge({ id: "2", weekRanges: [{ start: 3, end: 4 }] }),
    ]
    const result = getActiveMergesToday(merges, [], new Date("2025-03-05")) // 1주차
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })
})

// ===== getMergedCourseSet =====
describe("getMergedCourseSet", () => {
  it("활성 합반의 과목 Set 반환", () => {
    const merges = [
      baseMerge({ courses: ["수학A", "수학B"] }),
      baseMerge({ id: "2", courses: ["영어A", "영어B"] }),
    ]
    const set = getMergedCourseSet(merges)
    expect(set.size).toBe(4)
    expect(set.has("수학A")).toBe(true)
    expect(set.has("영어B")).toBe(true)
  })
})

// ===== getMergeReferenceDate =====
describe("getMergeReferenceDate", () => {
  it("API referenceStartDate가 있으면 그걸 사용", () => {
    const merge = baseMerge({ referenceStartDate: "2025-03-03" })
    expect(getMergeReferenceDate(merge, [])).toBe("2025-03-03")
  })

  it("없으면 registrations에서 계산", () => {
    const merge = baseMerge({ referenceStartDate: null })
    const regs = [
      { id: "1", course: "수학A", startDate: "2025-03-10" },
      { id: "2", course: "수학B", startDate: "2025-03-03" },
      { id: "3", course: "영어A", startDate: "2025-02-01" },
    ]
    expect(getMergeReferenceDate(merge, regs)).toBe("2025-03-03")
  })

  it("퇴원 학생은 제외", () => {
    const merge = baseMerge({ referenceStartDate: null })
    const regs = [
      { id: "1", course: "수학A", startDate: "2025-02-01", withdrawnAt: "2025-02-10" },
      { id: "2", course: "수학B", startDate: "2025-03-10" },
    ]
    expect(getMergeReferenceDate(merge, regs)).toBe("2025-03-10")
  })
})

// ===== validateNoWeekOverlap =====
describe("validateNoWeekOverlap", () => {
  it("겹침 없으면 valid", () => {
    const merges = [
      baseMerge({ id: "1", courses: ["수학A", "수학B"], weekRanges: [{ start: 1, end: 3 }] }),
      baseMerge({ id: "2", courses: ["수학A", "수학C"], weekRanges: [{ start: 4, end: 6 }] }),
    ]
    expect(validateNoWeekOverlap(merges).valid).toBe(true)
  })

  it("같은 과목이 같은 주차에 겹치면 invalid", () => {
    const merges = [
      baseMerge({ id: "1", name: "D합반", courses: ["수학A", "수학B"], weekRanges: [{ start: 1, end: 3 }] }),
      baseMerge({ id: "2", name: "E합반", courses: ["수학A", "수학C"], weekRanges: [{ start: 2, end: 4 }] }),
    ]
    const result = validateNoWeekOverlap(merges)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("수학A")
  })

  it("비활성 합반은 검증에서 제외", () => {
    const merges = [
      baseMerge({ id: "1", courses: ["수학A", "수학B"], weekRanges: [{ start: 1, end: 3 }] }),
      baseMerge({ id: "2", courses: ["수학A", "수학C"], weekRanges: [{ start: 2, end: 4 }], isActive: false }),
    ]
    expect(validateNoWeekOverlap(merges).valid).toBe(true)
  })

  it("weekRanges 비어있으면 전체 주차로 간주 → 겹침 발생", () => {
    const merges = [
      baseMerge({ id: "1", courses: ["수학A", "수학B"], weekRanges: [] }),
      baseMerge({ id: "2", courses: ["수학A", "수학C"], weekRanges: [{ start: 1, end: 3 }] }),
    ]
    expect(validateNoWeekOverlap(merges).valid).toBe(false)
  })

  it("다른 과목끼리는 겹쳐도 OK", () => {
    const merges = [
      baseMerge({ id: "1", courses: ["수학A", "수학B"], weekRanges: [{ start: 1, end: 3 }] }),
      baseMerge({ id: "2", courses: ["영어A", "영어B"], weekRanges: [{ start: 1, end: 3 }] }),
    ]
    expect(validateNoWeekOverlap(merges).valid).toBe(true)
  })
})
