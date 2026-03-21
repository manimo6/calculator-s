import { useCallback, useState } from "react"

import { apiClient } from "@/api-client"

import { formatDateYmd } from "./utils"

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
    const today = formatDateYmd(new Date())
    const defaultDate = formatDateYmd(registration?.withdrawnAt) || today
    setTarget(registration)
    setDate(defaultDate || today)
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
    if (!date) {
      setWithdrawError("퇴원일을 선택해 주세요.")
      return
    }

    const withdrawId = target?.id
    if (!withdrawId) {
      setWithdrawError("대상을 확인해 주세요.")
      return
    }

    setSaving(true)
    setWithdrawError("")
    try {
      await apiClient.updateRegistrationWithdrawal(String(withdrawId), date)
      await onSuccess?.()
      closeDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "퇴원 처리에 실패했습니다."
      setWithdrawError(message)
    } finally {
      setSaving(false)
    }
  }, [closeDialog, date, onSuccess, target])

  const handleRestore = useCallback(
    async (registration: RegistrationRow) => {
      if (!registration?.id) return
      const name = registration?.name || "학생"
      if (!window.confirm(`${name}의 퇴원 상태를 복구할까요?`)) return

      try {
        await apiClient.updateRegistrationWithdrawal(String(registration.id), null)
        await onSuccess?.()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "복구 처리에 실패했습니다."
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
