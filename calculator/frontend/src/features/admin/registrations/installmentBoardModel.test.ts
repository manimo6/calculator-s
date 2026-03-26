import { describe, expect, it } from "vitest"

import { formatDateYmd } from "./utils"
import {
  buildCourseEarliestStartMap,
  buildExtensionsByRegistration,
  buildInstallmentRows,
} from "./installmentBoardModel"

describe("installmentBoardModel", () => {
  it("groups extensions by registration id", () => {
    const grouped = buildExtensionsByRegistration([
      { registrationId: "a", startDate: "2026-03-20" },
      { registrationId: "a", startDate: "2026-03-27" },
      { registrationId: "b", startDate: "2026-04-01" },
    ])

    expect(grouped.get("a")).toHaveLength(2)
    expect(grouped.get("b")).toHaveLength(1)
  })

  it("keeps the earliest course start per course id", () => {
    const earliest = buildCourseEarliestStartMap([
      { courseId: "math", startDate: "2026-03-15" },
      { courseId: "math", startDate: "2026-03-03" },
      { courseId: "eng", startDate: "2026-04-01" },
    ])

    expect(formatDateYmd(earliest.get("math"))).toBe("2026-03-03")
    expect(formatDateYmd(earliest.get("eng"))).toBe("2026-04-01")
  })

  it("derives installment rows and keeps notice-priority sorting stable", () => {
    const registrations = [
      {
        id: "notice",
        name: "Alpha",
        course: "Math",
        courseId: "math",
        startDate: "2026-03-03",
        endDate: "2026-03-16",
        weeks: 4,
        tuitionFee: 120000,
      },
      {
        id: "done",
        name: "Beta",
        course: "English",
        courseId: "eng",
        startDate: "2026-03-05",
        endDate: "2026-03-28",
        weeks: 3,
        tuitionFee: 150000,
      },
    ]
    const extensionsByRegistration = buildExtensionsByRegistration([
      { registrationId: "done", startDate: "2026-03-30" },
    ])
    const courseEarliestStartMap = buildCourseEarliestStartMap(registrations)

    const rows = buildInstallmentRows({
      registrations,
      courseConfigSet: {
        data: {
          courseInfo: {
            math: {
              name: "Math",
              installmentEligible: true,
              max: 12,
              days: [1, 3],
            },
            eng: {
              name: "English",
              installmentEligible: true,
              max: 12,
              days: [2, 4],
            },
          },
        },
      },
      courseEarliestStartMap,
      courseIdToLabel: new Map([
        ["math", "Math"],
        ["eng", "English"],
      ]),
      extensionsByRegistration,
      sortConfig: {
        key: null,
        direction: "asc",
      },
      today: new Date("2026-03-10T00:00:00"),
    })

    expect(rows).toHaveLength(2)
    expect(rows[0].registration.id).toBe("notice")
    expect(rows[0].status).toBe("notice_needed")
    expect(rows[1].registration.id).toBe("done")
    expect(rows[1].status).toBe("notice_done")
    expect(rows[0].nextStartDate).toBe("2026-03-18")
  })
})
