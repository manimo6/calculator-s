import { NOTE_COPY } from "./noteCopy"
import { formatTimestampKo } from "./utils"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  note?: string
  noteUpdatedAt?: string | number | Date
} & Record<string, unknown>

export function getInitialNoteValue(registration: RegistrationRow | null | undefined) {
  return String(registration?.note || "")
}

export function getNoteUpdatedAtLabel(registration: RegistrationRow | null | undefined) {
  return registration?.noteUpdatedAt ? formatTimestampKo(registration.noteUpdatedAt) : ""
}

export function getNoteSaveValidationError(target: RegistrationRow | null) {
  if (!target) return ""
  if (!target.id) return NOTE_COPY.targetMissing
  return ""
}
