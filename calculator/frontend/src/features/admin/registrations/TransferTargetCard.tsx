import { Clock, User } from "lucide-react"

import { TRANSFER_COPY } from "./transferCopy"
import { isDailyRegistration } from "./utils"
import type { TransferDialogRegistrationRow } from "./transferDialogTypes"

export function TransferTargetCard({
  target,
}: {
  target: TransferDialogRegistrationRow
}) {
  const isDaily = isDailyRegistration(target)

  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
        <User className="h-5 w-5 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-slate-900">{target?.name || "-"}</div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {target?.course || "-"}
          </span>
          {target?.weeks ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              <Clock className="h-3 w-3" />
              {target.weeks}
              {isDaily ? TRANSFER_COPY.daysUnit : TRANSFER_COPY.weeksUnit}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
