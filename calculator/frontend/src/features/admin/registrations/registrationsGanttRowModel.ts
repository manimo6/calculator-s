import {
  BAR_HEIGHT_PX,
  formatDateKorean,
  getWeekClassDates,
  isWeekInRanges,
  type ModelRow,
  type RegistrationRow,
  type WeekRangeDates,
} from "./registrationsGanttModel"
import { formatDateYmd, isDailyRegistration, stripMathExcludeLabel, type NormalizedWeekRange } from "./utils"

export type GanttBarDescriptor = {
  key: string
  left: number
  width: number
  height: number
  title: string
  className: string
}

export type GanttMarkerDescriptor = {
  key: string
  left: number
  labels: string[]
}

export type GanttRowMeta = {
  courseLabel: string
  noteText: string
  notePreview: string
  hasNote: boolean
  isMathExcluded: boolean
  barClassName: string
}

const ACTIVE_BAR_CLASS =
  "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-500/20"
const PENDING_BAR_CLASS =
  "bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-500/20"
const COMPLETED_BAR_CLASS = "bg-gradient-to-r from-zinc-300 to-zinc-400"
const UNKNOWN_BAR_CLASS = "bg-muted-foreground/40"
const TRANSFERRED_BAR_CLASS =
  "bg-[repeating-linear-gradient(135deg,_#94a3b8_0px,_#94a3b8_2px,_#e2e8f0_2px,_#e2e8f0_12px)] ring-1 ring-slate-300"
const GHOST_BAR_CLASS = `${TRANSFERRED_BAR_CLASS} opacity-40`

export function buildGanttRowMeta({
  registration,
  status,
  isTransferredOut,
}: {
  registration: RegistrationRow
  status: string
  isTransferredOut: boolean
}): GanttRowMeta {
  const courseLabel = stripMathExcludeLabel(registration?.course)
  const noteText = String(registration?.note || "").trim()
  const isMathExcluded =
    !!registration?.excludeMath || String(registration?.course || "").includes("수학 제외")

  const barClassName = isTransferredOut
    ? TRANSFERRED_BAR_CLASS
    : status === "active"
      ? ACTIVE_BAR_CLASS
      : status === "pending"
        ? PENDING_BAR_CLASS
        : status === "completed"
          ? COMPLETED_BAR_CLASS
          : UNKNOWN_BAR_CLASS

  return {
    courseLabel,
    noteText,
    notePreview: noteText.length > 10 ? `${noteText.slice(0, 10)}...` : noteText,
    hasNote: noteText.length > 0,
    isMathExcluded,
    barClassName,
  }
}

function buildRecordingMaps(recordingWeeks: ModelRow["recordingWeeks"]) {
  const recordingWeekMap = new Map<number, Date[]>()
  const recordingDateSet = new Set<number>()

  for (const bucket of recordingWeeks || []) {
    recordingWeekMap.set(bucket.weekIndex, bucket.dates)
    for (const date of bucket.dates) {
      recordingDateSet.add(date.getTime())
    }
  }

  return { recordingWeekMap, recordingDateSet }
}

export function buildGanttTimelineDescriptors({
  row,
  rowIndex,
  weeks,
  unitWidth,
  globalStartIndex,
  mergeWeekRangesNormalized,
}: {
  row: ModelRow
  rowIndex: number
  weeks: WeekRangeDates[]
  unitWidth: number
  globalStartIndex: number
  mergeWeekRangesNormalized: NormalizedWeekRange[]
}) {
  const {
    r,
    start,
    end,
    recordingWeeks,
    courseDays: rowCourseDays,
    skipWeeks,
    startIndex,
    endIndex,
    transferSegments,
    isTransferredOut,
    status,
  } = row

  const meta = buildGanttRowMeta({
    registration: r,
    status,
    isTransferredOut,
  })

  const hasDates = Boolean(start && end)
  const bars: GanttBarDescriptor[] = []
  const markers: GanttMarkerDescriptor[] = []
  const { recordingWeekMap, recordingDateSet } = buildRecordingMaps(recordingWeeks)
  const skipWeekSet = new Set(skipWeeks || [])
  const hasCourseDays = Array.isArray(rowCourseDays) && rowCourseDays.length > 0
  const pad = 3
  const isRowDaily = isDailyRegistration(r)
  const rowSelectedDatesSet = isRowDaily && Array.isArray(r?.selectedDates) && r.selectedDates.length > 0
    ? new Set(r.selectedDates)
    : null

  if (hasDates && start && end && startIndex !== -1 && endIndex !== -1) {
    for (let weekIndex = startIndex; weekIndex <= endIndex; weekIndex += 1) {
      const week = weeks[weekIndex]
      if (!week) continue

      // 일 단위 컬럼(start===end)에서만 selectedDates 필터 적용
      const isDailyColumn = week.start.getTime() === week.end.getTime()
      if (rowSelectedDatesSet && isDailyColumn && !rowSelectedDatesSet.has(formatDateYmd(week.start) ?? "")) continue

      const mergeRelativeWeek = weekIndex - globalStartIndex + 1
      if (!isWeekInRanges(mergeRelativeWeek, mergeWeekRangesNormalized)) continue

      const studentRelativeWeek = weekIndex - startIndex + 1
      if (skipWeekSet.has(studentRelativeWeek)) continue

      const recordedDates = recordingWeekMap.get(weekIndex) || []
      let mode: "none" | "all" | "partial" = "none"
      let tooltipDates: Date[] = []

      if (hasCourseDays && !(rowSelectedDatesSet && isDailyColumn)) {
        const classDates = getWeekClassDates(week, start, end, rowCourseDays)
        if (!classDates.length) continue

        const recordedInWeek = classDates.filter((date) =>
          recordingDateSet.has(date.getTime())
        )

        if (recordedInWeek.length >= classDates.length) {
          mode = "all"
          tooltipDates = recordedInWeek
        } else if (recordedInWeek.length > 0) {
          mode = "partial"
          tooltipDates = recordedInWeek
        }
      } else if (recordedDates.length) {
        mode = "partial"
        tooltipDates = recordedDates
      }

      const left = weekIndex * unitWidth + pad
      const width = Math.max(6, unitWidth - pad * 2)

      if (mode !== "all") {
        bars.push({
          key: `${r?.id || rowIndex}-bar-${weekIndex}`,
          left,
          width,
          height: BAR_HEIGHT_PX,
          title: `${r?.name || "-"} · ${meta.courseLabel || "-"} (${formatDateYmd(start)}~${formatDateYmd(end)})`,
          className: meta.barClassName,
        })
      }

      if (mode !== "none") {
        markers.push({
          key: `${r?.id || rowIndex}-recording-${weekIndex}`,
          left: weekIndex * unitWidth + unitWidth / 2,
          labels: tooltipDates.map((date) => formatDateKorean(date)),
        })
      }
    }
  }

  if (transferSegments?.length) {
    for (const segment of transferSegments) {
      if (segment.startIndex === -1 || segment.endIndex === -1) continue
      const segmentSkipSet = new Set(segment.skipWeeks || [])

      for (let weekIndex = segment.startIndex; weekIndex <= segment.endIndex; weekIndex += 1) {
        const week = weeks[weekIndex]
        if (!week) continue

        const mergeRelativeWeek = weekIndex - globalStartIndex + 1
        if (!isWeekInRanges(mergeRelativeWeek, mergeWeekRangesNormalized)) continue

        const studentRelativeWeek = weekIndex - segment.startIndex + 1
        if (segmentSkipSet.has(studentRelativeWeek)) continue

        bars.push({
          key: `${segment.r?.id || "seg"}-ghost-${weekIndex}`,
          left: weekIndex * unitWidth + pad,
          width: Math.max(6, unitWidth - pad * 2),
          height: BAR_HEIGHT_PX,
          title: `${stripMathExcludeLabel(segment.r?.course) || "-"} (${formatDateYmd(segment.start)}~${formatDateYmd(segment.end)})`,
          className: GHOST_BAR_CLASS,
        })
      }
    }
  }

  return {
    hasDates: hasDates && startIndex !== -1 && endIndex !== -1,
    bars,
    markers,
    meta,
  }
}
