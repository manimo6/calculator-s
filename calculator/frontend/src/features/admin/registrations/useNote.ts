import { useCallback, useState } from "react"

import { apiClient } from "@/api-client"

import { NOTE_COPY } from "./noteCopy"
import {
  getInitialNoteValue,
  getNoteSaveValidationError,
  getNoteUpdatedAtLabel,
} from "./noteModel"

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

  const updatedAtLabel = getNoteUpdatedAtLabel(target)

  const openDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    setTarget(registration)
    setValue(getInitialNoteValue(registration))
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

    const validationError = getNoteSaveValidationError(target)
    if (validationError) {
      setError(validationError)
      return
    }

    const noteId = target?.id
    try {
      await apiClient.updateRegistrationNote(String(noteId), value)
      await onSuccess?.()
      closeDialog()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : NOTE_COPY.saveFailed
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
