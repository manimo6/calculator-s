import { useMemo } from "react"

import RegistrationCard, { type RegistrationAction } from "./RegistrationCard"
import { sortRegistrationsForCards } from "./registrationCardModel"
import type { RegistrationRow } from "./registrationsTypes"

type RegistrationCardGridProps = {
  registrations: RegistrationRow[]
  onWithdraw?: RegistrationAction
  onRestore?: RegistrationAction
  onTransfer?: RegistrationAction
  onTransferCancel?: RegistrationAction
  onNote?: RegistrationAction
}

export default function RegistrationCardGrid({
  registrations,
  onWithdraw,
  onRestore,
  onTransfer,
  onTransferCancel,
  onNote,
}: RegistrationCardGridProps) {
  const sorted = useMemo(() => sortRegistrationsForCards(registrations), [registrations])

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((registration, idx) => (
        <RegistrationCard
          key={`${registration.id || idx}`}
          registration={registration}
          onWithdraw={onWithdraw}
          onRestore={onRestore}
          onTransfer={onTransfer}
          onTransferCancel={onTransferCancel}
          onNote={onNote}
        />
      ))}
    </div>
  )
}
