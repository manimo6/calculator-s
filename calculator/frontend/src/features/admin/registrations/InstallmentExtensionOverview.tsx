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
    <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white p-5 shadow-sm md:grid-cols-2">
      <InfoBlock label={COPY.dialogStudent} value={selectedRow.registration?.name || "-"} />
      <InfoBlock label={COPY.course} value={selectedRow.courseLabel || "-"} />
      <InfoBlock
        label={COPY.dialogCurrentWeeks}
        value={`${selectedRow.weeks}${COPY.weekSuffix}`}
        valueClassName="text-emerald-700"
      />
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{COPY.dialogMaxWeeks}</div>
        <div className="text-base font-bold text-slate-900">
          {selectedRow.studentMaxWeeks}
          {COPY.weekSuffix}
          {selectedRow.studentMaxWeeks !== selectedRow.maxWeeks ? (
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({selectedRow.maxWeeks}
              {COPY.tableClassWeeksSuffix})
            </span>
          ) : null}
        </div>
      </div>
      <InfoBlock
        label={COPY.dialogRemainingWeeks}
        value={`${selectedRow.remainingWeeks}${COPY.weekSuffix}`}
        valueClassName="text-amber-600"
      />
      <InfoBlock label={COPY.dialogCurrentFee} value={currentFeeLabel} />
    </div>
  )
}

function InfoBlock({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-base font-bold text-slate-900 ${valueClassName || ""}`}>{value}</div>
    </div>
  )
}
