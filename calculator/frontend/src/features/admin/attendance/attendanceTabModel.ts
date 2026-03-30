import { matchesSearch } from "@/utils/searchUtils"

export type AttendanceVariantTab = {
  key: string
  label: string
  count: number
}

type RegistrationLike = {
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  withdrawnAt?: string | Date
}

function parseYmd(d: string | Date | undefined | null): Date | null {
  if (!d) return null
  const date = typeof d === "string" ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? null : date
}

function stripTime(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function hasCourseActiveRegistration(
  courseLabel: string,
  registrations: RegistrationLike[],
  today: Date
): boolean {
  const todayMs = stripTime(today)
  for (const reg of registrations) {
    if (String(reg.course || "") !== courseLabel) continue
    if (reg.withdrawnAt) continue
    const start = parseYmd(reg.startDate)
    const end = parseYmd(reg.endDate)
    if (start && stripTime(start) > todayMs) continue
    if (end && stripTime(end) < todayMs) continue
    return true
  }
  return false
}

export function isCourseScheduledToday(courseDays: number[], todayDayOfWeek: number) {
  if (courseDays.length === 0) return false
  return courseDays.includes(todayDayOfWeek)
}

export function filterAttendanceVariantTabs({
  variantTabs,
  courseSearch,
  todayOnly,
  todayDayOfWeek,
  resolveCourseDays,
  registrations = [],
}: {
  variantTabs: AttendanceVariantTab[]
  courseSearch: string
  todayOnly: boolean
  todayDayOfWeek: number
  resolveCourseDays: (courseName?: string) => number[]
  registrations?: RegistrationLike[]
}) {
  let result = variantTabs

  if (todayOnly) {
    const today = new Date()
    result = result.filter((tab) => {
      if (!isCourseScheduledToday(resolveCourseDays(tab.label), todayDayOfWeek)) return false
      if (registrations.length === 0) return true
      return hasCourseActiveRegistration(tab.label, registrations, today)
    })
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
  registrations = [],
}: {
  variantTabs: AttendanceVariantTab[]
  todayDayOfWeek: number
  resolveCourseDays: (courseName?: string) => number[]
  registrations?: RegistrationLike[]
}) {
  const today = new Date()
  return variantTabs.filter((tab) => {
    if (!isCourseScheduledToday(resolveCourseDays(tab.label), todayDayOfWeek)) return false
    if (registrations.length === 0) return true
    return hasCourseActiveRegistration(tab.label, registrations, today)
  }).length
}

type TimeTableEntry = string | Record<string, string> | { type: string; options?: Array<{ label: string; time: string }> }

function extractStartTime(
  courseLabel: string,
  timeTable: Record<string, TimeTableEntry | undefined>
): string | null {
  // courseLabel 예: "Calculus AB (오전반)", "Algebra 1 온라인", "Psychology"
  // timeTable 키 예: "Calculus AB", "Algebra 1", "Psychology"
  for (const [key, entry] of Object.entries(timeTable)) {
    if (!entry || !courseLabel.startsWith(key)) continue

    // 단순 문자열: "11:10~13:10"
    if (typeof entry === "string") {
      const m = entry.match(/^(\d{1,2}:\d{2})/)
      return m ? m[1] : null
    }

    // dynamic 타입
    if (typeof entry === "object" && "type" in entry) continue

    // 객체: { "오전반": "09:00~11:00", "저녁반": "18:20~20:20" }
    if (typeof entry === "object") {
      const suffix = courseLabel.slice(key.length).trim()
      // "(오전반)" → "오전반", "온라인" → "온라인"
      const cleaned = suffix.replace(/[()]/g, "").trim()
      for (const [variant, timeStr] of Object.entries(entry)) {
        if (cleaned === variant || (!cleaned && typeof timeStr === "string")) {
          const m = String(timeStr).match(/^(\d{1,2}:\d{2})/)
          if (m) return m[1]
        }
      }
    }
  }
  return null
}

export type TimeGroupedTabs = {
  time: string
  label: string
  tabs: AttendanceVariantTab[]
}[]

export function groupTabsByStartTime(
  tabs: AttendanceVariantTab[],
  timeTable: Record<string, TimeTableEntry | undefined>
): TimeGroupedTabs {
  const groups = new Map<string, AttendanceVariantTab[]>()
  const noTime: AttendanceVariantTab[] = []

  for (const tab of tabs) {
    const time = extractStartTime(tab.label, timeTable)
    if (time) {
      if (!groups.has(time)) groups.set(time, [])
      groups.get(time)!.push(tab)
    } else {
      noTime.push(tab)
    }
  }

  const sorted = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, groupTabs]) => ({
      time,
      label: `${time}~`,
      tabs: groupTabs,
    }))

  if (noTime.length > 0) {
    sorted.push({ time: "99:99", label: "기타", tabs: noTime })
  }

  return sorted
}
