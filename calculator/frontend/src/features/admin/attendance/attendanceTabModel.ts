import { matchesSearch } from "@/utils/searchUtils"

export type AttendanceVariantTab = {
  key: string
  label: string
  count: number
}

export function isCourseScheduledToday(courseDays: number[], todayDayOfWeek: number) {
  if (courseDays.length === 0) return true
  return courseDays.includes(todayDayOfWeek)
}

export function filterAttendanceVariantTabs({
  variantTabs,
  courseSearch,
  todayOnly,
  todayDayOfWeek,
  resolveCourseDays,
}: {
  variantTabs: AttendanceVariantTab[]
  courseSearch: string
  todayOnly: boolean
  todayDayOfWeek: number
  resolveCourseDays: (courseName?: string) => number[]
}) {
  let result = variantTabs

  if (todayOnly) {
    result = result.filter((tab) =>
      isCourseScheduledToday(resolveCourseDays(tab.label), todayDayOfWeek)
    )
  }

  if (courseSearch.trim()) {
    result = result.filter((tab) => matchesSearch(tab.label, courseSearch.trim()))
  }

  return result
}

export function countTodayAttendanceTabs({
  variantTabs,
  todayDayOfWeek,
  resolveCourseDays,
}: {
  variantTabs: AttendanceVariantTab[]
  todayDayOfWeek: number
  resolveCourseDays: (courseName?: string) => number[]
}) {
  return variantTabs.filter((tab) =>
    isCourseScheduledToday(resolveCourseDays(tab.label), todayDayOfWeek)
  ).length
}
