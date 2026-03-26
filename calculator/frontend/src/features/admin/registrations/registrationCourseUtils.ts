import { addDays } from "@/utils/calculatorLogic"
import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSetLike = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

export function stripMathExcludeLabel(value: string | null | undefined) {
  if (!value) return ""
  return String(value).replace(/\s*\(?수학\s*제외\)?\s*$/g, "").trim()
}

export function resolveCourseInfo(
  courseId: unknown,
  courseName: unknown,
  courseConfigSet: CourseConfigSetLike | null
): CourseInfo | null {
  const id = String(courseId || "").trim()
  const name = String(courseName || "").trim()
  if (!id && !name) return null

  const configData = courseConfigSet?.data
  const configInfo = configData?.courseInfo || {}
  if (id && configInfo[id]) return configInfo[id] ?? null

  const sources: Array<{ tree: CourseTreeGroup[]; info: CourseInfoRecord }> = [
    {
      tree: Array.isArray(configData?.courseTree) ? configData.courseTree : [],
      info: configInfo,
    },
    { tree: courseTree || [], info: courseInfo || {} },
  ]

  let best: CourseInfo | null = null
  let bestLen = 0

  for (const source of sources) {
    for (const group of source.tree || []) {
      for (const item of group.items || []) {
        const label = item?.label
        if (!label || !name) continue
        if (!name.startsWith(label) || label.length < bestLen) continue
        const info = source.info?.[item.val]
        if (info) {
          best = info
          bestLen = label.length
        }
      }
    }

    for (const info of Object.values(source.info || {})) {
      const infoRecord = info && typeof info === "object" ? (info as CourseInfo) : null
      const label = infoRecord?.name
      if (!label || !name) continue
      if (!name.startsWith(label) || label.length < bestLen) continue
      best = infoRecord
      bestLen = label.length
    }
  }

  return best
}

function isValidDow(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

export function getCourseDaysByName(courseName: string, courseConfigSet: CourseConfigSetLike | null) {
  const name = String(courseName || "").trim()
  if (!name) return []

  const configData = courseConfigSet?.data
  const sources: Array<{ tree: CourseTreeGroup[]; info: CourseInfoRecord }> = [
    {
      tree: Array.isArray(configData?.courseTree) ? configData.courseTree : [],
      info: configData?.courseInfo || {},
    },
    { tree: courseTree || [], info: courseInfo || {} },
  ]

  let bestDays: number[] | null = null
  let bestLen = 0

  for (const source of sources) {
    for (const group of source.tree || []) {
      for (const item of group.items || []) {
        const label = item?.label
        if (!label) continue
        if (!name.startsWith(label) || label.length < bestLen) continue

        const info = source.info?.[item.val]
        if (Array.isArray(info?.days)) {
          bestDays = info.days.filter(isValidDow)
          bestLen = label.length
        }
      }
    }

    const infoValues = Object.values(source.info || {})
    for (const info of infoValues) {
      const infoRecord = info && typeof info === "object" ? (info as CourseInfo) : null
      const label = infoRecord?.name
      if (!label) continue
      if (!name.startsWith(label) || label.length < bestLen) continue

      if (Array.isArray(infoRecord?.days)) {
        bestDays = infoRecord.days.filter(isValidDow)
        bestLen = label.length
      }
    }
  }

  return bestDays || []
}

export { addDays }

export function normalizeCourse(value: unknown) {
  return String(value || "").trim()
}

export function getCourseKey(
  registration: { courseId?: string | number; course?: string },
  variantSet: Set<string>
) {
  const courseId = String(registration?.courseId || "").trim()
  const courseName = String(registration?.course || "").trim()

  if (courseName && variantSet.size > 0) {
    for (const base of variantSet) {
      if (courseName.startsWith(base)) {
        return `__coursename__${courseName}`
      }
    }
  }

  if (courseId) return `__courseid__${courseId}`
  return courseName ? `__coursename__${courseName}` : ""
}

export function getCourseLabel(
  key: string,
  courseIdLabelMap: Map<string, string>,
  fallback?: string
) {
  if (typeof key !== "string") return fallback || ""
  if (key.startsWith("__courseid__")) {
    const id = key.replace("__courseid__", "")
    return courseIdLabelMap.get(id) || fallback || ""
  }
  if (key.startsWith("__coursename__")) {
    return key.replace("__coursename__", "")
  }
  return fallback || ""
}

export type NormalizedWeekRange = { start: number; end: number }

export function normalizeWeekRanges(ranges: unknown): NormalizedWeekRange[] {
  if (!Array.isArray(ranges)) return []
  return ranges
    .map((range) => ({
      start: Number(range?.start),
      end: Number(range?.end),
    }))
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 1 &&
        range.end >= range.start
    )
    .sort((a, b) => a.start - b.start || a.end - b.end)
}

export function matchesCourseName(courseName: unknown, target: unknown) {
  const course = normalizeCourse(courseName)
  const base = normalizeCourse(target)
  if (!course || !base) return false
  return course === base || course.startsWith(base)
}
