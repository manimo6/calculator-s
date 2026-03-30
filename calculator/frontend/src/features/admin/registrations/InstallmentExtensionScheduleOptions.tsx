import { useMemo } from "react"

import { DAY_MS } from "@/utils/calculatorLogic"
import { weekdayName } from "@/utils/data"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type ScheduleOptionsProps = {
  extendWeeks: number
  scheduleWeeks: number
  skipWeeksEnabled: boolean
  onSkipWeeksEnabledChange: (enabled: boolean) => void
  skipWeeks: number[]
  onSkipWeekToggle: (weekIndex: number) => void
  maxSkipWeeks: number
  isRecordingAvailable: boolean
  recordingEnabled: boolean
  onRecordingEnabledChange: (enabled: boolean) => void
  recordingDates: string[]
  onRecordingDateToggle: (dateStr: string) => void
  availableRecordingDates: string[]
  extensionStartDate: string
  courseDays: number[]
}

export default function InstallmentExtensionScheduleOptions({
  extendWeeks,
  scheduleWeeks,
  skipWeeksEnabled,
  onSkipWeeksEnabledChange,
  skipWeeks,
  onSkipWeekToggle,
  maxSkipWeeks,
  isRecordingAvailable,
  recordingEnabled,
  onRecordingEnabledChange,
  recordingDates,
  onRecordingDateToggle,
  availableRecordingDates,
  extensionStartDate,
  courseDays,
}: ScheduleOptionsProps) {
  const skipWeekSet = useMemo(() => new Set(skipWeeks), [skipWeeks])
  const totalChipWeeks = scheduleWeeks || extendWeeks
  const hasScheduleChange = skipWeeksEnabled && skipWeeks.length > 0
  const atSkipLimit = skipWeeks.length >= maxSkipWeeks

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-50/60 to-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {COPY.scheduleOptionsLabel}
      </div>

      {/* 휴강 주차 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSkipWeeksEnabledChange(!skipWeeksEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              skipWeeksEnabled
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {COPY.skipWeeksLabel}
          </button>
          {hasScheduleChange ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/60">
              <span>{COPY.scheduleSummaryPrefix} {extendWeeks}{COPY.scheduleSummaryUnit}</span>
              <span className="text-amber-400">+</span>
              <span>{COPY.scheduleSummarySkip} {skipWeeks.length}{COPY.scheduleSummaryUnit}</span>
              <span className="text-amber-400">=</span>
              <span>{COPY.scheduleSummaryTotal} {scheduleWeeks}{COPY.scheduleSummaryUnit}</span>
            </div>
          ) : null}
        </div>

        {skipWeeksEnabled ? (
          <div className="space-y-2">
            {maxSkipWeeks > 0 ? (
              <p className="text-xs text-slate-400">
                최대 {maxSkipWeeks}{COPY.weekSuffix} 휴강 가능
                {atSkipLimit ? <span className="ml-1 font-medium text-amber-500">(한도 도달)</span> : null}
              </p>
            ) : (
              <p className="text-xs text-amber-500 font-medium">잔여 주수가 없어 휴강을 추가할 수 없습니다</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: totalChipWeeks }, (_, i) => i + 1).map((week) => {
                const isSkipped = skipWeekSet.has(week)
                const isLocked = !isSkipped && atSkipLimit
                return (
                  <button
                    key={week}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSkipWeekToggle(week)}
                    className={`flex h-8 min-w-[2.75rem] items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      isSkipped
                        ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                        : isLocked
                          ? "cursor-not-allowed bg-slate-50 text-slate-300"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                    }`}
                    title={`${week}${COPY.weekSuffix}`}
                  >
                    {week}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* 녹화강의 */}
      {isRecordingAvailable ? (
        <div className="space-y-3 border-t border-slate-200/50 pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onRecordingEnabledChange(!recordingEnabled)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                recordingEnabled
                  ? "bg-violet-500 text-white shadow-sm shadow-violet-500/25"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {COPY.recordingLabel}
            </button>
            {recordingEnabled && recordingDates.length > 0 ? (
              <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-200/60">
                {recordingDates.length}{COPY.daySuffix} {COPY.selectedCount}
              </div>
            ) : null}
          </div>

          {recordingEnabled ? (
            <RecordingCalendar
              extensionStartDate={extensionStartDate}
              scheduleWeeks={scheduleWeeks}
              courseDays={courseDays}
              availableRecordingDates={availableRecordingDates}
              recordingDates={recordingDates}
              onRecordingDateToggle={onRecordingDateToggle}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function RecordingCalendar({
  extensionStartDate,
  scheduleWeeks,
  courseDays,
  availableRecordingDates,
  recordingDates,
  onRecordingDateToggle,
}: {
  extensionStartDate: string
  scheduleWeeks: number
  courseDays: number[]
  availableRecordingDates: string[]
  recordingDates: string[]
  onRecordingDateToggle: (dateStr: string) => void
}) {
  const availableSet = useMemo(() => new Set(availableRecordingDates), [availableRecordingDates])
  const selectedSet = useMemo(() => new Set(recordingDates), [recordingDates])
  const courseDaySet = useMemo(() => new Set(courseDays), [courseDays])

  const calendarWeeks = useMemo(() => {
    if (!extensionStartDate || !scheduleWeeks) return []
    const start = new Date(extensionStartDate)
    if (isNaN(start.getTime())) return []

    const weeks: Array<{ weekIndex: number; cells: Array<{ dateKey: string; label: string; dayOfWeek: number }> }> = []
    for (let w = 0; w < scheduleWeeks; w++) {
      const weekStart = new Date(start.getTime() + w * 7 * DAY_MS)
      const weekStartDow = weekStart.getDay()
      const cells = WEEKDAY_ORDER.map((weekday) => {
        const offset = (weekday - weekStartDow + 7) % 7
        const date = new Date(weekStart.getTime() + offset * DAY_MS)
        const dateKey = date.toISOString().split("T")[0]
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        return { dateKey, label, dayOfWeek: weekday }
      })
      weeks.push({ weekIndex: w + 1, cells })
    }
    return weeks
  }, [extensionStartDate, scheduleWeeks])

  const weekdayLabels = useMemo(() => WEEKDAY_ORDER.map((d) => weekdayName[d] || ""), [])

  if (!extensionStartDate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">
        {COPY.selectStartFirst}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-2 ring-1 ring-slate-100">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="w-10 px-1 py-1 text-center text-[10px] font-bold text-slate-300" />
            {weekdayLabels.map((label, i) => (
              <th
                key={i}
                className={`px-1 py-1 text-center text-[10px] font-bold ${
                  courseDaySet.has(WEEKDAY_ORDER[i]) ? "text-slate-500" : "text-slate-200"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks.map((week) => (
            <tr key={week.weekIndex} className="border-t border-slate-50">
              <td className="px-1 py-0.5 text-center text-[10px] font-bold text-slate-300">
                {week.weekIndex}
              </td>
              {week.cells.map((cell) => {
                const isAvailable = availableSet.has(cell.dateKey)
                const isSelected = selectedSet.has(cell.dateKey)
                const isCourseDay = courseDaySet.has(cell.dayOfWeek)

                if (!isCourseDay) {
                  return <td key={cell.dateKey} className="px-0.5 py-0.5" />
                }

                if (!isAvailable) {
                  return (
                    <td key={cell.dateKey} className="px-0.5 py-0.5 text-center">
                      <span className="inline-block rounded px-1 py-0.5 text-[10px] text-slate-200 line-through">
                        {cell.label}
                      </span>
                    </td>
                  )
                }

                return (
                  <td key={cell.dateKey} className="px-0.5 py-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRecordingDateToggle(cell.dateKey)}
                      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-1 py-1 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30 scale-105"
                          : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                      }`}
                    >
                      {cell.label}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
