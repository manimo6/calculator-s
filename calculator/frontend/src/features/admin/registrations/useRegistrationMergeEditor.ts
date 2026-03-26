import { useCallback, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import { getMergedCourseSet } from "@/utils/mergeUtils"

import { normalizeWeekRanges } from "./utils"
import { isPermissionDeniedError } from "./registrationsSelectors"
import type { MergeEntry } from "./registrationsTypes"
import {
  buildActiveMergesTodayEntries,
  buildMergeEditDraft,
  buildMergeRefDateMap,
  buildNextMerges,
  createEmptyMergeWeekRangeInputs,
  validateMergeDraft,
} from "./mergeEditorModel"

type UseRegistrationMergeEditorParams = {
  shouldLoadMerges: boolean
  selectedCourseConfigSet: string
  simulationDate: Date | null
  setError: (message: string) => void
}

export function useRegistrationMergeEditor(params: UseRegistrationMergeEditorParams) {
  const { shouldLoadMerges, selectedCourseConfigSet, simulationDate, setError } = params

  const [mergeError, setMergeError] = useState("")
  const [merges, setMerges] = useState<MergeEntry[]>([])
  const [activeMergesFromApi, setActiveMergesFromApi] = useState<MergeEntry[]>([])
  const [mergeManagerOpen, setMergeManagerOpen] = useState(false)
  const [mergeName, setMergeName] = useState("")
  const [mergeCourses, setMergeCourses] = useState<string[]>([])
  const [mergeWeekMode, setMergeWeekMode] = useState<"all" | "range">("all")
  const [mergeWeekRangeInputs, setMergeWeekRangeInputs] = useState(createEmptyMergeWeekRangeInputs)
  const [editingMergeId, setEditingMergeId] = useState<string | null>(null)

  const refDateMap = useMemo(() => {
    return buildMergeRefDateMap(activeMergesFromApi)
  }, [activeMergesFromApi])

  const activeMergesToday = useMemo(() => {
    return buildActiveMergesTodayEntries({
      merges,
      activeMergesFromApi,
      simulationDate,
      refDateMap,
    })
  }, [activeMergesFromApi, merges, refDateMap, simulationDate])

  const mergedCourseSetToday = useMemo(
    () => getMergedCourseSet(activeMergesToday),
    [activeMergesToday]
  )

  const loadMerges = useCallback(async () => {
    if (!shouldLoadMerges) return
    try {
      const res = await apiClient.listMerges()
      const list = (Array.isArray(res?.merges) ? res.merges : []).map((merge: MergeEntry) => ({
        ...merge,
        weekRanges: normalizeWeekRanges(merge?.weekRanges),
      }))
      setMerges(list)
    } catch (e: unknown) {
      if (isPermissionDeniedError(e)) {
        setMerges([])
        return
      }
      setMerges([])
      const message =
        e instanceof Error ? e.message : "\uD569\uBC18 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
      setError(message)
    }
  }, [setError, shouldLoadMerges])

  const persistMerges = useCallback(async (next: MergeEntry[]) => {
    try {
      const res = await apiClient.saveMerges(next)
      setMerges(res?.merges || next)
      return true
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "\uD569\uBC18 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
      setMergeError(message)
      return false
    }
  }, [])

  const addMerge = useCallback(async () => {
    const validated = validateMergeDraft({
      mergeCourses,
      mergeWeekMode,
      mergeWeekRangeInputs,
    })
    if (!validated.ok) {
      setMergeError(validated.error)
      return
    }

    const next = buildNextMerges({
      merges,
      editingMergeId,
      mergeName,
      selectedCourses: validated.selected,
      selectedCourseConfigSet,
      weekRanges: validated.weekRanges,
    })

    setEditingMergeId(null)
    setMergeName("")
    setMergeCourses([])
    setMergeWeekMode("all")
    setMergeWeekRangeInputs(createEmptyMergeWeekRangeInputs())
    await persistMerges(next)
  }, [
    editingMergeId,
    mergeCourses,
    mergeName,
    mergeWeekRangeInputs,
    mergeWeekMode,
    merges,
    persistMerges,
    selectedCourseConfigSet,
  ])

  const deleteMerge = useCallback(
    async (id: string) => {
      const next = merges.filter((merge) => String(merge.id) !== String(id))
      await persistMerges(next)
    },
    [merges, persistMerges]
  )

  const toggleMergeActive = useCallback(
    async (id: string, isActive: boolean) => {
      const next = merges.map((merge) =>
        String(merge.id) === String(id) ? { ...merge, isActive } : merge
      )
      await persistMerges(next)
    },
    [merges, persistMerges]
  )

  const startEditMerge = useCallback(
    (id: string) => {
      const target = merges.find((merge) => String(merge.id) === id)
      if (!target) return

      const draft = buildMergeEditDraft(target)
      setEditingMergeId(id)
      setMergeName(draft.mergeName)
      setMergeCourses(draft.mergeCourses)
      setMergeWeekMode(draft.mergeWeekMode)
      setMergeWeekRangeInputs(draft.mergeWeekRangeInputs)
    },
    [merges]
  )

  const cancelEditMerge = useCallback(() => {
    setEditingMergeId(null)
    setMergeName("")
    setMergeCourses([])
    setMergeWeekMode("all")
    setMergeWeekRangeInputs(createEmptyMergeWeekRangeInputs())
  }, [])

  return {
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
  }
}
