import { matchesCourseName, normalizeCourse, normalizeWeekRanges } from "./utils"
import {
  isMergeKey,
  makeCourseFilterValue,
  parseCourseFilterValue,
  type CourseConfigSetTreeGroup,
} from "./registrationSelectorShared"
import type {
  CourseOption,
  MergeEntry,
  MergeWeekRange,
  RegistrationRow,
} from "./registrationsTypes"

const MERGE_OPTION_PREFIX = "[\uD569\uBC18]"

export function buildCourseOptions(params: {
  resolvedRegistrations: RegistrationRow[]
  selectedCourseConfigSet: string
  courseConfigSetBaseCourses: string[]
  courseConfigSetCourseIdSet: Set<string>
  courseConfigSetIdToLabel: Map<string, string>
  courseConfigSetTree: CourseConfigSetTreeGroup[]
  courseVariantRequiredSet: Set<string>
}) {
  const {
    resolvedRegistrations,
    selectedCourseConfigSet,
    courseConfigSetBaseCourses,
    courseConfigSetCourseIdSet,
    courseConfigSetIdToLabel,
    courseConfigSetTree,
    courseVariantRequiredSet,
  } = params

  if (!selectedCourseConfigSet) return []

  const dataCourseSet = new Set(
    (resolvedRegistrations || [])
      .map((registration) => normalizeCourse(registration.course))
      .filter(Boolean)
  )

  const dataCourseIdSet = new Set(
    (resolvedRegistrations || [])
      .map((registration) => normalizeCourse(registration.courseId))
      .filter(Boolean)
  )

  const out = new Map<string, CourseOption>()

  for (const registration of resolvedRegistrations || []) {
    const courseId = normalizeCourse(registration?.courseId)
    const courseName = normalizeCourse(registration?.course)
    if (courseId) {
      if (courseConfigSetCourseIdSet.size && !courseConfigSetCourseIdSet.has(courseId)) {
        continue
      }
      const value = makeCourseFilterValue(courseId, courseName)
      const label = courseConfigSetIdToLabel.get(courseId) || courseName || courseId
      if (value && !out.has(value)) out.set(value, { value, label })
      continue
    }

    if (!courseName) continue
    let allowed = false
    for (const base of courseConfigSetBaseCourses) {
      if (courseName.startsWith(base)) {
        allowed = true
        break
      }
    }
    if (!allowed) continue
    const value = makeCourseFilterValue("", courseName)
    if (value && !out.has(value)) out.set(value, { value, label: courseName })
  }

  for (const group of courseConfigSetTree || []) {
    for (const item of group.items || []) {
      const label = normalizeCourse(item?.label)
      const id = normalizeCourse(item?.val)
      if (!label || !id) continue
      if (courseVariantRequiredSet.has(label)) {
        const hasData = dataCourseIdSet.has(id) || dataCourseSet.has(label)
        if (!hasData) continue
      }
      const value = makeCourseFilterValue(id, label)
      if (!out.has(value)) out.set(value, { value, label })
    }
  }

  return Array.from(out.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ko-KR")
  )
}

export function buildVariantTabs(
  preVariantRegistrations: RegistrationRow[],
  mergeCourseLabelMap: Map<string, string>
) {
  const map = new Map<string, { key: string; label: string; count: number }>()

  for (const registration of preVariantRegistrations || []) {
    const courseName = normalizeCourse(registration?.course)
    if (!courseName) continue

    const mergeLabel = mergeCourseLabelMap.get(courseName)
    const tabKey = mergeLabel ? `__mergetab__${mergeLabel}` : courseName
    const tabLabel = mergeLabel || courseName

    const entry = map.get(tabKey)
    if (entry) {
      entry.count += 1
      continue
    }
    map.set(tabKey, { key: tabKey, label: tabLabel, count: 1 })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ko-KR")
  )
}

export function filterBaseRegistrationsByVariant(params: {
  enableVariants: boolean
  preVariantRegistrations: RegistrationRow[]
  variantFilter: string
  variantTabs: Array<{ key: string }>
  mergeCourseLabelMap: Map<string, string>
}) {
  const {
    enableVariants,
    preVariantRegistrations,
    variantFilter,
    variantTabs,
    mergeCourseLabelMap,
  } = params

  if (!enableVariants) return preVariantRegistrations

  const fallbackVariant = variantTabs[0]?.key || ""
  const activeVariant = variantFilter || fallbackVariant
  if (!activeVariant) return []

  if (activeVariant.startsWith("__mergetab__")) {
    const mergeLabel = activeVariant.replace("__mergetab__", "")
    return (preVariantRegistrations || []).filter((registration) => {
      const courseName = normalizeCourse(registration?.course)
      return mergeCourseLabelMap.get(courseName) === mergeLabel
    })
  }

  const normalizedVariant = normalizeCourse(activeVariant)
  return (preVariantRegistrations || []).filter(
    (registration) => normalizeCourse(registration?.course) === normalizedVariant
  )
}

export function filterRegistrationsByCourseFilter(params: {
  baseRegistrations: RegistrationRow[]
  courseFilter: string
  merges: MergeEntry[]
}) {
  const { baseRegistrations, courseFilter, merges } = params

  if (!courseFilter) return baseRegistrations
  let list = baseRegistrations.slice()

  if (isMergeKey(courseFilter)) {
    const id = courseFilter.replace("__merge__", "")
    const merge = merges.find((entry) => String(entry.id) === String(id))
    const mergeCourses = Array.isArray(merge?.courses) ? merge.courses : []
    if (mergeCourses.length) {
      list = list.filter((registration) =>
        mergeCourses.some((course) => matchesCourseName(registration.course, course))
      )
    } else {
      list = []
    }
  } else {
    const parsed = parseCourseFilterValue(courseFilter)
    if (parsed.type === "id" && parsed.value) {
      list = list.filter(
        (registration) => normalizeCourse(registration?.courseId) === parsed.value
      )
    } else if (parsed.value) {
      const courseName = normalizeCourse(parsed.value)
      list = list.filter((registration) => normalizeCourse(registration?.course) === courseName)
    } else {
      list = []
    }
  }

  return list
}

export function buildMergeOptions(
  merges: MergeEntry[],
  activeMergesToday: Array<{ id?: string | number }>
) {
  return (merges || []).map((merge) => {
    const courses = Array.isArray(merge.courses) ? merge.courses.filter(Boolean) : []
    const isActiveToday = activeMergesToday.some(
      (activeMerge) => String(activeMerge.id) === String(merge.id)
    )

    return {
      value: `__merge__${merge.id}`,
      label: `${MERGE_OPTION_PREFIX} ${merge.name || courses.join(" + ")}`,
      courses,
      weekRanges: normalizeWeekRanges(merge.weekRanges) as MergeWeekRange[],
      isActiveToday,
    }
  })
}
