import { normalizeCourse } from "./utils"
import {
  normalizeCourseConfigSetName,
  parseCourseFilterValue,
} from "./registrationSelectorShared"
import type { RegistrationRow } from "./registrationsTypes"

export function resolveCategoryFromLabel(
  label: string,
  courseCatMap: Map<string, string>,
  courseConfigSetBaseCourses: string[]
) {
  const normalizedLabel = normalizeCourse(label)
  if (!normalizedLabel) return ""
  if (courseCatMap.has(normalizedLabel)) return courseCatMap.get(normalizedLabel) || ""

  let bestBase = ""
  for (const base of courseConfigSetBaseCourses) {
    if (normalizedLabel.startsWith(base) && base.length > bestBase.length) {
      bestBase = base
    }
  }
  if (bestBase) return courseCatMap.get(bestBase) || ""

  return ""
}

export function getCategoryForFilterValue(
  value: string,
  courseConfigSetIdToCategory: Map<string, string>,
  courseCatMap: Map<string, string>,
  courseConfigSetBaseCourses: string[]
) {
  const parsed = parseCourseFilterValue(value)
  if (!parsed.value) return ""
  if (parsed.type === "id") {
    return courseConfigSetIdToCategory.get(parsed.value) || ""
  }
  return resolveCategoryFromLabel(parsed.value, courseCatMap, courseConfigSetBaseCourses)
}

export function getCategoryForRegistration(
  registration: RegistrationRow,
  courseConfigSetIdToCategory: Map<string, string>,
  courseCatMap: Map<string, string>,
  courseConfigSetBaseCourses: string[]
) {
  const courseId = normalizeCourse(registration?.courseId)
  if (courseId) {
    return courseConfigSetIdToCategory.get(courseId) || ""
  }
  return resolveCategoryFromLabel(
    String(registration?.course || ""),
    courseCatMap,
    courseConfigSetBaseCourses
  )
}

export function filterPreVariantRegistrations(params: {
  resolvedRegistrations: RegistrationRow[]
  selectedCourseConfigSet: string
  courseConfigSetCourseSet: Set<string>
  courseConfigSetCourseIdSet: Set<string>
  categoryFilter: string
  search: string
  getCategoryForRegistration: (registration: RegistrationRow) => string
}) {
  const {
    resolvedRegistrations,
    selectedCourseConfigSet,
    courseConfigSetCourseSet,
    courseConfigSetCourseIdSet,
    categoryFilter,
    search,
    getCategoryForRegistration,
  } = params

  if (!selectedCourseConfigSet) return []
  if (courseConfigSetCourseSet.size === 0 && courseConfigSetCourseIdSet.size === 0) return []

  const allowedLabels = courseConfigSetCourseSet.size ? courseConfigSetCourseSet : null
  const allowedIds = courseConfigSetCourseIdSet.size ? courseConfigSetCourseIdSet : null
  const selectedConfigName = normalizeCourseConfigSetName(selectedCourseConfigSet)
  let list = (resolvedRegistrations || []).slice()

  if (selectedConfigName) {
    list = list.filter(
      (registration) =>
        normalizeCourseConfigSetName(registration?.courseConfigSetName) === selectedConfigName
    )
  }

  if ((allowedLabels && allowedLabels.size) || (allowedIds && allowedIds.size)) {
    list = list.filter((registration) => {
      const courseId = normalizeCourse(registration?.courseId)
      if (courseId && allowedIds && allowedIds.has(courseId)) return true

      const courseName = normalizeCourse(registration?.course)
      if (allowedLabels && allowedLabels.has(courseName)) return true
      if (allowedLabels) {
        for (const base of allowedLabels) {
          if (courseName && courseName.startsWith(base)) return true
        }
      }
      return false
    })
  }

  if (categoryFilter) {
    list = list.filter((registration) => getCategoryForRegistration(registration) === categoryFilter)
  }

  if (search.trim()) {
    const normalizedSearch = search.trim().toLowerCase()
    list = list.filter((registration) =>
      String(registration.name || "").toLowerCase().includes(normalizedSearch)
    )
  }

  return list
}
