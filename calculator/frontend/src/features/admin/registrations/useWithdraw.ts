import { useCallback, useState } from "react"

import { apiClient } from "@/api-client"

import { WITHDRAW_COPY } from "./withdrawCopy"
import {
  getDefaultWithdrawDate,
  getRestoreConfirmMessage,
  getWithdrawSaveValidationError,
} from "./withdrawModel"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  withdrawnAt?: string | Date
} & Record<string, unknown>

type UseWithdrawParams = {
  onSuccess?: () => void | Promise<void>
  setError: (msg: string) => void
}

export function useWithdraw({ onSuccess, setError }: UseWithdrawParams) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [target, setTarget] = useState<RegistrationRow | null>(null)
  const [date, setDate] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setWithdrawError] = useState("")
  const [saving, setSaving] = useState(false)

  const openDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    setTarget(registration)
    setDate(getDefaultWithdrawDate(registration))
    setWithdrawError("")
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setTarget(null)
    setWithdrawError("")
    setPickerOpen(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!target) return
    const validationError = getWithdrawSaveValidationError({ target, date })
    if (validationError) {
      setWithdrawError(validationError)
      return
    }

    const withdrawId = target?.id
    setSaving(true)
    setWithdrawError("")
    try {
      await apiClient.updateRegistrationWithdrawal(String(withdrawId), date)
      await onSuccess?.()
      closeDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : WITHDRAW_COPY.saveFailed
      setWithdrawError(message)
    } finally {
      setSaving(false)
    }
  }, [closeDialog, date, onSuccess, target])

  const handleRestore = useCallback(
    async (registration: RegistrationRow) => {
      if (!registration?.id) return
      if (!window.confirm(getRestoreConfirmMessage(registration))) return

      try {
        await apiClient.updateRegistrationWithdrawal(String(registration.id), null)
        await onSuccess?.()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : WITHDRAW_COPY.restoreFailed
        setError(message)
      }
    },
    [onSuccess, setError]
  )

  return {
    withdrawDialogOpen: dialogOpen,
    withdrawTarget: target,
    withdrawDate: date,
    setWithdrawDate: setDate,
    withdrawPickerOpen: pickerOpen,
    setWithdrawPickerOpen: setPickerOpen,
    withdrawError: error,
    withdrawSaving: saving,
    openWithdrawDialog: openDialog,
    handleWithdrawSave: handleSave,
    handleRestore,
    closeWithdrawDialog: closeDialog,
  }
}
