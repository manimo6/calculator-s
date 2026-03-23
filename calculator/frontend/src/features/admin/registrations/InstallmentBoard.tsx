import { useEffect, useMemo, useState } from "react"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"

import { TUITION_ACCOUNT } from "@/utils/clipboardUtils"
import type { BreakRangeInput, CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import { ALL_WEEK_DAYS, formatDateWithWeekday, getEndDate, getScheduleWeeks, normalizeBreakRanges, normalizeCourseDays, resolveEndDay } from "@/utils/calculatorLogic"

import { diffInDays, formatDateYmd, parseDate, resolveCourseInfo, startOfDay } from "./utils"

const DEFAULT_EXTEND_WEEKS = 4
const DEFAULT_SORT = { key: "status", direction: "asc" }

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSet = {
  name?: string
  data?: {
    courseTree?: CourseTreeGroup[]
    courseInfo?: CourseInfoRecord
  } | null
}

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  withdrawnAt?: string | Date
  tuitionFee?: number | string
} & Record<string, unknown>

type ExtensionRow = {
  registrationId?: string | number
  startDate?: string | Date
} & Record<string, unknown>

type InstallmentStatus = "notice_needed" | "notice_done" | "in_progress"

type InstallmentRow = {
  registration: RegistrationRow
  courseLabel: string
  maxWeeks: number
  studentMaxWeeks: number
  weeks: number
  remainingWeeks: number
  courseDays: number[]
  endDay: number
  endDate: string | Date
  status: InstallmentStatus
  extensionCount: number
  breakRanges: BreakRangeInput[]
  nextStartDate: string
  isWithdrawn: boolean
}

type SortKey = "student" | "course" | "period" | "status" | null
type SortConfig = { key: SortKey; direction: "asc" | "desc" }


function resolveMaxWeeks(info: CourseInfo | null | undefined) {
  const raw = info?.max ?? info?.maxDuration
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}


function getWeekOffset(
  studentStartDate: Date | null,
  courseStartDate: Date | null
): number {
  if (!studentStartDate || !courseStartDate) return 0
  const diffMs = studentStartDate.getTime() - courseStartDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(diffDays / 7))
}

function isDateInBreakRanges(
  date: Date | null,
  breakRanges: BreakRangeInput[] | null | undefined
) {
  if (!date) return false
  const ranges = normalizeBreakRanges(breakRanges)
  return ranges.some((range) => date >= range.start && date <= range.end)
}

function getNextCourseDate(
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

function formatFee(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-"
  const num = Number(value)
  if (!Number.isFinite(num)) return "-"
  return `${num.toLocaleString("ko-KR")}원`
}


function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const startLabel = formatDateWithWeekday(startDate)
  const endLabel = formatDateWithWeekday(endDate)
  if (!startLabel || !endLabel) return "-"
  return `${startLabel}~${endLabel}`
}


function buildNoticeText({
  name,
  course,
  rangeLabel,
  weeks,
  fee,
  includeCaution,
}: {
  name: string
  course: string
  rangeLabel: string
  weeks: number
  fee: number | string
  includeCaution: boolean
}) {
  const safeName = String(name || "").trim() || "-"
  const safeCourse = String(course || "").trim() || "-"
  const safeWeeks = Number(weeks) > 0 ? `${weeks}주` : "-"
  const safeRange = String(rangeLabel || "").trim() || "-"
  const feeValue = Number(fee)
  const safeFee = Number.isFinite(feeValue) ? `${feeValue.toLocaleString("ko-KR")}원` : "-"

  const lines = [
    "[수강 연장 안내]",
    `• 학생이름: ${safeName}`,
    `• 과목: ${safeCourse}`,
    `• 연장일: ${safeRange}`,
    `• 연장 주수: ${safeWeeks}`,
    `• 연장 수강료: ${safeFee}`,
  ]

  if (includeCaution) {
    lines.push("", TUITION_ACCOUNT)
  }

  return lines.join("\n")
}

function compareText(a: string | number | null | undefined, b: string | number | null | undefined) {
  return String(a || "").localeCompare(String(b || ""), "ko-KR")
}

function compareDates(a: string | Date | null | undefined, b: string | Date | null | undefined) {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da && !db) return 0
  if (!da) return 1
  if (!db) return -1
  return da.getTime() - db.getTime()
}

function compareStatus(a: InstallmentStatus, b: InstallmentStatus) {
  const rank: Record<InstallmentStatus, number> = {
    notice_needed: 0,
    notice_done: 1,
    in_progress: 2,
  }
  return (rank[a] ?? 9) - (rank[b] ?? 9)
}

function StatusBadge({ status }: { status: InstallmentStatus }) {
  if (status === "notice_needed") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-400 bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/20"
      >
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
        </span>
        연장 안내필요
      </Badge>
    )
  }
  if (status === "notice_done") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-sky-400 bg-gradient-to-r from-sky-100 to-blue-100 px-3 py-1 text-xs font-bold text-sky-900 shadow-md shadow-sky-500/20"
      >
        연장 안내완료
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-emerald-400 bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-bold text-emerald-900 shadow-md shadow-emerald-500/20"
    >
      수강중
    </Badge>
  )
}

type InstallmentBoardProps = {
  registrations: RegistrationRow[]
  extensions: ExtensionRow[]
  courseConfigSet: CourseConfigSet | null
  courseIdToLabel: Map<string, string>
  resolveCourseDays?: (courseName?: string) => number[]
  onCreateExtension?: (payload: Record<string, unknown>) => Promise<void> | void
  categoryFilter: string
  courseFilter: string
  extensionsLoading?: boolean
}

export default function InstallmentBoard({
  registrations,
  extensions,
  courseConfigSet,
  courseIdToLabel,
  resolveCourseDays,
  onCreateExtension,
  categoryFilter,
  courseFilter,
  extensionsLoading = false,
}: InstallmentBoardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<InstallmentRow | null>(null)
  const [extendWeeks, setExtendWeeks] = useState<number>(DEFAULT_EXTEND_WEEKS)
  const [extendFee, setExtendFee] = useState<string>("")
  const [startDateOverride, setStartDateOverride] = useState<string>("")
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [copyState, setCopyState] = useState("")
  const [saveError, setSaveError] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  })

  const canSortCourse = !courseFilter

  useEffect(() => {
    if (!canSortCourse && sortConfig.key === "course") {
      setSortConfig({ key: null, direction: "asc" })
    }
  }, [canSortCourse, sortConfig.key])

  const extensionsByRegistration = useMemo(() => {
    const map = new Map<string, ExtensionRow[]>()
    for (const ext of extensions || []) {
      const id = String(ext?.registrationId || "").trim()
      if (!id) continue
      if (!map.has(id)) map.set(id, [])
      map.get(id)?.push(ext)
    }
    return map
  }, [extensions])

  const courseEarliestStartMap = useMemo(() => {
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
  }, [registrations])

  const installmentRows = useMemo(() => {
    const today = startOfDay(new Date())
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
        const infoDays = normalizeCourseDays(info?.days)
        const fallbackDays = normalizeCourseDays(
          resolveCourseDays?.(String(registration?.course || ""))
        )
        const courseDays = infoDays.length ? infoDays : fallbackDays.length ? fallbackDays : []
        const endDay = resolveEndDay(info)
        const endDate = registration?.endDate || ""
        const remainingWeeks = Math.max(studentMaxWeeks - weeks, 0)
        const breakRanges = normalizeBreakRanges(info?.breakRanges) as BreakRangeInput[]
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
          .find((ext) => today && ext.start.getTime() > today.getTime())

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

    const effectiveSort = sortConfig.key ? sortConfig : DEFAULT_SORT
    const direction = effectiveSort.direction === "desc" ? -1 : 1

    list.sort((a, b) => {
      let result = 0
      switch (effectiveSort.key) {
        case "student":
          result = compareText(a.registration?.name, b.registration?.name)
          break
        case "course":
          result = compareText(a.courseLabel, b.courseLabel)
          break
        case "period": {
          result = compareDates(a.registration?.startDate, b.registration?.startDate)
          if (result === 0) {
            result = compareDates(a.endDate, b.endDate)
          }
          break
        }
        case "status":
        default:
          result = compareStatus(a.status, b.status)
          break
      }

      if (result === 0) {
        result = compareText(a.registration?.name, b.registration?.name)
      }
      return result * direction
    })

    return list
  }, [
    courseConfigSet,
    courseEarliestStartMap,
    courseIdToLabel,
    extensionsByRegistration,
    registrations,
    resolveCourseDays,
    sortConfig.direction,
    sortConfig.key,
  ])

  useEffect(() => {
    if (!selectedRow) return
    setExtendWeeks(Math.min(DEFAULT_EXTEND_WEEKS, selectedRow.remainingWeeks))
    const baseFee = selectedRow.registration?.tuitionFee
    setExtendFee(baseFee !== null && baseFee !== undefined ? String(baseFee) : "")
    setStartDateOverride(selectedRow.nextStartDate || "")
    setCopyState("")
    setSaveError("")
  }, [selectedRow])

  const feeValue = useMemo(() => {
    const raw = String(extendFee || "").replace(/,/g, "").trim()
    if (!raw) return null
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  }, [extendFee])

  const extensionStartDate = useMemo(() => {
    if (!selectedRow) return ""
    return startDateOverride || selectedRow.nextStartDate || ""
  }, [selectedRow, startDateOverride])

  const extensionEndDate = useMemo(() => {
    if (!selectedRow) return ""
    const weeksValue = Number(extendWeeks)
    if (!extensionStartDate || !Number.isFinite(weeksValue) || weeksValue <= 0) return ""
    const scheduleInput: Parameters<typeof getScheduleWeeks>[0] = {
      startDate: extensionStartDate,
      durationWeeks: weeksValue,
      skipWeeks: [],
      courseDays: selectedRow.courseDays,
      endDayOfWeek: selectedRow.endDay,
      breakRanges: selectedRow.breakRanges,
    }
    const scheduleMeta = getScheduleWeeks(scheduleInput)
    const effectiveWeeks = scheduleMeta.scheduleWeeks || weeksValue
    const end = getEndDate(extensionStartDate, effectiveWeeks, selectedRow.endDay)
    return formatDateYmd(end)
  }, [extendWeeks, extensionStartDate, selectedRow])

  const rangeLabel = useMemo(
    () => formatDateRange(extensionStartDate, extensionEndDate),
    [extensionEndDate, extensionStartDate]
  )

  const noticePreview = useMemo(() => {
    if (!selectedRow) return ""
    return buildNoticeText({
      name: String(selectedRow.registration?.name || ""),
      course: String(selectedRow.courseLabel || ""),
      rangeLabel,
      weeks: extendWeeks,
      fee: feeValue ?? "",
      includeCaution: false,
    })
  }, [extendWeeks, feeValue, rangeLabel, selectedRow])

  const noticeCopy = useMemo(() => {
    if (!selectedRow) return ""
    return buildNoticeText({
      name: String(selectedRow.registration?.name || ""),
      course: String(selectedRow.courseLabel || ""),
      rangeLabel,
      weeks: extendWeeks,
      fee: feeValue ?? "",
      includeCaution: true,
    })
  }, [extendWeeks, feeValue, rangeLabel, selectedRow])

  const handleOpen = (row: InstallmentRow) => {
    setSelectedRow(row)
    setDialogOpen(true)
  }

  const handleCopy = async () => {
    if (!noticeCopy) return
    try {
      await navigator.clipboard.writeText(noticeCopy)
      setCopyState("복사됨")
    } catch (err) {
      try {
        window.prompt("복사할 내용을 선택하세요.", noticeCopy)
        setCopyState("복사됨")
      } catch (promptError) {
        setCopyState("복사 실패")
      }
    }
  }

  const handleSave = async () => {
    if (!selectedRow || typeof onCreateExtension !== "function") return
    const weeksValue = Number(extendWeeks)
    if (!Number.isFinite(weeksValue) || weeksValue <= 0) {
      setSaveError("연장 주수를 확인해 주세요.")
      return
    }
    if (weeksValue > selectedRow.remainingWeeks) {
      setSaveError(`남은 주수(${selectedRow.remainingWeeks}주)를 초과할 수 없습니다.`)
      return
    }
    const feeValueRaw = String(extendFee || "").replace(/,/g, "").trim()
    const feeValue = feeValueRaw ? Number(feeValueRaw) : null
    if (feeValueRaw && !Number.isFinite(feeValue)) {
      setSaveError("연장 수강료를 확인해 주세요.")
      return
    }

    const startDateValue = formatDateYmd(extensionStartDate)
    const payload = {
      registrationId: selectedRow.registration?.id,
      weeks: weeksValue,
      tuitionFee: Number.isFinite(feeValue) ? feeValue : null,
      startDate: startDateValue || undefined,
      endDate: extensionEndDate || undefined,
    }

    setSaveError("")
    try {
      await onCreateExtension(payload)
      setDialogOpen(false)
      setSelectedRow(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "연장 저장에 실패했습니다."
      setSaveError(message)
    }
  }

  const handleSort = (key: SortKey) => {
    if (key === "course" && !canSortCourse) return
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" }
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" }
      }
      return { key: null, direction: "asc" }
    })
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
    )
  }

  const SortButton = ({
    label,
    sortKey,
    disabled = false,
  }: {
    label: string
    sortKey: SortKey
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={() => handleSort(sortKey)}
      disabled={disabled}
      className={`group inline-flex items-center gap-1.5 text-left text-xs font-bold uppercase tracking-wider transition-colors ${
        disabled
          ? "cursor-not-allowed text-slate-400/60"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      {disabled ? null : renderSortIcon(sortKey)}
    </button>
  )

  if (!installmentRows.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
        분납 대상이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">{installmentRows.length}명</span>
                <Badge className="rounded-full bg-emerald-100 text-emerald-700 shadow-sm">분납 대상</Badge>
              </div>
              <p className="text-sm text-slate-600">수강료 분납 관리</p>
            </div>
          </div>
          {extensionsLoading ? (
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-slate-600">연장 기록 불러오는 중...</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-xl shadow-slate-200/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-slate-50/95 to-slate-100/95 backdrop-blur-md">
              <TableRow className="border-b border-slate-200/60 hover:bg-transparent">
                <TableHead className="h-12">
                  <SortButton label="학생" sortKey="student" />
                </TableHead>
                <TableHead>
                  <SortButton label="과목" sortKey="course" disabled={!canSortCourse} />
                </TableHead>
                <TableHead>
                  <SortButton label="기간" sortKey="period" />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  등록/최대
                </TableHead>
                <TableHead>
                  <SortButton label="상태" sortKey="status" />
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                  연장
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installmentRows.map((row) => {
                const tone =
                  row.isWithdrawn
                    ? "bg-rose-50/60 hover:bg-rose-100/70"
                    : row.status === "notice_needed"
                      ? "bg-amber-50/60 hover:bg-amber-100/70"
                      : row.status === "notice_done"
                        ? "bg-sky-50/60 hover:bg-sky-100/70"
                        : "bg-emerald-50/40 hover:bg-emerald-100/60"
                return (
                  <TableRow
                    key={row.registration?.id}
                    className={`group border-b border-slate-200/50 transition-all ${tone}`}
                  >
                    <TableCell className="font-bold text-slate-900">
                      {row.registration?.name || "-"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {row.courseLabel || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="rounded-lg bg-white/60 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
                        {formatDateYmd(row.registration?.startDate) || "-"} ~ {formatDateYmd(row.endDate) || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-bold text-slate-900">
                        {row.weeks} / {row.studentMaxWeeks}
                        {row.studentMaxWeeks !== row.maxWeeks && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({row.maxWeeks}주 수업)
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="mt-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                        남은 {row.remainingWeeks}주
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.isWithdrawn ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-rose-400 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 shadow-sm"
                          >
                            중도퇴원
                          </Badge>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </div>
                      {row.extensionCount ? (
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          연장 {row.extensionCount}회
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        onClick={() => handleOpen(row)}
                        disabled={row.isWithdrawn}
                      >
                        연장
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setSelectedRow(null)
            setStartPickerOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:rounded-[24px]">
          <DialogHeader className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">분납 연장</DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  연장 주수와 수강료를 입력하고 안내문을 복사하세요.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedRow ? (
            <div className="space-y-5 text-sm">
              <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white p-5 shadow-sm md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">학생</div>
                  <div className="text-base font-bold text-slate-900">{selectedRow.registration?.name || "-"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">과목</div>
                  <div className="text-base font-bold text-slate-900">{selectedRow.courseLabel || "-"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">현재 등록 주수</div>
                  <div className="text-base font-bold text-emerald-700">{selectedRow.weeks}주</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">최대 주수</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedRow.studentMaxWeeks}주
                    {selectedRow.studentMaxWeeks !== selectedRow.maxWeeks && (
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        ({selectedRow.maxWeeks}주 수업)
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">남은 주수</div>
                  <div className="text-base font-bold text-amber-600">{selectedRow.remainingWeeks}주</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">지난 수강료</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatFee(selectedRow.registration?.tuitionFee)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="extendWeeks" className="text-sm font-semibold text-slate-700">
                    연장 주수
                    <span className="ml-1.5 text-xs font-normal text-slate-500">
                      (최대 {selectedRow.remainingWeeks}주)
                    </span>
                  </Label>
                  <Input
                    id="extendWeeks"
                    type="number"
                    min={1}
                    max={selectedRow.remainingWeeks}
                    value={extendWeeks}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = Number(e.target.value) || 0
                      setExtendWeeks(Math.min(value, selectedRow.remainingWeeks))
                    }}
                    className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extendFee" className="text-sm font-semibold text-slate-700">연장 수강료 (원)</Label>
                  <Input
                    id="extendFee"
                    value={extendFee}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExtendFee(e.target.value)
                    }
                    placeholder="예: 120000"
                    className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-semibold text-slate-700">연장 시작일</Label>
                  <Popover
                    open={startPickerOpen}
                    onOpenChange={setStartPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-slate-200/70 bg-white text-left font-medium shadow-sm transition-shadow hover:shadow-md"
                      >
                        {startDateOverride || "YYYY-MM-DD"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto border-none bg-transparent p-0 shadow-none"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={parseDate(startDateOverride) ?? undefined}
                        onSelect={(value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                          const selectedDate = value instanceof Date ? value : null
                          setStartDateOverride(selectedDate ? formatDateYmd(selectedDate) : "")
                          setStartPickerOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  연장 종료일
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">{extensionEndDate || "-"}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">안내문</Label>
                  <div className="flex items-center gap-2">
                    {copyState ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {copyState}
                      </span>
                    ) : null}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopy}
                      className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md"
                    >
                      복사
                    </Button>
                  </div>
                </div>
                <Textarea 
                  value={noticePreview} 
                  readOnly 
                  className="min-h-[140px] rounded-xl border-slate-200/70 bg-white shadow-sm"
                />
              </div>
            </div>
          ) : null}

          {saveError ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{saveError}</span>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="rounded-xl border-slate-200/70 shadow-sm transition-all hover:shadow-md"
            >
              닫기
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={!selectedRow}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
            >
              연장 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
