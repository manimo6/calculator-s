import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"

import {
  buildRegistrationsGanttModel,
  buildWeekTotals,
  LABEL_WIDTH_PX,
  NOTE_WIDTH_PX,
  type RegistrationRow,
} from "./registrationsGanttModel"
import {
  RegistrationsGanttCardHeader,
  RegistrationsGanttEmptyState,
} from "./RegistrationsGanttHeader"
import RegistrationsGanttDetailPanel from "./RegistrationsGanttDetailPanel"
import { RegistrationsGanttTimeline } from "./RegistrationsGanttTimeline"
import { normalizeWeekRanges } from "./utils"
import { useTransferHistory, useVisibleRows } from "./useTransferDisplay"

type RegistrationsGanttProps = {
  registrations: RegistrationRow[]
  rangeRegistrations: RegistrationRow[]
  courseDays: number[]
  getCourseDaysForCourse: (courseName?: string) => number[]
  mergeWeekRanges: Array<{ start?: number; end?: number }>
  registrationMap?: Map<string, RegistrationRow>
  onWithdraw: (row: RegistrationRow) => void
  onRestore: (row: RegistrationRow) => void
  onTransfer: (row: RegistrationRow) => void
  onTransferCancel: (row: RegistrationRow) => void
  onNote: (row: RegistrationRow) => void
  showTransferChain?: boolean
  simulationDate?: Date | null
  maxHeightClassName?: string
  disableCardOverflow?: boolean
}

export default function RegistrationsGantt({
  registrations,
  rangeRegistrations,
  courseDays,
  getCourseDaysForCourse,
  mergeWeekRanges,
  registrationMap,
  onWithdraw,
  onRestore,
  onTransfer,
  onTransferCancel,
  onNote,
  showTransferChain = false,
  simulationDate = null,
  maxHeightClassName = "max-h-[560px]",
  disableCardOverflow = false,
}: RegistrationsGanttProps) {
  const ganttScrollRef = useRef<HTMLDivElement | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<RegistrationRow | null>(null)

  const openDetail = useCallback((row: RegistrationRow) => {
    if (!row) return
    setDetailTarget(row)
    setDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailTarget(null)
  }, [])

  useEffect(() => {
    if (!detailOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetail()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [detailOpen, closeDetail])

  const mergeWeekRangesNormalized = useMemo(
    () => normalizeWeekRanges(mergeWeekRanges),
    [mergeWeekRanges]
  )

  const model = useMemo(
    () =>
      buildRegistrationsGanttModel({
        registrations,
        rangeRegistrations,
        courseDays,
        getCourseDaysForCourse,
        simulationDate,
      }),
    [courseDays, getCourseDaysForCourse, rangeRegistrations, registrations, simulationDate]
  )

  const visibleRows = useVisibleRows(model.rows, false, registrationMap, showTransferChain)
  const gridTemplateColumns = useMemo(
    () => `${LABEL_WIDTH_PX}px ${NOTE_WIDTH_PX}px ${model.timelineWidth}px`,
    [model.timelineWidth]
  )
  const timelineWidth = model.timelineWidth
  const transferHistory = useTransferHistory(detailTarget, registrationMap)

  const gridBackgroundImage = useMemo(() => {
    const line = "hsl(var(--foreground) / 0.06)"
    const step = Math.max(2, model.unitWidth)
    return `repeating-linear-gradient(to right, transparent 0, transparent ${step - 1}px, ${line} ${step - 1}px, ${line} ${step}px)`
  }, [model.unitWidth])

  const handleGanttWheel = useCallback((event: WheelEvent) => {
    const container = ganttScrollRef.current
    if (!container) return

    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest("[data-gantt-left]")) {
      if (event.deltaY) {
        event.preventDefault()
        if (container.scrollHeight > container.clientHeight) {
          container.scrollTop += event.deltaY
        } else {
          let parent = container.parentElement
          while (parent) {
            if (parent.scrollHeight > parent.clientHeight) {
              parent.scrollTop += event.deltaY
              break
            }
            parent = parent.parentElement
          }
        }
      }
      return
    }

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY

    if (!delta) return

    event.preventDefault()
    container.scrollLeft += delta
  }, [])

  useEffect(() => {
    const container = ganttScrollRef.current
    if (!container) return

    container.addEventListener("wheel", handleGanttWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleGanttWheel)
    }
  }, [handleGanttWheel])

  const weekTotals = useMemo(
    () => buildWeekTotals(model, mergeWeekRangesNormalized),
    [mergeWeekRangesNormalized, model]
  )

  const overlayClassName = `absolute inset-0 bg-slate-900/25 backdrop-blur-[2px] transition-opacity duration-500 ${
    detailOpen ? "opacity-100" : "opacity-0"
  }`
  const panelStateClass = detailOpen
    ? "translate-x-0 opacity-100"
    : "translate-x-full opacity-0"
  const panelClassName = `absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto rounded-none border-l border-slate-200/70 bg-gradient-to-b from-white/95 via-white/90 to-slate-50/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${panelStateClass}`

  return (
    <>
      <Card
        className={`border-0 bg-white shadow-xl shadow-slate-200/20 ring-1 ring-slate-200/50 ${
          disableCardOverflow ? "" : "overflow-hidden"
        }`}
      >
        <RegistrationsGanttCardHeader model={model} />

        <CardContent className="p-0">
          {!model.range || !model.weeks.length ? (
            <RegistrationsGanttEmptyState model={model} />
          ) : (
            <RegistrationsGanttTimeline
              ganttScrollRef={ganttScrollRef}
              maxHeightClassName={maxHeightClassName}
              model={model}
              visibleRows={visibleRows}
              gridTemplateColumns={gridTemplateColumns}
              timelineWidth={timelineWidth}
              gridBackgroundImage={gridBackgroundImage}
              weekTotals={weekTotals}
              mergeWeekRangesNormalized={mergeWeekRangesNormalized}
              openDetail={openDetail}
              onNote={onNote}
            />
          )}
        </CardContent>
      </Card>

      <RegistrationsGanttDetailPanel
        open={detailOpen}
        target={detailTarget}
        overlayClassName={overlayClassName}
        panelClassName={panelClassName}
        closeDetail={closeDetail}
        simulationDate={simulationDate}
        transferHistory={transferHistory}
        courseDays={courseDays}
        getCourseDaysForCourse={getCourseDaysForCourse}
        onRestore={onRestore}
        onTransfer={onTransfer}
        onTransferCancel={onTransferCancel}
        onWithdraw={onWithdraw}
      />
    </>
  )
}
