import { Badge } from "@/components/ui/badge"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"

type InstallmentBoardSummaryProps = {
  count: number
  loading: boolean
}

export default function InstallmentBoardSummary({
  count,
  loading,
}: InstallmentBoardSummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {count}
                {COPY.countSuffix}
              </span>
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
                {COPY.summaryBadge}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{COPY.summarySubtitle}</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-600">{COPY.loading}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
