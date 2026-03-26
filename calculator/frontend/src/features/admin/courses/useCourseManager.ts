import { useCallback, useEffect, useState } from "react"

import { apiClient } from "@/api-client"
import {
  courseInfo,
  courseToCatMap,
  courseTree,
  fetchCourseData,
  recordingAvailable,
  timeTable,
} from "@/utils/data"

import {
  buildCourseCategoryMapFromTree,
  replaceArrayContents,
  replaceObjectContents,
} from "./courseManagerUtils"
import { useCourseConfigSetActions } from "./useCourseConfigSetActions"
import { useCourseTreeActions } from "./useCourseTreeActions"
import { normalizeCourseConfigSets } from "../courseConfigSets/utils"

export function useCourseManager() {
  const [loading, setLoading] = useState<any>(true)
  const [lastUpdated, setLastUpdated] = useState<any>(Date.now())
  const [isConfigDirty, setIsConfigDirty] = useState<any>(false)

  const [toast, setToast] = useState<any>({ visible: false, message: "" })

  const [courseConfigSetList, setCourseConfigSetList] = useState<any>([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState<any>("")

  const showToast = useCallback((message) => {
    setToast({ visible: true, message: message || "" })
    setTimeout(() => setToast({ visible: false, message: "" }), 3000)
  }, [])

  const rebuildCourseToCatMap = useCallback(() => {
    replaceObjectContents(courseToCatMap, buildCourseCategoryMapFromTree(courseTree))
  }, [])

  const commitCourseState = useCallback(
    ({
      nextCourseTree,
      nextCourseInfo,
      nextTimeTable,
      nextRecordingAvailable,
      isDirty = true,
    }: {
      nextCourseTree?: unknown[]
      nextCourseInfo?: Record<string, unknown>
      nextTimeTable?: Record<string, unknown>
      nextRecordingAvailable?: Record<string, unknown>
      isDirty?: boolean
    }) => {
      if (nextCourseTree) replaceArrayContents(courseTree, nextCourseTree)
      if (nextCourseInfo) replaceObjectContents(courseInfo, nextCourseInfo)
      if (nextTimeTable) replaceObjectContents(timeTable, nextTimeTable)
      if (nextRecordingAvailable) {
        replaceObjectContents(recordingAvailable, nextRecordingAvailable)
      }

      rebuildCourseToCatMap()
      setIsConfigDirty(isDirty)
      setLastUpdated(Date.now())
    },
    [rebuildCourseToCatMap]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await fetchCourseData()
      setLastUpdated(Date.now())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCourseConfigSets = useCallback(async () => {
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = normalizeCourseConfigSets(raw)
      const names = list
        .map((p) => p.name)
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a, "ko-KR"))
      setCourseConfigSetList(names)
    } catch {
      setCourseConfigSetList([])
    }
  }, [])

  useEffect(() => {
    loadData()
    loadCourseConfigSets()
  }, [loadCourseConfigSets, loadData])

  const {
    handleDeleteCategory,
    handleDeleteCourse,
    handleSaveCategory,
    handleSaveCourse,
  } = useCourseTreeActions({
    showToast,
    commitCourseState,
  })

  const {
    handleDeleteCourseConfigSet,
    handleLoadCourseConfigSet,
    handleOverwriteCourseConfigSet,
    handleSaveCourseConfigSet,
    handleSaveToServer,
    handleSelectCourseConfigSet,
  } = useCourseConfigSetActions({
    showToast,
    loadCourseConfigSets,
    commitCourseState,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    isConfigDirty,
    setIsConfigDirty,
  })

  return {
    loading,
    lastUpdated,
    toast,
    showToast,
    isConfigDirty,

    courseConfigSetList,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    loadCourseConfigSets,

    loadData,

    handleSaveCategory,
    handleDeleteCategory,
    handleSaveCourse,
    handleDeleteCourse,
    handleSaveToServer,

    handleSaveCourseConfigSet,
    handleOverwriteCourseConfigSet,
    handleLoadCourseConfigSet,
    handleSelectCourseConfigSet,
    handleDeleteCourseConfigSet,

    courseTree,
  }
}
