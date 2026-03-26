import { matchesCourseName, normalizeCourse } from "./utils"
import type { CourseConfigSet, GanttGroup, MergeEntry, RegistrationRow } from "./registrationsTypes"
import {
  buildMergeLabel,
  collectCourseDays,
  countVisibleRegistrations,
} from "./registrationsGanttGroupShared"

export function buildMergeFilterGroup({
  courseFilter,
  merges,
  sourceList,
  allRegistrations,
  selectedCourseConfigSetObj,
}: {
  courseFilter: string
  merges: MergeEntry[]
  sourceList: RegistrationRow[]
  allRegistrations: RegistrationRow[]
  selectedCourseConfigSetObj: CourseConfigSet | null
}): GanttGroup[] {
  const id = courseFilter.replace("__merge__", "")
  const merge = (merges || []).find((entry) => String(entry.id) === String(id))
  const courseNames = Array.from(
    new Set(
      Array.isArray(merge?.courses)
        ? merge.courses.map(normalizeCourse)
        : sourceList.map((registration) => normalizeCourse(registration?.course))
    )
  ).filter(Boolean)
  const labelBase = merge?.name || courseNames.join(" + ")
  const rangeRows = allRegistrations.filter((registration) =>
    courseNames.some((name) => matchesCourseName(registration?.course, name))
  )

  return [
    {
      key: courseFilter,
      label: buildMergeLabel(labelBase),
      registrations: sourceList,
      rangeRegistrations: rangeRows,
      courseDays: collectCourseDays(courseNames, selectedCourseConfigSetObj),
      mergeWeekRanges: merge?.weekRanges || [],
      count: countVisibleRegistrations(sourceList),
    },
  ]
}

export function buildActiveMergeGroups({
  courseFilter,
  activeMergesToday,
  sourceList,
  allRegistrations,
  selectedCourseConfigSetObj,
}: {
  courseFilter: string
  activeMergesToday: MergeEntry[]
  sourceList: RegistrationRow[]
  allRegistrations: RegistrationRow[]
  selectedCourseConfigSetObj: CourseConfigSet | null
}) {
  const mergeGroups: GanttGroup[] = []
  const todayMergedCourses = new Set<string>()

  if (!courseFilter && activeMergesToday.length > 0) {
    for (const merge of activeMergesToday) {
      const courseNames = Array.from(new Set((merge?.courses || []).map(normalizeCourse))).filter(
        Boolean
      )
      if (!courseNames.length) continue

      const rows = sourceList.filter((registration) =>
        courseNames.some((name) => matchesCourseName(registration?.course, name))
      )
      if (!rows.length) continue

      for (const courseName of courseNames) {
        todayMergedCourses.add(courseName)
      }

      const labelBase = merge?.name || courseNames.join(" + ")
      const rangeRows = allRegistrations.filter((registration) =>
        courseNames.some((name) => matchesCourseName(registration?.course, name))
      )

      mergeGroups.push({
        key: `__merge__${merge.id}`,
        label: buildMergeLabel(labelBase),
        registrations: rows,
        rangeRegistrations: rangeRows,
        courseDays: collectCourseDays(courseNames, selectedCourseConfigSetObj),
        mergeWeekRanges: merge?.weekRanges || [],
        count: countVisibleRegistrations(rows),
      })
    }
  }

  return { mergeGroups, todayMergedCourses }
}
