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
import { ChevronLeft, ChevronRight, Calendar, Paintbrush, EyeOff } from "lucide-react"
import { io } from "socket.io-client"

import { apiClient } from "@/api-client"
import { getToken } from "@/auth-store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getBreakDateSet, getEndDate, getScheduleWeeks, normalizeSkipWeeks } from "@/utils/calculatorLogic"
import type { BreakRangeInput } from "@/utils/data"
import { parseDate } from "../registrations/utils"

const LABEL_WIDTH_PX = 240
const DAY_WIDTH_PX = 44
const ROW_HEIGHT_PX = 50

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]
const API_URL = import.meta.env.VITE_API_URL || ""

const STATUS_STYLES = [
  {
    key: "pending",
    label: "미입력",
    shortLabel: "",
    className: "border-slate-300/80 bg-slate-50/80 text-slate-400 hover:bg-slate-100/80",
    cellClassName:
      "border-slate-300/60 bg-white/80 text-transparent border-2 border-dashed",
  },
  {
    key: "present",
    label: "출석",
    shortLabel: "출",
    className: "border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-600 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/15",
    cellClassName: "border-emerald-300/80 bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 shadow-sm shadow-emerald-500/20",
  },
  {
    key: "recorded",
    label: "녹화강의",
    shortLabel: "녹",
    className: "border-sky-300/80 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 shadow-sm shadow-sky-500/10 hover:shadow-md hover:shadow-sky-500/15",
    cellClassName: "border-sky-300/80 bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 shadow-sm shadow-sky-500/20",
  },
  {
    key: "late",
    label: "지각",
    shortLabel: "지",
    className: "border-amber-300/80 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-600 shadow-sm shadow-amber-500/10 hover:shadow-md hover:shadow-amber-500/15",
    cellClassName: "border-amber-300/80 bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 shadow-sm shadow-amber-500/20",
  },
  {
    key: "absent",
    label: "결석",
    shortLabel: "결",
    className: "border-rose-300/80 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-600 shadow-sm shadow-rose-500/10 hover:shadow-md hover:shadow-rose-500/15",
    cellClassName: "border-rose-300/80 bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 shadow-sm shadow-rose-500/20",
  },
]

type AttendanceStatus = (typeof STATUS_STYLES)[number]
type AttendanceStatusKey = AttendanceStatus["key"]

const STATUS_LOOKUP = STATUS_STYLES.reduce(
  (acc, status) => {
    acc[status.key as AttendanceStatusKey] = status
    return acc
  },
  {} as Record<AttendanceStatusKey, AttendanceStatus>
)
const PAINT_STATUS_ORDER: AttendanceStatusKey[] = [
  "present",
  "recorded",
  "late",
  "absent",
  "pending",
]
const PAINTABLE_STATUSES = PAINT_STATUS_ORDER.map((key) => STATUS_LOOKUP[key]).filter(Boolean)

const NO_CLASS_LABEL = "-"
const OFF_DAY_LABEL = "등록안함"

type AttendanceRow = {
  id?: string | number
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  courseDays?: Array<number | string>
  courseEndDay?: number
  breakRanges?: unknown[]
  weeks?: number | string
  period?: number | string
  skipWeeks?: Array<number | string>
  withdrawnAt?: string | Date
  transferToId?: string
  transferAt?: string | Date
  isTransferredOut?: boolean
  recordingDates?: string[]
}

type AttendanceRowMeta = {
  start: Date | null
  end: Date | null
  withdrawnAt: Date | null
  transferAt: Date | null
  inactiveAt: Date | null
  isTransferredOut: boolean
  courseDays: number[]
  courseDaySet: Set<number>
  skipWeekSet: Set<number>
  breakDateSet: Set<string>
  recordingDateSet: Set<string>
}

type AttendanceBoardProps = {
  registrations?: AttendanceRow[]
  getCourseDaysForCourse?: (courseName?: string) => number[]
}

type AttendanceCellMap = Record<string, Record<string, string>>

function getRowKey(row: AttendanceRow, index: number) {
  if (row?.id !== undefined && row?.id !== null) return String(row.id)
  const name = row?.name || "row"
  const course = row?.course || "course"
  return `${name}-${course}-${index}`
}

function normalizeCourseDays(days?: Array<number | string> | null) {
  if (!Array.isArray(days)) return []
  return Array.from(
    new Set(days.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))
  ).sort((a, b) => a - b)
}

function getWeekIndex(date: Date, start: Date) {
  return Math.floor((date.getTime() - start.getTime()) / WEEK_MS) + 1
}

function hasUpcomingClasses(
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
        !skipWeekSet.has(getWeekIndex(cursor, meta.start)) &&
        !breakDateSet.has(dateKey)
      )
        return true
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  }

  return false
}

type ScheduleInput = Parameters<typeof getScheduleWeeks>[0]

export default function AttendanceBoard(props: AttendanceBoardProps) {
  const { registrations = [], getCourseDaysForCourse } = props || {}
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [paintStatus, setPaintStatus] = useState<AttendanceStatusKey>("present")
  const [cellStatuses, setCellStatuses] = useState<AttendanceCellMap>({})
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
  const registrationIdSet = useMemo(
    () => new Set(registrationIds),
    [registrationIds]
  )
  const monthKey = useMemo(() => format(month, "yyyy-MM"), [month])

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
      const next: AttendanceCellMap = {}

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

  const setCellStatus = useCallback((rowKey: string, dateKey: string, status: string) => {
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

  const applySocketUpdates = useCallback(
    (updates: Array<{ registrationId?: string; date?: string; status?: string }>) => {
      if (!Array.isArray(updates) || updates.length === 0) return
      setCellStatuses((prev) => {
        let next = prev
        for (const update of updates) {
          const registrationId = String(update?.registrationId || "").trim()
          const dateKey = String(update?.date || "").trim()
          const status = String(update?.status || "").trim()
          if (!registrationId || !dateKey || !status) continue
          if (!registrationIdSet.has(registrationId)) continue
          if (monthKey && !dateKey.startsWith(monthKey)) continue

          const rowStatus = next[registrationId] || {}
          const existing = rowStatus[dateKey]
          if (status === "pending") {
            if (!existing) continue
            if (next === prev) next = { ...prev }
            const updatedRow = { ...rowStatus }
            delete updatedRow[dateKey]
            next[registrationId] = updatedRow
            continue
          }
          if (existing === status) continue
          if (next === prev) next = { ...prev }
          next[registrationId] = {
            ...rowStatus,
            [dateKey]: status,
          }
        }
        return next
      })
    },
    [monthKey, registrationIdSet]
  )

  useEffect(() => {
    const token = getToken()
    const socket = io(API_URL || undefined, {
      withCredentials: true,
      auth: token ? { token } : undefined,
    })

    const handleUpdate = (payload: { updates?: Array<{ registrationId?: string; date?: string; status?: string }> }) => {
      applySocketUpdates(payload?.updates || [])
    }

    socket.on("attendance:update", handleUpdate)

    return () => {
      socket.off("attendance:update", handleUpdate)
      socket.disconnect()
    }
  }, [applySocketUpdates])

  const persistAttendance = useCallback(async (registrationId: string, dateKey: string, status: string) => {
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
    (event: React.PointerEvent<HTMLDivElement>, rowKey: string, dateKey: string, registrationId: string) => {
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
    (rowKey: string, dateKey: string, registrationId: string) => {
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
    <Card className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-xl shadow-black/5 backdrop-blur-xl">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/90 via-white/95 to-violet-50/90 px-6 py-5">
        {/* 상단: 월 네비게이션 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-slate-200/60 bg-white/80 shadow-sm transition-all hover:bg-white hover:shadow-md"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <div className="min-w-[140px] rounded-xl border border-slate-200/60 bg-white/90 px-5 py-2 text-center text-base font-bold text-slate-800 shadow-sm">
                {format(month, "yyyy년 M월", { locale: ko })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-slate-200/60 bg-white/80 shadow-sm transition-all hover:bg-white hover:shadow-md"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>

          {/* 퇴원 학생 숨기기 토글 */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2.5 shadow-sm">
            <EyeOff className="h-4 w-4 text-slate-400" />
            <Switch
              id="attendance-hide-inactive"
              checked={hideInactive}
              onCheckedChange={(value: boolean) => setHideInactive(Boolean(value))}
            />
            <Label htmlFor="attendance-hide-inactive" className="cursor-pointer text-sm font-medium text-slate-600">
              퇴원 학생 숨기기
            </Label>
          </div>
        </div>

        {/* 하단: 페인트 상태 선택 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Paintbrush className="h-4 w-4" />
            <span>상태 선택</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PAINTABLE_STATUSES.map((status) => {
              const isActive = paintStatus === status.key
              return (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => setPaintStatus(status.key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${status.className} ${
                    isActive
                      ? "ring-2 ring-violet-400/60 ring-offset-2"
                      : "hover:scale-105"
                  }`}
                  aria-pressed={isActive}
                >
                  {status.label}
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-2xl bg-white/60">
          <div className="max-h-[600px] overflow-auto no-scrollbar">
            <div style={{ minWidth }} className="select-none">
              {/* 날짜 헤더 */}
              <div
                className="sticky top-0 z-20 grid border-b border-slate-200/60 bg-gradient-to-b from-slate-50 to-white/95 backdrop-blur-lg"
                style={{ gridTemplateColumns }}
              >
                <div className="sticky left-0 z-30 flex items-center border-r border-slate-200/60 bg-gradient-to-r from-slate-100/95 to-slate-50/95 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-lg">
                  학생 / 수업
                </div>
                {days.map((day) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex flex-col items-center justify-center gap-1 px-1 py-3 ${
                        isWeekend ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          isToday
                            ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                            : isWeekend
                              ? "text-rose-500"
                              : "text-slate-700"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <span className={`text-[10px] font-medium ${isWeekend ? "text-rose-400" : "text-slate-400"}`}>
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
                    className={`group grid border-b border-slate-100 transition-colors ${
                      rowIndex % 2 === 1 ? "bg-slate-50/40" : "bg-white/60"
                    } hover:bg-violet-50/30`}
                    style={{ gridTemplateColumns }}
                  >
                    <div
                      className="sticky left-0 z-10 flex h-full items-center gap-3 border-r border-slate-200/60 bg-gradient-to-r from-white via-white to-transparent px-4 py-3 backdrop-blur-sm transition-colors group-hover:from-violet-50/80 group-hover:via-violet-50/60"
                      style={{ minHeight: ROW_HEIGHT_PX }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-800">
                          {row?.name || "-"}
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-500">
                          {row?.course || "수업 정보 없음"}
                        </div>
                        {isTransferredOut ? (
                          <Badge
                            variant="outline"
                            className="mt-2 rounded-lg border-amber-300/80 bg-gradient-to-r from-amber-50 to-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                          >
                            전반
                          </Badge>
                        ) : isWithdrawn ? (
                          <Badge
                            variant="outline"
                            className="mt-2 rounded-lg border-rose-300/80 bg-gradient-to-r from-rose-50 to-pink-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
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
                      const courseDays = Array.isArray(meta?.courseDays) ? meta.courseDays : []
                      const hasCourseDay = inRange && courseDays.includes(day.getDay())

                      const isBreakDay =
                        hasCourseDay && meta?.breakDateSet?.has(dateKey)
                      const isSkipDay =
                        !isBreakDay &&
                        hasCourseDay &&
                        meta?.skipWeekSet?.size &&
                        start &&
                        meta?.skipWeekSet?.has(getWeekIndex(day, start))

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

                      const isWeekendDay = day.getDay() === 0 || day.getDay() === 6
                      const cellBaseClass =
                        `flex items-center justify-center px-1 py-2 transition-colors ${isWeekendDay ? "bg-rose-50/20" : ""}`
                      const cellInteractiveClass = isPaintable
                        ? "cursor-crosshair hover:bg-violet-100/40"
                        : "cursor-default"

                      let cellContent = null
                      if (!hasCourseDay) {
                        cellContent = (
                          <span className="text-xs text-slate-300">
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isInactiveDay) {
                        cellContent = (
                          <span className="text-xs text-slate-300">
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isBreakDay) {
                        cellContent = (
                          <span
                            className="text-xs text-slate-400"
                            title="휴강"
                          >
                            {NO_CLASS_LABEL}
                          </span>
                        )
                      } else if (isSkipDay) {
                        cellContent = (
                          <span
                            className="inline-flex items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-slate-100/50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400"
                            title={OFF_DAY_LABEL}
                          >
                            {OFF_DAY_LABEL}
                          </span>
                        )
                      } else {
                        cellContent = (
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-bold transition-transform hover:scale-110 ${statusStyle.cellClassName}`}
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
                <div className="px-6 py-16 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <Calendar className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base font-medium text-slate-600">표시할 등록 정보가 없습니다</p>
                  <p className="mt-1 text-sm text-slate-400">필터를 조정하거나 데이터를 확인해주세요</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
