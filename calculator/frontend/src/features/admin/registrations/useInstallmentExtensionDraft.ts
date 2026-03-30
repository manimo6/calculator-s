import { useCallback, useEffect, useMemo, useState } from "react"

import {
  calculateRecordingFee,
  calculateTotalDays,
  getAvailableRecordingDates,
  getEndDate,
  getScheduleWeeks,
  normalizeSkipWeeks,
} from "@/utils/calculatorLogic"
import { stripDuplicateSuffix } from "@/utils/clipboardUtils"
import {
  recordingAvailable as globalRecordingAvailable,
  courseInfo as globalCourseInfo,
  getCourseName,
} from "@/utils/data"
import type { CourseTreeGroup, CourseInfo } from "@/utils/data"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import {
  buildInstallmentNoticeText,
  formatInstallmentDateRange,
  formatInstallmentFee,
} from "./installmentBoardNotice"
import {
  DEFAULT_EXTEND_WEEKS,
  type InstallmentRow,
  type CourseConfigSet,
} from "./installmentBoardModel"
import { formatDateYmd } from "./utils"

type RecordingAvailableMap = Record<string, boolean | Record<string, boolean> | undefined>

function resolveRecordingAvailable(courseConfigSet: CourseConfigSet | null): RecordingAvailableMap {
  // courseConfigSet.data에 recordingAvailable이 있으면 사용 (TS 타입에는 없지만 API 응답에 포함됨)
  const configData = courseConfigSet?.data as Record<string, unknown> | null | undefined
  const fromConfig = configData?.recordingAvailable as RecordingAvailableMap | undefined
  if (fromConfig && typeof fromConfig === "object" && Object.keys(fromConfig).length > 0) {
    return fromConfig
  }
  return globalRecordingAvailable as RecordingAvailableMap
}

type CourseInfoMap = Record<string, CourseInfo | undefined>

function resolveCourseInfoMap(courseConfigSet: CourseConfigSet | null): CourseInfoMap {
  const configData = courseConfigSet?.data as Record<string, unknown> | null | undefined
  const fromConfig = configData?.courseInfo as CourseInfoMap | undefined
  if (fromConfig && typeof fromConfig === "object" && Object.keys(fromConfig).length > 0) {
    return fromConfig
  }
  return globalCourseInfo as CourseInfoMap
}

function findCourseConfigKey(
  courseLabel: string,
  ciMap: CourseInfoMap,
  courseTree?: CourseTreeGroup[],
): string {
  if (!courseLabel) return ""
  let bestKey = ""
  let bestLen = 0
  for (const key of Object.keys(ciMap)) {
    const name = getCourseName(key)
    if (courseLabel.startsWith(name) && name.length > bestLen) {
      bestKey = key
      bestLen = name.length
    }
    if (courseLabel.startsWith(key) && key.length > bestLen) {
      bestKey = key
      bestLen = key.length
    }
  }
  if (bestKey) return bestKey
  for (const group of courseTree || []) {
    for (const item of group.items || []) {
      if (!item.label || !courseLabel.startsWith(item.label)) continue
      if (item.label.length > bestLen && ciMap[item.val]) {
        bestKey = item.val
        bestLen = item.label.length
      }
    }
  }
  return bestKey
}

function findRecordingKey(
  courseLabel: string,
  ra: RecordingAvailableMap,
  courseTree?: CourseTreeGroup[],
): string {
  if (!courseLabel) return ""
  let bestKey = ""
  let bestLen = 0

  // 1) recordingAvailable 키 직접 순회
  for (const key of Object.keys(ra)) {
    const name = getCourseName(key)
    if (courseLabel.startsWith(name) && name.length > bestLen) {
      bestKey = key
      bestLen = name.length
    }
    if (courseLabel.startsWith(key) && key.length > bestLen) {
      bestKey = key
      bestLen = key.length
    }
  }
  if (bestKey) return bestKey

  // 2) courseTree에서 val 키로 recordingAvailable 조회
  for (const group of courseTree || []) {
    for (const item of group.items || []) {
      if (!item.label || !courseLabel.startsWith(item.label)) continue
      if (item.label.length > bestLen && ra[item.val] !== undefined) {
        bestKey = item.val
        bestLen = item.label.length
      }
    }
  }
  return bestKey
}

export function useInstallmentExtensionDraft({
  onCreateExtension,
  courseConfigSet = null,
}: {
  onCreateExtension?: (payload: Record<string, unknown>) => Promise<void> | void
  courseConfigSet?: CourseConfigSet | null
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<InstallmentRow | null>(null)
  const [extendWeeks, setExtendWeeks] = useState<number>(DEFAULT_EXTEND_WEEKS)
  const [extendFee, setExtendFee] = useState<string>("")
  const [copyState, setCopyState] = useState("")
  const [saveError, setSaveError] = useState("")

  const [skipWeeksEnabled, setSkipWeeksEnabled] = useState(false)
  const [skipWeeks, setSkipWeeks] = useState<number[]>([])
  const [recordingEnabled, setRecordingEnabled] = useState(false)
  const [recordingDates, setRecordingDates] = useState<string[]>([])

  useEffect(() => {
    if (!selectedRow) return
    setExtendWeeks(Math.min(DEFAULT_EXTEND_WEEKS, selectedRow.remainingWeeks))
    setExtendFee("")
    setSkipWeeksEnabled(false)
    setSkipWeeks([])
    setRecordingEnabled(false)
    setRecordingDates([])
    setCopyState("")
    setSaveError("")
  }, [selectedRow])

  const ra = useMemo(() => resolveRecordingAvailable(courseConfigSet), [courseConfigSet])
  const ciMap = useMemo(() => resolveCourseInfoMap(courseConfigSet), [courseConfigSet])
  const configTree = useMemo(
    () => (courseConfigSet?.data?.courseTree as CourseTreeGroup[] | undefined) || [],
    [courseConfigSet],
  )

  // 수업목록에서 설정한 주당 수강료
  const weeklyFee = useMemo(() => {
    if (!selectedRow) return 0
    const label = selectedRow.courseLabel || String(selectedRow.registration?.course || "")
    const key = findCourseConfigKey(label, ciMap, configTree)
    if (!key) return 0
    const info = ciMap[key]
    return Number(info?.fee ?? 0)
  }, [selectedRow, ciMap, configTree])

  const isRecordingAvailable = useMemo(() => {
    if (!selectedRow) return false
    const label = selectedRow.courseLabel || String(selectedRow.registration?.course || "")
    const key = findRecordingKey(label, ra, configTree)
    if (!key) return false
    const entry = ra[key]
    if (typeof entry === "boolean") return entry
    if (entry && typeof entry === "object") return true
    return false
  }, [selectedRow, ra, configTree])

  const normalizedSkipWeeks = useMemo(() => {
    if (!skipWeeksEnabled) return []
    return normalizeSkipWeeks(skipWeeks, extendWeeks)
  }, [extendWeeks, skipWeeks, skipWeeksEnabled])

  const feeValue = useMemo(() => {
    const raw = String(extendFee || "").replace(/,/g, "").trim()
    if (!raw) return null
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  }, [extendFee])

  const extensionStartDate = useMemo(() => {
    if (!selectedRow) return ""
    return selectedRow.nextStartDate || ""
  }, [selectedRow])

  const scheduleMeta = useMemo(() => {
    if (!selectedRow) return { scheduleWeeks: 0, skipWeeks: [] as number[], breakWeekSet: new Set<number>() }
    const weeksValue = Number(extendWeeks)
    if (!extensionStartDate || !Number.isFinite(weeksValue) || weeksValue <= 0) {
      return { scheduleWeeks: 0, skipWeeks: [] as number[], breakWeekSet: new Set<number>() }
    }
    return getScheduleWeeks({
      startDate: extensionStartDate,
      durationWeeks: weeksValue,
      skipWeeks: normalizedSkipWeeks,
      courseDays: selectedRow.courseDays,
      endDayOfWeek: selectedRow.endDay,
      breakRanges: selectedRow.breakRanges,
    })
  }, [extendWeeks, extensionStartDate, normalizedSkipWeeks, selectedRow])

  const scheduleWeeks = scheduleMeta.scheduleWeeks

  const extensionEndDate = useMemo(() => {
    if (!selectedRow || !scheduleWeeks) return ""
    const end = getEndDate(extensionStartDate, scheduleWeeks, selectedRow.endDay)
    return formatDateYmd(end)
  }, [extensionStartDate, scheduleWeeks, selectedRow])

  const totalDays = useMemo(() => {
    if (!selectedRow) return 0
    return calculateTotalDays(selectedRow.courseDays, selectedRow.endDay, extendWeeks)
  }, [extendWeeks, selectedRow])

  const availableRecordingDates = useMemo(() => {
    if (!selectedRow || !extensionStartDate || !scheduleWeeks) return []
    return getAvailableRecordingDates(
      extensionStartDate,
      scheduleWeeks,
      selectedRow.courseDays,
      normalizedSkipWeeks,
      selectedRow.breakRanges
    )
  }, [extensionStartDate, normalizedSkipWeeks, scheduleWeeks, selectedRow])

  const validRecordingDates = useMemo(() => {
    if (!recordingEnabled) return []
    const availableSet = new Set(availableRecordingDates)
    return recordingDates.filter((d) => availableSet.has(d))
  }, [availableRecordingDates, recordingDates, recordingEnabled])

  const recordingDays = validRecordingDates.length

  const savedDiscount = useMemo(() => {
    const raw = Number(selectedRow?.registration?.discount ?? 0)
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0
  }, [selectedRow])

  const feeBreakdown = useMemo(() => {
    // 수업목록에 설정된 주당 수강료 기준으로 계산 (계산기 화면과 동일)
    const baseFee = weeklyFee > 0 ? weeklyFee * extendWeeks : feeValue ?? 0
    if (!baseFee || !totalDays) {
      return { normalFee: 0, recordingFee: 0, totalFee: feeValue ?? 0, hasBreakdown: false }
    }
    if (recordingDays > 0 && recordingDays < totalDays) {
      const result = calculateRecordingFee(baseFee, totalDays, recordingDays, savedDiscount)
      return {
        normalFee: result.normal,
        recordingFee: result.recording,
        totalFee: result.total,
        hasBreakdown: true,
      }
    }
    // 녹화 없어도 할인 적용
    const discountedFee = Math.round(baseFee * (1 - savedDiscount))
    return { normalFee: 0, recordingFee: 0, totalFee: discountedFee, hasBreakdown: false }
  }, [extendWeeks, feeValue, recordingDays, savedDiscount, totalDays, weeklyFee])

  const rangeLabel = useMemo(
    () => formatInstallmentDateRange(extensionStartDate, extensionEndDate),
    [extensionEndDate, extensionStartDate]
  )

  const currentFeeLabel = useMemo(
    () => formatInstallmentFee(selectedRow?.registration?.tuitionFee),
    [selectedRow]
  )

  const displayName = useMemo(() => {
    return stripDuplicateSuffix(selectedRow?.registration?.name)
  }, [selectedRow])

  const effectiveFee = weeklyFee > 0 ? feeBreakdown.totalFee : (feeValue ?? 0)

  const buildNoticeParams = useCallback(
    (includeCaution: boolean) => {
      if (!selectedRow) return null
      return {
        name: displayName,
        course: String(selectedRow.courseLabel || ""),
        rangeLabel,
        weeks: extendWeeks,
        fee: effectiveFee,
        includeCaution,
        skipWeeks: normalizedSkipWeeks.length > 0 ? normalizedSkipWeeks : undefined,
        startDate: extensionStartDate || undefined,
        recordingDates: validRecordingDates.length > 0 ? validRecordingDates : undefined,
        normalFee: feeBreakdown.hasBreakdown ? feeBreakdown.normalFee : undefined,
        recordingFee: feeBreakdown.hasBreakdown ? feeBreakdown.recordingFee : undefined,
        totalDays: feeBreakdown.hasBreakdown ? totalDays : undefined,
        recordingDays: feeBreakdown.hasBreakdown ? recordingDays : undefined,
      }
    },
    [
      displayName, effectiveFee, extendWeeks, extensionStartDate,
      feeBreakdown, normalizedSkipWeeks, rangeLabel, recordingDays,
      selectedRow, totalDays, validRecordingDates,
    ]
  )

  const noticePreview = useMemo(() => {
    const params = buildNoticeParams(false)
    if (!params) return ""
    return buildInstallmentNoticeText(params)
  }, [buildNoticeParams])

  const noticeCopy = useMemo(() => {
    const params = buildNoticeParams(true)
    if (!params) return ""
    return buildInstallmentNoticeText(params)
  }, [buildNoticeParams])

  const maxSkipWeeks = selectedRow ? selectedRow.remainingWeeks - extendWeeks : 0

  const handleSkipWeekToggle = useCallback((weekIndex: number) => {
    setSkipWeeks((prev) => {
      const set = new Set(prev)
      if (set.has(weekIndex)) {
        set.delete(weekIndex)
      } else {
        if (set.size >= maxSkipWeeks) return prev
        set.add(weekIndex)
      }
      return Array.from(set).sort((a, b) => a - b)
    })
  }, [maxSkipWeeks])

  const handleRecordingDateToggle = useCallback((dateStr: string) => {
    setRecordingDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr)
      }
      return [...prev, dateStr].sort()
    })
  }, [])

  useEffect(() => {
    if (!recordingEnabled && recordingDates.length > 0) {
      setRecordingDates([])
    }
  }, [recordingEnabled, recordingDates.length])

  useEffect(() => {
    if (!skipWeeksEnabled && skipWeeks.length > 0) {
      setSkipWeeks([])
    }
  }, [skipWeeksEnabled, skipWeeks.length])

  const handleOpen = (row: InstallmentRow) => {
    setSelectedRow(row)
    setDialogOpen(true)
  }

  const handleCopy = async () => {
    if (!noticeCopy) return
    try {
      await navigator.clipboard.writeText(noticeCopy)
      setCopyState(COPY.cautionCopyDone)
    } catch {
      try {
        window.prompt(COPY.cautionCopyFallback, noticeCopy)
        setCopyState(COPY.cautionCopyDone)
      } catch {
        setCopyState(COPY.copyFailed)
      }
    }
  }

  const handleSave = async () => {
    if (!selectedRow || typeof onCreateExtension !== "function") return

    const weeksValue = Number(extendWeeks)
    if (!Number.isFinite(weeksValue) || weeksValue <= 0) {
      setSaveError(COPY.invalidWeeks)
      return
    }
    if (weeksValue > selectedRow.remainingWeeks) {
      setSaveError(
        `${COPY.dialogRemainingWeeks}(${selectedRow.remainingWeeks}${COPY.weekSuffix})를 초과할 수 없습니다.`
      )
      return
    }

    const feeValueRaw = String(extendFee || "").replace(/,/g, "").trim()
    const nextFeeValue = feeValueRaw ? Number(feeValueRaw) : null
    if (feeValueRaw && !Number.isFinite(nextFeeValue)) {
      setSaveError(COPY.invalidFee)
      return
    }

    const finalFee = weeklyFee > 0
      ? feeBreakdown.totalFee
      : (Number.isFinite(nextFeeValue) ? nextFeeValue : null)

    const startDateValue = formatDateYmd(extensionStartDate)

    // 연장 휴강 주차를 등록 전체 기준으로 변환
    const baseWeeks = Number(selectedRow.registration?.weeks || 0)
    const baseSkipArr = Array.isArray(selectedRow.registration?.skipWeeks)
      ? (selectedRow.registration.skipWeeks as number[]).filter((n) => typeof n === "number")
      : []
    const baseCalendarWeeks = baseWeeks + baseSkipArr.length
    const globalSkipWeeks = normalizedSkipWeeks.map((w) => baseCalendarWeeks + w)

    const payload: Record<string, unknown> = {
      registrationId: selectedRow.registration?.id,
      weeks: weeksValue,
      tuitionFee: Number.isFinite(finalFee) ? finalFee : null,
      startDate: startDateValue || undefined,
      endDate: extensionEndDate || undefined,
    }
    if (globalSkipWeeks.length > 0) {
      payload.skipWeeks = globalSkipWeeks
    }
    if (validRecordingDates.length > 0) {
      payload.recordingDates = validRecordingDates
    }

    setSaveError("")
    try {
      await onCreateExtension(payload)
      setDialogOpen(false)
      setSelectedRow(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : COPY.saveFailed
      setSaveError(message)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedRow(null)
    }
  }

  return {
    dialogOpen,
    selectedRow,
    extendWeeks,
    extendFee,
    extensionStartDate,
    extensionEndDate,
    noticePreview,
    copyState,
    saveError,
    currentFeeLabel,
    handleOpen,
    handleCopy,
    handleSave,
    handleDialogOpenChange,
    setExtendWeeks,
    setExtendFee,

    skipWeeksEnabled,
    setSkipWeeksEnabled,
    skipWeeks: normalizedSkipWeeks,
    handleSkipWeekToggle,
    maxSkipWeeks,
    scheduleWeeks,

    recordingEnabled,
    setRecordingEnabled,
    recordingDates: validRecordingDates,
    handleRecordingDateToggle,
    availableRecordingDates,
    isRecordingAvailable,

    feeBreakdown,
    totalDays,
    recordingDays,
    effectiveFee,
    weeklyFee,
    savedDiscount,
  }
}
