import type { BreakRangeInput, CourseInfo } from "@/utils/data"
import {
  ALL_WEEK_DAYS,
  normalizeBreakRanges,
  normalizeCourseDays,
  resolveEndDay,
} from "@/utils/calculatorLogic"

import { formatDateYmd, parseDate } from "./utils"

export function resolveMaxWeeks(info: CourseInfo | null | undefined) {
  const raw = info?.max ?? info?.maxDuration
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}

export function getWeekOffset(studentStartDate: Date | null, courseStartDate: Date | null) {
  if (!studentStartDate || !courseStartDate) return 0
  const diffMs = studentStartDate.getTime() - courseStartDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(diffDays / 7))
}

export function isDateInBreakRanges(
  date: Date | null,
  breakRanges: BreakRangeInput[] | null | undefined
) {
  if (!date) return false
  const ranges = normalizeBreakRanges(breakRanges)
  return ranges.some((range) => date >= range.start && date <= range.end)
}

export function getNormalizedCourseDays(
  infoDays: Array<string | number> | null | undefined,
  fallbackDays: Array<string | number> | null | undefined
) {
  const normalizedInfoDays = normalizeCourseDays(infoDays)
  const normalizedFallbackDays = normalizeCourseDays(fallbackDays)
  return normalizedInfoDays.length
    ? normalizedInfoDays
    : normalizedFallbackDays.length
      ? normalizedFallbackDays
      : []
}

export function getNormalizedBreakRanges(
  breakRanges: BreakRangeInput[] | null | undefined
) {
  return normalizeBreakRanges(breakRanges) as BreakRangeInput[]
}

export function getResolvedEndDay(info: CourseInfo | null | undefined) {
  return resolveEndDay(info)
}

export function getNextCourseDate(
  endDate: string | Date | null | undefined,
  courseDays: number[] | null | undefined,
  breakRanges: BreakRangeInput[] | null | undefined
) {
  const base = parseDate(endDate)
  if (!base) return ""
  const normalizedDays = normalizeCourseDays(courseDays)
  const days = normalizedDays.length ? normalizedDays : ALL_WEEK_DAYS
  const daySet = new Set(days)
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  next.setDate(next.getDate() + 1)
  for (let i = 0; i < 60; i += 1) {
    if (daySet.has(next.getDay()) && !isDateInBreakRanges(next, breakRanges)) {
      return formatDateYmd(next)
    }
    next.setDate(next.getDate() + 1)
  }
  return formatDateYmd(next)
}
