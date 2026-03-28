import { ArrowRight, Clock } from "lucide-react"

import { TRANSFER_COPY } from "./transferCopy"

export function TransferPreviewCard({
  date,
  expectedEndDate,
  weeksNum,
  isDaily,
}: {
  date: string
  expectedEndDate: string
  weeksNum: number
  isDaily?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200/60">
      <div className="border-b border-emerald-100 px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {TRANSFER_COPY.previewTitle}
        </span>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-800">
              {weeksNum}
              {isDaily ? TRANSFER_COPY.daysUnit : TRANSFER_COPY.weeksUnit}
            </div>
            <div className="text-xs text-emerald-600">
              {isDaily ? TRANSFER_COPY.remainingDaysLabel : TRANSFER_COPY.remainingWeeksLabel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            {date}
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
            {expectedEndDate || "..."}
          </div>
          <div className="mt-0.5 text-xs text-emerald-500">{TRANSFER_COPY.expectedPeriodLabel}</div>
        </div>
      </div>
    </div>
  )
}
