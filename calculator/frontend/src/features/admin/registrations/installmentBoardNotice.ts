import {
  TUITION_ACCOUNT,
  formatRecordingDates,
  buildSkipPeriodLines,
} from "@/utils/clipboardUtils"
import { formatDateWithWeekday } from "@/utils/calculatorLogic"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"

export function formatInstallmentFee(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return COPY.feeUnknown
  const num = Number(value)
  if (!Number.isFinite(num)) return COPY.feeUnknown
  return `${num.toLocaleString("ko-KR")}${COPY.feeSuffix}`
}

export function formatInstallmentDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const startLabel = formatDateWithWeekday(startDate)
  const endLabel = formatDateWithWeekday(endDate)
  if (!startLabel || !endLabel) return COPY.feeUnknown
  return `${startLabel}~${endLabel}`
}

export function buildInstallmentNoticeText({
  name,
  course,
  rangeLabel,
  weeks,
  fee,
  includeCaution,
  skipWeeks,
  startDate,
  recordingDates,
  normalFee,
  recordingFee,
  totalDays,
  recordingDays,
}: {
  name: string
  course: string
  rangeLabel: string
  weeks: number
  fee: number | string
  includeCaution: boolean
  skipWeeks?: number[]
  startDate?: string
  recordingDates?: string[]
  normalFee?: number
  recordingFee?: number
  totalDays?: number
  recordingDays?: number
}) {
  const safeName = String(name || "").trim() || COPY.feeUnknown
  const safeCourse = String(course || "").trim() || COPY.feeUnknown
  const safeWeeks = Number(weeks) > 0 ? `${weeks}${COPY.weekSuffix}` : COPY.feeUnknown
  const safeRange = String(rangeLabel || "").trim() || COPY.feeUnknown
  const feeValue = Number(fee)
  const safeFee = Number.isFinite(feeValue)
    ? `${feeValue.toLocaleString("ko-KR")}${COPY.feeSuffix}`
    : COPY.feeUnknown

  const lines = [
    COPY.tuitionNoticeTitle,
    `${COPY.studentName}: ${safeName}`,
    `${COPY.course}: ${safeCourse}`,
    `${COPY.extensionRange}: ${safeRange}`,
    `${COPY.extensionWeeks}: ${safeWeeks}`,
  ]

  const safeSkipWeeks = Array.isArray(skipWeeks) ? skipWeeks : []
  if (safeSkipWeeks.length > 0 && startDate) {
    const skipLines = buildSkipPeriodLines(startDate, safeSkipWeeks)
    if (skipLines.length > 0) {
      lines.push(...skipLines)
    }
  }

  const safeRecordingDates = Array.isArray(recordingDates) ? recordingDates : []
  const recDays = Number(recordingDays) || safeRecordingDates.length
  const normDays = Number(totalDays) || 0
  const normFee = Number(normalFee)
  const recFee = Number(recordingFee)

  if (recDays > 0 && normDays > 0 && Number.isFinite(normFee) && Number.isFinite(recFee)) {
    const normalDays = normDays - recDays
    lines.push(
      `${COPY.extensionFee}:`,
      `  = ${COPY.normalFeeNote}(${normalDays}${COPY.daySuffix}): ${normFee.toLocaleString("ko-KR")}${COPY.feeSuffix}`,
      `  + ${COPY.recordingFeeNote}(${recDays}${COPY.daySuffix}): ${recFee.toLocaleString("ko-KR")}${COPY.feeSuffix}`,
      `  = 합계: ${safeFee}`
    )
  } else {
    lines.push(`${COPY.extensionFee}: ${safeFee}`)
  }

  if (safeRecordingDates.length > 0) {
    const formatted = formatRecordingDates(safeRecordingDates)
    if (formatted) {
      lines.push(`• ${COPY.recordingDatesLabel}: ${formatted}`)
    }
  }

  if (includeCaution) {
    lines.push("", TUITION_ACCOUNT)
  }

  return lines.join("\n")
}
