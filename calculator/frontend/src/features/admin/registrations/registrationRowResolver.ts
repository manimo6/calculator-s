import {
  addDays,
  getEndDate,
  getScheduleWeeks,
  normalizeBreakRanges,
  normalizeCourseDays,
  resolveEndDay,
} from "@/utils/calculatorLogic"

import { formatDateYmd, isDailyRegistration, parseDate, resolveCourseInfo } from "./utils"
import type {
  CourseConfigSet,
  RegistrationRow,
} from "./registrationsTypes"

export function resolveRegistrationRows(
  registrations: RegistrationRow[],
  selectedCourseConfigSetObj: CourseConfigSet | null
) {
  if (!Array.isArray(registrations) || registrations.length === 0) return []

  return registrations.map((registration) => {
    const info = resolveCourseInfo(
      registration?.courseId,
      registration?.course,
      selectedCourseConfigSetObj
    )
    if (!info) return registration

    const courseDays = normalizeCourseDays(info?.days)
    const endDay = resolveEndDay(info)
    const normalizedBreaks = normalizeBreakRanges(info?.breakRanges)
    const breakRanges = normalizedBreaks.map(({ startDate, endDate }) => ({
      startDate,
      endDate,
    }))

    const startDate = registration?.startDate
    const weeksValue = Number(registration?.weeks || 0)
    const skipWeeks = Array.isArray(registration?.skipWeeks)
      ? registration.skipWeeks
      : []

    const isDaily = info?.durationUnit === "daily" || isDailyRegistration(registration)
    let computedEndDate = registration?.endDate || ""
    let computedStartDate = startDate
    let breakWeeks: number[] = []

    if (isDaily) {
      const selectedDates = Array.isArray(registration?.selectedDates)
        ? registration.selectedDates.filter(Boolean).sort()
        : []
      if (selectedDates.length > 0) {
        computedStartDate = selectedDates[0]
        computedEndDate = selectedDates[selectedDates.length - 1]
      }
    } else if (startDate && Number.isFinite(weeksValue) && weeksValue > 0) {
      const scheduleMeta = getScheduleWeeks({
        startDate,
        durationWeeks: weeksValue,
        skipWeeks,
        courseDays,
        endDayOfWeek: endDay,
        breakRanges,
      })
      breakWeeks = Array.from(scheduleMeta.breakWeekSet || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b)
      if (scheduleMeta.scheduleWeeks) {
        const endDate = getEndDate(startDate, scheduleMeta.scheduleWeeks, endDay)
        const formatted = formatDateYmd(endDate)
        if (formatted) computedEndDate = formatted
      }
    }

    const withdrawnDate = parseDate(registration?.withdrawnAt)
    const transferAt = parseDate(registration?.transferAt)
    const isTransferredOut = Boolean(registration?.transferToId)
    const isTransferredIn = Boolean(registration?.transferFromId)
    let effectiveEndDate = computedEndDate || registration?.endDate || ""

    if (isTransferredOut && transferAt) {
      const transferEnd = addDays(transferAt, -1)
      const formatted = transferEnd ? formatDateYmd(transferEnd) : ""
      if (formatted) effectiveEndDate = formatted
    }

    if (withdrawnDate) {
      const endCandidate = parseDate(effectiveEndDate)
      if (!endCandidate || withdrawnDate.getTime() <= endCandidate.getTime()) {
        effectiveEndDate = formatDateYmd(withdrawnDate)
      }
    }

    return {
      ...registration,
      startDate: computedStartDate || registration?.startDate || "",
      endDate: effectiveEndDate || registration?.endDate || "",
      withdrawnAt: withdrawnDate ? formatDateYmd(withdrawnDate) : "",
      transferAt: transferAt ? formatDateYmd(transferAt) : "",
      isWithdrawn: Boolean(withdrawnDate),
      isTransferredOut,
      isTransferredIn,
      courseDays,
      courseEndDay: endDay,
      breakRanges,
      breakWeeks,
    }
  })
}
