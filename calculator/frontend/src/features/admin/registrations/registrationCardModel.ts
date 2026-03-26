import { getRegistrationStatus, getStatusSortRank, parseDate } from "./utils"
import type { RegistrationRow } from "./registrationsTypes"

export function sortRegistrationsForCards(registrations: RegistrationRow[]) {
  const list = (registrations || []).slice()
  list.sort((a, b) => {
    const aStatus = getRegistrationStatus(a)
    const bStatus = getRegistrationStatus(b)
    const statusRank = getStatusSortRank(aStatus) - getStatusSortRank(bStatus)
    if (statusRank !== 0) return statusRank

    const aStart = parseDate(a?.startDate)
    const bStart = parseDate(b?.startDate)
    if (aStart && bStart) return aStart.getTime() - bStart.getTime()
    if (aStart) return -1
    if (bStart) return 1
    return String(a?.name || "").localeCompare(String(b?.name || ""), "ko-KR")
  })
  return list
}
