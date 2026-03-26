import type { InstallmentRow, InstallmentStatus, SortConfig } from "./installmentBoardTypes"
import { DEFAULT_INSTALLMENT_SORT } from "./installmentBoardTypes"
import { parseDate } from "./utils"

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

export function sortInstallmentRows(rows: InstallmentRow[], sortConfig: SortConfig) {
  const effectiveSort = sortConfig.key ? sortConfig : DEFAULT_INSTALLMENT_SORT
  const direction = effectiveSort.direction === "desc" ? -1 : 1

  rows.sort((a, b) => {
    let result = 0
    switch (effectiveSort.key) {
      case "student":
        result = compareText(a.registration?.name, b.registration?.name)
        break
      case "course":
        result = compareText(a.courseLabel, b.courseLabel)
        break
      case "period":
        result = compareDates(a.registration?.startDate, b.registration?.startDate)
        if (result === 0) {
          result = compareDates(a.endDate, b.endDate)
        }
        break
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

  return rows
}
