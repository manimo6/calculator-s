import { useCallback } from "react"

import { apiClient } from "@/api-client"
import {
  courseConfigSetName,
  courseInfo,
  courseTree,
  recordingAvailable,
  setCourseConfigSetName,
  timeTable,
  weekdayName,
} from "@/utils/data"

import { COURSE_ACTION_COPY as COPY } from "./courseActionCopy"
import { buildCourseConfigSetSnapshot, replaceArrayContents } from "./courseManagerUtils"

const COURSE_CONFIG_SETS_UPDATED_KEY = "courseConfigSets.updatedAt"

const notifyCourseConfigSetsUpdated = () => {
  if (typeof window === "undefined") return
  const updatedAt = String(Date.now())
  try {
    localStorage.setItem(COURSE_CONFIG_SETS_UPDATED_KEY, updatedAt)
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(
    new CustomEvent("course-config-sets:updated", { detail: { updatedAt } })
  )
}

type CommitCourseStateInput = {
  nextCourseTree?: unknown[]
  nextCourseInfo?: Record<string, unknown>
  nextTimeTable?: Record<string, unknown>
  nextRecordingAvailable?: Record<string, unknown>
  isDirty?: boolean
}

type UseCourseConfigSetActionsArgs = {
  showToast: (message: string) => void
  loadCourseConfigSets: () => Promise<void>
  commitCourseState: (input: CommitCourseStateInput) => void
  selectedCourseConfigSet: string
  setSelectedCourseConfigSet: (value: string) => void
  isConfigDirty: boolean
  setIsConfigDirty: (value: boolean) => void
}

export function useCourseConfigSetActions({
  showToast,
  loadCourseConfigSets,
  commitCourseState,
  selectedCourseConfigSet,
  setSelectedCourseConfigSet,
  isConfigDirty,
  setIsConfigDirty,
}: UseCourseConfigSetActionsArgs) {
  const handleSaveToServer = useCallback(async () => {
    try {
      const payload = {
        courseConfigSetName,
        ...buildCourseConfigSetSnapshot({
          weekdayName,
          courseTree,
          courseInfo,
          timeTable,
          recordingAvailable,
        }),
      }
      await apiClient.saveCourses(payload)
      showToast(COPY.serverSaveSuccess)
      notifyCourseConfigSetsUpdated()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e || "")
      alert(COPY.serverSaveAlertPrefix + message)
    }
  }, [showToast])

  const applyCourseConfigSetData = useCallback(
    (name, courseConfigSetData) => {
      const nextSnapshot = buildCourseConfigSetSnapshot({
        weekdayName: courseConfigSetData.weekdayName || weekdayName,
        courseTree: courseConfigSetData.courseTree || [],
        courseInfo: courseConfigSetData.courseInfo || {},
        timeTable: courseConfigSetData.timeTable || {},
        recordingAvailable: courseConfigSetData.recordingAvailable || {},
      })
      replaceArrayContents(weekdayName, nextSnapshot.weekdayName)
      commitCourseState({
        nextCourseTree: nextSnapshot.courseTree,
        nextCourseInfo: nextSnapshot.courseInfo,
        nextTimeTable: nextSnapshot.timeTable,
        nextRecordingAvailable: nextSnapshot.recordingAvailable,
        isDirty: false,
      })
      setCourseConfigSetName(name)
    },
    [commitCourseState]
  )

  const loadCourseConfigSetByName = useCallback(
    async (name) => {
      if (!name) return false
      try {
        const raw = await apiClient.listCourseConfigSets()
        const courseConfigSetData =
          raw && typeof raw === "object" && !Array.isArray(raw) ? raw[name] : null
        if (!courseConfigSetData) {
          showToast(COPY.configSetNotFound)
          return false
        }

        applyCourseConfigSetData(name, courseConfigSetData)
        setSelectedCourseConfigSet(name)
        showToast(COPY.configSetLoadSuccess)
        return true
      } catch (e) {
        const message = e instanceof Error ? e.message : COPY.configSetLoadFailed
        showToast(message || COPY.configSetLoadFailed)
        return false
      }
    },
    [applyCourseConfigSetData, setSelectedCourseConfigSet, showToast]
  )

  const handleSaveCourseConfigSet = useCallback(async () => {
    const name = prompt(COPY.configSetPrompt)
    if (!name) return
    const data = buildCourseConfigSetSnapshot({
      weekdayName,
      courseTree,
      courseInfo,
      timeTable,
      recordingAvailable,
    })
    try {
      await apiClient.saveCourseConfigSet(name, data)
      showToast(COPY.configSetSaveSuccess(name))
      notifyCourseConfigSetsUpdated()
      await loadCourseConfigSets()
    } catch (e) {
      const message = e instanceof Error ? e.message : COPY.configSetSaveFailed
      showToast(message || COPY.configSetSaveFailed)
    }
  }, [loadCourseConfigSets, showToast])

  const handleOverwriteCourseConfigSet = useCallback(async () => {
    const name = String(selectedCourseConfigSet || "").trim()
    if (!name) {
      showToast(COPY.overwriteTargetRequired)
      return
    }
    if (!confirm(COPY.overwriteConfirm(name))) return
    const data = buildCourseConfigSetSnapshot({
      weekdayName,
      courseTree,
      courseInfo,
      timeTable,
      recordingAvailable,
    })
    try {
      await apiClient.saveCourseConfigSet(name, data)
      showToast(COPY.overwriteSuccess(name))
      notifyCourseConfigSetsUpdated()
      setIsConfigDirty(false)
      await loadCourseConfigSets()
    } catch (e) {
      const message = e instanceof Error ? e.message : COPY.overwriteFailed
      showToast(message || COPY.overwriteFailed)
    }
  }, [loadCourseConfigSets, selectedCourseConfigSet, setIsConfigDirty, showToast])

  const handleLoadCourseConfigSet = useCallback(async () => {
    const name = selectedCourseConfigSet
    if (!name) {
      showToast(COPY.loadTargetRequired)
      return
    }
    if (!confirm(COPY.loadConfirm(name))) return
    await loadCourseConfigSetByName(name)
  }, [loadCourseConfigSetByName, selectedCourseConfigSet, showToast])

  const handleSelectCourseConfigSet = useCallback(
    async (name) => {
      const nextName = String(name || "").trim()
      if (!nextName) {
        setSelectedCourseConfigSet("")
        return
      }

      if (nextName === selectedCourseConfigSet) return
      if (isConfigDirty) {
        const ok = confirm(COPY.switchDirtyConfirm(nextName))
        if (!ok) return
      }

      await loadCourseConfigSetByName(nextName)
    },
    [
      isConfigDirty,
      loadCourseConfigSetByName,
      selectedCourseConfigSet,
      setSelectedCourseConfigSet,
    ]
  )

  const handleDeleteCourseConfigSet = useCallback(async () => {
    const name = selectedCourseConfigSet
    if (!name) {
      showToast(COPY.deleteTargetRequired)
      return
    }
    if (!confirm(COPY.deleteConfirm(name))) return
    const typed = prompt(COPY.deleteTypePrompt(name))
    if (typed === null) return
    if (String(typed).trim() !== String(name).trim()) {
      showToast(COPY.deleteTypeMismatch)
      return
    }
    try {
      await apiClient.deleteCourseConfigSet(name)
      showToast(COPY.deleteSuccess)
      notifyCourseConfigSetsUpdated()
      setSelectedCourseConfigSet("")
      await loadCourseConfigSets()
    } catch (e) {
      if (String(e?.message || "") === "Recent authentication required.") {
        throw e
      }
      const message = e instanceof Error ? e.message : COPY.deleteFailed
      showToast(message || COPY.deleteFailed)
    }
  }, [loadCourseConfigSets, selectedCourseConfigSet, showToast])

  return {
    handleDeleteCourseConfigSet,
    handleLoadCourseConfigSet,
    handleOverwriteCourseConfigSet,
    handleSaveCourseConfigSet,
    handleSaveToServer,
    handleSelectCourseConfigSet,
  }
}
