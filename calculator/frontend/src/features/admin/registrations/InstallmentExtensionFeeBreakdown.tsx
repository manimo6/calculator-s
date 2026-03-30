import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"

type FeeBreakdownProps = {
  feeBreakdown: {
    normalFee: number
    recordingFee: number
    totalFee: number
    hasBreakdown: boolean
  }
  totalDays: number
  recordingDays: number
}

export default function InstallmentExtensionFeeBreakdown({
  feeBreakdown,
  totalDays,
  recordingDays,
}: FeeBreakdownProps) {
  if (!feeBreakdown.hasBreakdown) return null

  const normalDays = totalDays - recordingDays

  return (
    <div className="rounded-2xl bg-gradient-to-r from-violet-50/60 to-slate-50/40 px-5 py-4 ring-1 ring-violet-200/50">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-500/80">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {COPY.feeBreakdownLabel}
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{COPY.normalFeeNote} ({normalDays}{COPY.daySuffix})</span>
          <span className="font-semibold text-slate-700">{feeBreakdown.normalFee.toLocaleString("ko-KR")}{COPY.feeSuffix}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-violet-500">{COPY.recordingFeeNote} ({recordingDays}{COPY.daySuffix})</span>
          <span className="font-semibold text-violet-600">{feeBreakdown.recordingFee.toLocaleString("ko-KR")}{COPY.feeSuffix}</span>
        </div>
        <div className="flex items-center justify-between border-t border-violet-200/40 pt-2">
          <span className="font-bold text-slate-600">합계</span>
          <span className="text-base font-extrabold text-slate-900">{feeBreakdown.totalFee.toLocaleString("ko-KR")}{COPY.feeSuffix}</span>
        </div>
      </div>
    </div>
  )
}
