import { useCallback } from "react"

import {
  courseInfo,
  courseTree,
  recordingAvailable,
  timeTable,
} from "@/utils/data"

import { COURSE_ACTION_COPY as COPY } from "./courseActionCopy"
import {
  buildDeletedCourseState,
  buildSavedCourseState,
  cloneCourseTreeGroups,
  findCategoryIndex,
  findDuplicateCourseByName,
  normalizeBreakRanges,
} from "./courseManagerUtils"

type CommitCourseStateInput = {
  nextCourseTree?: unknown[]
  nextCourseInfo?: Record<string, unknown>
  nextTimeTable?: Record<string, unknown>
  nextRecordingAvailable?: Record<string, unknown>
  isDirty?: boolean
}

type UseCourseTreeActionsArgs = {
  showToast: (message: string) => void
  commitCourseState: (input: CommitCourseStateInput) => void
}

export function useCourseTreeActions({
  showToast,
  commitCourseState,
}: UseCourseTreeActionsArgs) {
  const handleSaveCategory = useCallback(
    (newName, originalName) => {
      const name = (newName || "").trim()
      if (!name) {
        showToast(COPY.categoryNameRequired)
        return
      }
      const dup = courseTree.find((group) => group.cat === name)
      if (dup && name !== originalName) {
        showToast(COPY.categoryDuplicate)
        return
      }

      const nextCourseTree = cloneCourseTreeGroups(courseTree)
      if (originalName) {
        const targetIndex = findCategoryIndex(nextCourseTree, originalName)
        if (targetIndex === -1) return
        nextCourseTree[targetIndex] = {
          ...nextCourseTree[targetIndex],
          cat: name,
        }
      } else {
        nextCourseTree.push({ cat: name, items: [] })
      }

      commitCourseState({ nextCourseTree })
    },
    [commitCourseState, showToast]
  )

  const handleDeleteCategory = useCallback(
    (catName) => {
      const index = findCategoryIndex(courseTree, catName)
      if (index === -1) return
      const group = courseTree[index]
      const hasItems = Array.isArray(group.items) && group.items.length > 0
      if (hasItems) {
        showToast(COPY.categoryHasItems)
        return
      }
      const ok = confirm(COPY.categoryDeleteConfirm(catName))
      if (!ok) return

      const nextCourseTree = cloneCourseTreeGroups(courseTree)
      nextCourseTree.splice(index, 1)
      commitCourseState({ nextCourseTree })
      showToast(COPY.deleted)
    },
    [commitCourseState, showToast]
  )

  const handleSaveCourse = useCallback(
    (formData, courseId) => {
      const name = (formData?.courseName || "").trim()
      const category = (formData?.category || "").trim()
      if (!name || !category) {
        showToast(COPY.courseNameAndCategoryRequired)
        return false
      }

      const isDaily = formData?.durationUnit === "daily"

      if (!isDaily) {
        const days = Array.isArray(formData?.days) ? formData.days : []
        if (days.length === 0) {
          showToast(COPY.classDaysRequired)
          return false
        }

        const endDays = Array.isArray(formData?.endDays) ? formData.endDays : []
        if (endDays.length === 0) {
          showToast(COPY.endDaysRequired)
          return false
        }
        if (endDays.length !== 1) {
          showToast(COPY.endDaysSingleRequired)
          return false
        }

        if (!courseId) {
          const startDays = Array.isArray(formData?.startDays) ? formData.startDays : []
          if (startDays.length === 0) {
            showToast(COPY.startDaysRequired)
            return false
          }
        }
      }

      const timeType = formData?.timeType || "default"
      if (timeType === "default") {
        const time = (formData?.timeDefault || "").trim()
        if (!time) {
          showToast(COPY.defaultTimeRequired)
          return false
        }
      } else if (timeType === "onoff") {
        const online = (formData?.timeOnline || "").trim()
        const offline = (formData?.timeOffline || "").trim()
        if (!online || !offline) {
          showToast(COPY.onOffTimeRequired)
          return false
        }
      } else if (timeType === "dynamic") {
        const raw = Array.isArray(formData?.dynamicOptions)
          ? formData.dynamicOptions
          : []
        const options = raw
          .map((option) => ({
            label: (option?.label || "").trim(),
            time: (option?.time || "").trim(),
          }))
          .filter((option) => option.label || option.time)

        if (options.length === 0) {
          showToast(COPY.dynamicOptionRequired)
          return false
        }
        const invalid = options.find((option) => !option.label || !option.time)
        if (invalid) {
          showToast(COPY.dynamicOptionInvalid)
          return false
        }
        const labels = options.map((option) => option.label)
        const dupLabel = labels.find((label, index) => labels.indexOf(label) !== index)
        if (dupLabel) {
          showToast(COPY.dynamicOptionDuplicate)
          return false
        }
      } else {
        showToast(COPY.unsupportedTimeType)
        return false
      }

      const breakRangesResult = normalizeBreakRanges(formData?.breakRanges)
      if (breakRangesResult.error) {
        showToast(breakRangesResult.error)
        return false
      }

      const duplicateCourse = findDuplicateCourseByName(courseTree, name, courseId)
      if (duplicateCourse) {
        showToast(COPY.duplicateCourse)
        return false
      }

      const nextState = buildSavedCourseState({
        currentCourseTree: courseTree,
        currentCourseInfo: courseInfo,
        currentTimeTable: timeTable,
        currentRecordingAvailable: recordingAvailable,
        formData,
        courseId,
        name,
        category,
        breakRanges: breakRangesResult.ranges,
      })
      if (!nextState) {
        showToast(COPY.courseStateBuildFailed)
        return false
      }

      commitCourseState({
        nextCourseTree: nextState.nextCourseTree,
        nextCourseInfo: nextState.nextCourseInfo,
        nextTimeTable: nextState.nextTimeTable,
        nextRecordingAvailable: nextState.nextRecordingAvailable,
      })
      return true
    },
    [commitCourseState, showToast]
  )

  const handleDeleteCourse = useCallback(
    (id) => {
      const nextState = buildDeletedCourseState({
        currentCourseTree: courseTree,
        currentCourseInfo: courseInfo,
        currentTimeTable: timeTable,
        currentRecordingAvailable: recordingAvailable,
        courseId: id,
      })
      if (!nextState) return

      const label = nextState.label
      if (!confirm(COPY.courseDeleteConfirm(label || id))) return

      commitCourseState({
        nextCourseTree: nextState.nextCourseTree,
        nextCourseInfo: nextState.nextCourseInfo,
        nextTimeTable: nextState.nextTimeTable,
        nextRecordingAvailable: nextState.nextRecordingAvailable,
      })
      showToast(COPY.courseDeleted)
    },
    [commitCourseState, showToast]
  )

  return {
    handleDeleteCategory,
    handleDeleteCourse,
    handleSaveCategory,
    handleSaveCourse,
  }
}
