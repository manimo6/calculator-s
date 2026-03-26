import React from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"

import { getWeekIndex } from "@/utils/calculatorLogic"

import { ATTENDANCE_BOARD_COPY as COPY } from "./attendanceBoardCopy"
import {
  getPrevChainAttendance,
  NO_CLASS_LABEL,
  OFF_DAY_LABEL,
  ROW_HEIGHT_PX,
  STATUS_LOOKUP,
  type AttendanceCellMap,
  type AttendanceRow,
  type AttendanceRowMeta,
} from "./attendanceBoardModel"

type AttendanceBoardRowProps = {
  row: AttendanceRow
  rowKey: string
  rowIndex: number
  meta: AttendanceRowMeta | undefined
  days: Date[]
  gridTemplateColumns: string
  cellStatuses: AttendanceCellMap
  onPaintStart: (
    event: React.PointerEvent<HTMLDivElement>,
    rowKey: string,
    dateKey: string,
    registrationId: string
  ) => void
  onPaintEnter: (rowKey: string, dateKey: string, registrationId: string) => void
}

export default function AttendanceBoardRow({
  row,
  rowKey,
  rowIndex,
  meta,
  days,
  gridTemplateColumns,
  cellStatuses,
  onPaintStart,
  onPaintEnter,
}: AttendanceBoardRowProps) {
  const rowStatus = cellStatuses[rowKey] || {}
  const start = meta?.start
  const end = meta?.end
  const withdrawnAt = meta?.withdrawnAt
  const inactiveAt = meta?.inactiveAt
  const isTransferredOut = Boolean(meta?.isTransferredOut)
  const registrationId = String(row?.id || "").trim()

  const isWithdrawn = Boolean(withdrawnAt)
  const inactiveLabel = isTransferredOut ? COPY.inactiveTransfer : COPY.inactiveWithdraw

  return (
    <div
      className={`group grid border-b border-slate-100 transition-colors ${
        rowIndex % 2 === 1 ? "bg-slate-50/40" : "bg-white/60"
      } hover:bg-violet-50/30`}
      style={{ gridTemplateColumns }}
    >
      <div
        className="sticky left-0 z-10 flex h-full items-center gap-3 border-r border-slate-200/60 bg-gradient-to-r from-white via-white to-transparent px-4 py-3 backdrop-blur-sm transition-colors group-hover:from-violet-50/80 group-hover:via-violet-50/60"
        style={{ minHeight: ROW_HEIGHT_PX }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-800">
              {row?.name || "-"}
            </span>
            {isWithdrawn ? (
              <Badge
                variant="outline"
                className="shrink-0 rounded-lg border-rose-300/80 bg-gradient-to-r from-rose-50 to-pink-50 px-1.5 py-0 text-[10px] font-semibold text-rose-700"
              >
                {COPY.withdrawnBadge}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className="truncate font-medium text-slate-500">
              {row?.course || COPY.courseMissing}
            </span>
            {Array.isArray(row._prevChainRegs) && row._prevChainRegs.length > 0 ? (
              <span className="shrink-0 text-[10px] text-slate-400">
                {COPY.previousChainPrefix}
                {String(row._prevChainRegs[row._prevChainRegs.length - 1]?.course || "")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd")
        const inRange =
          start && end && day.getTime() >= start.getTime() && day.getTime() <= end.getTime()
        const courseDays = Array.isArray(meta?.courseDays) ? meta.courseDays : []
        const hasCourseDay = inRange && courseDays.includes(day.getDay())

        const isBreakDay = hasCourseDay && meta?.breakDateSet?.has(dateKey)
        const isSkipDay =
          !isBreakDay &&
          hasCourseDay &&
          meta?.skipWeekSet?.size &&
          start &&
          meta?.skipWeekSet?.has(getWeekIndex(start, day))

        const isInactiveDay = inactiveAt && day.getTime() >= inactiveAt.getTime()
        const isPaintable = hasCourseDay && !isSkipDay && !isBreakDay && !isInactiveDay
        const isRecordedDefault =
          isPaintable && meta?.recordingDateSet?.has(dateKey)
        const statusKey =
          rowStatus[dateKey] || (isRecordedDefault ? "recorded" : "pending")
        const statusStyle = STATUS_LOOKUP[statusKey] || STATUS_LOOKUP.pending

        const isWeekendDay = day.getDay() === 0 || day.getDay() === 6
        const cellBaseClass =
          `flex items-center justify-center px-1 py-2 transition-colors ${isWeekendDay ? "bg-rose-50/20" : ""}`
        const cellInteractiveClass = isPaintable
          ? "cursor-crosshair hover:bg-violet-100/40"
          : "cursor-default"

        const prevChainStatus = !isPaintable
          ? getPrevChainAttendance(row, dateKey, cellStatuses)
          : null

        let cellContent = null
        if (prevChainStatus) {
          const prevStyle = STATUS_LOOKUP[prevChainStatus] || STATUS_LOOKUP.pending
          cellContent = (
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-bold opacity-30 ${prevStyle.cellClassName}`}
              title={`${COPY.previousStatusTitlePrefix} ${prevStyle.label}`}
            >
              {prevStyle.shortLabel}
            </span>
          )
        } else if (!hasCourseDay || isInactiveDay) {
          cellContent = <span className="text-xs text-slate-300">{NO_CLASS_LABEL}</span>
        } else if (isBreakDay) {
          cellContent = (
            <span className="text-xs text-slate-400" title={COPY.breakDayTitle}>
              {NO_CLASS_LABEL}
            </span>
          )
        } else if (isSkipDay) {
          cellContent = (
            <span
              className="inline-flex items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-slate-100/50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400"
              title={OFF_DAY_LABEL}
            >
              {OFF_DAY_LABEL}
            </span>
          )
        } else {
          cellContent = (
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-bold transition-transform hover:scale-110 ${statusStyle.cellClassName}`}
              title={statusStyle.label}
            >
              {statusStyle.shortLabel}
            </span>
          )
        }

        return (
          <div
            key={`${rowKey}-${dateKey}`}
            className={`${cellBaseClass} ${cellInteractiveClass}`}
            onPointerDown={
              isPaintable
                ? (event) => onPaintStart(event, rowKey, dateKey, registrationId)
                : undefined
            }
            onPointerEnter={
              isPaintable
                ? () => onPaintEnter(rowKey, dateKey, registrationId)
                : undefined
            }
            aria-label={
              isSkipDay
                ? `${OFF_DAY_LABEL} (${dateKey})`
                : isInactiveDay
                  ? `${inactiveLabel} (${dateKey})`
                  : isBreakDay
                    ? `${COPY.breakDayTitle} (${dateKey})`
                    : !hasCourseDay
                      ? `${COPY.noClass} (${dateKey})`
                      : `${statusStyle.label} (${dateKey})`
            }
          >
            {cellContent}
          </div>
        )
      })}
    </div>
  )
}
