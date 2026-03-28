import type { RefObject } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

import {
  LABEL_WIDTH_PX,
  NOTE_WIDTH_PX,
  type ModelRow,
  type RegistrationRow,
  type RegistrationsGanttModel,
} from "./registrationsGanttModel"
import RegistrationsGanttRow from "./RegistrationsGanttRow"
import { RegistrationsGanttTimelineHeader } from "./RegistrationsGanttHeader"
import type { NormalizedWeekRange } from "./utils"

export function RegistrationsGanttTimeline({
  ganttScrollRef,
  maxHeightClassName,
  model,
  visibleRows,
  gridTemplateColumns,
  timelineWidth,
  gridBackgroundImage,
  weekTotals,
  mergeWeekRangesNormalized,
  openDetail,
  onNote,
  isDaily,
}: {
  ganttScrollRef: RefObject<HTMLDivElement | null>
  maxHeightClassName: string
  model: RegistrationsGanttModel
  visibleRows: ModelRow[]
  gridTemplateColumns: string
  timelineWidth: number
  gridBackgroundImage: string
  weekTotals: Array<{ count: number; transferred: number }>
  mergeWeekRangesNormalized: NormalizedWeekRange[]
  openDetail: (row: RegistrationRow) => void
  onNote: (row: RegistrationRow) => void
  isDaily?: boolean
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative">
        <div
          ref={ganttScrollRef}
          className={`overflow-auto no-scrollbar [overscroll-behavior:contain] ${maxHeightClassName}`}
        >
          <div style={{ minWidth: model.timelineWidth + LABEL_WIDTH_PX + NOTE_WIDTH_PX }}>
            <RegistrationsGanttTimelineHeader
              model={model}
              weekTotals={weekTotals}
              gridTemplateColumns={gridTemplateColumns}
              timelineWidth={timelineWidth}
              gridBackgroundImage={gridBackgroundImage}
              isDaily={isDaily}
            />

            <div className="relative">
              <div
                className="pointer-events-none absolute inset-y-0 z-0"
                style={{
                  left: LABEL_WIDTH_PX + NOTE_WIDTH_PX,
                  width: timelineWidth,
                  backgroundImage: gridBackgroundImage,
                }}
              />
              {visibleRows.map((row, idx) => (
                <RegistrationsGanttRow
                  key={`${row.r?.id || idx}`}
                  row={row}
                  rowIndex={idx}
                  weeks={model.weeks}
                  unitWidth={model.unitWidth}
                  gridTemplateColumns={gridTemplateColumns}
                  timelineWidth={timelineWidth}
                  globalStartIndex={model.globalStartIndex ?? 0}
                  mergeWeekRangesNormalized={mergeWeekRangesNormalized}
                  openDetail={openDetail}
                  onNote={onNote}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
