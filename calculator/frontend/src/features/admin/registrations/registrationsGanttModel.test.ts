import { describe, expect, it } from "vitest"

import { formatDateYmd } from "./utils"
import {
  adjustEndToLastClassDay,
  buildRegistrationsGanttModel,
  buildWeekTotals,
  buildWeeks,
  formatDateKorean,
} from "./registrationsGanttModel"

describe("registrationsGanttModel", () => {
  it("formats Korean dates with weekday labels", () => {
    const date = new Date("2026-03-04T00:00:00")
    expect(formatDateKorean(date)).toBe("3\uC6D4 4\uC77C (\uC218)")
  })

  it("adjusts the end date to the last class day in the same week", () => {
    const adjusted = adjustEndToLastClassDay("2026-03-06", [1, 3])
    expect(formatDateYmd(adjusted)).toBe("2026-03-04")
  })

  it("builds week buckets from class-day schedules", () => {
    const weeks = buildWeeks("2026-03-02", "2026-03-18", [1, 3])

    expect(weeks).toHaveLength(3)
    expect(formatDateYmd(weeks[0].start)).toBe("2026-03-02")
    expect(formatDateYmd(weeks[0].end)).toBe("2026-03-04")
    expect(formatDateYmd(weeks[2].start)).toBe("2026-03-16")
    expect(formatDateYmd(weeks[2].end)).toBe("2026-03-18")
  })

  it("keeps weekly totals and transferred counts stable", () => {
    const registrations = [
      {
        id: "active",
        name: "\uD64D\uAE38\uB3D9",
        course: "\uC911\uB4F1\uC218\uD559",
        startDate: "2026-03-02",
        endDate: "2026-03-18",
        weeks: 3,
        skipWeeks: [2],
      },
      {
        id: "transfer",
        name: "\uAE40\uC804\uBC18",
        course: "\uC911\uB4F1\uC218\uD559",
        startDate: "2026-03-02",
        endDate: "2026-03-04",
        weeks: 1,
        isTransferredOut: true,
      },
    ]

    const model = buildRegistrationsGanttModel({
      registrations,
      rangeRegistrations: registrations,
      courseDays: [1, 3],
      getCourseDaysForCourse: () => [1, 3],
    })
    const totals = buildWeekTotals(model, [])

    expect(model.weeks).toHaveLength(3)
    expect(totals).toEqual([
      { count: 1, transferred: 1 },
      { count: 0, transferred: 0 },
      { count: 1, transferred: 0 },
    ])
  })
})
