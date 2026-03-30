import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar } from "lucide-react"
import type { PointerEvent as ReactPointerEvent } from "react"

import { CardContent } from "@/components/ui/card"

import AttendanceBoardRow from "./AttendanceBoardRow"
import { ATTENDANCE_BOARD_COPY as COPY } from "./attendanceBoardCopy"
import type {
  AttendanceCellMap,
  AttendanceRow,
  AttendanceRowMeta,
} from "./attendanceBoardModel"

type RowEntry = {
  row: AttendanceRow
  rowKey: string
  meta?: AttendanceRowMeta
}

export default function AttendanceBoardGrid({
  days,
  today,
  minWidth,
  gridTemplateColumns,
  visibleRows,
  registrations,
  cellStatuses,
  onPaintStart,
  onPaintEnter,
}: {
  days: Date[]
  today: Date
  minWidth: number
  gridTemplateColumns: string
  visibleRows: RowEntry[]
  registrations: AttendanceRow[]
  cellStatuses: AttendanceCellMap
  onPaintStart: (
    event: ReactPointerEvent<HTMLDivElement>,
    rowKey: string,
    dateKey: string,
    registrationId: string
  ) => void
  onPaintEnter: (rowKey: string, dateKey: string, registrationId: string) => void
}) {
  return (
    <CardContent className="p-0">
      <div className="rounded-b-2xl bg-white/60">
        <div className="overflow-auto no-scrollbar">
          <div style={{ minWidth }} className="select-none">
            <div
              className="sticky top-0 z-20 grid border-b border-slate-200/60 bg-gradient-to-b from-slate-50 to-white/95 backdrop-blur-lg"
              style={{ gridTemplateColumns }}
            >
              <div className="sticky left-0 z-30 flex items-center border-r border-slate-200/60 bg-gradient-to-r from-slate-100/95 to-slate-50/95 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-lg">
                {COPY.studentCourse}
              </div>
              {days.map((day) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isToday = day.toDateString() === today.toDateString()
                return (
                  <div
                    key={day.toISOString()}
                    className={`flex flex-col items-center justify-center gap-1 px-1 py-3 ${
                      isWeekend ? "bg-rose-50/30" : ""
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isToday
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                          : isWeekend
                            ? "text-rose-500"
                            : "text-slate-700"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        isWeekend ? "text-rose-400" : "text-slate-400"
                      }`}
                    >
                      {format(day, "EEE", { locale: ko })}
                    </span>
                  </div>
                )
              })}
            </div>

            {visibleRows.map(({ row, rowKey, meta }, rowIndex) => (
              <AttendanceBoardRow
                key={rowKey}
                row={row}
                rowKey={rowKey}
                rowIndex={rowIndex}
                meta={meta}
                days={days}
                gridTemplateColumns={gridTemplateColumns}
                cellStatuses={cellStatuses}
                onPaintStart={onPaintStart}
                onPaintEnter={onPaintEnter}
              />
            ))}

            {!registrations?.length ? (
              <div className="px-6 py-16 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-base font-medium text-slate-600">{COPY.emptyTitle}</p>
                <p className="mt-1 text-sm text-slate-400">{COPY.emptyDescription}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CardContent>
  )
}
