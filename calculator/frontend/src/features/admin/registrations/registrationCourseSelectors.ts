import type { CourseInfo } from "@/utils/data"

import type { CourseConfigSet } from "./registrationsTypes"
import {
  type CourseConfigSetTreeGroup,
  isTimeVariantEntry,
} from "./registrationSelectorShared"

export function buildCourseConfigSetIdMap(courseConfigSetTree: CourseConfigSetTreeGroup[]) {
  const idToLabel = new Map<string, string>()
  const idToCategory = new Map<string, string>()

  for (const group of courseConfigSetTree || []) {
    const category = group?.cat
    for (const item of group.items || []) {
      if (!item?.val) continue
      const id = String(item.val)
      idToLabel.set(id, item.label || id)
      if (category) idToCategory.set(id, category)
    }
  }

  return { idToLabel, idToCategory }
}

export function buildCourseVariantRequiredSet(params: {
  courseConfigSetBaseCourses: string[]
  courseConfigSetTree: CourseConfigSetTreeGroup[]
  selectedCourseConfigSetObj: CourseConfigSet | null
}) {
  const { courseConfigSetBaseCourses, courseConfigSetTree, selectedCourseConfigSetObj } = params
  const set = new Set<string>()
  const data = selectedCourseConfigSetObj?.data || {}
  const timeTable =
    data.timeTable && typeof data.timeTable === "object"
      ? (data.timeTable as Record<string, unknown>)
      : {}
  const courseInfo =
    data.courseInfo && typeof data.courseInfo === "object"
      ? (data.courseInfo as Record<string, CourseInfo | undefined>)
      : {}
  const labelToKey = new Map<string, string>()

  for (const group of courseConfigSetTree || []) {
    for (const item of group.items || []) {
      if (item?.label) labelToKey.set(String(item.label), String(item.val || ""))
    }
  }

  for (const label of courseConfigSetBaseCourses) {
    const key = labelToKey.get(label)
    const info = key ? courseInfo[key] : null
    const requiresInfoVariant = Boolean(info?.dynamicTime || info?.dynamicOptions)
    const tableEntry = timeTable[label] ?? (key ? timeTable[key] : null)
    const requiresTableVariant = isTimeVariantEntry(tableEntry)
    if (requiresInfoVariant || requiresTableVariant) set.add(label)
  }

  return set
}
