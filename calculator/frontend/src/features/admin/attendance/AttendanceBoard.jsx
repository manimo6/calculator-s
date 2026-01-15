import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
} from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { apiClient } from "@/api-client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getBreakDateSet, getEndDate, getScheduleWeeks, normalizeSkipWeeks } from "@/utils/calculatorLogic"
import { parseDate } from "../registrations/utils"

const LABEL_WIDTH_PX = 240
const DAY_WIDTH_PX = 44
const ROW_HEIGHT_PX = 50

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]

const STATUS_STYLES = [
  {
    key: "pending",
    label: "미입력",
    shortLabel: "",
    className: "border-border/70 bg-background/60 text-muted-foreground",
    cellClassName:
      "border-slate-400/80 bg-white text-transparent border-2 border-dashed",
  },
  {
    key: "present",
    label: "출석",
    shortLabel: "출",
    className: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    cellClassName: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  },
  {
    key: "recorded",
    label: "녹화강의",
    shortLabel: "녹",
    className: "border-sky-200/80 bg-sky-50 text-sky-700",
    cellClassName: "border-sky-200/80 bg-sky-50 text-sky-700",
  },
  {
    key: "late",
    label: "지각",
    shortLabel: "지",
    className: "border-amber-200/80 bg-amber-50 text-amber-800",
    cellClassName: "border-amber-200/80 bg-amber-50 text-amber-800",
  },
  {
    key: "absent",
    label: "결석",
    shortLabel: "결",
    className: "border-rose-200/80 bg-rose-50 text-rose-700",
    cellClassName: "border-rose-200/80 bg-rose-50 text-rose-700",
  },
]

const STATUS_LOOKUP = STATUS_STYLES.reduce((acc, status) => {
  acc[status.key] = status
  return acc
}, {})
const PAINT_STATUS_ORDER = ["present", "recorded", "late", "absent", "pending"]
const PAINTABLE_STATUSES = PAINT_STATUS_ORDER.map(
  (key) => STATUS_LOOKUP[key]
).filter(Boolean)

const NO_CLASS_LABEL = "-"
const OFF_DAY_LABEL = "등록안함"

function getRowKey(row, index) {
  if (row?.id !== undefined && row?.id !== null) return String(row.id)
  const name = row?.name || "row"
  const course = row?.course || "course"
  return `${name}-${course}-${index}`
}

function normalizeCourseDays(days) {
  if (!Array.isArray(days)) return []
  return Array.from(
    new Set(days.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))
  ).sort((a, b) => a - b)
}

function getWeekIndex(date, start) {
  return Math.floor((date.getTime() - start.getTime()) / WEEK_MS) + 1
}

function hasUpcomingClasses(meta, todayStart) {
  if (!meta?.start || !meta?.end || !(todayStart instanceof Date)) return true
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
        !skipWeekSet.has(getWeekIndex(cursor, meta.start)) &&
        !breakDateSet.has(dateKey)
      )
        return true
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  }

  return false
}

export default function AttendanceBoard({
  registrations = [],
  getCourseDaysForCourse,
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [paintStatus, setPaintStatus] = useState("present")
  const [cellStatuses, setCellStatuses] = useState({})
  const [hideInactive, setHideInactive] = useState(false)
  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => parseDate(new Date()), [])
  const paintingRef = useRef(false)
  const paintStatusRef = useRef(paintStatus)

  useEffect(() => {
    paintStatusRef.current = paintStatus
  }, [paintStatus])

  useEffect(() => {
    const handlePointerUp = () => {
      paintingRef.current = false
    }

    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [])

  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return eachDayOfInterval({ start, end })
  }, [month])

  const gridTemplateColumns = useMemo(
    () => `${LABEL_WIDTH_PX}px repeat(${days.length}, ${DAY_WIDTH_PX}px)`,
    [days.length]
  )

  const minWidth = useMemo(
    () => LABEL_WIDTH_PX + days.length * DAY_WIDTH_PX,
    [days.length]
  )

  const registrationIds = useMemo(
    () =>
      (registrations || [])
        .map((row) => String(row?.id || "").trim())
        .filter(Boolean),
    [registrations]
  )

  const rowMetaMap = useMemo(() => {
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
      const breakRanges = Array.isArray(row?.breakRanges) ? row.breakRanges : []
      const paidWeeks = Number(row?.weeks) || Number(row?.period) || 0
      const rawSkipWeeks = Array.isArray(row?.skipWeeks) ? row.skipWeeks : []
      const withdrawnAt = parseDate(row?.withdrawnAt)
      const isTransferredOut = Boolean(row?.isTransferredOut || row?.transferToId)
      const transferAt = isTransferredOut ? parseDate(row?.transferAt) : null
      const inactiveAt = transferAt || withdrawnAt
      const scheduleMeta =
        paidWeeks > 0 && start
          ? getScheduleWeeks({
              startDate: start,
              durationWeeks: paidWeeks,
              skipWeeks: rawSkipWeeks,
              courseDays,
              endDayOfWeek: endDay,
              breakRanges,
            })
          : { scheduleWeeks: 0, skipWeeks: normalizeSkipWeeks(rawSkipWeeks, paidWeeks), breakWeekSet: new Set() }
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
          .filter(Boolean)
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
      })

      return map
    }, new Map())
  }, [getCourseDaysForCourse, registrations])

  const rowEntries = useMemo(
    () =>
      (registrations || []).map((row, index) => {
        const rowKey = getRowKey(row, index)
        return { row, rowKey, meta: rowMetaMap.get(rowKey) }
      }),
    [registrations, rowMetaMap]
  )

  const visibleRows = useMemo(() => {
    if (!hideInactive) return rowEntries
    return rowEntries.filter(({ meta }) => {
      if (meta?.inactiveAt) return false
      return hasUpcomingClasses(meta, todayStart)
    })
  }, [hideInactive, rowEntries, todayStart])

  const loadAttendance = useCallback(async () => {
    if (!registrationIds.length) {
      setCellStatuses({})
      return
    }

    try {
      const res = await apiClient.listAttendance({
        month: format(month, "yyyy-MM"),
        registrationIds,
      })
      const results = Array.isArray(res?.results) ? res.results : []
      const next = {}

      for (const record of results) {
        const registrationId = String(record?.registrationId || "").trim()
        const date = String(record?.date || "").trim()
        const status = String(record?.status || "").trim()
        if (!registrationId || !date || !status) continue
        if (!next[registrationId]) next[registrationId] = {}
        next[registrationId][date] = status
      }

      setCellStatuses(next)
    } catch (error) {
      console.error("Failed to load attendance records:", error)
    }
  }, [month, registrationIds])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const setCellStatus = useCallback((rowKey, dateKey, status) => {
    setCellStatuses((prev) => {
      const rowStatus = prev[rowKey] || {}
      if (rowStatus[dateKey] === status) return prev

      return {
        ...prev,
        [rowKey]: {
          ...rowStatus,
          [dateKey]: status,
        },
      }
    })
  }, [])

  const persistAttendance = useCallback(async (registrationId, dateKey, status) => {
    if (!registrationId) return
    try {
      await apiClient.saveAttendance({
        registrationId,
        date: dateKey,
        status,
      })
    } catch (error) {
      console.error("Failed to save attendance:", error)
    }
  }, [])

  const handlePaintStart = useCallback(
    (event, rowKey, dateKey, registrationId) => {
      if (event.button !== 0) return
      event.preventDefault()
      paintingRef.current = true
      const nextStatus = paintStatusRef.current
      setCellStatus(rowKey, dateKey, nextStatus)
      persistAttendance(registrationId, dateKey, nextStatus)
    },
    [persistAttendance, setCellStatus]
  )

  const handlePaintEnter = useCallback(
    (rowKey, dateKey, registrationId) => {
      if (!paintingRef.current) return
      const nextStatus = paintStatusRef.current
      setCellStatus(rowKey, dateKey, nextStatus)
      persistAttendance(registrationId, dateKey, nextStatus)
    },
    [persistAttendance, setCellStatus]
  )

  const handlePrevMonth = () => setMonth((prev) => addMonths(prev, -1))
  const handleNextMonth = () => setMonth((prev) => addMonths(prev, 1))

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(245,244,239,0.85)_55%,rgba(236,240,246,0.9)_100%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            출석부
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">페인트</span>
            {PAINTABLE_STATUSES.map((status) => {
              const isActive = paintStatus === status.key
              return (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => setPaintStatus(status.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${status.className} ${
                    isActive
                      ? "ring-2 ring-primary/40"
                      : "hover:border-foreground/20"
                  }`}
                  aria-pressed={isActive}
                >
                  {status.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1 text-xs">
              <Switch
                id="attendance-hide-inactive"
                checked={hideInactive}
                onCheckedChange={(value) => setHideInactive(Boolean(value))}
              />
              <Label htmlFor="attendance-hide-inactive" className="cursor-pointer">
                퇴원 학생 숨기기
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-border/70 bg-white/80"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="rounded-full border border-border/70 bg-white/80 px-4 py-1.5 text-sm font-semibold text-foreground/90 shadow-sm">
                {format(month, "yyyy년 M월", { locale: ko })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-border/70 bg-white/80"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <div className="max-h-[560px] overflow-auto no-scrollbar">
            <div style={{ minWidth }} className="select-none">
              <div
                className="sticky top-0 z-20 grid border-b border-border/60 bg-white/90 backdrop-blur"
                style={{ gridTemplateColumns }}
              >
                <div className="sticky left-0 z-30 flex items-center border-r border-border/70 bg-white/95 px-4 py-3 text-xs font-semibold text-muted-foreground">
                  학생 / 수업
                </div>
                {days.map((day) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold ${
                        isWeekend ? "text-rose-500/80" : "text-foreground/80"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          isToday
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-transparent"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {format(day, "EEE", { locale: ko })}
                      </span>
                    </div>
                  )
                })}
              </div>

              {visibleRows.map(({ row, rowKey, meta }, rowIndex) => {
                const rowStatus = cellStatuses[rowKey] || {}
                const start = meta?.start
                const end = meta?.end
                const withdrawnAt = meta?.withdrawnAt
                const inactiveAt = meta?.inactiveAt
                const isTransferredOut = Boolean(meta?.isTransferredOut)
                const registrationId = String(row?.id || "").trim()

                const isWithdrawn = Boolean(withdrawnAt)
                const inactiveLabel = isTransferredOut ? "전반" : "퇴원"

                return (
                  <div
                    key={rowKey}
                    className={`grid border-b border-border/60 ${
                      rowIndex % 2 === 1 ? "bg-muted/20" : "bg-transparent"
                    }`}
                    style={{ gridTemplateColumns }}
                  >
                    <div
                      className="sticky left-0 z-10 flex h-full items-center gap-2 border-r border-border/60 bg-white/95 px-4 py-3"
                      style={{ minHeight: ROW_HEIGHT_PX }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {row?.name || "-"}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {row?.course || "수업 정보 없음"}
                        </div>
                        {isTransferredOut ? (
                          <Badge
                            variant="outline"
                            className="mt-2 border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                          >
                            전반
                          </Badge>
                        ) : isWithdrawn ? (
                          <Badge
                            variant="outline"
                            className="mt-2 border-rose-300 bg-rose-50 text-[10px] text-rose-700"
                          >
                            퇴원
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {days.map((day) => {
                      const dateKey = format(day, "yyyy-MM-dd")
                      const inRange =
                        start && end && day.getTime() >= start.getTime() && day.getTime() <= end.getTime()
                      const hasCourseDay =
                        inRange &&
                        Array.isArray(meta?.courseDays) &&
                        meta.courseDays.includes(day.getDay())

                      const isBreakDay =
                        hasCourseDay && meta?.breakDateSet?.has(dateKey)
                      const isSkipDay =
                        !isBreakDay &&
                        hasCourseDay &&
                        meta?.skipWeekSet?.size &&
                        start &&
                        meta.skipWeekSet.has(getWeekIndex(day, start))

                      const isInactiveDay =
                        inactiveAt &&
                        day.getTime() >= inactiveAt.getTime()
                      const isPaintable =
                        hasCourseDay && !isSkipDay && !isBreakDay && !isInactiveDay
                      const isRecordedDefault =
                        isPaintable && meta?.recordingDateSet?.has(dateKey)
                      const statusKey =
                        rowStatus[dateKey] ||
                        (isRecordedDefault ? "recorded" : "pending")
                      const statusStyle = STATUS_LOOKUP[statusKey] || STATUS_LOOKUP.pending

                      const cellBaseClass =
                        "flex items-center justify-center px-1 py-2"
                      const cellInteractiveClass = isPaintable
                        ? "cursor-crosshair"
                        : "cursor-default"

                      let cellContent = null
                      if (!hasCourseDay) {
                        cellContent = (
                          <span className="text-xs text-muted-foreground/50">
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isInactiveDay) {
                        cellContent = (
                          <span className="text-xs text-muted-foreground/60">
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isBreakDay) {
                        cellContent = (
                          <span
                            className="text-xs text-muted-foreground/70"
                            title="휴강"
                          >
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isSkipDay) {
                        cellContent = (
                          <span
                            className="rounded-md border border-dashed border-border/70 bg-muted/30 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground"
                            title={OFF_DAY_LABEL}
                          >
                            {OFF_DAY_LABEL}
                          </span>
                        )
                      } else {
                        cellContent = (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${statusStyle.cellClassName}`}
                            title={statusStyle.label}
                          >
                            {statusStyle.shortLabel}
                          </span>
                        )
                      }

                      return (
                        <div
                          key={`${rowKey}-${dateKey}`}
                          className={`${cellBaseClass} ${cellInteractiveClass}`}
                          onPointerDown={
                            isPaintable
                              ? (event) =>
                                  handlePaintStart(event, rowKey, dateKey, registrationId)
                              : undefined
                          }
                          onPointerEnter={
                            isPaintable
                              ? () => handlePaintEnter(rowKey, dateKey, registrationId)
                              : undefined
                          }
                          aria-label={
                            isSkipDay
                              ? `${OFF_DAY_LABEL} (${dateKey})`
                              : isInactiveDay
                                ? `${inactiveLabel} (${dateKey})`
                              : isBreakDay
                                ? `휴강 (${dateKey})`
                                : !hasCourseDay
                                ? `수업 없음 (${dateKey})`
                                : `${statusStyle.label} (${dateKey})`
                          }
                        >
                          {cellContent}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {!registrations?.length ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  표시할 등록 정보가 없습니다.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
