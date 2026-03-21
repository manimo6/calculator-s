import { useCallback, useState } from "react"

import { apiClient } from "@/api-client"

import { formatTimestampKo } from "./utils"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  note?: string
  noteUpdatedAt?: string | number | Date
} & Record<string, unknown>

type UseNoteParams = {
  onSuccess?: () => void | Promise<void>
}

export function useNote({ onSuccess }: UseNoteParams) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [target, setTarget] = useState<RegistrationRow | null>(null)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const updatedAtLabel = target?.noteUpdatedAt
    ? formatTimestampKo(target.noteUpdatedAt)
    : ""

  const openDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    setTarget(registration)
    setValue(String(registration?.note || ""))
    setError("")
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setTarget(null)
    setValue("")
    setError("")
  }, [])

  const handleSave = useCallback(async () => {
    if (!target?.id) return
    setSaving(true)
    setError("")
    const noteId = target?.id
    if (!noteId) {
      setError("대상을 확인해 주세요.")
      return
    }
    try {
      await apiClient.updateRegistrationNote(String(noteId), value)
      await onSuccess?.()
      closeDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "메모 저장에 실패했습니다."
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [closeDialog, onSuccess, target, value])

  return {
    noteDialogOpen: dialogOpen,
    noteTarget: target,
    noteValue: value,
    setNoteValue: setValue,
    noteUpdatedAtLabel: updatedAtLabel,
    noteError: error,
    noteSaving: saving,
    openNoteDialog: openDialog,
    handleNoteSave: handleSave,
    closeNoteDialog: closeDialog,
  }
}
