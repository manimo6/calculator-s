import type { AttendanceCellMap } from "./attendanceBoardModel"

type AttendanceBoardStateRow = {
  id?: string | number
  _prevChainRegs?: Array<{ id?: string | number } & Record<string, unknown>>
}

type AttendanceRecordPayload = {
  registrationId?: string | number
  date?: string
  status?: string
}

export function collectAttendanceRegistrationIds(rows: AttendanceBoardStateRow[]) {
  const ids = new Set<string>()
  for (const row of rows || []) {
    const id = String(row?.id || "").trim()
    if (id) ids.add(id)
    if (Array.isArray(row._prevChainRegs)) {
      for (const prev of row._prevChainRegs) {
        const prevId = String(prev?.id || "").trim()
        if (prevId) ids.add(prevId)
      }
    }
  }
  return [...ids]
}

export function buildAttendanceCellMap(records: AttendanceRecordPayload[]) {
  const next: AttendanceCellMap = {}

  for (const record of records || []) {
    const registrationId = String(record?.registrationId || "").trim()
    const date = String(record?.date || "").trim()
    const status = String(record?.status || "").trim()
    if (!registrationId || !date || !status) continue
    if (!next[registrationId]) next[registrationId] = {}
    next[registrationId][date] = status
  }

  return next
}

export function updateAttendanceCellStatus(
  prev: AttendanceCellMap,
  rowKey: string,
  dateKey: string,
  status: string
) {
  const rowStatus = prev[rowKey] || {}
  if (rowStatus[dateKey] === status) return prev

  return {
    ...prev,
    [rowKey]: {
      ...rowStatus,
      [dateKey]: status,
    },
  }
}

export function applyAttendanceSocketUpdates(
  prev: AttendanceCellMap,
  updates: AttendanceRecordPayload[],
  registrationIdSet: Set<string>,
  monthKey: string
) {
  if (!Array.isArray(updates) || updates.length === 0) return prev

  let next = prev
  for (const update of updates) {
    const registrationId = String(update?.registrationId || "").trim()
    const dateKey = String(update?.date || "").trim()
    const status = String(update?.status || "").trim()
    if (!registrationId || !dateKey || !status) continue
    if (!registrationIdSet.has(registrationId)) continue
    if (monthKey && !dateKey.startsWith(monthKey)) continue

    const rowStatus = next[registrationId] || {}
    const existing = rowStatus[dateKey]
    if (status === "pending") {
      if (!existing) continue
      if (next === prev) next = { ...prev }
      const updatedRow = { ...rowStatus }
      delete updatedRow[dateKey]
      next[registrationId] = updatedRow
      continue
    }
    if (existing === status) continue
    if (next === prev) next = { ...prev }
    next[registrationId] = {
      ...rowStatus,
      [dateKey]: status,
    }
  }

  return next
}
