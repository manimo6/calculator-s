import { ArrowRightLeft } from "lucide-react"

import { formatDateYmd, stripMathExcludeLabel } from "./utils"

type RegistrationRow = {
  id?: string | number
  course?: string
  startDate?: string | Date
  endDate?: string | Date
} & Record<string, unknown>

type DateInput = string | Date | null | undefined

type TransferHistoryTimelineProps = {
  history: RegistrationRow[]
  currentId?: string | number | null
  adjustEndDate?: (date: DateInput, course?: string) => Date | null | undefined
}

export default function TransferHistoryTimeline({
  history,
  currentId,
  adjustEndDate,
}: TransferHistoryTimelineProps) {
  if (!history.length) return null

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        전반 이력
      </div>
      <div className="relative ml-2 border-l-2 border-slate-200 pl-4">
        {history.map((entry, i) => {
          const isCurrent =
            entry?.id != null &&
            currentId != null &&
            String(entry.id) === String(currentId)
          const isLast = i === history.length - 1
          const courseName = stripMathExcludeLabel(entry?.course)
          const start = formatDateYmd(entry?.startDate)
          const adjustedEnd = adjustEndDate ? adjustEndDate(entry?.endDate, entry?.course) : entry?.endDate
          const end = formatDateYmd(adjustedEnd)

          return (
            <div
              key={`transfer-${entry?.id || i}`}
              className={`relative pb-4 ${isLast ? "pb-0" : ""}`}
            >
              <div
                className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 ${isCurrent ? "border-teal-500 bg-teal-500" : "border-slate-300 bg-white"}`}
              />
              <div
                className={`text-sm font-medium ${isCurrent ? "text-teal-700" : "text-slate-600"}`}
              >
                {courseName || "-"}
                {isCurrent ? (
                  <span className="ml-1.5 text-[10px] font-semibold text-teal-500">
                    현재
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-slate-400">
                {start}
                {end ? ` ~ ${end}` : " ~"}
              </div>
              {i < history.length - 1 ? (
                <div className="mt-1 text-[10px] text-amber-500">다음 전반</div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
