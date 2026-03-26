import { format } from "date-fns"

import {
  ALL_WEEK_DAYS,
  getBreakDateSet,
  getEndDate,
  getScheduleWeeks,
  getWeekIndex,
  normalizeCourseDays,
  normalizeSkipWeeks,
} from "@/utils/calculatorLogic"
import type { BreakRangeInput } from "@/utils/data"
import { parseDate } from "../registrations/utils"
import type { AttendanceRow, AttendanceRowMeta } from "./attendanceBoardShared"
import { getRowKey } from "./attendanceBoardShared"

type ScheduleInput = Parameters<typeof getScheduleWeeks>[0]

export function hasUpcomingClasses(
  meta: AttendanceRowMeta | undefined,
  todayStart: Date | null
) {
  if (!meta || !meta.start || !meta.end || !(todayStart instanceof Date)) return true
  if (meta.end.getTime() < todayStart.getTime()) return false
  if (meta.start.getTime() > meta.end.getTime()) return false

  const courseDaySet =
    meta.courseDaySet instanceof Set
      ? meta.courseDaySet
      : new Set(meta.courseDays || ALL_WEEK_DAYS)
  const skipWeekSet = meta.skipWeekSet instanceof Set ? meta.skipWeekSet : new Set()
  const breakDateSet =
    meta.breakDateSet instanceof Set ? meta.breakDateSet : new Set()

  const startCursor =
    meta.start.getTime() > todayStart.getTime() ? meta.start : todayStart
  let cursor = new Date(
    startCursor.getFullYear(),
    startCursor.getMonth(),
    startCursor.getDate()
  )

  while (cursor <= meta.end) {
    if (courseDaySet.has(cursor.getDay())) {
      const dateKey = format(cursor, "yyyy-MM-dd")
      if (
        !skipWeekSet.has(getWeekIndex(meta.start, cursor)) &&
        !breakDateSet.has(dateKey)
      ) {
        return true
      }
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  }

  return false
}

export function buildAttendanceRowMetaMap(
  registrations: AttendanceRow[],
  getCourseDaysForCourse?: (courseName?: string) => number[]
) {
  const resolver =
    typeof getCourseDaysForCourse === "function"
      ? getCourseDaysForCourse
      : () => []

  return (registrations || []).reduce((map, row, index) => {
    const rowKey = getRowKey(row, index)
    const start = parseDate(row?.startDate)
    const resolvedDays = normalizeCourseDays(row?.courseDays)
    const fallbackDays = normalizeCourseDays(resolver(row?.course))
    const courseDays = resolvedDays.length
      ? resolvedDays
      : fallbackDays.length
        ? fallbackDays
        : ALL_WEEK_DAYS
    const endDay = Number.isInteger(row?.courseEndDay) ? row.courseEndDay : 5
    const breakRanges = Array.isArray(row?.breakRanges)
      ? (row.breakRanges as BreakRangeInput[])
      : []
    const paidWeeks = Number(row?.weeks) || Number(row?.period) || 0
    const rawSkipWeeks = Array.isArray(row?.skipWeeks) ? row.skipWeeks : []
    const withdrawnAt = parseDate(row?.withdrawnAt)
    const isTransferredOut = Boolean(row?.isTransferredOut || row?.transferToId)
    const transferAt = isTransferredOut ? parseDate(row?.transferAt) : null
    const inactiveAt = transferAt || withdrawnAt
    const scheduleMeta =
      paidWeeks > 0 && start
        ? (() => {
            const scheduleInput: ScheduleInput = {
              startDate: start,
              durationWeeks: paidWeeks,
              skipWeeks: rawSkipWeeks,
              courseDays,
              endDayOfWeek: endDay,
              breakRanges,
            }
            return getScheduleWeeks(scheduleInput)
          })()
        : {
            scheduleWeeks: 0,
            skipWeeks: normalizeSkipWeeks(rawSkipWeeks, paidWeeks),
            breakWeekSet: new Set<number>(),
          }
    const skipWeeks = scheduleMeta.skipWeeks || normalizeSkipWeeks(rawSkipWeeks, paidWeeks)
    const computedEnd =
      start && scheduleMeta.scheduleWeeks
        ? getEndDate(start, scheduleMeta.scheduleWeeks, endDay)
        : null
    let end = computedEnd || parseDate(row?.endDate) || start
    if (inactiveAt && end && inactiveAt.getTime() <= end.getTime()) {
      end = inactiveAt
    }
    const recordingDates = Array.isArray(row?.recordingDates)
      ? row.recordingDates
      : []
    const recordingDateSet = new Set(
      recordingDates
        .map((value) => parseDate(value))
        .filter((date): date is Date => Boolean(date))
        .map((date) => format(date, "yyyy-MM-dd"))
    )

    const breakDateSet = getBreakDateSet({
      startDate: start,
      endDate: end,
      courseDays,
      breakRanges,
    })

    map.set(rowKey, {
      start,
      end,
      withdrawnAt,
      transferAt,
      inactiveAt,
      isTransferredOut,
      courseDays,
      courseDaySet: new Set(courseDays),
      skipWeekSet: new Set(skipWeeks),
      breakDateSet,
      recordingDateSet,
    } satisfies AttendanceRowMeta)

    return map
  }, new Map<string, AttendanceRowMeta>())
}
