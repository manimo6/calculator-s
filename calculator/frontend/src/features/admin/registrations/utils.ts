import { DAY_MS } from "@/utils/calculatorLogic"
import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

type DateInput = string | number | Date | null | undefined
type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSetLike = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

export function pad2(value: string | number) {
  return String(value).padStart(2, "0")
}

export function stripMathExcludeLabel(value: string | null | undefined) {
  if (!value) return ""
  return String(value).replace(/\s*\(?수학\s*제외\)?\s*$/g, "").trim()
}

export function startOfDay(date: DateInput) {
  if (date === null || date === undefined || date === "") return null
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseDate(value: DateInput) {
  if (!value) return null
  if (value instanceof Date) return startOfDay(value)
  if (typeof value === "number") return startOfDay(new Date(value))

  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(/\./g, "-").replace(/\//g, "-")
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    const date = new Date(year, month - 1, day)
    if (!Number.isNaN(date.getTime())) return startOfDay(date)
    return null
  }

  const date = new Date(trimmed)
  if (!Number.isNaN(date.getTime())) return startOfDay(date)
  return null
}

export function diffInDays(start: DateInput, end: DateInput) {
  const s = startOfDay(start)
  const e = startOfDay(end)
  if (!s || !e) return null
  return Math.round((e.getTime() - s.getTime()) / DAY_MS)
}

export function getRegistrationStatus(
  { startDate, endDate }: { startDate?: DateInput; endDate?: DateInput },
  now: Date = new Date()
) {
  const today = startOfDay(now)
  if (!today) return "unknown"

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (start && start.getTime() > today.getTime()) return "pending"
  if (end && end.getTime() < today.getTime()) return "completed"
  if (start && end && start.getTime() <= today.getTime() && today.getTime() <= end.getTime()) {
    return "active"
  }
  if (start && !end && start.getTime() <= today.getTime()) return "active"
  if (!start && end && today.getTime() <= end.getTime()) return "active"
  return "unknown"
}

export function formatDateYmd(date: DateInput) {
  const d = parseDate(date)
  if (!d) return ""
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function formatTimestampKo(value: DateInput) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = date.getHours()
  const minutes = pad2(date.getMinutes())
  const meridiem = hours < 12 ? "오전" : "오후"
  const hour12 = hours % 12
  const displayHour = pad2(hour12 === 0 ? 12 : hour12)

  return `${month}.${day} ${meridiem} ${displayHour}:${minutes}`
}

export function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "진행중"
    case "pending":
      return "시작전"
    case "completed":
      return "종료"
    default:
      return "알 수 없음"
  }
}

export function getStatusSortRank(status: string | null | undefined) {
  switch (status) {
    case "active":
      return 0
    case "pending":
      return 1
    case "completed":
      return 2
    default:
      return 3
  }
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

export { addDays } from "@/utils/calculatorLogic"

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
