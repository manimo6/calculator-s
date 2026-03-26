import { useCallback, useMemo } from "react"

import { apiClient } from "@/api-client"

import { buildTransferCancelConfirm, TRANSFER_COPY } from "./transferCopy"
import { validateTransferSubmission } from "./transferSubmissionModel"
import { useTransferDerivedState } from "./useTransferDerivedState"
import { useTransferDialogState } from "./useTransferDialogState"
import {
  buildTransferCourseLabelMap,
  buildTransferCourseOptions,
} from "./transferModel"
import type {
  CourseConfigSet,
  RegistrationRow,
  RegistrationRowForOptions,
} from "./transferModelTypes"
export type { TransferGroup, TransferOption } from "./transferModel"

type UseTransferParams = {
  courseOptions: Array<string | { value?: string; label?: string }>
  registrations: RegistrationRowForOptions[]
  selectedCourseConfigSetObj: CourseConfigSet | null
  selectedCourseConfigSet: string
  onTransferSuccess?: () => void | Promise<void>
  setError: (msg: string) => void
  resolveCourseDays?: (courseName: string) => number[]
}

export function useTransfer({
  courseOptions,
  registrations,
  selectedCourseConfigSetObj,
  selectedCourseConfigSet,
  onTransferSuccess,
  setError,
  resolveCourseDays,
}: UseTransferParams) {
  const previewLabelMap = useMemo(() => {
    const options = buildTransferCourseOptions({
      courseOptions,
      registrations,
    })
    return buildTransferCourseLabelMap(options)
  }, [courseOptions, registrations])

  const state = useTransferDialogState({
    transferCourseLabelMap: previewLabelMap,
  })

  const {
    transferCourseLabelMap,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
  } = useTransferDerivedState({
    courseOptions,
    registrations,
    selectedCourseConfigSetObj,
    transferTarget: state.transferTarget,
    transferCourseValue: state.transferCourseValue,
    transferDate: state.transferDate,
    transferWeeks: state.transferWeeks,
    resolveCourseDays,
  })

  const handleTransferSave = useCallback(async () => {
    if (!state.transferTarget) return

    const validated = validateTransferSubmission({
      transferTarget: state.transferTarget,
      transferDate: state.transferDate,
      transferCourseValue: state.transferCourseValue,
      transferWeeks: state.transferWeeks,
      transferCourseLabelMap,
      selectedCourseConfigSet,
    })
    if (!validated.ok) {
      state.setTransferError(validated.error)
      return
    }

    state.setTransferSaving(true)
    state.setTransferError("")

    try {
      await apiClient.transferRegistration(validated.transferId, validated.payload)
      await onTransferSuccess?.()
      state.resetTransferDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : TRANSFER_COPY.transferFailed
      state.setTransferError(message)
    } finally {
      state.setTransferSaving(false)
    }
  }, [onTransferSuccess, selectedCourseConfigSet, state, transferCourseLabelMap])

  const handleTransferCancel = useCallback(
    async (registration: RegistrationRow) => {
      if (!registration?.id) return

      const name = registration?.name || TRANSFER_COPY.anonymousStudent
      if (!window.confirm(buildTransferCancelConfirm(name))) return

      try {
        await apiClient.cancelTransferRegistration(String(registration.id))
        await onTransferSuccess?.()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : TRANSFER_COPY.cancelFailed
        setError(message)
      }
    },
    [onTransferSuccess, setError]
  )

  return {
    transferDialogOpen: state.transferDialogOpen,
    transferTarget: state.transferTarget,
    transferDate: state.transferDate,
    setTransferDate: state.setTransferDate,
    transferPickerOpen: state.transferPickerOpen,
    setTransferPickerOpen: state.setTransferPickerOpen,
    transferCourseValue: state.transferCourseValue,
    setTransferCourseValue: state.setTransferCourseValue,
    transferWeeks: state.transferWeeks,
    transferError: state.transferError,
    transferSaving: state.transferSaving,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
    openTransferDialog: state.openTransferDialog,
    handleTransferSave,
    handleTransferCancel,
    closeTransferDialog: state.closeTransferDialog,
  }
}
