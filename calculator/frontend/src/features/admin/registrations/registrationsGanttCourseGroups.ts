import { findActiveInChain, getFullChain } from "./transferChain"
import { getCourseKey, getCourseLabel, normalizeCourse } from "./utils"
import type { CourseConfigSet, RegistrationRow } from "./registrationsTypes"
import {
  collectCourseDays,
  countVisibleRegistrations,
} from "./registrationsGanttGroupShared"

export function buildCourseGroupMaps({
  sourceList,
  allRegistrations,
  todayMergedCourses,
  courseVariantRequiredSet,
  registrationMap,
  simulationDate,
  showTransferChain,
}: {
  sourceList: RegistrationRow[]
  allRegistrations: RegistrationRow[]
  todayMergedCourses: Set<string>
  courseVariantRequiredSet: Set<string>
  registrationMap: Map<string, RegistrationRow>
  simulationDate: Date | null
  showTransferChain: boolean
}) {
  const refDate = simulationDate || new Date()
  const processedChainIds = new Set<string>()
  const map = new Map<string, RegistrationRow[]>()

  for (const registration of sourceList) {
    const registrationId = String(registration?.id || "")
    if (processedChainIds.has(registrationId)) continue
    if (todayMergedCourses.size > 0 && todayMergedCourses.has(normalizeCourse(registration?.course))) {
      continue
    }

    if (!registrationMap.size || (!registration?.transferFromId && !registration?.transferToId)) {
      const courseKey = getCourseKey(registration, courseVariantRequiredSet)
      if (!courseKey) continue
      if (!map.has(courseKey)) map.set(courseKey, [])
      map.get(courseKey)?.push(registration)
      continue
    }

    const chain = getFullChain(registration, registrationMap)
    const activeRegistration = findActiveInChain(chain, refDate)
    for (const chainRegistration of chain) {
      processedChainIds.add(String(chainRegistration?.id || ""))
    }

    for (const chainRegistration of chain) {
      if (
        !sourceList.some(
          (sourceRegistration) => String(sourceRegistration?.id) === String(chainRegistration?.id)
        )
      ) {
        continue
      }

      const isActiveAtRef =
        activeRegistration && String(chainRegistration?.id) === String(activeRegistration?.id)
      const courseKey = getCourseKey(chainRegistration, courseVariantRequiredSet)
      if (!courseKey) continue

      if (isActiveAtRef) {
        if (!map.has(courseKey)) map.set(courseKey, [])
        map.get(courseKey)?.push({
          ...chainRegistration,
          isTransferredOut: false,
          transferToId: undefined,
        })
      } else if (showTransferChain) {
        if (!map.has(courseKey)) map.set(courseKey, [])
        map.get(courseKey)?.push({
          ...chainRegistration,
          isTransferredOut: true,
        })
      }
    }
  }

  const rangeMap = new Map<string, RegistrationRow[]>()
  for (const registration of allRegistrations) {
    if (todayMergedCourses.size > 0 && todayMergedCourses.has(normalizeCourse(registration?.course))) {
      continue
    }
    const courseKey = getCourseKey(registration, courseVariantRequiredSet)
    if (!courseKey) continue
    if (!rangeMap.has(courseKey)) rangeMap.set(courseKey, [])
    rangeMap.get(courseKey)?.push(registration)
  }

  return { map, rangeMap }
}

export function buildCourseGroups({
  map,
  rangeMap,
  courseConfigSetIdToLabel,
  selectedCourseConfigSetObj,
}: {
  map: Map<string, RegistrationRow[]>
  rangeMap: Map<string, RegistrationRow[]>
  courseConfigSetIdToLabel: Map<string, string>
  selectedCourseConfigSetObj: CourseConfigSet | null
}) {
  const courseIdLabelMap =
    courseConfigSetIdToLabel instanceof Map ? courseConfigSetIdToLabel : new Map()

  return Array.from(map.entries())
    .sort((a, b) => {
      const aLabel = getCourseLabel(a[0], courseIdLabelMap, a[1]?.[0]?.course)
      const bLabel = getCourseLabel(b[0], courseIdLabelMap, b[1]?.[0]?.course)
      return aLabel.localeCompare(bLabel, "ko-KR")
    })
    .map(([courseKey, rows]) => {
      const courseNames = rows.map((row) => normalizeCourse(row?.course)).filter(Boolean)

      return {
        key: courseKey,
        label: getCourseLabel(courseKey, courseIdLabelMap, rows?.[0]?.course),
        registrations: rows,
        rangeRegistrations: rangeMap.get(courseKey) || rows,
        courseDays: collectCourseDays(courseNames, selectedCourseConfigSetObj),
        count: countVisibleRegistrations(rows),
      }
    })
}
