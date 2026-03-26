import { useEffect, useMemo, useState } from "react"

import { getEndDate, getScheduleWeeks } from "@/utils/calculatorLogic"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import {
  buildInstallmentNoticeText,
  formatInstallmentDateRange,
  formatInstallmentFee,
} from "./installmentBoardNotice"
import {
  DEFAULT_EXTEND_WEEKS,
  type InstallmentRow,
} from "./installmentBoardModel"
import { formatDateYmd } from "./utils"

export function useInstallmentExtensionDraft({
  onCreateExtension,
}: {
  onCreateExtension?: (payload: Record<string, unknown>) => Promise<void> | void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<InstallmentRow | null>(null)
  const [extendWeeks, setExtendWeeks] = useState<number>(DEFAULT_EXTEND_WEEKS)
  const [extendFee, setExtendFee] = useState<string>("")
  const [startDateOverride, setStartDateOverride] = useState<string>("")
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [copyState, setCopyState] = useState("")
  const [saveError, setSaveError] = useState("")

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
    () => formatInstallmentDateRange(extensionStartDate, extensionEndDate),
    [extensionEndDate, extensionStartDate]
  )

  const currentFeeLabel = useMemo(
    () => formatInstallmentFee(selectedRow?.registration?.tuitionFee),
    [selectedRow]
  )

  const noticePreview = useMemo(() => {
    if (!selectedRow) return ""
    return buildInstallmentNoticeText({
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
    return buildInstallmentNoticeText({
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
        `${COPY.dialogRemainingWeeks}(${selectedRow.remainingWeeks}${COPY.weekSuffix})\uB97C \uCD08\uACFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      )
      return
    }

    const feeValueRaw = String(extendFee || "").replace(/,/g, "").trim()
    const nextFeeValue = feeValueRaw ? Number(feeValueRaw) : null
    if (feeValueRaw && !Number.isFinite(nextFeeValue)) {
      setSaveError(COPY.invalidFee)
      return
    }

    const startDateValue = formatDateYmd(extensionStartDate)
    const payload = {
      registrationId: selectedRow.registration?.id,
      weeks: weeksValue,
      tuitionFee: Number.isFinite(nextFeeValue) ? nextFeeValue : null,
      startDate: startDateValue || undefined,
      endDate: extensionEndDate || undefined,
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
      setStartPickerOpen(false)
    }
  }

  return {
    dialogOpen,
    selectedRow,
    extendWeeks,
    extendFee,
    startDateOverride,
    startPickerOpen,
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
    setStartPickerOpen,
    setStartDateOverride,
  }
}
