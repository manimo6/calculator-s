import { useCallback, useState } from "react"

import {
  buildOpenTransferDialogDraft,
} from "./transferSubmissionModel"
import { calcRemainingDays, calcRemainingWeeks } from "./transferModel"
import { isDailyRegistration } from "./utils"
import type { RegistrationRow } from "./transferModelTypes"

export function useTransferDialogState({
  transferCourseLabelMap,
}: {
  transferCourseLabelMap: Map<string, string>
}) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<RegistrationRow | null>(null)
  const [transferDate, setTransferDateValue] = useState("")
  const [transferPickerOpen, setTransferPickerOpen] = useState(false)
  const [transferCourseValue, setTransferCourseValueValue] = useState("")
  const [transferWeeks, setTransferWeeks] = useState("")
  const [transferError, setTransferError] = useState("")
  const [transferSaving, setTransferSaving] = useState(false)

  const resetTransferDialog = useCallback(() => {
    setTransferDialogOpen(false)
    setTransferTarget(null)
    setTransferDateValue("")
    setTransferError("")
    setTransferPickerOpen(false)
    setTransferCourseValueValue("")
    setTransferWeeks("")
  }, [])

  const openTransferDialog = useCallback(
    (registration: RegistrationRow) => {
      if (!registration) return

      const draft = buildOpenTransferDialogDraft(registration, transferCourseLabelMap)

      setTransferTarget(registration)
      setTransferCourseValueValue(draft.transferCourseValue)
      setTransferDateValue(draft.transferDate)
      setTransferWeeks(draft.transferWeeks)
      setTransferError("")
      setTransferPickerOpen(false)
      setTransferDialogOpen(true)
    },
    [transferCourseLabelMap]
  )

  const handleTransferDateChange = useCallback(
    (date: string) => {
      setTransferDateValue(date)
      if (transferTarget && date) {
        const remaining = isDailyRegistration(transferTarget)
          ? calcRemainingDays(transferTarget, date)
          : calcRemainingWeeks(transferTarget, date)
        setTransferWeeks(remaining > 0 ? String(remaining) : "")
      }
    },
    [transferTarget]
  )

  const handleTransferCourseChange = useCallback((value: string) => {
    setTransferCourseValueValue(value)
    setTransferDateValue("")
    setTransferWeeks("")
    setTransferPickerOpen(false)
  }, [])

  return {
    transferDialogOpen,
    setTransferDialogOpen,
    transferTarget,
    setTransferTarget,
    transferDate,
    setTransferDate: handleTransferDateChange,
    transferPickerOpen,
    setTransferPickerOpen,
    transferCourseValue,
    setTransferCourseValue: handleTransferCourseChange,
    transferWeeks,
    transferError,
    setTransferError,
    transferSaving,
    setTransferSaving,
    openTransferDialog,
    closeTransferDialog: resetTransferDialog,
    resetTransferDialog,
  }
}
