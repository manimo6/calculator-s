import { getCourseDaysByName } from "./utils"
import type { CourseConfigSet, RegistrationRow } from "./registrationsTypes"

export const MERGE_LABEL_PREFIX = "[합반]"

export function buildMergeLabel(labelBase: string) {
  return labelBase ? `${MERGE_LABEL_PREFIX} ${labelBase}` : MERGE_LABEL_PREFIX
}

export function countVisibleRegistrations(rows: RegistrationRow[]) {
  return rows.filter((registration) => !registration?.transferToId && !registration?.isTransferredOut)
    .length
}

export function collectCourseDays(courseNames: string[], selectedCourseConfigSetObj: CourseConfigSet | null) {
  const daySet = new Set<number>()
  for (const name of courseNames) {
    for (const day of getCourseDaysByName(name, selectedCourseConfigSetObj)) {
      const dayValue = Number(day)
      if (Number.isInteger(dayValue)) {
        daySet.add(dayValue)
      }
    }
  }
  return Array.from(daySet).sort((a, b) => a - b)
}
