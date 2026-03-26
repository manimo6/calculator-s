import { describe, expect, it } from "vitest"

import {
  buildInstallmentNoticeText,
  formatInstallmentDateRange,
  formatInstallmentFee,
} from "./installmentBoardNotice"

describe("installmentBoardNotice", () => {
  it("formats installment fee safely", () => {
    expect(formatInstallmentFee(120000)).toBe("120,000\uC6D0")
    expect(formatInstallmentFee("")).toBe("-")
    expect(formatInstallmentFee("oops")).toBe("-")
  })

  it("formats date range only when both dates are valid", () => {
    expect(formatInstallmentDateRange("2026-03-01", "2026-03-31")).toContain("~")
    expect(formatInstallmentDateRange("", "2026-03-31")).toBe("-")
  })

  it("builds notice text with optional caution block", () => {
    const text = buildInstallmentNoticeText({
      name: "\uD64D\uAE38\uB3D9",
      course: "\uAD6D\uC5B4",
      rangeLabel: "3\uC6D4 1\uC77C~3\uC6D4 31\uC77C",
      weeks: 4,
      fee: 120000,
      includeCaution: false,
    })
    expect(text).toContain("[\uBD84\uD560 \uC5F0\uC7A5 \uC548\uB0B4]")
    expect(text).toContain("\uD559\uC0DD \uC774\uB984: \uD64D\uAE38\uB3D9")
    expect(text).toContain("\uC5F0\uC7A5 \uC8FC\uC218: 4\uC8FC")

    const withCaution = buildInstallmentNoticeText({
      name: "\uD64D\uAE38\uB3D9",
      course: "\uAD6D\uC5B4",
      rangeLabel: "3\uC6D4 1\uC77C~3\uC6D4 31\uC77C",
      weeks: 4,
      fee: 120000,
      includeCaution: true,
    })
    expect(withCaution).toContain("\uACC4\uC88C")
  })
})
