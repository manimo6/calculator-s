import { describe, expect, it } from "vitest"

import {
  buildInstallmentNoticeText,
  formatInstallmentDateRange,
  formatInstallmentFee,
} from "./installmentBoardNotice"

describe("installmentBoardNotice", () => {
  it("formats installment fee safely", () => {
    expect(formatInstallmentFee(120000)).toBe("120,000원")
    expect(formatInstallmentFee("")).toBe("-")
    expect(formatInstallmentFee("oops")).toBe("-")
  })

  it("formats date range only when both dates are valid", () => {
    expect(formatInstallmentDateRange("2026-03-01", "2026-03-31")).toContain("~")
    expect(formatInstallmentDateRange("", "2026-03-31")).toBe("-")
  })

  it("builds notice text with optional caution block", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 120000,
      includeCaution: false,
    })
    expect(text).toContain("[분할 연장 안내]")
    expect(text).toContain("학생 이름: 홍길동")
    expect(text).toContain("연장 주수: 4주")
    expect(text).toContain("120,000원")

    const withCaution = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 120000,
      includeCaution: true,
    })
    expect(withCaution).toContain("계좌")
  })

  it("includes skip period lines when skipWeeks and startDate provided", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~4월 30일",
      weeks: 4,
      fee: 120000,
      includeCaution: false,
      skipWeeks: [2, 3],
      startDate: "2026-03-02",
    })
    expect(text).toContain("미등록기간")
  })

  it("does not include skip lines when skipWeeks is empty", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 120000,
      includeCaution: false,
      skipWeeks: [],
      startDate: "2026-03-02",
    })
    expect(text).not.toContain("미등록기간")
  })

  it("includes recording dates in notice text", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 100000,
      includeCaution: false,
      recordingDates: ["2026-03-10", "2026-03-12"],
    })
    expect(text).toContain("녹화수강일")
  })

  it("shows fee breakdown when recording fee info is provided", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 100000,
      includeCaution: false,
      recordingDates: ["2026-03-10", "2026-03-12"],
      normalFee: 72000,
      recordingFee: 16000,
      totalDays: 20,
      recordingDays: 2,
    })
    expect(text).toContain("실시간수업(18일)")
    expect(text).toContain("72,000원")
    expect(text).toContain("녹화 (정가의 40%)(2일)")
    expect(text).toContain("16,000원")
    expect(text).toContain("합계")
  })

  it("falls back to simple fee when no recording breakdown", () => {
    const text = buildInstallmentNoticeText({
      name: "홍길동",
      course: "국어",
      rangeLabel: "3월 1일~3월 31일",
      weeks: 4,
      fee: 120000,
      includeCaution: false,
    })
    expect(text).toContain("연장 수강료: 120,000원")
    expect(text).not.toContain("합계")
  })
})
