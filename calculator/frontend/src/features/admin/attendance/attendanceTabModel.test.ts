import { describe, expect, it } from "vitest"

import {
  countTodayAttendanceTabs,
  filterAttendanceVariantTabs,
  isCourseScheduledToday,
  type AttendanceVariantTab,
} from "./attendanceTabModel"

const VARIANT_TABS: AttendanceVariantTab[] = [
  { key: "math", label: "수학", count: 3 },
  { key: "english", label: "영어", count: 2 },
  { key: "science", label: "과학", count: 1 },
]

const COURSE_DAYS = new Map<string, number[]>([
  ["수학", [1, 3, 5]],
  ["영어", [2, 4]],
  ["과학", []],
])

function resolveCourseDays(courseName?: string) {
  return COURSE_DAYS.get(courseName || "") || []
}

describe("attendanceTabModel", () => {
  it("treats courses without day metadata as not scheduled today", () => {
    expect(isCourseScheduledToday([], 1)).toBe(false)
    expect(isCourseScheduledToday([2, 4], 1)).toBe(false)
    expect(isCourseScheduledToday([1, 4], 1)).toBe(true)
  })

  it("filters tabs by today-only and search together", () => {
    expect(
      filterAttendanceVariantTabs({
        variantTabs: VARIANT_TABS,
        courseSearch: "",
        todayOnly: true,
        todayDayOfWeek: 1,
        resolveCourseDays,
      }).map((tab) => tab.label)
    ).toEqual(["수학"])

    expect(
      filterAttendanceVariantTabs({
        variantTabs: VARIANT_TABS,
        courseSearch: "영",
        todayOnly: false,
        todayDayOfWeek: 1,
        resolveCourseDays,
      }).map((tab) => tab.label)
    ).toEqual(["영어"])
  })

  it("counts courses visible for today", () => {
    expect(
      countTodayAttendanceTabs({
        variantTabs: VARIANT_TABS,
        todayDayOfWeek: 1,
        resolveCourseDays,
      })
    ).toBe(1)
  })
})
