import { DAY_MS } from "@/utils/calculatorLogic"

export type DateInput = string | number | Date | null | undefined

export function pad2(value: string | number) {
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

export function isDailyRegistration(
  reg: { durationUnit?: string; selectedDates?: unknown[] } | null | undefined
): boolean {
  if (!reg) return false
  return reg.durationUnit === "daily"
    || (Array.isArray(reg.selectedDates) && reg.selectedDates.length > 0)
}
