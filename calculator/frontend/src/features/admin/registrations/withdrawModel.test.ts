import { describe, expect, it } from "vitest"

import {
  getDefaultWithdrawDate,
  getRestoreConfirmMessage,
  getWithdrawSaveValidationError,
} from "./withdrawModel"

describe("withdrawModel", () => {
  it("uses withdrawnAt first when present", () => {
    expect(
      getDefaultWithdrawDate(
        { withdrawnAt: "2026-03-22" },
        new Date("2026-03-24T00:00:00")
      )
    ).toBe("2026-03-22")
  })

  it("falls back to today when there is no withdrawnAt", () => {
    expect(getDefaultWithdrawDate({}, new Date("2026-03-24T00:00:00"))).toBe("2026-03-24")
  })

  it("validates withdrawal save prerequisites", () => {
    expect(getWithdrawSaveValidationError({ target: { id: "r1" }, date: "" })).not.toBe("")
    expect(getWithdrawSaveValidationError({ target: { name: "홍길동" }, date: "2026-03-24" })).not.toBe("")
    expect(getWithdrawSaveValidationError({ target: { id: "r1" }, date: "2026-03-24" })).toBe("")
  })

  it("builds restore confirm copy from the registration name", () => {
    expect(getRestoreConfirmMessage({ name: "김학생" })).toContain("김학생")
  })
})
