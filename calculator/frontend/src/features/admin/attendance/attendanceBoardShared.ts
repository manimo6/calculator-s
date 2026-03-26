import { ATTENDANCE_BOARD_COPY as COPY } from "./attendanceBoardCopy"

export const LABEL_WIDTH_PX = 240
export const DAY_WIDTH_PX = 44
export const ROW_HEIGHT_PX = 50

export const STATUS_STYLES = [
  {
    key: "pending",
    label: COPY.pending,
    shortLabel: COPY.pendingShort,
    className: "border-slate-300/80 bg-slate-50/80 text-slate-400 hover:bg-slate-100/80",
    cellClassName:
      "border-slate-300/60 bg-white/80 text-transparent border-2 border-dashed",
  },
  {
    key: "present",
    label: COPY.present,
    shortLabel: COPY.presentShort,
    className:
      "border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-600 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/15",
    cellClassName:
      "border-emerald-300/80 bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 shadow-sm shadow-emerald-500/20",
  },
  {
    key: "recorded",
    label: COPY.recorded,
    shortLabel: COPY.recordedShort,
    className:
      "border-sky-300/80 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 shadow-sm shadow-sky-500/10 hover:shadow-md hover:shadow-sky-500/15",
    cellClassName:
      "border-sky-300/80 bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 shadow-sm shadow-sky-500/20",
  },
  {
    key: "late",
    label: COPY.late,
    shortLabel: COPY.lateShort,
    className:
      "border-amber-300/80 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-600 shadow-sm shadow-amber-500/10 hover:shadow-md hover:shadow-amber-500/15",
    cellClassName:
      "border-amber-300/80 bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 shadow-sm shadow-amber-500/20",
  },
  {
    key: "absent",
    label: COPY.absent,
    shortLabel: COPY.absentShort,
    className:
      "border-rose-300/80 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-600 shadow-sm shadow-rose-500/10 hover:shadow-md hover:shadow-rose-500/15",
    cellClassName:
      "border-rose-300/80 bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 shadow-sm shadow-rose-500/20",
  },
] as const

export type AttendanceStatus = (typeof STATUS_STYLES)[number]
export type AttendanceStatusKey = AttendanceStatus["key"]

export const STATUS_LOOKUP = STATUS_STYLES.reduce(
  (acc, status) => {
    acc[status.key as AttendanceStatusKey] = status
    return acc
  },
  {} as Record<AttendanceStatusKey, AttendanceStatus>
)

export const PAINT_STATUS_ORDER: AttendanceStatusKey[] = [
  "present",
  "recorded",
  "late",
  "absent",
  "pending",
]

export const PAINTABLE_STATUSES = PAINT_STATUS_ORDER.map(
  (key) => STATUS_LOOKUP[key]
).filter(Boolean)

export const NO_CLASS_LABEL = "-"
export const OFF_DAY_LABEL = COPY.offDay

export type AttendanceRow = {
  id?: string | number
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  courseDays?: Array<number | string>
  courseEndDay?: number
  breakRanges?: unknown[]
  weeks?: number | string
  period?: number | string
  skipWeeks?: Array<number | string>
  withdrawnAt?: string | Date
  transferToId?: string
  transferAt?: string | Date
  isTransferredOut?: boolean
  recordingDates?: string[]
  _prevChainRegs?: Array<{ id?: string | number; course?: unknown } & Record<string, unknown>>
}

export type AttendanceRowMeta = {
  start: Date | null
  end: Date | null
  withdrawnAt: Date | null
  transferAt: Date | null
  inactiveAt: Date | null
  isTransferredOut: boolean
  courseDays: number[]
  courseDaySet: Set<number>
  skipWeekSet: Set<number>
  breakDateSet: Set<string>
  recordingDateSet: Set<string>
}

export type AttendanceBoardProps = {
  registrations?: AttendanceRow[]
  getCourseDaysForCourse?: (courseName?: string) => number[]
}

export type AttendanceCellMap = Record<string, Record<string, string>>

export function getPrevChainAttendance(
  row: AttendanceRow,
  dateKey: string,
  cellStatuses: AttendanceCellMap
) {
  const prevRegs = row._prevChainRegs
  if (!Array.isArray(prevRegs) || !prevRegs.length) return null
  for (const prev of prevRegs) {
    const prevId = String(prev?.id || "").trim()
    if (!prevId) continue
    const status = cellStatuses[prevId]?.[dateKey]
    if (status && status !== "pending") return status
  }
  return null
}

export function getRowKey(row: AttendanceRow, index: number) {
  if (row?.id !== undefined && row?.id !== null) return String(row.id)
  const name = row?.name || "row"
  const course = row?.course || "course"
  return `${name}-${course}-${index}`
}
