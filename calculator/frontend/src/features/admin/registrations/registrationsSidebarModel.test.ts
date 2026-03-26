import { describe, expect, it } from "vitest"

import {
  buildSidebarCourseGroups,
  buildSidebarItems,
  buildSidebarStats,
} from "./registrationsSidebarModel"

describe("registrationsSidebarModel", () => {
  it("builds sidebar stats from registration dates", () => {
    const stats = buildSidebarStats(
      [
        { startDate: "2026-03-01", endDate: "2026-03-30" },
        { startDate: "2026-03-25", endDate: "2026-04-20" },
        { startDate: "2026-02-01", endDate: "2026-03-10" },
      ],
      new Date("2026-03-24T09:00:00")
    )

    expect(stats).toEqual({
      total: 3,
      active: 1,
      pending: 1,
      completed: 1,
    })
  })

  it("builds course groups with variant-aware keys and counts", () => {
    const groups = buildSidebarCourseGroups({
      registrations: [
        { courseId: "math-a", course: "중등수학 A" },
        { courseId: "math-a", course: "중등수학 A" },
        { course: "SAT 파이널" },
      ],
      courseIdToLabel: new Map([["math-a", "중등수학 A"]]),
      courseVariantRequiredSet: new Set(["SAT"]),
    })

    expect(groups).toEqual([
      { key: "__courseid__math-a", label: "중등수학 A", count: 2 },
      { key: "__coursename__SAT 파이널", label: "SAT 파이널", count: 1 },
    ])
  })

  it("filters merged courses and injects active merge rows without mutating source groups", () => {
    const courseGroups = [
      { key: "__courseid__math-a", label: "중등수학 A", count: 2 },
      { key: "__courseid__eng-a", label: "중등영어 A", count: 1 },
    ]

    const items = buildSidebarItems({
      courseGroups,
      mergedCourseSetToday: new Set(["중등수학 A", "중등영어 A"]),
      activeMergesToday: [
        {
          id: "merge-1",
          name: "토요 합반",
          courses: ["중등수학 A", "중등영어 A"],
          weekRanges: [],
          isActive: true,
          courseConfigSetName: "2026 봄",
          referenceStartDate: "2026-03-24",
        },
      ],
      searchQuery: "합반",
    })

    expect(items).toEqual([
      {
        key: "__merge__merge-1",
        label: "토요 합반",
        count: 3,
        isMerge: true,
        subCourses: [
          { key: "__courseid__math-a", label: "중등수학 A", count: 2 },
          { key: "__courseid__eng-a", label: "중등영어 A", count: 1 },
        ],
      },
    ])
    expect(courseGroups).toEqual([
      { key: "__courseid__math-a", label: "중등수학 A", count: 2 },
      { key: "__courseid__eng-a", label: "중등영어 A", count: 1 },
    ])
  })
})
