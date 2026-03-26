import { useCallback, useEffect, useState } from "react"

import { normalizeWeekRanges } from "./utils"
import { useRegistrationRecords } from "./useRegistrationRecords"
import { useRegistrationsDerivedState } from "./useRegistrationsDerivedState"
import { useRegistrationMergeEditor } from "./useRegistrationMergeEditor"
import { useRegistrationCourseConfigSets } from "./useRegistrationCourseConfigSets"
import { useRegistrationFilterState } from "./useRegistrationFilterState"
import type { MergeEntry } from "./registrationsTypes"

type UseRegistrationsOptions = {
  loadMerges?: boolean
  loadExtensions?: boolean
  enableVariants?: boolean
}

export function useRegistrations(options: UseRegistrationsOptions = {}) {
  const {
    loadMerges: shouldLoadMerges = true,
    loadExtensions: shouldLoadExtensions = true,
    enableVariants = false,
  } = options

  const [error, setError] = useState("")

  const {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    loadCourseConfigSets,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    selectedCourseConfigSetObj,
    courseConfigSetTree,
    courseConfigSetIdToLabel,
    courseConfigSetIdToCategory,
    courseConfigSetCourseIdSet,
    courseConfigSetBaseCourses,
    courseConfigSetCourseSet,
    courseCatMap,
    courseConfigSetCategories,
    courseVariantRequiredSet,
  } = useRegistrationCourseConfigSets()

  const {
    simulationDate,
    setSimulationDate,
    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,
    variantFilter,
    setVariantFilter,
    selectCourseConfigSet,
  } = useRegistrationFilterState({
    setSelectedCourseConfigSet,
  })

  const {
    mergeError,
    setMergeError,
    merges,
    loadMerges,
    setActiveMergesFromApi,
    activeMergesToday,
    mergedCourseSetToday,
    mergeManagerOpen,
    setMergeManagerOpen,
    mergeName,
    setMergeName,
    mergeCourses,
    setMergeCourses,
    mergeWeekMode,
    setMergeWeekMode,
    mergeWeekRangeInputs,
    setMergeWeekRangeInputs,
    addMerge,
    deleteMerge,
    toggleMergeActive,
    editingMergeId,
    startEditMerge,
    cancelEditMerge,
  } = useRegistrationMergeEditor({
    shouldLoadMerges,
    selectedCourseConfigSet,
    simulationDate,
    setError,
  })

  const handleActiveMergesFromApi = useCallback(
    (entries: MergeEntry[]) => {
      const normalized = entries.map((entry) => ({
        ...entry,
        weekRanges: normalizeWeekRanges(entry?.weekRanges),
      }))
      setActiveMergesFromApi(normalized)
    },
    [setActiveMergesFromApi]
  )

  const {
    loading,
    registrations: resolvedRegistrations,
    extensions,
    extensionsLoading,
    extensionsError,
    loadRegistrations,
    loadExtensions,
  } = useRegistrationRecords({
    selectedCourseConfigSet,
    selectedCourseConfigSetObj,
    shouldLoadExtensions,
    setError,
    setActiveMergesFromApi: handleActiveMergesFromApi,
  })

  useEffect(() => {
    if (!selectedCourseConfigSet) return
    if (shouldLoadMerges) {
      loadMerges()
    }
    loadRegistrations()
  }, [selectedCourseConfigSet, loadMerges, loadRegistrations, shouldLoadMerges])

  const {
    courseOptions,
    courseOptionsForFilter,
    variantTabs,
    baseRegistrations,
    filteredRegistrations,
    mergeOptions,
    mergeOptionsForFilter,
  } = useRegistrationsDerivedState({
    enableVariants,
    resolvedRegistrations,
    selectedCourseConfigSet,
    courseConfigSetBaseCourses,
    courseConfigSetCourseIdSet,
    courseConfigSetCourseSet,
    courseConfigSetIdToLabel,
    courseConfigSetIdToCategory,
    courseConfigSetTree,
    courseVariantRequiredSet,
    categoryFilter,
    courseFilter,
    search,
    variantFilter,
    setVariantFilter,
    merges,
    activeMergesToday,
    courseCatMap,
  })

  return {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    courseConfigSetCourseSet,
    courseConfigSetCourseIdSet,
    courseConfigSetIdToLabel,
    courseConfigSetBaseCourses,
    courseVariantRequiredSet,
    courseOptions,
    loadCourseConfigSets,

    loading,
    error,
    setError,
    mergeError,
    setMergeError,
    simulationDate,
    setSimulationDate,
    registrations: resolvedRegistrations,
    extensions,
    extensionsLoading,
    extensionsError,
    baseRegistrations,
    filteredRegistrations,
    variantTabs,
    variantFilter,
    setVariantFilter,
    loadRegistrations,
    loadExtensions,

    merges,
    activeMergesToday,
    mergedCourseSetToday,
    mergeOptions,
    mergeOptionsForFilter,
    mergeManagerOpen,
    setMergeManagerOpen,
    mergeName,
    setMergeName,
    mergeCourses,
    setMergeCourses,
    mergeWeekMode,
    setMergeWeekMode,
    mergeWeekRangeInputs,
    setMergeWeekRangeInputs,
    addMerge,
    deleteMerge,
    toggleMergeActive,
    editingMergeId,
    startEditMerge,
    cancelEditMerge,

    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,

    courseOptionsForFilter,
  }
}
