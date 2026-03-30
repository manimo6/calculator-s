import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentRow } from "./installmentBoardModel"

type InstallmentExtensionOverviewProps = {
  selectedRow: InstallmentRow
  currentFeeLabel: string
}

export default function InstallmentExtensionOverview({
  selectedRow,
  currentFeeLabel,
}: InstallmentExtensionOverviewProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/50 px-5 py-4 ring-1 ring-slate-200/60">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/60">
        {String(selectedRow.registration?.name || "?").charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-slate-900 truncate">
            {selectedRow.registration?.name || "-"}
          </span>
          <span className="text-xs font-medium text-slate-400 truncate">
            {selectedRow.courseLabel || "-"}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <Stat label={COPY.dialogCurrentWeeks} value={`${selectedRow.weeks}${COPY.weekSuffix}`} color="emerald" />
          <Stat label={COPY.dialogMaxWeeks} value={`${selectedRow.studentMaxWeeks}${COPY.weekSuffix}`} />
          <Stat label={COPY.dialogRemainingWeeks} value={`${selectedRow.remainingWeeks}${COPY.weekSuffix}`} color="amber" />
          <Stat label={COPY.dialogCurrentFee} value={currentFeeLabel} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: "emerald" | "amber" }) {
  const valueColor = color === "emerald"
    ? "text-emerald-600"
    : color === "amber"
      ? "text-amber-600"
      : "text-slate-700"
  return (
    <span className="flex items-center gap-1">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${valueColor}`}>{value}</span>
    </span>
  )
}
