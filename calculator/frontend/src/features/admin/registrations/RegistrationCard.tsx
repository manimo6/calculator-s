import { Card } from "@/components/ui/card"

import { RegistrationCardBody } from "./RegistrationCardBody"
import { RegistrationCardHeader } from "./RegistrationCardHeader"
import { REGISTRATION_CARD_COPY as COPY } from "./registrationCardCopy"
import type { RegistrationRow } from "./registrationsTypes"
import { formatDateYmd, getRegistrationStatus, stripMathExcludeLabel } from "./utils"

export type RegistrationAction = (row: RegistrationRow) => void

type RegistrationCardProps = {
  registration: RegistrationRow
  onWithdraw?: RegistrationAction
  onRestore?: RegistrationAction
  onTransfer?: RegistrationAction
  onTransferCancel?: RegistrationAction
  onNote?: RegistrationAction
}

export default function RegistrationCard({
  registration,
  onWithdraw,
  onRestore,
  onTransfer,
  onTransferCancel,
  onNote,
}: RegistrationCardProps) {
  const status = getRegistrationStatus(registration)
  const start = formatDateYmd(registration?.startDate)
  const end = formatDateYmd(registration?.endDate)
  const weeks = registration?.weeks ? String(registration.weeks) : ""
  const recordingCount = Array.isArray(registration?.recordingDates)
    ? registration.recordingDates.length
    : 0
  const courseLabel = stripMathExcludeLabel(registration?.course)
  const noteText = String(registration?.note || "").trim()
  const hasNote = noteText.length > 0
  const isMathExcluded =
    !!registration?.excludeMath || String(registration?.course || "").includes(COPY.mathExcluded)
  const isWithdrawn = Boolean(registration?.isWithdrawn || registration?.withdrawnAt)
  const isTransferredOut = Boolean(registration?.isTransferredOut || registration?.transferToId)
  const isLastInChain = !!registration?.transferFromId && !registration?.transferToId && !isWithdrawn
  const canWithdraw = !isWithdrawn && !isTransferredOut
  const canTransfer = !isWithdrawn && !isTransferredOut

  return (
    <Card className="border-border/60 bg-card/60">
      <RegistrationCardHeader
        registration={registration}
        status={status}
        courseLabel={courseLabel}
        isMathExcluded={isMathExcluded}
        isWithdrawn={isWithdrawn}
        isTransferredOut={isTransferredOut}
        isLastInChain={isLastInChain}
        canTransfer={canTransfer}
        canWithdraw={canWithdraw}
        onWithdraw={onWithdraw}
        onRestore={onRestore}
        onTransfer={onTransfer}
        onTransferCancel={onTransferCancel}
      />
      <RegistrationCardBody
        registration={registration}
        start={start}
        end={end}
        weeks={weeks}
        recordingCount={recordingCount}
        hasNote={hasNote}
        onNote={onNote}
      />
    </Card>
  )
}
