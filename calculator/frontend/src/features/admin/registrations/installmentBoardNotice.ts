import { TUITION_ACCOUNT } from "@/utils/clipboardUtils"
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
}: {
  name: string
  course: string
  rangeLabel: string
  weeks: number
  fee: number | string
  includeCaution: boolean
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
    `${COPY.extensionFee}: ${safeFee}`,
  ]

  if (includeCaution) {
    lines.push("", TUITION_ACCOUNT)
  }

  return lines.join("\n")
}
