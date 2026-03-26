import { useEffect, useMemo } from "react"

import {
  buildCourseOptions,
  buildMergeOptions,
  buildVariantTabs,
  filterBaseRegistrationsByVariant,
  filterPreVariantRegistrations,
  filterRegistrationsByCourseFilter,
  getCategoryForFilterValue as getCategoryForFilterValueHelper,
  getCategoryForRegistration as getCategoryForRegistrationHelper,
} from "./registrationsSelectors"
import type {
  CourseOption,
  MergeEntry,
  RegistrationRow,
} from "./registrationsTypes"

type UseRegistrationsDerivedStateParams = {
  enableVariants: boolean
  resolvedRegistrations: RegistrationRow[]
  selectedCourseConfigSet: string
  courseConfigSetBaseCourses: string[]
  courseConfigSetCourseIdSet: Set<string>
  courseConfigSetCourseSet: Set<string>
  courseConfigSetIdToLabel: Map<string, string>
  courseConfigSetIdToCategory: Map<string, string>
  courseConfigSetTree: unknown[]
  courseVariantRequiredSet: Set<string>
  categoryFilter: string
  courseFilter: string
  search: string
  variantFilter: string
  setVariantFilter: (value: string) => void
  merges: MergeEntry[]
  activeMergesToday: MergeEntry[]
  courseCatMap: Map<string, string>
}

export function useRegistrationsDerivedState({
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
}: UseRegistrationsDerivedStateParams) {
  const mapCourseToCategory = useMemo(() => {
    return (courseLabel: string) => {
      return getCategoryForRegistrationHelper(
        { course: courseLabel },
        courseConfigSetIdToCategory,
        courseCatMap,
        courseConfigSetBaseCourses
      )
    }
  }, [courseCatMap, courseConfigSetBaseCourses, courseConfigSetIdToCategory])

  const getCategoryForCourseValue = useMemo(() => {
    return (value: string) => {
      return getCategoryForFilterValueHelper(
        value,
        courseConfigSetIdToCategory,
        courseCatMap,
        courseConfigSetBaseCourses
      )
    }
  }, [courseCatMap, courseConfigSetBaseCourses, courseConfigSetIdToCategory])

  const getCategoryForRegistration = useMemo(() => {
    return (registration: RegistrationRow) => {
      return getCategoryForRegistrationHelper(
        registration,
        courseConfigSetIdToCategory,
        courseCatMap,
        courseConfigSetBaseCourses
      )
    }
  }, [courseCatMap, courseConfigSetBaseCourses, courseConfigSetIdToCategory])

  const courseOptions = useMemo<CourseOption[]>(
    () =>
      buildCourseOptions({
        resolvedRegistrations,
        selectedCourseConfigSet,
        courseConfigSetBaseCourses,
        courseConfigSetCourseIdSet,
        courseConfigSetIdToLabel,
        courseConfigSetTree,
        courseVariantRequiredSet,
      }),
    [
      courseConfigSetBaseCourses,
      courseConfigSetCourseIdSet,
      courseConfigSetIdToLabel,
      courseConfigSetTree,
      courseVariantRequiredSet,
      resolvedRegistrations,
      selectedCourseConfigSet,
    ]
  )

  const courseOptionsForFilter = useMemo(() => {
    if (!categoryFilter) return courseOptions
    return courseOptions.filter((course) => {
      return getCategoryForCourseValue(course.value) === categoryFilter
    })
  }, [categoryFilter, courseOptions, getCategoryForCourseValue])

  const preVariantRegistrations = useMemo(
    () =>
      filterPreVariantRegistrations({
        resolvedRegistrations,
        selectedCourseConfigSet,
        courseConfigSetCourseSet,
        courseConfigSetCourseIdSet,
        categoryFilter,
        search,
        getCategoryForRegistration,
      }),
    [
      categoryFilter,
      courseConfigSetCourseIdSet,
      courseConfigSetCourseSet,
      getCategoryForRegistration,
      resolvedRegistrations,
      search,
      selectedCourseConfigSet,
    ]
  )

  const mergeCourseLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const merge of activeMergesToday) {
      for (const course of merge.courses || []) {
        map.set(course, merge.name || (merge.courses || []).join(" + "))
      }
    }
    return map
  }, [activeMergesToday])

  const variantTabs = useMemo(() => {
    if (!enableVariants) return []
    return buildVariantTabs(preVariantRegistrations, mergeCourseLabelMap)
  }, [enableVariants, preVariantRegistrations, mergeCourseLabelMap])

  useEffect(() => {
    if (!enableVariants) {
      if (variantFilter) setVariantFilter("")
      return
    }
    if (!variantTabs.length) {
      if (variantFilter) setVariantFilter("")
      return
    }
    if (!variantFilter || !variantTabs.some((tab) => tab.key === variantFilter)) {
      setVariantFilter(variantTabs[0].key)
    }
  }, [enableVariants, variantFilter, variantTabs, setVariantFilter])

  const baseRegistrations = useMemo(() => {
    return filterBaseRegistrationsByVariant({
      enableVariants,
      preVariantRegistrations,
      variantFilter,
      variantTabs,
      mergeCourseLabelMap,
    })
  }, [enableVariants, preVariantRegistrations, variantFilter, variantTabs, mergeCourseLabelMap])

  const filteredRegistrations = useMemo(() => {
    return filterRegistrationsByCourseFilter({
      baseRegistrations,
      courseFilter,
      merges,
    })
  }, [baseRegistrations, courseFilter, merges])

  const mergeOptions = useMemo(() => {
    return buildMergeOptions(merges, activeMergesToday)
  }, [activeMergesToday, merges])

  const mergeOptionsForFilter = useMemo(() => {
    if (!categoryFilter) return mergeOptions
    return mergeOptions.filter((merge) =>
      (merge.courses || []).some(
        (course) => mapCourseToCategory(String(course)) === categoryFilter
      )
    )
  }, [categoryFilter, mapCourseToCategory, mergeOptions])

  return {
    courseOptions,
    courseOptionsForFilter,
    preVariantRegistrations,
    mergeCourseLabelMap,
    variantTabs,
    baseRegistrations,
    filteredRegistrations,
    mergeOptions,
    mergeOptionsForFilter,
  }
}
