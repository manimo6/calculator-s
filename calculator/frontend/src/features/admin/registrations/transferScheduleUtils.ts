import { formatDateYmd, parseDate } from "./utils"
import type { RegistrationRow } from "./transferModelTypes"

export function calcRemainingWeeks(registration: RegistrationRow, transferDate: string | Date) {
  const totalWeeks = Number(registration?.weeks) || 0
  if (totalWeeks <= 0) return 0

  const start = parseDate(registration?.startDate)
  const transfer = parseDate(transferDate)
  if (!start || !transfer || transfer <= start) return totalWeeks

  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsedWeeks = Math.ceil((transfer.getTime() - start.getTime()) / msPerWeek)
  const skipWeeks = Array.isArray(registration?.skipWeeks)
    ? registration.skipWeeks
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= elapsedWeeks)
    : []
  const attendedWeeks = Math.max(0, elapsedWeeks - skipWeeks.length)

  return Math.max(1, totalWeeks - attendedWeeks)
}

export function getTransferExpectedEndDate(transferDate: string, transferWeeks: string) {
  if (!transferDate || !transferWeeks) return ""

  const start = parseDate(transferDate)
  const weeks = Number(transferWeeks)
  if (!start || !weeks || weeks <= 0) return ""

  const end = new Date(start.getTime())
  end.setDate(end.getDate() + weeks * 7 - 1)
  return formatDateYmd(end)
}
