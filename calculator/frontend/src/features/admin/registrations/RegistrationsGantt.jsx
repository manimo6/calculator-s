import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  ArrowRightLeft,
  CalendarRange,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RotateCcw,
  TimerOff,
  UserMinus,
  Video,
  X,
} from "lucide-react"

import {
  formatDateYmd,
  getRegistrationStatus,
  getStatusLabel,
  parseDate,
} from "./utils"
import { normalizeSkipWeeks } from "@/utils/calculatorLogic"

const LABEL_WIDTH_PX = 256
const NOTE_WIDTH_PX = 72
const WEEK_WIDTH_PX = 88
const ROW_HEIGHT_PX = 48
const BAR_HEIGHT_PX = 18
const RECORDING_ICON_PX = 16
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]
function addDays(date, days) {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + days)
  return d
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function formatWeekLabel(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return ""

  const sm = pad2(start.getMonth() + 1)
  const sd = pad2(start.getDate())
  const em = pad2(end.getMonth() + 1)
  const ed = pad2(end.getDate())

  return sm === em ? `${sm}/${sd}~${ed}` : `${sm}/${sd}~${em}/${ed}`
}

function formatDateKorean(date) {
  if (!(date instanceof Date)) return ""
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dow = WEEKDAY_LABELS[date.getDay()] || ""
  return `${month}월 ${day}일 (${dow})`
}

function normalizeCourseDays(courseDays) {
  if (!Array.isArray(courseDays)) return []
  return Array.from(
    new Set(
      courseDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )
  ).sort((a, b) => a - b)
}

function normalizeWeekRanges(ranges) {
  if (!Array.isArray(ranges)) return []
  return ranges
    .map((range) => ({
      start: Number(range?.start),
      end: Number(range?.end),
    }))
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 1 &&
        range.end >= range.start
    )
    .sort((a, b) => a.start - b.start || a.end - b.end)
}

function isWeekInRanges(relativeWeek, ranges) {
  if (!ranges.length) return true
  return ranges.some(
    (range) => relativeWeek >= range.start && relativeWeek <= range.end
  )
}

function getWeekClassDates(week, start, end, courseDays) {
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

function getWeekEndOffset(startDow, daySet) {
  let offset = 0
  for (let i = 0; i < 7; i += 1) {
    const dow = (startDow + i) % 7
    if (daySet.has(dow)) offset = i
  }
  return offset
}

function buildWeeks(rangeStart, rangeEnd, courseDays) {
  const start = parseDate(rangeStart)
  const end = parseDate(rangeEnd)
  if (!start || !end || start > end) return []

  const days = normalizeCourseDays(courseDays)
  const daySet = new Set(days)

  const weeks = []

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
  if (first > end) return []

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

function groupRecordingDates(recordingDates, weeks) {
  if (!Array.isArray(recordingDates) || !recordingDates.length || !weeks.length) {
    return []
  }

  const buckets = new Map()

  // Bucket recording dates by week index for icon placement.
  for (const value of new Set(recordingDates)) {
    const date = parseDate(value)
    if (!date) continue

    const weekIndex = weeks.findIndex(
      (week) => date >= week.start && date <= week.end
    )
    if (weekIndex < 0) continue

    if (!buckets.has(weekIndex)) buckets.set(weekIndex, [])
    buckets.get(weekIndex).push(date)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, dates]) => ({
      weekIndex,
      dates: dates.sort((a, b) => a - b),
    }))
}

function StatusPill({ status }) {
  const Icon =
    status === "active" ? CheckCircle2 : status === "pending" ? Clock : TimerOff
  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700"
  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {getStatusLabel(status)}
    </Badge>
  )
}


function stripMathExcludeLabel(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  return raw.replace(/\s*\(?수학\s*제외\)?\s*$/g, "").trim()
}

export default function RegistrationsGantt({
  registrations,
  rangeRegistrations,
  courseDays,
  getCourseDaysForCourse,
  mergeWeekRanges,
  onWithdraw,
  onRestore,
  onTransfer,
  onTransferCancel,
  onNote,
  maxHeightClassName = "max-h-[560px]",
}) {
  const ganttScrollRef = useRef(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)
  const openDetail = useCallback((row) => {
    if (!row) return
    setDetailTarget(row)
    setDetailOpen(true)
  }, [])
  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailTarget(null)
  }, [])
  useEffect(() => {
    if (!detailOpen) return
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDetail()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [detailOpen, closeDetail])
  const overlayClassName = `absolute inset-0 bg-slate-900/25 backdrop-blur-[2px] transition-opacity duration-500 ${
    detailOpen ? "opacity-100" : "opacity-0"
  }`
  const panelStateClass = detailOpen
    ? "translate-x-0 opacity-100"
    : "translate-x-full opacity-0"
  const panelClassName = `absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto rounded-none border-l border-slate-200/70 bg-gradient-to-b from-white/95 via-white/90 to-slate-50/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${panelStateClass}`
  const mergeWeekRangesNormalized = useMemo(
    () => normalizeWeekRanges(mergeWeekRanges),
    [mergeWeekRanges]
  )
  const model = useMemo(() => {
    const rows = (registrations || []).map((r) => {
      const start = parseDate(r?.startDate)
      const end = parseDate(r?.endDate) || start
      const status = getRegistrationStatus(r)
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

    const valid = rangeRows.filter((x) => x.start && x.end)
    if (!valid.length) {
      return {
        rows: rows.map((row) => ({ ...row, recordingWeeks: [] })),
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

    const rowsWithRecording = rows.map((row) => {
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
  }, [courseDays, getCourseDaysForCourse, rangeRegistrations, registrations])

  const gridTemplateColumns = useMemo(() => {
    return `${LABEL_WIDTH_PX}px ${NOTE_WIDTH_PX}px ${model.timelineWidth}px`
  }, [model.timelineWidth])

  const timelineWidth = model.timelineWidth
  const timelineOffset = LABEL_WIDTH_PX + NOTE_WIDTH_PX
  const detailStatus = detailTarget ? getRegistrationStatus(detailTarget) : "active"
  const detailIsWithdrawn = Boolean(
    detailTarget?.isWithdrawn || detailTarget?.withdrawnAt
  )
  const detailIsTransferredOut = Boolean(
    detailTarget?.isTransferredOut || detailTarget?.transferToId
  )
  const detailIsTransferChild = Boolean(detailTarget?.transferFromId)
  const detailCanWithdraw = !detailIsWithdrawn && !detailIsTransferredOut
  const detailCanTransfer =
    !detailIsWithdrawn && !detailIsTransferredOut && !detailIsTransferChild
  const detailCanTransferCancel = detailIsTransferChild && !detailIsTransferredOut
  const detailCourseLabel = stripMathExcludeLabel(detailTarget?.course)
  const detailStart = formatDateYmd(detailTarget?.startDate)
  const detailEnd = formatDateYmd(detailTarget?.endDate)
  const detailWeeks =
    detailTarget?.weeks !== null && detailTarget?.weeks !== undefined
      ? String(detailTarget.weeks)
      : ""

  const gridBackgroundImage = useMemo(() => {
    const line = "hsl(var(--foreground) / 0.12)"
    const step = Math.max(2, model.unitWidth)
    return `repeating-linear-gradient(to right, transparent 0, transparent ${step - 1}px, ${line} ${step - 1}px, ${line} ${step}px)`
  }, [model.unitWidth])

  const handleGanttWheel = useCallback((event) => {
    const container = event.currentTarget
    if (!container) return

    const target = event.target
    if (target && target.closest && target.closest("[data-gantt-left]")) return

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY

    if (!delta) return

    event.preventDefault()
    container.scrollLeft += delta
  }, [])

  useEffect(() => {
    const container = ganttScrollRef.current
    if (!container) return

    container.addEventListener("wheel", handleGanttWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleGanttWheel)
    }
  }, [handleGanttWheel])

  const weekTotals = useMemo(() => {
    if (!model.weeks.length) return []
    const globalStartIndex = model.globalStartIndex ?? 0
    return model.weeks.map((week, weekIndex) => {
      let count = 0
      for (const row of model.rows) {
        if (!row?.start || !row?.end) continue
        const startIndex = row.startIndex
        if (startIndex >= 0) {
          const mergeRelativeWeek = weekIndex - globalStartIndex + 1
          if (!isWeekInRanges(mergeRelativeWeek, mergeWeekRangesNormalized)) continue
          const studentRelativeWeek = weekIndex - startIndex + 1
          if (row.skipWeeks?.includes(studentRelativeWeek)) continue
        }
        if (Array.isArray(row.courseDays) && row.courseDays.length > 0) {
          const dates = getWeekClassDates(week, row.start, row.end, row.courseDays)
          if (dates.length) count += 1
        } else {
          const overlaps = !(row.end < week.start || row.start > week.end)
          if (overlaps) count += 1
        }
      }
      return count
    })
  }, [mergeWeekRangesNormalized, model.rows, model.weeks])

  return (
    <>
    <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">등록현황 차트</CardTitle>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            {model.range ? (
              <span>
                {formatDateYmd(model.range.start)} ~ {formatDateYmd(model.range.end)}
              </span>
            ) : (
              <span>표시할 기간 정보가 없습니다.</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            행을 클릭하면 상세/전반/퇴원 처리를 할 수 있습니다.
          </div>
        </div>
        <Badge variant="secondary">주단위</Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {!model.range ? (
          <div className="rounded-xl border border-border/60 bg-background px-4 py-6 text-sm text-muted-foreground">등록현황 차트를 만들 수 있는 날짜 정보가 없습니다.</div>
        ) : !model.weeks.length ? (
          <div className="rounded-xl border border-border/60 bg-background px-4 py-6 text-sm text-muted-foreground">주차 정보를 계산할 수 없습니다.</div>
        ) : (
          <TooltipProvider delayDuration={180}>
            <div className="rounded-xl border border-border/60 bg-background">
              <div
                ref={ganttScrollRef}
                className={`overflow-auto no-scrollbar [overscroll-behavior:contain] ${maxHeightClassName}`}
              >
                <div style={{ minWidth: LABEL_WIDTH_PX + NOTE_WIDTH_PX + timelineWidth }}>
                <div
                  className="sticky top-0 z-30 grid border-b border-border/60 bg-background"
                  style={{ gridTemplateColumns }}
                >
                  <div
                    data-gantt-left
                    className="sticky left-0 z-40 flex items-center border-r-2 border-border/70 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
                  >학생/과목</div>
                  <div
                    data-gantt-left
                    className="sticky left-0 z-30 flex items-center justify-center gap-1 bg-background px-2 py-2 text-xs font-semibold text-muted-foreground relative"
                    style={{ left: LABEL_WIDTH_PX }}
                  >
                    <span className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-slate-300/80" />
                    <FileText className="h-3.5 w-3.5" />
                    메모
                  </div>
                  <div
                    className="grid border-r border-border/60"
                    style={{
                      gridTemplateColumns: `repeat(${model.weeks.length}, ${model.unitWidth}px)`,
                      width: timelineWidth,
                      backgroundImage: gridBackgroundImage,
                    }}
                  >
                    {model.weeks.map((w, i) => (
                      <div
                        key={i}
                        className="overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-center text-xs font-bold leading-none text-foreground"
                        title={`${formatDateYmd(w.start)} ~ ${formatDateYmd(w.end)}`}
                      >
                        {formatWeekLabel(w.start, w.end)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-y-0 z-0"
                    style={{
                      left: timelineOffset,
                      width: timelineWidth,
                      backgroundImage: gridBackgroundImage,
                    }}
                  />
                  {model.rows.map(({ r, start, end, status, isWithdrawn, isTransferredOut, recordingWeeks, courseDays: rowCourseDays, skipWeeks, startIndex, endIndex }, idx) => {
                  const hasDates = start && end
                  const globalStartIndex = model.globalStartIndex ?? 0
                  const courseLabel = stripMathExcludeLabel(r?.course)
                  const noteText = String(r?.note || "").trim()
                  const hasNote = noteText.length > 0
                  const notePreview =
                    noteText.length > 10 ? `${noteText.slice(0, 10)}...` : noteText
                  const isMathExcluded =
                    !!r?.excludeMath || String(r?.course || "").includes("수학 제외")

                  const barClass =
                    status === "active"
                      ? "bg-emerald-500/70"
                      : status === "pending"
                        ? "bg-amber-500/70"
                        : status === "completed"
                          ? "bg-zinc-400/70"
                          : "bg-muted-foreground/40"

                  const recordingWeekMap = new Map()
                  const recordingDateSet = new Set()
                  for (const bucket of recordingWeeks || []) {
                    recordingWeekMap.set(bucket.weekIndex, bucket.dates)
                    for (const date of bucket.dates) {
                      recordingDateSet.add(date.getTime())
                    }
                  }

                  const hasCourseDays =
                    Array.isArray(rowCourseDays) && rowCourseDays.length > 0
                  const segmentBars = []
                  const recordingMarkers = []

                  const skipWeekSet = new Set(skipWeeks || [])

                  if (hasDates && startIndex !== -1 && endIndex !== -1) {
                    const pad = 4
                    for (let weekIndex = startIndex; weekIndex <= endIndex; weekIndex += 1) {
                      const week = model.weeks[weekIndex]
                      if (!week) continue
                      const mergeRelativeWeek = weekIndex - globalStartIndex + 1
                      if (!isWeekInRanges(mergeRelativeWeek, mergeWeekRangesNormalized)) continue
                      const studentRelativeWeek = weekIndex - startIndex + 1
                      if (skipWeekSet.has(studentRelativeWeek)) continue

                      const recordedDates = recordingWeekMap.get(weekIndex) || []
                      let mode = "none"
                      let tooltipDates = []

                      if (hasCourseDays) {
                        const classDates = getWeekClassDates(
                          week,
                          start,
                          end,
                          rowCourseDays
                        )
                        if (!classDates.length) continue

                        const recordedInWeek = classDates.filter((date) =>
                          recordingDateSet.has(date.getTime())
                        )

                        if (recordedInWeek.length === 0) {
                          mode = "none"
                        } else if (recordedInWeek.length >= classDates.length) {
                          mode = "all"
                          tooltipDates = recordedInWeek
                        } else {
                          mode = "partial"
                          tooltipDates = recordedInWeek
                        }
                      } else if (recordedDates.length) {
                        mode = "partial"
                        tooltipDates = recordedDates
                      }

                      const segmentLeft = weekIndex * model.unitWidth + pad
                      const segmentWidth = Math.max(
                        6,
                        model.unitWidth - pad * 2
                      )
                      const iconLeft = weekIndex * model.unitWidth + model.unitWidth / 2

                      if (mode !== "all") {
                        segmentBars.push(
                          <div
                            key={`${r?.id || idx}-bar-${weekIndex}`}
                            className={`absolute top-1/2 -translate-y-1/2 rounded-none ${barClass}`}
                            style={{
                              left: segmentLeft,
                              width: segmentWidth,
                              height: BAR_HEIGHT_PX,
                            }}
                            title={`${r?.name || "-"} · ${courseLabel || "-"} (${formatDateYmd(start)}~${formatDateYmd(end)})`}
                          />
                        )
                      }

                      if (mode !== "none") {
                        const markerClassName =
                          "absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_55%),conic-gradient(from_210deg_at_50%_50%,#F7A83E_0deg,#FB4A75_110deg,#C39CFD_210deg,#6BB5EE_310deg,#F7A83E_360deg)] p-0.5 text-white shadow-sm transition hover:shadow-md"
                        const tooltipItems = tooltipDates.map((date) => ({
                          key: date.getTime(),
                          label: formatDateKorean(date),
                        }))

                        recordingMarkers.push(
                          <Tooltip key={`${r?.id || idx}-recording-${weekIndex}`}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={markerClassName}
                                style={{ left: iconLeft }}
                                aria-label="녹화 날짜"
                              >
                                <Video className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <div className="space-y-0.5">
                                {tooltipItems.map((item) => (
                                  <div key={item.key}>{item.label}</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      }
                    }
                  }

                  return (
                    <div
                      key={`${r?.id || idx}`}
                      className="group relative z-10 grid"
                      style={{ gridTemplateColumns, height: ROW_HEIGHT_PX }}
                      onClick={() => openDetail(r)}
                    >
                      <div
                        data-gantt-left
                        className="sticky left-0 z-30 border-b-2 border-r-2 border-border/70 bg-background/95 px-3 py-1.5 backdrop-blur transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(r)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            openDetail(r)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold">
                                {r?.name || "-"}
                              </div>
                              {isMathExcluded ? (
                                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">수학 제외</Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {courseLabel || "-"}
                            </div>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <div className="flex items-center gap-2">
                              {isTransferredOut ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800"
                                >
                                  전반
                                </Badge>
                              ) : isWithdrawn ? (
                                <Badge
                                  variant="outline"
                                  className="border-rose-300 bg-rose-50 text-rose-700"
                                >
                                  중도퇴원
                                </Badge>
                              ) : (
                                <StatusPill status={status} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        data-gantt-left
                        className="sticky left-0 z-20 flex items-center justify-center border-b-2 bg-background/95 px-2 relative"
                        style={{ left: LABEL_WIDTH_PX }}
                      >
                        <span className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-slate-300/80" />
                        {typeof onNote === "function" ? (
                          hasNote ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur transition hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onNote(r)
                                  }}
                                  aria-label="메모 보기/수정"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={8}
                                className="rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur"
                              >
                                {notePreview}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-transparent text-slate-400 opacity-0 transition group-hover:opacity-100 hover:border-slate-200 hover:bg-white/80 hover:text-slate-700 hover:shadow-sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                onNote(r)
                              }}
                              aria-label="메모 추가"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )
                        ) : null}
                      </div>

                      <div
                        className="relative border-r border-border/60"
                        style={{
                          width: timelineWidth,
                          height: "100%",
                        }}
                      >
                        {hasDates && startIndex !== -1 && endIndex !== -1 ? (
                          <>
                            {segmentBars}
                            {recordingMarkers}
                          </>
                        ) : (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">날짜 정보 없음</div>
                        )}
                      </div>
                    </div>
                  )
                })}
                  {model.weeks.length ? (
                    <div
                      className="relative z-10 grid border-t border-border/60"
                      style={{ gridTemplateColumns }}
                    >
                      <div
                        data-gantt-left
                        className="sticky left-0 z-20 border-r-2 border-border/70 bg-background/95 px-3 py-2 text-xs font-semibold text-muted-foreground"
                      >주차 합계</div>
                      <div
                        data-gantt-left
                        className="sticky left-0 z-10 bg-background/95 px-2 py-2 text-xs text-muted-foreground relative"
                        style={{ left: LABEL_WIDTH_PX }}
                      >
                        <span className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-slate-300/80" />
                        -
                      </div>
                      <div
                        className="grid border-r border-border/60"
                        style={{
                          gridTemplateColumns: `repeat(${model.weeks.length}, ${model.unitWidth}px)`,
                          width: timelineWidth,
                        }}
                      >
                        {weekTotals.map((count, i) => (
                          <div
                            key={`week-total-${i}`}
                            className="flex items-center justify-center px-1 py-2 text-xs font-semibold text-foreground"
                          >
                            {count}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
    <div
      className={`fixed inset-0 z-50 ${detailOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!detailOpen}
    >
      <div
        className={overlayClassName}
        onClick={closeDetail}
      />
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full border border-slate-200/70 bg-white/80 p-1.5 text-slate-500 shadow-sm transition hover:text-slate-800"
          onClick={closeDetail}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">닫기</span>
        </button>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
              등록현황
            </div>
            <div className="text-xl font-semibold text-slate-900">등록현황 상세</div>
          </div>
          <div className="text-sm text-slate-500">
            차트에서 선택한 학생의 상태와 전반/퇴원 처리를 확인합니다.
          </div>
        </div>
        {detailTarget ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    학생
                  </div>
                  <div className="mt-1 truncate text-2xl font-semibold text-slate-900">
                    {detailTarget?.name || "-"}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {detailCourseLabel || detailTarget?.course || "-"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {detailIsTransferredOut ? (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                      전반
                    </Badge>
                  ) : detailIsWithdrawn ? (
                    <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                      중도퇴원
                    </Badge>
                  ) : (
                    <StatusPill status={detailStatus} />
                  )}
                  {detailWeeks ? <Badge variant="secondary">{detailWeeks}주</Badge> : null}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarRange className="h-4 w-4" />
                <span>
                  {detailStart && detailEnd ? `${detailStart} ~ ${detailEnd}` : detailStart || "-"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                선택한 기간 기준으로 표시됩니다.
              </div>
            </div>
            <div className="mt-auto border-t border-slate-200/60 pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {detailIsWithdrawn ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full rounded-lg border-emerald-200/80 text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    onClick={() => {
                      onRestore?.(detailTarget)
                      closeDetail()
                    }}
                  >
                    복구
                  </Button>
                ) : null}
                {detailCanTransferCancel && onTransferCancel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-lg border-amber-200/80 text-amber-700 shadow-sm transition hover:bg-amber-50"
                    onClick={() => {
                      onTransferCancel?.(detailTarget)
                      closeDetail()
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    전반취소
                  </Button>
                ) : detailCanTransfer && onTransfer ? (
                  <Button
                    type="button"
                    className="h-10 w-full gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                    onClick={() => {
                      onTransfer?.(detailTarget)
                      closeDetail()
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    전반
                  </Button>
                ) : null}
                {detailCanWithdraw ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-lg border-rose-200/80 text-rose-600 shadow-sm transition hover:bg-rose-50"
                    onClick={() => {
                      onWithdraw?.(detailTarget)
                      closeDetail()
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                    퇴원
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">선택된 항목이 없습니다.</div>
        )}
      </div>
    </div>
    </>
  )
}







