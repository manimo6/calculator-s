import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"

import {
  buildCourseCategoryMap,
  extractCategoriesFromCourseTree,
  extractCourseTreeFromCourseConfigSet,
  extractCoursesFromCourseConfigSet,
  normalizeCourseConfigSets,
} from "../courseConfigSets/utils"
import {
  buildCourseConfigSetIdMap,
  buildCourseVariantRequiredSet,
} from "./registrationsSelectors"
import type { CourseConfigSet } from "./registrationsTypes"

const COURSE_CONFIG_SET_LOAD_ERROR =
  "\uC124\uC815 \uC138\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
const COURSE_CONFIG_SETS_UPDATED_KEY = "courseConfigSets.updatedAt"

export function useRegistrationCourseConfigSets() {
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true)
  const [courseConfigSetError, setCourseConfigSetError] = useState("")
  const [courseConfigSets, setCourseConfigSets] = useState<CourseConfigSet[]>([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState("")

  const selectedCourseConfigSetObj = useMemo(
    () => courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )
  const courseConfigSetTree = useMemo(
    () => extractCourseTreeFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetIdMap = useMemo(
    () => buildCourseConfigSetIdMap(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseConfigSetIdToLabel = courseConfigSetIdMap.idToLabel
  const courseConfigSetIdToCategory = courseConfigSetIdMap.idToCategory
  const courseConfigSetCourseIdSet = useMemo(
    () => new Set(courseConfigSetIdToLabel.keys()),
    [courseConfigSetIdToLabel]
  )
  const courseConfigSetBaseCourses = useMemo(
    () => extractCoursesFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetCourseSet = useMemo(
    () => new Set(courseConfigSetBaseCourses),
    [courseConfigSetBaseCourses]
  )
  const courseCatMap = useMemo(
    () => buildCourseCategoryMap(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseConfigSetCategories = useMemo(
    () => extractCategoriesFromCourseTree(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseVariantRequiredSet = useMemo(
    () =>
      buildCourseVariantRequiredSet({
        courseConfigSetBaseCourses,
        courseConfigSetTree,
        selectedCourseConfigSetObj,
      }),
    [courseConfigSetBaseCourses, courseConfigSetTree, selectedCourseConfigSetObj]
  )

  const loadCourseConfigSets = useCallback(async () => {
    setCourseConfigSetLoading(true)
    setCourseConfigSetError("")
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = (normalizeCourseConfigSets(raw) as CourseConfigSet[]).sort((a, b) => {
        const aName = a?.name ?? ""
        const bName = b?.name ?? ""
        return bName.localeCompare(aName, "ko-KR")
      })
      setCourseConfigSets(list)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : COURSE_CONFIG_SET_LOAD_ERROR
      setCourseConfigSetError(message)
      setCourseConfigSets([])
    } finally {
      setCourseConfigSetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourseConfigSets()
  }, [loadCourseConfigSets])

  useEffect(() => {
    if (typeof window === "undefined") return

    const reloadCourseConfigSets = () => {
      void loadCourseConfigSets()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== COURSE_CONFIG_SETS_UPDATED_KEY) return
      reloadCourseConfigSets()
    }

    window.addEventListener("course-config-sets:updated", reloadCourseConfigSets)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("course-config-sets:updated", reloadCourseConfigSets)
      window.removeEventListener("storage", handleStorage)
    }
  }, [loadCourseConfigSets])

  return {
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
  }
}
