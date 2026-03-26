import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import RegistrationsGanttStatusPill from "./RegistrationsGanttStatusPill"
import { REGISTRATIONS_GANTT_ROW_COPY as COPY } from "./registrationsGanttRowCopy"
import type { RegistrationRow } from "./registrationsGanttModel"
import type { GanttRowMeta } from "./registrationsGanttRowModel"

export function RegistrationsGanttIdentityCell({
  row,
  meta,
  isWithdrawn,
  isTransferredOut,
  status,
  openDetail,
}: {
  row: RegistrationRow
  meta: GanttRowMeta
  isWithdrawn: boolean
  isTransferredOut: boolean
  status: string
  openDetail: (row: RegistrationRow) => void
}) {
  return (
    <div
      data-gantt-left
      className="sticky left-0 z-30 flex flex-col justify-center border-r border-border/5 bg-white px-4 transition-colors group-hover:bg-slate-50"
      role="button"
      tabIndex={0}
      onClick={() => openDetail(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          openDetail(row)
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-foreground">{row?.name || "-"}</div>
            {meta.isMathExcluded ? (
              <Badge
                variant="outline"
                className="border-sky-200 bg-sky-50 text-[10px] text-sky-700"
              >
                {COPY.mathExcluded}
              </Badge>
            ) : null}
          </div>

          {(isTransferredOut && row?.transferToCourseName) ||
          (row?.transferFromId && row?.transferFromCourseName) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-0.5 cursor-default truncate text-xs text-muted-foreground/80">
                  {meta.courseLabel || "-"}
                  {isTransferredOut && row?.transferToCourseName ? (
                    <span className="ml-1 text-amber-600">
                      {"\u2192"} {String(row.transferToCourseName)}
                    </span>
                  ) : (
                    <span className="ml-1 text-blue-600">
                      {"\u2190"} {String(row.transferFromCourseName)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={4}
                className="rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur"
              >
                {isTransferredOut ? (
                  <span>
                    <span className="font-semibold">{meta.courseLabel}</span> {"\u2192"}{" "}
                    <span className="font-semibold text-amber-600">
                      {String(row.transferToCourseName)}
                    </span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-blue-600">
                      {String(row.transferFromCourseName)}
                    </span>{" "}
                    {"\u2192"} <span className="font-semibold">{meta.courseLabel}</span>
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="mt-0.5 truncate text-xs text-muted-foreground/80">
              {meta.courseLabel || "-"}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {isTransferredOut ? (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
            >
              {COPY.transferred}
            </Badge>
          ) : isWithdrawn ? (
            <Badge
              variant="outline"
              className="border-rose-200 bg-rose-50 text-[10px] text-rose-700"
            >
              {COPY.withdrawn}
            </Badge>
          ) : (
            <RegistrationsGanttStatusPill status={status} />
          )}
        </div>
      </div>
    </div>
  )
}
