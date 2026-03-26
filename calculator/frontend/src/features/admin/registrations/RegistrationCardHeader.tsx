import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, CheckCircle2, Clock, HelpCircle, TimerOff, User } from "lucide-react"

import { REGISTRATION_CARD_COPY as COPY } from "./registrationCardCopy"
import type { RegistrationRow } from "./registrationsTypes"
import { getStatusLabel } from "./utils"

type RegistrationAction = (row: RegistrationRow) => void

function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = getStatusLabel(status)
  const Icon =
    status === "active"
      ? CheckCircle2
      : status === "pending"
        ? Clock
        : status === "completed"
          ? TimerOff
          : HelpCircle

  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "completed"
          ? "border-zinc-200 bg-zinc-50 text-zinc-700"
          : ""

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

export function RegistrationCardHeader({
  registration,
  status,
  courseLabel,
  isMathExcluded,
  isWithdrawn,
  isTransferredOut,
  isLastInChain,
  canTransfer,
  canWithdraw,
  onWithdraw,
  onRestore,
  onTransfer,
  onTransferCancel,
}: {
  registration: RegistrationRow
  status: string | null | undefined
  courseLabel: string
  isMathExcluded: boolean
  isWithdrawn: boolean
  isTransferredOut: boolean
  isLastInChain: boolean
  canTransfer: boolean
  canWithdraw: boolean
  onWithdraw?: RegistrationAction
  onRestore?: RegistrationAction
  onTransfer?: RegistrationAction
  onTransferCancel?: RegistrationAction
}) {
  return (
    <CardHeader className="space-y-2 pb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-extrabold">{registration?.name || "-"}</CardTitle>
          {isMathExcluded ? (
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
              {COPY.mathExcluded}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isTransferredOut ? (
            <>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                {COPY.transferredOut}
              </Badge>
              {onTransferCancel ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-3 text-xs font-semibold"
                  onClick={() => onTransferCancel(registration)}
                >
                  {COPY.cancelTransfer}
                </Button>
              ) : null}
            </>
          ) : isWithdrawn ? (
            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
              {COPY.withdrawn}
            </Badge>
          ) : isLastInChain ? (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              {COPY.transferFollowup}
            </Badge>
          ) : (
            <StatusBadge status={status} />
          )}
          {isWithdrawn ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs font-semibold"
              onClick={() => onRestore?.(registration)}
            >
              {COPY.restore}
            </Button>
          ) : null}
          {isLastInChain && onTransferCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs font-semibold"
              onClick={() => onTransferCancel(registration)}
            >
              {COPY.cancelTransfer}
            </Button>
          ) : null}
          {(canTransfer || isLastInChain) && onTransfer ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs font-semibold"
              onClick={() => onTransfer?.(registration)}
            >
              {isLastInChain ? COPY.editTransfer : COPY.createTransfer}
            </Button>
          ) : null}
          {canWithdraw ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs font-semibold"
              onClick={() => onWithdraw?.(registration)}
            >
              {COPY.withdraw}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" />
          {registration?.name || "-"}
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {courseLabel || "-"}
          {isTransferredOut && registration?.transferToCourseName ? (
            <span className="text-amber-600">
              {COPY.transferToPrefix}
              {String(registration.transferToCourseName)}
            </span>
          ) : registration?.transferFromId && registration?.transferFromCourseName ? (
            <span className="text-blue-600">
              {COPY.transferFromPrefix}
              {String(registration.transferFromCourseName)}
            </span>
          ) : null}
        </span>
      </div>
    </CardHeader>
  )
}
