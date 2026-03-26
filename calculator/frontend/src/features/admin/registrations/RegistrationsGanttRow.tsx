import {
  LABEL_WIDTH_PX,
  ROW_HEIGHT_PX,
  type ModelRow,
  type RegistrationRow,
  type WeekRangeDates,
} from "./registrationsGanttModel"
import { buildGanttTimelineDescriptors } from "./registrationsGanttRowModel"
import {
  RegistrationsGanttIdentityCell,
  RegistrationsGanttNoteCell,
  RegistrationsGanttTimeline,
} from "./RegistrationsGanttRowSections"
import { type NormalizedWeekRange } from "./utils"

type RegistrationsGanttRowProps = {
  row: ModelRow
  rowIndex: number
  weeks: WeekRangeDates[]
  unitWidth: number
  gridTemplateColumns: string
  timelineWidth: number
  globalStartIndex: number
  mergeWeekRangesNormalized: NormalizedWeekRange[]
  openDetail: (row: RegistrationRow) => void
  onNote: (row: RegistrationRow) => void
}

export default function RegistrationsGanttRow({
  row,
  rowIndex,
  weeks,
  unitWidth,
  gridTemplateColumns,
  timelineWidth,
  globalStartIndex,
  mergeWeekRangesNormalized,
  openDetail,
  onNote,
}: RegistrationsGanttRowProps) {
  const { r, status, isWithdrawn, isTransferredOut } = row
  const { hasDates, bars, markers, meta } = buildGanttTimelineDescriptors({
    row,
    rowIndex,
    weeks,
    unitWidth,
    globalStartIndex,
    mergeWeekRangesNormalized,
  })

  return (
    <div
      className={`group relative z-10 grid border-b border-border/5 transition-colors hover:bg-slate-50/60${
        isTransferredOut ? " opacity-40" : ""
      }`}
      style={{ gridTemplateColumns, height: ROW_HEIGHT_PX }}
      onClick={() => openDetail(r)}
    >
      <RegistrationsGanttIdentityCell
        row={r}
        meta={meta}
        isWithdrawn={isWithdrawn}
        isTransferredOut={isTransferredOut}
        status={status}
        openDetail={openDetail}
      />

      <RegistrationsGanttNoteCell row={r} meta={meta} onNote={onNote} />

      <div
        className="relative"
        style={{
          width: timelineWidth,
          height: "100%",
          left: LABEL_WIDTH_PX ? 0 : 0,
        }}
      >
        <RegistrationsGanttTimeline
          hasDates={hasDates}
          timelineWidth={timelineWidth}
          bars={bars}
          markers={markers}
        />
      </div>
    </div>
  )
}
