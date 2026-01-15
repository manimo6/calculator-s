import React, { useEffect, useMemo, useState } from "react"
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

import { courseInfo, courseTree, weekdayName } from "@/utils/data"
import { getEndDate, getScheduleWeeks, normalizeBreakRanges } from "@/utils/calculatorLogic"

import { diffInDays, formatDateYmd, parseDate, startOfDay } from "./utils"

const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]
const DEFAULT_EXTEND_WEEKS = 4
const DEFAULT_SORT = { key: "status", direction: "asc" }

function pad2(value) {
  return String(value).padStart(2, "0")
}

function normalizeCourseDays(days) {
  if (!Array.isArray(days)) return []
  return days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
}

function resolveCourseInfo(courseId, courseName, courseConfigSet) {
  const id = String(courseId || "").trim()
  const name = String(courseName || "").trim()
  if (!id && !name) return null

  const configData = courseConfigSet?.data
  const configInfo = configData?.courseInfo || {}
  if (id && configInfo[id]) return configInfo[id]

  const sources = [
    {
      tree: Array.isArray(configData?.courseTree) ? configData.courseTree : [],
      info: configInfo,
    },
    { tree: courseTree || [], info: courseInfo || {} },
  ]

  let best = null
  let bestLen = 0

  for (const source of sources) {
    for (const group of source.tree || []) {
      for (const item of group.items || []) {
        const label = item?.label
        if (!label || !name) continue
        if (!name.startsWith(label) || label.length < bestLen) continue
        const info = source.info?.[item.val]
        if (info) {
          best = info
          bestLen = label.length
        }
      }
    }

    for (const info of Object.values(source.info || {})) {
      const label = info?.name
      if (!label || !name) continue
      if (!name.startsWith(label) || label.length < bestLen) continue
      best = info
      bestLen = label.length
    }
  }

  return best
}

function resolveMaxWeeks(info) {
  const raw = info?.max ?? info?.maxDuration
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}

function resolveEndDay(info) {
  const endDays = Array.isArray(info?.endDays) ? info.endDays : []
  if (endDays.length && Number.isInteger(endDays[0])) return endDays[0]
  if (Number.isInteger(info?.endDay)) return info.endDay
  return 5
}

function isDateInBreakRanges(date, breakRanges) {
  if (!date) return false
  const ranges = normalizeBreakRanges(breakRanges)
  return ranges.some((range) => date >= range.start && date <= range.end)
}

function getNextCourseDate(endDate, courseDays, breakRanges) {
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

function formatFee(value) {
  if (value === null || value === undefined || value === "") return "-"
  const num = Number(value)
  if (!Number.isFinite(num)) return "-"
  return `${num.toLocaleString("ko-KR")}원`
}

function formatDateWithWeekday(value) {
  const date = parseDate(value)
  if (!date) return ""
  const dayLabel = weekdayName?.[date.getDay()] || "-"
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}(${dayLabel})`
}

function formatDateRange(startDate, endDate) {
  const startLabel = formatDateWithWeekday(startDate)
  const endLabel = formatDateWithWeekday(endDate)
  if (!startLabel || !endLabel) return "-"
  return `${startLabel}~${endLabel}`
}

const NOTICE_CAUTION = [
  "⚠️주의사항⚠️",
  "✅ 계좌이체 시 **반드시 학생이름으로 입금** 부탁드립니다.",
  "🚫 부모님 성함으로 입금 시, 시스템상 입금 확인이 불가능하여 등록이 지연될 수 있습니다.",
  "✅ 납부 후, 현금영수증 발급받으실 휴대폰/사업자 번호를 알려주시기 바랍니다.",
  "[수강료 입금 계좌]",
  "신한은행 140-009-205058",
  "(예금주: 세한아카데미외국어학원)",
].join("\n")

function buildNoticeText({ name, course, rangeLabel, weeks, fee, includeCaution }) {
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
    lines.push("", NOTICE_CAUTION)
  }

  return lines.join("\n")
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "ko-KR")
}

function compareDates(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da && !db) return 0
  if (!da) return 1
  if (!db) return -1
  return da.getTime() - db.getTime()
}

function compareStatus(a, b) {
  const rank = { notice_needed: 0, notice_done: 1, in_progress: 2 }
  return (rank[a] ?? 9) - (rank[b] ?? 9)
}

function StatusBadge({ status }) {
  if (status === "notice_needed") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-400 bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm"
      >
        연장 안내필요
      </Badge>
    )
  }
  if (status === "notice_done") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-sky-400 bg-sky-200/80 px-2.5 py-1 text-xs font-semibold text-sky-950 shadow-sm"
      >
        연장 안내완료
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-emerald-400 bg-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-950 shadow-sm"
    >
      수강중
    </Badge>
  )
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
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [extendWeeks, setExtendWeeks] = useState(DEFAULT_EXTEND_WEEKS)
  const [extendFee, setExtendFee] = useState("")
  const [startDateOverride, setStartDateOverride] = useState("")
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [copyState, setCopyState] = useState("")
  const [saveError, setSaveError] = useState("")
  const [sortConfig, setSortConfig] = useState({
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
    const map = new Map()
    for (const ext of extensions || []) {
      const id = String(ext?.registrationId || "").trim()
      if (!id) continue
      if (!map.has(id)) map.set(id, [])
      map.get(id).push(ext)
    }
    return map
  }, [extensions])

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
        if (weeks >= maxWeeks) return null

        const courseLabel =
          String(registration?.course || "").trim() ||
          (courseIdToLabel instanceof Map ? courseIdToLabel.get(courseId) : "") ||
          ""
        const infoDays = normalizeCourseDays(info?.days)
        const fallbackDays = normalizeCourseDays(resolveCourseDays?.(registration?.course))
        const courseDays = infoDays.length ? infoDays : fallbackDays.length ? fallbackDays : []
        const endDay = resolveEndDay(info)
        const endDate = registration?.endDate || ""
        const remainingWeeks = Math.max(maxWeeks - weeks, 0)
        const breakRanges = info?.breakRanges || []
        const isWithdrawn = Boolean(registration?.withdrawnAt)

        const extensionList = extensionsByRegistration.get(registration?.id) || []
        const upcomingExtension = extensionList
          .map((ext) => ({
            ...ext,
            start: parseDate(ext?.startDate),
          }))
          .filter((ext) => ext.start)
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .find((ext) => today && ext.start.getTime() > today.getTime())

        let status = "in_progress"
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
      .filter(Boolean)

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
    courseIdToLabel,
    extensionsByRegistration,
    registrations,
    resolveCourseDays,
    sortConfig.direction,
    sortConfig.key,
  ])

  useEffect(() => {
    if (!selectedRow) return
    setExtendWeeks(DEFAULT_EXTEND_WEEKS)
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
    const scheduleMeta = getScheduleWeeks({
      startDate: extensionStartDate,
      durationWeeks: weeksValue,
      skipWeeks: [],
      courseDays: selectedRow.courseDays,
      endDayOfWeek: selectedRow.endDay,
      breakRanges: selectedRow.breakRanges,
    })
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
      name: selectedRow.registration?.name,
      course: selectedRow.courseLabel,
      rangeLabel,
      weeks: extendWeeks,
      fee: feeValue,
      includeCaution: false,
    })
  }, [extendWeeks, feeValue, rangeLabel, selectedRow])

  const noticeCopy = useMemo(() => {
    if (!selectedRow) return ""
    return buildNoticeText({
      name: selectedRow.registration?.name,
      course: selectedRow.courseLabel,
      rangeLabel,
      weeks: extendWeeks,
      fee: feeValue,
      includeCaution: true,
    })
  }, [extendWeeks, feeValue, rangeLabel, selectedRow])

  const handleOpen = (row) => {
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
    } catch (err) {
      setSaveError(err?.message || "연장 저장에 실패했습니다.")
    }
  }

  const handleSort = (key) => {
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

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
    )
  }

  const SortButton = ({ label, sortKey, disabled }) => (
    <button
      type="button"
      onClick={() => handleSort(sortKey)}
      disabled={disabled}
      className={`group inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide ${
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : "text-muted-foreground hover:text-slate-800"
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.96)_55%,rgba(224,231,255,0.6)_100%)] px-4 py-3 text-sm text-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-semibold">총 {installmentRows.length}명</span>
          <span className="text-xs text-muted-foreground">분납 대상</span>
        </div>
        {extensionsLoading ? <span className="text-xs">연장 기록 불러오는 중...</span> : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11">
                  <SortButton label="학생" sortKey="student" />
                </TableHead>
                <TableHead>
                  <SortButton label="과목" sortKey="course" disabled={!canSortCourse} />
                </TableHead>
                <TableHead>
                  <SortButton label="기간" sortKey="period" />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  등록/최대
                </TableHead>
                <TableHead>
                  <SortButton label="상태" sortKey="status" />
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  연장
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installmentRows.map((row) => {
                const tone =
                  row.isWithdrawn
                    ? "bg-rose-100/80"
                    : row.status === "notice_needed"
                      ? "bg-amber-100/85"
                      : row.status === "notice_done"
                        ? "bg-sky-100/85"
                        : "bg-emerald-100/70"
                return (
                  <TableRow
                    key={row.registration?.id}
                    className={`group border-b border-border/60 transition-colors hover:bg-muted/40 ${tone}`}
                  >
                    <TableCell className="font-semibold text-slate-900">
                      {row.registration?.name || "-"}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {row.courseLabel || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="font-medium text-slate-800">
                        {row.registration?.startDate || "-"} ~ {row.endDate || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold text-slate-900">
                        {row.weeks} / {row.maxWeeks}
                      </div>
                      <Badge variant="secondary" className="mt-1 rounded-full px-2 text-[11px]">
                        남은 {row.remainingWeeks}주
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.isWithdrawn ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                          >
                            중도퇴원
                          </Badge>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </div>
                      {row.extensionCount ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          연장 {row.extensionCount}회
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-xs font-semibold"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>분납 연장</DialogTitle>
            <DialogDescription>
              연장 주수와 수강료를 입력하고 안내문을 복사하세요.
            </DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">학생</div>
                  <div className="font-semibold">{selectedRow.registration?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">과목</div>
                  <div className="font-semibold">{selectedRow.courseLabel || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">현재 등록 주수</div>
                  <div className="font-semibold">{selectedRow.weeks}주</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">최대 주수</div>
                  <div className="font-semibold">{selectedRow.maxWeeks}주</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">남은 주수</div>
                  <div className="font-semibold">{selectedRow.remainingWeeks}주</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">지난 수강료</div>
                  <div className="font-semibold">
                    {formatFee(selectedRow.registration?.tuitionFee)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="extendWeeks">연장 주수</Label>
                  <Input
                    id="extendWeeks"
                    type="number"
                    min={1}
                    value={extendWeeks}
                    onChange={(e) => setExtendWeeks(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extendFee">연장 수강료 (원)</Label>
                  <Input
                    id="extendFee"
                    value={extendFee}
                    onChange={(e) => setExtendFee(e.target.value)}
                    placeholder="예: 120000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">연장 시작일</Label>
                  <Popover
                    open={startPickerOpen}
                    onOpenChange={setStartPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        type="button"
                        variant="outline"
                        className="w-full justify-between text-left font-normal"
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
                        onSelect={(date) => {
                          setStartDateOverride(date ? formatDateYmd(date) : "")
                          setStartPickerOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="text-xs text-muted-foreground">연장 종료일</div>
                <div className="font-semibold">{extensionEndDate || "-"}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>안내문</Label>
                  <div className="flex items-center gap-2">
                    {copyState ? (
                      <span className="text-xs text-muted-foreground">{copyState}</span>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                      복사
                    </Button>
                  </div>
                </div>
                <Textarea value={noticePreview} readOnly className="min-h-[140px]" />
              </div>
            </div>
          ) : null}

          {saveError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {saveError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              닫기
            </Button>
            <Button type="button" onClick={handleSave} disabled={!selectedRow}>
              연장 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
