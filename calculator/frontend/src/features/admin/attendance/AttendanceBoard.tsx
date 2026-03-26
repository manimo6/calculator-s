import { useMemo, useState } from "react"
import { addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns"

import { Card } from "@/components/ui/card"

import { parseDate } from "../registrations/utils"
import AttendanceBoardGrid from "./AttendanceBoardGrid"
import AttendanceBoardHeader from "./AttendanceBoardHeader"
import {
  buildAttendanceRowMetaMap,
  DAY_WIDTH_PX,
  getRowKey,
  hasUpcomingClasses,
  LABEL_WIDTH_PX,
  type AttendanceBoardProps,
  type AttendanceStatusKey,
} from "./attendanceBoardModel"
import { useAttendanceBoardState } from "./useAttendanceBoardState"

export default function AttendanceBoard(props: AttendanceBoardProps) {
  const { registrations = [], getCourseDaysForCourse } = props || {}
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [paintStatus, setPaintStatus] = useState<AttendanceStatusKey>("present")
  const [hideInactive, setHideInactive] = useState(false)

  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => parseDate(new Date()), [])

  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return eachDayOfInterval({ start, end })
  }, [month])

  const gridTemplateColumns = useMemo(
    () => `${LABEL_WIDTH_PX}px repeat(${days.length}, ${DAY_WIDTH_PX}px)`,
    [days.length]
  )

  const minWidth = useMemo(
    () => LABEL_WIDTH_PX + days.length * DAY_WIDTH_PX,
    [days.length]
  )

  const rowMetaMap = useMemo(
    () => buildAttendanceRowMetaMap(registrations, getCourseDaysForCourse),
    [getCourseDaysForCourse, registrations]
  )

  const rowEntries = useMemo(
    () =>
      (registrations || []).map((row, index) => {
        const rowKey = getRowKey(row, index)
        return { row, rowKey, meta: rowMetaMap.get(rowKey) }
      }),
    [registrations, rowMetaMap]
  )

  const visibleRows = useMemo(() => {
    if (!hideInactive) return rowEntries
    return rowEntries.filter(({ meta }) => {
      if (meta?.inactiveAt) return false
      return hasUpcomingClasses(meta, todayStart)
    })
  }, [hideInactive, rowEntries, todayStart])

  const {
    cellStatuses,
    handlePaintStart,
    handlePaintEnter,
  } = useAttendanceBoardState({
    month,
    registrations,
    paintStatus,
  })

  return (
    <Card className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-xl shadow-black/5 backdrop-blur-xl">
      <AttendanceBoardHeader
        month={month}
        hideInactive={hideInactive}
        paintStatus={paintStatus}
        onPrevMonth={() => setMonth((prev) => addMonths(prev, -1))}
        onNextMonth={() => setMonth((prev) => addMonths(prev, 1))}
        onHideInactiveChange={(value) => setHideInactive(Boolean(value))}
        onPaintStatusChange={setPaintStatus}
      />
      <AttendanceBoardGrid
        days={days}
        today={today}
        minWidth={minWidth}
        gridTemplateColumns={gridTemplateColumns}
        visibleRows={visibleRows}
        registrations={registrations}
        cellStatuses={cellStatuses}
        onPaintStart={handlePaintStart}
        onPaintEnter={handlePaintEnter}
      />
    </Card>
  )
}
