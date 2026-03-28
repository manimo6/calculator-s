import { matchesSearch } from "@/utils/searchUtils"

import { getCourseKey, getCourseLabel, getRegistrationStatus } from "./utils"

export type SidebarRegistrationRow = {
  courseId?: string | number
  course?: string
  startDate?: string | Date
  endDate?: string | Date
} & Record<string, unknown>

export type SidebarActiveMerge = {
  id: string
  name: string
  courses: string[]
  weekRanges: Array<{ start: number; end: number }>
  isActive: boolean
  courseConfigSetName: string
  referenceStartDate: string | null
}

export type SidebarCourseGroup = {
  key: string
  label: string
  count: number
}

export type SidebarSubCourse = {
  label: string
  count: number
  key: string
}

export type SidebarItem = {
  key: string
  label: string
  count: number
  isMerge?: boolean
  subCourses?: SidebarSubCourse[]
}

export type SidebarStats = {
  total: number
  active: number
  pending: number
  completed: number
}

export function buildSidebarStats(
  registrations: SidebarRegistrationRow[],
  now: Date = new Date()
): SidebarStats {
  const list = registrations || []
  const counts: SidebarStats = { total: list.length, active: 0, pending: 0, completed: 0 }

  for (const registration of list) {
    const status = getRegistrationStatus(registration, now)
    if (status === "active") counts.active += 1
    else if (status === "pending") counts.pending += 1
    else if (status === "completed") counts.completed += 1
  }

  return counts
}

export function buildSidebarCourseGroups({
  registrations,
  courseIdToLabel,
  courseVariantRequiredSet,
}: {
  registrations: SidebarRegistrationRow[]
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet?: Set<string>
}) {
  const courseIdLabelMap = courseIdToLabel instanceof Map ? courseIdToLabel : new Map()
  const variantSet =
    courseVariantRequiredSet instanceof Set ? courseVariantRequiredSet : new Set<string>()

  const map = new Map<string, SidebarCourseGroup>()

  for (const registration of registrations || []) {
    const course = String(registration?.course || "")
    const key = getCourseKey(registration, variantSet)
    if (!key) continue

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: getCourseLabel(key, courseIdLabelMap, course),
        count: 0,
      })
    }

    const entry = map.get(key)
    if (entry) entry.count += 1
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
}

export function buildSidebarItems({
  courseGroups,
  mergedCourseSetToday,
  activeMergesToday,
  searchQuery,
}: {
  courseGroups: SidebarCourseGroup[]
  mergedCourseSetToday?: Set<string>
  activeMergesToday?: SidebarActiveMerge[]
  searchQuery?: string
}) {
  const mergedSet =
    mergedCourseSetToday instanceof Set ? mergedCourseSetToday : new Set<string>()
  const activeMerges = Array.isArray(activeMergesToday) ? activeMergesToday : []

  let groups: SidebarItem[] = courseGroups.map((group) => ({ ...group }))
  if (mergedSet.size > 0) {
    groups = groups.filter((group) => !mergedSet.has(group.label))
  }

  for (const merge of activeMerges) {
    const subCourses = (merge.courses || []).map((courseName) => {
      const matched = courseGroups.find((group) => group.label === courseName)
      return {
        label: courseName,
        count: matched?.count || 0,
        key: matched?.key || `__coursename__${courseName}`,
      }
    })

    const totalCount = subCourses.reduce((sum, course) => sum + course.count, 0)
    if (totalCount === 0) continue

    groups.push({
      key: `__merge__${merge.id}`,
      label: merge.name || merge.courses.join(" + "),
      count: totalCount,
      isMerge: true,
      subCourses,
    })
  }

  groups = groups.slice().sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))

  const query = String(searchQuery || "").trim()
  if (!query) return groups

  return groups.filter((group) => matchesSearch(group.label, query))
}
