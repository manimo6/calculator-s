import { Badge } from "@/components/ui/badge"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarRange } from "lucide-react"

import { formatDateYmd } from "./utils"
import {
  type RegistrationsGanttModel,
  formatWeekLabel,
  LABEL_WIDTH_PX,
  NOTE_WIDTH_PX,
  type ModelRow,
} from "./registrationsGanttModel"
import { REGISTRATIONS_GANTT_COPY as COPY } from "./registrationsGanttCopy"

export function RegistrationsGanttCardHeader({
  model,
}: {
  model: RegistrationsGanttModel
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/5 pb-6 pt-6">
      <div className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground/90">
          {COPY.chartTitle}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/80">
          <CalendarRange className="h-3.5 w-3.5 opacity-70" />
          {model.range ? (
            <span>
              {formatDateYmd(model.range.start)} ~ {formatDateYmd(model.range.end)}
            </span>
          ) : (
            <span>{COPY.noRangeSummary}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200"
        >
          {model.weeks.length}
          {COPY.weekSuffix}
        </Badge>
      </div>
    </CardHeader>
  )
}

export function RegistrationsGanttTimelineHeader({
  model,
  weekTotals,
  gridTemplateColumns,
  timelineWidth,
  gridBackgroundImage,
}: {
  model: RegistrationsGanttModel
  weekTotals: Array<{ count: number; transferred: number }>
  gridTemplateColumns: string
  timelineWidth: number
  gridBackgroundImage: string
}) {
  return (
    <div className="sticky top-0 z-30">
      <div
        className="grid border-b border-slate-200/60 bg-gradient-to-b from-slate-100 to-slate-50"
        style={{ gridTemplateColumns }}
      >
        <div
          data-gantt-left
          className="sticky left-0 z-40 flex items-center justify-end border-r border-border/10 bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"
        >
          {COPY.weeklyTotal}
        </div>
        <div
          data-gantt-left
          className="sticky left-0 z-30 border-r-2 border-slate-300/80 bg-slate-100"
          style={{ left: LABEL_WIDTH_PX }}
        />
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${model.weeks.length}, ${model.unitWidth}px)`,
            width: timelineWidth,
          }}
        >
          {weekTotals.map((total, i) => (
            <div
              key={`week-total-${i}`}
              className="flex flex-col items-center justify-center border-l border-slate-200/60 px-1 py-1 first:border-l-0"
            >
              <span className="text-xs font-bold text-indigo-600">
                {total.count}
                {COPY.memberSuffix}
              </span>
              {total.transferred > 0 ? (
                <span className="text-[9px] text-amber-500/80">
                  {COPY.transferPrefix} {total.transferred}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div
        className="grid border-b border-border/5 bg-slate-50"
        style={{ gridTemplateColumns }}
      >
        <div
          data-gantt-left
          className="sticky left-0 z-40 flex items-center border-r border-border/5 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70"
        >
          {COPY.studentCourse}
        </div>
        <div
          data-gantt-left
          className="sticky left-0 z-30 flex items-center justify-center border-r-2 border-slate-300/80 bg-slate-50 px-2 py-3 relative"
          style={{ left: LABEL_WIDTH_PX }}
        />
        <div
          className="grid bg-gradient-to-b from-indigo-50/80 to-slate-50/50"
          style={{
            gridTemplateColumns: `repeat(${model.weeks.length}, ${model.unitWidth}px)`,
            width: timelineWidth,
            backgroundImage: gridBackgroundImage,
          }}
        >
          {model.weeks.map((w, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-0.5 overflow-hidden border-l border-slate-200/60 px-0.5 py-2 transition-colors first:border-l-0 hover:bg-indigo-100/50"
              title={`${formatDateYmd(w.start)} ~ ${formatDateYmd(w.end)}`}
            >
              <span className="rounded-full bg-indigo-500 px-1.5 py-px text-[9px] font-bold text-white">
                {i + 1}
                {COPY.weekSuffix}
              </span>
              <span className="text-[12px] font-semibold text-slate-700">
                {formatWeekLabel(w.start, w.end)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RegistrationsGanttEmptyState({
  model,
}: {
  model: RegistrationsGanttModel
}) {
  if (!model.range) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {COPY.noRangeMessage}
      </div>
    )
  }

  if (!model.weeks.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {COPY.noWeeksMessage}
      </div>
    )
  }

  return null
}
