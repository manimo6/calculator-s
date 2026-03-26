import { useCallback, useEffect, useMemo, useState } from "react"

import type { Dispatch, SetStateAction } from "react"

import type { GanttGroup } from "./registrationsTypes"

type UseRegistrationsViewStateParams = {
  courseFilter: string
  setCourseFilter: (value: string) => void
  ganttGroups: GanttGroup[]
  canManageMerges: boolean
  mergeManagerOpen: boolean
  setMergeManagerOpen: Dispatch<SetStateAction<boolean>>
  canViewInstallments: boolean
}

export function useRegistrationsViewState(params: UseRegistrationsViewStateParams) {
  const {
    courseFilter,
    setCourseFilter,
    ganttGroups,
    canManageMerges,
    mergeManagerOpen,
    setMergeManagerOpen,
    canViewInstallments,
  } = params

  const [viewSource, setViewSource] = useState<"card" | "sidebar" | null>(null)
  const [activeGanttTab, setActiveGanttTab] = useState("")
  const [installmentMode, setInstallmentMode] = useState(false)
  const [chartOverlayOpen, setChartOverlayOpen] = useState(false)

  useEffect(() => {
    if (!canManageMerges && mergeManagerOpen) {
      setMergeManagerOpen(false)
    }
  }, [canManageMerges, mergeManagerOpen, setMergeManagerOpen])

  useEffect(() => {
    if (!canViewInstallments && installmentMode) {
      setInstallmentMode(false)
    }
  }, [canViewInstallments, installmentMode])

  useEffect(() => {
    if (!ganttGroups.length) {
      if (activeGanttTab) setActiveGanttTab("")
      return
    }
    if (!ganttGroups.some((group) => group.key === activeGanttTab)) {
      setActiveGanttTab(ganttGroups[0].key)
    }
  }, [activeGanttTab, ganttGroups])

  useEffect(() => {
    if (!courseFilter) {
      setViewSource(null)
    }
  }, [courseFilter])

  const activeGanttGroup = useMemo(
    () => ganttGroups.find((group) => group.key === activeGanttTab) || null,
    [activeGanttTab, ganttGroups]
  )

  const handleCourseFilterFromCard = useCallback((value: string) => {
    setViewSource("card")
    setCourseFilter(value)
  }, [setCourseFilter])

  const handleCourseFilterFromSidebar = useCallback((value: string) => {
    setViewSource("sidebar")
    setCourseFilter(value)
  }, [setCourseFilter])

  const isAllView = !courseFilter
  const showGantt = viewSource === "sidebar" && !isAllView && !installmentMode
  const showCourseFilter = installmentMode

  return {
    activeGanttTab,
    setActiveGanttTab,
    activeGanttGroup,
    installmentMode,
    setInstallmentMode,
    chartOverlayOpen,
    setChartOverlayOpen,
    handleCourseFilterFromCard,
    handleCourseFilterFromSidebar,
    isAllView,
    showGantt,
    showCourseFilter,
    viewSource,
  }
}
