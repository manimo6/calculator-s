import { describe, expect, it } from "vitest"
import { format } from "date-fns"

import {
  buildAttendanceRowMetaMap,
  getRowKey,
  hasUpcomingClasses,
} from "./attendanceBoardModel"

describe("attendanceBoardModel", () => {
  it("builds a stable fallback row key", () => {
    expect(getRowKey({ name: "Alice", course: "Math" }, 3)).toBe("Alice-Math-3")
  })

  it("marks rows without future class days as inactive", () => {
    const result = hasUpcomingClasses(
      {
        start: new Date("2026-03-01"),
        end: new Date("2026-03-05"),
        withdrawnAt: null,
        transferAt: null,
        inactiveAt: null,
        isTransferredOut: false,
        courseDays: [1, 3],
        courseDaySet: new Set([1, 3]),
        skipWeekSet: new Set(),
        breakDateSet: new Set(),
        recordingDateSet: new Set(),
      },
      new Date("2026-03-10")
    )

    expect(result).toBe(false)
  })

  it("clips end dates to transfer dates when building row meta", () => {
    const metaMap = buildAttendanceRowMetaMap([
      {
        id: "reg-1",
        name: "Transfer Student",
        course: "Middle School Math",
        startDate: "2026-03-03",
        endDate: "2026-03-31",
        courseDays: [2, 4],
        transferToId: "reg-2",
        transferAt: "2026-03-17",
      },
    ])

    const meta = metaMap.get("reg-1")
    expect(meta).toBeDefined()
    expect(meta?.inactiveAt ? format(meta.inactiveAt, "yyyy-MM-dd") : "").toBe("2026-03-17")
    expect(meta?.end ? format(meta.end, "yyyy-MM-dd") : "").toBe("2026-03-17")
  })
})
