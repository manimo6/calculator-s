const DAY_MS = 24 * 60 * 60 * 1000

type DateInput = string | number | Date | null | undefined

function pad2(value: string | number) {
  return String(value).padStart(2, "0")
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
