import { useCallback, useMemo, useState } from "react"

import { useCardRegistrations, useEnrichedRegistrations, useRegistrationMap } from "./useTransferDisplay"
import { getCourseDaysByName } from "./utils"
import { buildGanttGroups, buildMergeCourseOptions, buildMergeCourseTabs } from "./registrationsGanttGroups"
import type { CourseConfigSet, GanttGroup, MergeEntry, RegistrationRow } from "./registrationsTypes"

type UseRegistrationsTabDerivedParams = {
  courseConfigSets: CourseConfigSet[]
  selectedCourseConfigSet: string
  courseConfigSetBaseCourses: string[]
  mergeCourses: string[]
  courseFilter: string
  merges: MergeEntry[]
  activeMergesToday: MergeEntry[]
  courseConfigSetIdToLabel: Map<string, string>
  courseVariantRequiredSet: Set<string>
  simulationDate: Date | null
  registrations: RegistrationRow[]
  filteredRegistrations: RegistrationRow[]
  baseRegistrations: RegistrationRow[]
}

export function useRegistrationsTabDerived({
  courseConfigSets,
  selectedCourseConfigSet,
  courseConfigSetBaseCourses,
  mergeCourses,
  courseFilter,
  merges,
  activeMergesToday,
  courseConfigSetIdToLabel,
  courseVariantRequiredSet,
  simulationDate,
  registrations,
  filteredRegistrations,
  baseRegistrations,
}: UseRegistrationsTabDerivedParams) {
  const [showTransferChain, setShowTransferChain] = useState(false)

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((setItem) => setItem.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )

  const mergeCourseOptions = useMemo(() => {
    return buildMergeCourseOptions(registrations || [], mergeCourses, selectedCourseConfigSet)
  }, [mergeCourses, registrations, selectedCourseConfigSet])

  const mergeCourseTabs = useMemo(() => {
    return buildMergeCourseTabs(courseConfigSetBaseCourses, mergeCourseOptions)
  }, [courseConfigSetBaseCourses, mergeCourseOptions])

  const resolveCourseDays = useCallback(
    (courseName: string) =>
      getCourseDaysByName(courseName || "", selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )

  const registrationMap = useRegistrationMap(registrations || [])
  const chartFilteredRegistrations = useEnrichedRegistrations(
    filteredRegistrations || [],
    registrationMap
  )
  const chartBaseRegistrations = useEnrichedRegistrations(
    baseRegistrations || [],
    registrationMap
  )
  const cardFilteredRegistrations = useCardRegistrations(chartFilteredRegistrations)

  const ganttGroups = useMemo<GanttGroup[]>(() => {
    return buildGanttGroups({
      selectedCourseConfigSet,
      selectedCourseConfigSetObj,
      registrations: registrations || [],
      chartFilteredRegistrations: chartFilteredRegistrations || [],
      chartBaseRegistrations: chartBaseRegistrations || [],
      courseFilter,
      merges: merges || [],
      activeMergesToday,
      courseConfigSetIdToLabel,
      courseVariantRequiredSet,
      simulationDate,
      showTransferChain,
      registrationMap,
    })
  }, [
    activeMergesToday,
    chartBaseRegistrations,
    chartFilteredRegistrations,
    courseConfigSetIdToLabel,
    courseFilter,
    courseVariantRequiredSet,
    merges,
    registrationMap,
    registrations,
    selectedCourseConfigSet,
    selectedCourseConfigSetObj,
    showTransferChain,
    simulationDate,
  ])

  return {
    selectedCourseConfigSetObj,
    showTransferChain,
    setShowTransferChain,
    mergeCourseOptions,
    mergeCourseTabs,
    resolveCourseDays,
    registrationMap,
    cardFilteredRegistrations,
    ganttGroups,
  }
}
