import { addDays, pad2, parseDate, type NormalizedWeekRange } from "./utils"
import { normalizeCourseDays } from "@/utils/calculatorLogic"

import { REGISTRATIONS_GANTT_COPY } from "./registrationsGanttCopy"

export const LABEL_WIDTH_PX = 256
export const NOTE_WIDTH_PX = 64
export const WEEK_WIDTH_PX = 88
export const ROW_HEIGHT_PX = 44
export const BAR_HEIGHT_PX = 24

const WEEKDAY_LABELS = REGISTRATIONS_GANTT_COPY.weekdayLabels

export type DateInput = string | number | Date | null | undefined

export type WeekRangeDates = {
  start: Date
  end: Date
}

export type RecordingWeek = {
  weekIndex: number
  dates: Date[]
}

export function adjustEndToLastClassDay(
  date: DateInput,
  courseDays: Array<number | string> | null | undefined
) {
  const d = parseDate(date)
  if (!d) return d
  const days = normalizeCourseDays(courseDays)
  if (!days.length) return d
  const daySet = new Set(days)
  const result = new Date(d.getTime())

  for (let i = 0; i < 7; i += 1) {
    if (daySet.has(result.getDay())) return result
    result.setDate(result.getDate() - 1)
  }

  return d
}

export function formatWeekLabel(start: Date, end: Date) {
  if (!(start instanceof Date) || !(end instanceof Date)) return ""

  const sm = pad2(start.getMonth() + 1)
  const sd = pad2(start.getDate())
  const em = pad2(end.getMonth() + 1)
  const ed = pad2(end.getDate())

  return sm === em ? `${sm}/${sd}~${ed}` : `${sm}/${sd}~${em}/${ed}`
}

export function formatDateKorean(date: Date | null | undefined) {
  if (!(date instanceof Date)) return ""
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dow = WEEKDAY_LABELS[date.getDay()] || ""
  return `${month}\uC6D4 ${day}\uC77C (${dow})`
}

export function isWeekInRanges(relativeWeek: number, ranges: NormalizedWeekRange[]) {
  if (!ranges.length) return true
  return ranges.some(
    (range) => relativeWeek >= range.start && relativeWeek <= range.end
  )
}

export function getWeekClassDates(
  week: WeekRangeDates,
  start: Date,
  end: Date,
  courseDays: Array<number | string> | null | undefined
) {
  if (!week || !start || !end || start > end) return []
  const days = normalizeCourseDays(courseDays)
  if (!days.length) return []

  const daySet = new Set(days)
  const rangeStart = start > week.start ? start : week.start
  const rangeEnd = end < week.end ? end : week.end
  if (rangeStart > rangeEnd) return []

  const dates = []
  let cur = new Date(rangeStart.getTime())
  while (cur <= rangeEnd) {
    if (daySet.has(cur.getDay())) dates.push(new Date(cur.getTime()))
    cur = addDays(cur, 1)
  }
  return dates
}

function getWeekEndOffset(startDow: number, daySet: Set<number>) {
  let offset = 0
  for (let i = 0; i < 7; i += 1) {
    const dow = (startDow + i) % 7
    if (daySet.has(dow)) offset = i
  }
  return offset
}

export function buildWeeks(
  rangeStart: DateInput,
  rangeEnd: DateInput,
  courseDays: Array<number | string> | null | undefined
) {
  const start = parseDate(rangeStart)
  const end = parseDate(rangeEnd)
  if (!start || !end || start > end) return []

  const days = normalizeCourseDays(courseDays)
  const daySet = new Set(days)
  const weeks: WeekRangeDates[] = []

  if (daySet.size === 0) {
    let cur = new Date(start.getTime())
    while (cur <= end) {
      const wStart = new Date(cur.getTime())
      const wEnd = addDays(wStart, 6)
      weeks.push({
        start: wStart,
        end: wEnd > end ? new Date(end.getTime()) : wEnd,
      })
      cur = addDays(cur, 7)
    }
    return weeks
  }

  let first = new Date(start.getTime())
  while (first <= end && !daySet.has(first.getDay())) {
    first = addDays(first, 1)
  }
  if (first > end) return weeks

  let cur = new Date(first.getTime())
  while (cur <= end) {
    const wStart = new Date(cur.getTime())
    const endOffset = getWeekEndOffset(wStart.getDay(), daySet)
    const wEnd = addDays(wStart, endOffset)
    weeks.push({
      start: wStart,
      end: wEnd > end ? new Date(end.getTime()) : wEnd,
    })
    cur = addDays(cur, 7)
  }

  return weeks
}

export function groupRecordingDates(
  recordingDates: Array<string | Date> | null | undefined,
  weeks: WeekRangeDates[]
) {
  if (!Array.isArray(recordingDates) || !recordingDates.length || !weeks.length) {
    return []
  }

  const buckets = new Map<number, Date[]>()

  for (const value of new Set(recordingDates)) {
    const date = parseDate(value)
    if (!date) continue

    const weekIndex = weeks.findIndex(
      (week) => date >= week.start && date <= week.end
    )
    if (weekIndex < 0) continue

    if (!buckets.has(weekIndex)) buckets.set(weekIndex, [])
    buckets.get(weekIndex)?.push(date)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, dates]: [number, Date[]]) => ({
      weekIndex,
      dates: dates.sort((a, b) => a.getTime() - b.getTime()),
    }))
}
