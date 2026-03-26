import { diffInDays, parseDate, resolveCourseInfo, startOfDay } from "./utils"
import {
  getNextCourseDate,
  getNormalizedBreakRanges,
  getNormalizedCourseDays,
  getResolvedEndDay,
  getWeekOffset,
  resolveMaxWeeks,
} from "./installmentBoardScheduleUtils"
import { sortInstallmentRows } from "./installmentBoardSortUtils"
import {
  DEFAULT_EXTEND_WEEKS,
  DEFAULT_INSTALLMENT_SORT,
  type BuildInstallmentRowsOptions,
  type CourseConfigSet,
  type ExtensionRow,
  type InstallmentRow,
  type InstallmentStatus,
  type RegistrationRow,
  type SortConfig,
  type SortKey,
} from "./installmentBoardTypes"

export {
  DEFAULT_EXTEND_WEEKS,
  DEFAULT_INSTALLMENT_SORT,
  getNextCourseDate,
}

export type {
  CourseConfigSet,
  ExtensionRow,
  InstallmentRow,
  InstallmentStatus,
  RegistrationRow,
  SortConfig,
  SortKey,
}

export function buildExtensionsByRegistration(extensions: ExtensionRow[]) {
  const map = new Map<string, ExtensionRow[]>()
  for (const ext of extensions || []) {
    const id = String(ext?.registrationId || "").trim()
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id)?.push(ext)
  }
  return map
}

export function buildCourseEarliestStartMap(registrations: RegistrationRow[]) {
  const map = new Map<string, Date>()
  for (const registration of registrations || []) {
    const courseId = registration?.courseId
    if (courseId === undefined || courseId === null) continue
    const key = String(courseId)
    const startDate = parseDate(registration?.startDate)
    if (!startDate) continue
    const existing = map.get(key)
    if (!existing || startDate.getTime() < existing.getTime()) {
      map.set(key, startDate)
    }
  }
  return map
}

export function buildInstallmentRows({
  registrations,
  courseConfigSet,
  courseEarliestStartMap,
  courseIdToLabel,
  extensionsByRegistration,
  resolveCourseDays,
  sortConfig,
  today = startOfDay(new Date()) ?? new Date(),
}: BuildInstallmentRowsOptions) {
  const list = (registrations || [])
    .map((registration) => {
      const courseId = registration?.courseId
      const info = resolveCourseInfo(courseId, registration?.course, courseConfigSet)
      const isInstallmentEligible = info?.installmentEligible === true
      if (!isInstallmentEligible) return null

      const maxWeeks = resolveMaxWeeks(info)
      const weeks = Number(registration?.weeks || 0)
      if (!maxWeeks || !Number.isFinite(weeks) || weeks <= 0) return null

      const courseIdKey = courseId !== undefined && courseId !== null ? String(courseId) : ""
      const studentStartDate = parseDate(registration?.startDate)
      const courseStartDate = courseEarliestStartMap.get(courseIdKey) || null
      const weekOffset = getWeekOffset(studentStartDate, courseStartDate)
      const studentMaxWeeks = Math.max(maxWeeks - weekOffset, 1)
      if (weeks >= studentMaxWeeks) return null

      const courseLabel =
        String(registration?.course || "").trim() ||
        (courseIdToLabel instanceof Map ? courseIdToLabel.get(courseIdKey) : "") ||
        ""
      const courseDays = getNormalizedCourseDays(
        info?.days,
        resolveCourseDays?.(String(registration?.course || ""))
      )
      const endDay = getResolvedEndDay(info)
      const endDate = registration?.endDate || ""
      const remainingWeeks = Math.max(studentMaxWeeks - weeks, 0)
      const breakRanges = getNormalizedBreakRanges(info?.breakRanges)
      const isWithdrawn = Boolean(registration?.withdrawnAt)

      const registrationId = String(registration?.id || "")
      const extensionList = extensionsByRegistration.get(registrationId) || []
      const upcomingExtension = extensionList
        .map((ext) => ({
          ...ext,
          start: parseDate(ext?.startDate),
        }))
        .filter((ext): ext is ExtensionRow & { start: Date } => Boolean(ext.start))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .find((ext) => ext.start.getTime() > today.getTime())

      let status: InstallmentStatus = "in_progress"
      if (upcomingExtension) {
        status = "notice_done"
      } else {
        const daysUntilEnd = diffInDays(today, endDate)
        if (daysUntilEnd !== null && daysUntilEnd <= 7) {
          status = "notice_needed"
        }
      }

      return {
        registration,
        courseLabel,
        maxWeeks,
        studentMaxWeeks,
        weeks,
        remainingWeeks,
        courseDays,
        endDay,
        endDate,
        status,
        extensionCount: extensionList.length,
        breakRanges,
        nextStartDate: getNextCourseDate(endDate, courseDays, breakRanges),
        isWithdrawn,
      }
    })
    .filter((row): row is InstallmentRow => Boolean(row))

  return sortInstallmentRows(list, sortConfig)
}
