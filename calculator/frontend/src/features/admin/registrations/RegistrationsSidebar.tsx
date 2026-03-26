import { useCallback, useMemo, useState } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"

import {
  SidebarCourseList,
  SidebarSimulationDate,
  SidebarStatsHeader,
  SidebarVariantTabs,
} from "./RegistrationsSidebarSections"
import {
  buildSidebarCourseGroups,
  buildSidebarItems,
  buildSidebarStats,
  type SidebarActiveMerge,
  type SidebarRegistrationRow,
} from "./registrationsSidebarModel"

type SidebarProps = {
  registrations: SidebarRegistrationRow[]
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet?: Set<string>
  merges?: Array<{ id?: string | number; name?: string; courses?: string[] }>
  activeMergesToday?: SidebarActiveMerge[]
  mergedCourseSetToday?: Set<string>
  variantTabs?: Array<{ key: string; label: string; count: number }>
  variantFilter?: string
  onVariantFilterChange?: (value: string) => void
  simulationDate?: Date | null
  onSimulationDateChange?: (date: Date | null) => void
}

export default function RegistrationsSidebar({
  registrations,
  courseFilter,
  onCourseFilterChange,
  courseIdToLabel,
  courseVariantRequiredSet,
  activeMergesToday = [],
  mergedCourseSetToday = new Set(),
  variantTabs = [],
  variantFilter,
  onVariantFilterChange,
  simulationDate = null,
  onSimulationDateChange,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMerges, setExpandedMerges] = useState<Set<string>>(new Set())

  const stats = useMemo(() => buildSidebarStats(registrations), [registrations])

  const courseGroups = useMemo(() => {
    return buildSidebarCourseGroups({
      registrations,
      courseIdToLabel,
      courseVariantRequiredSet,
    })
  }, [registrations, courseIdToLabel, courseVariantRequiredSet])

  const filteredCourseGroups = useMemo(() => {
    return buildSidebarItems({
      courseGroups,
      mergedCourseSetToday,
      activeMergesToday,
      searchQuery,
    })
  }, [courseGroups, mergedCourseSetToday, activeMergesToday, searchQuery])

  const toggleMergeExpand = useCallback((mergeKey: string) => {
    setExpandedMerges((prev) => {
      const next = new Set(prev)
      if (next.has(mergeKey)) next.delete(mergeKey)
      else next.add(mergeKey)
      return next
    })
  }, [])

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/60 bg-white">
      <SidebarStatsHeader stats={stats} />
      <SidebarSimulationDate
        simulationDate={simulationDate}
        onSimulationDateChange={onSimulationDateChange}
      />

      <ScrollArea className="flex-1 px-3 py-4">
        <SidebarCourseList
          courseFilter={courseFilter}
          onCourseFilterChange={onCourseFilterChange}
          filteredCourseGroups={filteredCourseGroups}
          totalCourseGroups={courseGroups.length}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          expandedMerges={expandedMerges}
          onToggleMergeExpand={toggleMergeExpand}
        />
      </ScrollArea>

      <SidebarVariantTabs
        variantTabs={variantTabs}
        variantFilter={variantFilter}
        onVariantFilterChange={onVariantFilterChange}
      />
    </div>
  )
}
