import type { DateInput } from "./registrationDateUtils"
import { parseDate, startOfDay } from "./registrationDateUtils"

export function getRegistrationStatus(
  { startDate, endDate }: { startDate?: DateInput; endDate?: DateInput },
  now: Date = new Date()
) {
  const today = startOfDay(now)
  if (!today) return "unknown"

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (start && start.getTime() > today.getTime()) return "pending"
  if (end && end.getTime() < today.getTime()) return "completed"
  if (start && end && start.getTime() <= today.getTime() && today.getTime() <= end.getTime()) {
    return "active"
  }
  if (start && !end && start.getTime() <= today.getTime()) return "active"
  if (!start && end && today.getTime() <= end.getTime()) return "active"
  return "unknown"
}

export function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "진행중"
    case "pending":
      return "시작전"
    case "completed":
      return "종료"
    default:
      return "알 수 없음"
  }
}

export function getStatusSortRank(status: string | null | undefined) {
  switch (status) {
    case "active":
      return 0
    case "pending":
      return 1
    case "completed":
      return 2
    default:
      return 3
  }
}
