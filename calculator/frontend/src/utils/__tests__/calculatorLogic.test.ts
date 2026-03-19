import { describe, it, expect } from "vitest"
import {
  calculateRecordingFee,
  calculateTotalDays,
  normalizeSkipWeeks,
  normalizeBreakRanges,
  getScheduleWeeks,
  getBreakDateSet,
} from "../calculatorLogic"

// ===== calculateRecordingFee =====
describe("calculateRecordingFee", () => {
  it("녹화 없이 전체 정상 수강", () => {
    const result = calculateRecordingFee(1000000, 20, 0, 0)
    expect(result.recording).toBe(0)
    expect(result.normal).toBe(1000000)
    expect(result.total).toBe(1000000)
  })

  it("녹화일 있을 때 40% 요율 적용", () => {
    const result = calculateRecordingFee(1000000, 10, 3, 0)
    // 녹화: (100000 * 3 * 0.4) = 120000
    // 정상: (100000 * 7 * 1.0) = 700000
    expect(result.recording).toBe(120000)
    expect(result.normal).toBe(700000)
    expect(result.total).toBe(820000)
  })

  it("할인 적용 시 정상일에만 할인", () => {
    const result = calculateRecordingFee(1000000, 10, 2, 0.1)
    // 녹화: (100000 * 2 * 0.4) = 80000
    // 정상: (100000 * 8 * 0.9) = 720000
    expect(result.recording).toBe(80000)
    expect(result.normal).toBe(720000)
    expect(result.total).toBe(800000)
  })

  it("7일 기준 나눗셈에서도 Math.round로 정수 반환", () => {
    const result = calculateRecordingFee(1000000, 7, 3, 0)
    expect(Number.isInteger(result.recording)).toBe(true)
    expect(Number.isInteger(result.normal)).toBe(true)
    expect(Number.isInteger(result.total)).toBe(true)
  })

  it("전체 녹화일 경우", () => {
    const result = calculateRecordingFee(500000, 5, 5, 0)
    // 녹화: (100000 * 5 * 0.4) = 200000
    // 정상: 0
    expect(result.recording).toBe(200000)
    expect(result.normal).toBe(0)
    expect(result.total).toBe(200000)
  })
})

// ===== calculateTotalDays =====
describe("calculateTotalDays", () => {
  it("주 5일 × 4주", () => {
    expect(calculateTotalDays([1, 2, 3, 4, 5], 5, 4)).toBe(20)
  })

  it("주 3일 × 2주", () => {
    expect(calculateTotalDays([1, 3, 5], 5, 2)).toBe(6)
  })

  it("endDay가 정의되면 마지막 주 일수 조정", () => {
    // days=[1,2,3,4,5], endDay=3 → endDayIndex=2, daysInLastWeek=3
    // period=2: (2-1)*5 + 3 = 8
    expect(calculateTotalDays([1, 2, 3, 4, 5], 3, 2)).toBe(8)
  })

  it("period 0이면 0 반환", () => {
    expect(calculateTotalDays([1, 2, 3], 3, 0)).toBe(0)
  })

  it("빈 courseDays면 0 반환", () => {
    expect(calculateTotalDays([], 5, 4)).toBe(0)
  })

  it("endDay 미정의면 전체 주 × 일수", () => {
    expect(calculateTotalDays([1, 3, 5], undefined, 3)).toBe(9)
  })
})

// ===== normalizeSkipWeeks =====
describe("normalizeSkipWeeks", () => {
  it("null 입력 시 빈 배열", () => {
    expect(normalizeSkipWeeks(null, 4)).toEqual([])
  })

  it("1주차는 스킵 불가 (필터링됨)", () => {
    expect(normalizeSkipWeeks([1, 2, 3], 4)).toEqual([2, 3])
  })

  it("중복 제거", () => {
    expect(normalizeSkipWeeks([2, 2, 3, 3], 4)).toEqual([2, 3])
  })

  it("period 초과 주차 제거", () => {
    // period=2, skip=[2,3] → maxWeek = 2 + skip.length
    // 반복 수렴: 처음 maxWeek=4 → [2,3] 유지, maxWeek=4 → 변화없음 → 끝
    const result = normalizeSkipWeeks([2, 3, 10], 2)
    expect(result).toEqual([2, 3])
  })

  it("문자열 입력도 처리", () => {
    expect(normalizeSkipWeeks(["2", "3"], 4)).toEqual([2, 3])
  })
})

// ===== normalizeBreakRanges =====
describe("normalizeBreakRanges", () => {
  it("null 입력 시 빈 배열", () => {
    expect(normalizeBreakRanges(null)).toEqual([])
  })

  it("유효한 범위 정규화", () => {
    const result = normalizeBreakRanges([
      { startDate: "2025-03-10", endDate: "2025-03-14" },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].startDate).toBe("2025-03-10")
    expect(result[0].endDate).toBe("2025-03-14")
  })

  it("start > end 이면 자동 스왑", () => {
    const result = normalizeBreakRanges([
      { startDate: "2025-03-14", endDate: "2025-03-10" },
    ])
    expect(result[0].startDate).toBe("2025-03-10")
    expect(result[0].endDate).toBe("2025-03-14")
  })

  it("잘못된 날짜는 필터링", () => {
    const result = normalizeBreakRanges([
      { startDate: "invalid", endDate: "2025-03-14" },
    ])
    expect(result).toHaveLength(0)
  })
})

// ===== getBreakDateSet =====
describe("getBreakDateSet", () => {
  it("범위 내 수업일에 해당하는 날짜만 반환", () => {
    const result = getBreakDateSet({
      startDate: "2025-03-03", // 월요일
      endDate: "2025-03-14",   // 금요일
      courseDays: [1, 3, 5],   // 월, 수, 금
      breakRanges: [{ startDate: "2025-03-10", endDate: "2025-03-14" }],
    })
    // 3/10(월), 3/12(수), 3/14(금)
    expect(result.size).toBe(3)
    expect(result.has("2025-03-10")).toBe(true)
    expect(result.has("2025-03-12")).toBe(true)
    expect(result.has("2025-03-14")).toBe(true)
  })

  it("break range가 없으면 빈 Set", () => {
    const result = getBreakDateSet({
      startDate: "2025-03-03",
      endDate: "2025-03-14",
      courseDays: [1, 3, 5],
    })
    expect(result.size).toBe(0)
  })
})

// ===== getScheduleWeeks =====
describe("getScheduleWeeks", () => {
  it("skipWeeks 없이 기본 스케줄", () => {
    const result = getScheduleWeeks({
      startDate: "2025-03-03",
      durationWeeks: 4,
      courseDays: [1, 2, 3, 4, 5],
    })
    expect(result.scheduleWeeks).toBe(4)
    expect(result.skipWeeks).toEqual([])
  })

  it("skipWeeks 포함 시 scheduleWeeks 증가", () => {
    const result = getScheduleWeeks({
      startDate: "2025-03-03",
      durationWeeks: 4,
      skipWeeks: [2],
      courseDays: [1, 2, 3, 4, 5],
    })
    expect(result.scheduleWeeks).toBe(5)
    expect(result.skipWeeks).toEqual([2])
  })
})
