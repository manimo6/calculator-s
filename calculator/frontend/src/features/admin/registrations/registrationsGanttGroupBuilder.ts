import { buildCourseGroups, buildCourseGroupMaps } from "./registrationsGanttCourseGroups"
import { buildActiveMergeGroups, buildMergeFilterGroup } from "./registrationsGanttMergeGroups"
import type { CourseConfigSet, GanttGroup, MergeEntry, RegistrationRow } from "./registrationsTypes"

type BuildGanttGroupsParams = {
  selectedCourseConfigSet: string
  selectedCourseConfigSetObj: CourseConfigSet | null
  registrations: RegistrationRow[]
  chartFilteredRegistrations: RegistrationRow[]
  chartBaseRegistrations: RegistrationRow[]
  courseFilter: string
  merges: MergeEntry[]
  activeMergesToday: MergeEntry[]
  courseConfigSetIdToLabel: Map<string, string>
  courseVariantRequiredSet: Set<string>
  simulationDate: Date | null
  showTransferChain: boolean
  registrationMap: Map<string, RegistrationRow>
}

export function buildGanttGroups({
  selectedCourseConfigSet,
  selectedCourseConfigSetObj,
  registrations,
  chartFilteredRegistrations,
  chartBaseRegistrations,
  courseFilter,
  merges,
  activeMergesToday,
  courseConfigSetIdToLabel,
  courseVariantRequiredSet,
  simulationDate,
  showTransferChain,
  registrationMap,
}: BuildGanttGroupsParams): GanttGroup[] {
  if (!selectedCourseConfigSet) return []

  const isMergeFilter = Boolean(courseFilter) && courseFilter.startsWith("__merge__")
  const sourceList = courseFilter ? chartFilteredRegistrations || [] : chartBaseRegistrations || []
  if (isMergeFilter) {
    if (!sourceList.length) return []
    return buildMergeFilterGroup({
      courseFilter,
      merges,
      sourceList,
      allRegistrations: registrations || [],
      selectedCourseConfigSetObj,
    })
  }

  if (!sourceList.length) return []

  const allRegistrations = registrations || []
  const { mergeGroups, todayMergedCourses } = buildActiveMergeGroups({
    courseFilter,
    activeMergesToday,
    sourceList,
    allRegistrations,
    selectedCourseConfigSetObj,
  })
  const { map, rangeMap } = buildCourseGroupMaps({
    sourceList,
    allRegistrations,
    todayMergedCourses,
    courseVariantRequiredSet,
    registrationMap,
    simulationDate,
    showTransferChain,
  })
  const courseGroups = buildCourseGroups({
    map,
    rangeMap,
    courseConfigSetIdToLabel,
    selectedCourseConfigSetObj,
  })

  if (mergeGroups.length) {
    mergeGroups.sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
    return [...mergeGroups, ...courseGroups]
  }

  return courseGroups
}
