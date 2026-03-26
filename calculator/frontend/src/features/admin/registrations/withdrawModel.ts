import { WITHDRAW_COPY, buildRestoreConfirmMessage } from "./withdrawCopy"
import { formatDateYmd } from "./utils"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  withdrawnAt?: string | Date
} & Record<string, unknown>

export function getDefaultWithdrawDate(
  registration: RegistrationRow | null | undefined,
  today: Date = new Date()
) {
  return formatDateYmd(registration?.withdrawnAt) || formatDateYmd(today)
}

export function getWithdrawSaveValidationError({
  target,
  date,
}: {
  target: RegistrationRow | null
  date: string
}) {
  if (!target) return ""
  if (!date) return WITHDRAW_COPY.dateRequired
  if (!target.id) return WITHDRAW_COPY.targetMissing
  return ""
}

export function getRestoreConfirmMessage(registration: RegistrationRow | null | undefined) {
  const name = registration?.name || WITHDRAW_COPY.anonymousStudent
  return buildRestoreConfirmMessage(name)
}
