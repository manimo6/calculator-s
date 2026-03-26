import { getRegistrationStatus, parseDate, type NormalizedWeekRange } from "./utils"
import { normalizeSkipWeeks } from "@/utils/calculatorLogic"

import {
  WEEK_WIDTH_PX,
  type RecordingWeek,
  type WeekRangeDates,
  buildWeeks,
  getWeekClassDates,
  groupRecordingDates,
  isWeekInRanges,
} from "./registrationsGanttShared"

export {
  BAR_HEIGHT_PX,
  LABEL_WIDTH_PX,
  NOTE_WIDTH_PX,
  ROW_HEIGHT_PX,
  WEEK_WIDTH_PX,
  adjustEndToLastClassDay,
  buildWeeks,
  formatDateKorean,
  formatWeekLabel,
  getWeekClassDates,
  isWeekInRanges,
} from "./registrationsGanttShared"

export type { RecordingWeek, WeekRangeDates } from "./registrationsGanttShared"

export type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: string | number
  skipWeeks?: Array<number | string>
  breakWeeks?: number[]
  withdrawnAt?: string | Date
  isWithdrawn?: boolean
  isTransferredOut?: boolean
  transferToId?: string | number
  transferFromId?: string | number
  recordingDates?: Array<string | Date>
  note?: string
} & Record<string, unknown>

export type BaseRow = {
  r: RegistrationRow
  start: Date | null
  end: Date | null
  status: string
  isWithdrawn: boolean
  isTransferredOut: boolean
  recordingDates: Array<string | Date>
  courseDays: number[]
}

export type ModelRow = BaseRow & {
  recordingWeeks: RecordingWeek[]
  skipWeeks: number[]
  startIndex: number
  endIndex: number
  transferSegments?: ModelRow[]
}

export type RangeRow = {
  start: Date
  end: Date
}

export type RegistrationsGanttModel = {
  rows: ModelRow[]
  range: RangeRow | null
  weeks: WeekRangeDates[]
  globalStartIndex?: number
  unitWidth: number
  timelineWidth: number
}

type BuildRegistrationsGanttModelParams = {
  registrations: RegistrationRow[]
  rangeRegistrations: RegistrationRow[]
  courseDays: number[]
  getCourseDaysForCourse?: (courseName?: string) => number[]
  simulationDate?: Date | null
}

export function buildRegistrationsGanttModel({
  registrations,
  rangeRegistrations,
  courseDays,
  getCourseDaysForCourse,
  simulationDate = null,
}: BuildRegistrationsGanttModelParams): RegistrationsGanttModel {
  const rows = (registrations || []).map<BaseRow>((r) => {
    const start = parseDate(r?.startDate)
    const end = parseDate(r?.endDate) || start
    const status = getRegistrationStatus(r, simulationDate || undefined)
    const isWithdrawn = Boolean(r?.isWithdrawn || r?.withdrawnAt)
    const isTransferredOut = Boolean(r?.isTransferredOut || r?.transferToId)
    const recordingDates = Array.isArray(r?.recordingDates) ? r.recordingDates : []
    const rowCourseDays =
      typeof getCourseDaysForCourse === "function"
        ? getCourseDaysForCourse(r?.course)
        : []
    const effectiveCourseDays = rowCourseDays.length ? rowCourseDays : courseDays

    return {
      r,
      start,
      end,
      status,
      isWithdrawn,
      isTransferredOut,
      recordingDates,
      courseDays: effectiveCourseDays,
    }
  })

  const rangeSource =
    Array.isArray(rangeRegistrations) && rangeRegistrations.length
      ? rangeRegistrations
      : registrations || []

  const rangeRows = (rangeSource || []).map((r) => {
    const start = parseDate(r?.startDate)
    const end = parseDate(r?.endDate) || start
    return { start, end }
  })

  const valid = rangeRows.filter((x): x is RangeRow => Boolean(x.start && x.end))
  if (!valid.length) {
    return {
      rows: rows.map<ModelRow>((row) => ({
        ...row,
        recordingWeeks: [],
        skipWeeks: [],
        startIndex: -1,
        endIndex: -1,
      })),
      range: null,
      weeks: [],
      unitWidth: WEEK_WIDTH_PX,
      timelineWidth: 0,
    }
  }

  const minStart = valid.reduce(
    (min, x) => (x.start < min ? x.start : min),
    valid[0].start
  )
  const maxEnd = valid.reduce(
    (max, x) => (x.end > max ? x.end : max),
    valid[0].end
  )

  let weeks = buildWeeks(minStart, maxEnd, courseDays)
  if (!weeks.length) weeks = buildWeeks(minStart, maxEnd, [])

  const rowsWithRecording = rows.map<ModelRow>((row) => {
    const paidWeeks = Number(row?.r?.weeks) || 0
    const skipWeeks = normalizeSkipWeeks(row?.r?.skipWeeks, paidWeeks)
    const breakWeeks = Array.isArray(row?.r?.breakWeeks) ? row.r.breakWeeks : []
    const combinedSkipWeeks = Array.from(new Set([...skipWeeks, ...breakWeeks])).sort(
      (a, b) => a - b
    )
    let startIndex = -1
    let endIndex = -1

    if (row.start && row.end) {
      for (let i = 0; i < weeks.length; i += 1) {
        const w = weeks[i]
        const overlaps = !(row.end < w.start || row.start > w.end)
        if (overlaps && startIndex === -1) startIndex = i
        if (overlaps) endIndex = i
      }
    }

    return {
      ...row,
      skipWeeks: combinedSkipWeeks,
      startIndex,
      endIndex,
      recordingWeeks: groupRecordingDates(row.recordingDates, weeks),
    }
  })

  const globalStartIndex = rowsWithRecording.reduce((min, row) => {
    if (row.startIndex >= 0) {
      return Math.min(min, row.startIndex)
    }
    return min
  }, Number.POSITIVE_INFINITY)
  const normalizedGlobalStartIndex = Number.isFinite(globalStartIndex)
    ? globalStartIndex
    : 0

  return {
    rows: rowsWithRecording,
    range: { start: minStart, end: maxEnd },
    weeks,
    globalStartIndex: normalizedGlobalStartIndex,
    unitWidth: WEEK_WIDTH_PX,
    timelineWidth: weeks.length * WEEK_WIDTH_PX,
  }
}

export function buildWeekTotals(
  model: RegistrationsGanttModel,
  mergeWeekRangesNormalized: NormalizedWeekRange[]
) {
  if (!model.weeks.length) return []
  const globalStartIndex = model.globalStartIndex ?? 0

  return model.weeks.map((week, weekIndex) => {
    let count = 0
    let transferred = 0

    for (const row of model.rows) {
      if (!row?.start || !row?.end) continue
      const startIndex = row.startIndex
      let inWeek = false

      if (startIndex >= 0) {
        const mergeRelativeWeek = weekIndex - globalStartIndex + 1
        if (!isWeekInRanges(mergeRelativeWeek, mergeWeekRangesNormalized)) continue
        const studentRelativeWeek = weekIndex - startIndex + 1
        if (row.skipWeeks?.includes(studentRelativeWeek)) continue
      }

      if (Array.isArray(row.courseDays) && row.courseDays.length > 0) {
        const dates = getWeekClassDates(week, row.start, row.end, row.courseDays)
        inWeek = dates.length > 0
      } else {
        inWeek = !(row.end < week.start || row.start > week.end)
      }

      if (inWeek) {
        if (row.isTransferredOut) {
          transferred += 1
        } else {
          count += 1
        }
      }
    }

    return { count, transferred }
  })
}
