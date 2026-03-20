import { useMemo } from "react"

// ── Types ──

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: string | number
  transferToId?: string | number
  transferFromId?: string | number
  isTransferredOut?: boolean
} & Record<string, unknown>

type ModelRow = {
  r: RegistrationRow
  start: Date | null
  end: Date | null
  status: string
  isWithdrawn: boolean
  isTransferredOut: boolean
  recordingDates: Array<string | Date>
  courseDays: number[]
  recordingWeeks: Array<{ weekIndex: number; dates: Date[] }>
  skipWeeks: number[]
  startIndex: number
  endIndex: number
  transferSegments?: ModelRow[]
}

// ── registrationMap + enrichment (RegistrationsTab용) ──

export function useRegistrationMap(baseRegistrations: RegistrationRow[]) {
  return useMemo(() => {
    const map = new Map<string, RegistrationRow>()
    for (const r of baseRegistrations || []) {
      if (r?.id != null) map.set(String(r.id), r)
    }
    return map
  }, [baseRegistrations])
}

export function useEnrichedRegistrations(
  registrations: RegistrationRow[],
  registrationMap: Map<string, RegistrationRow>
) {
  return useMemo(
    () =>
      registrations.map((r) => {
        const toReg = r?.transferToId
          ? registrationMap.get(String(r.transferToId))
          : null
        const fromReg = r?.transferFromId
          ? registrationMap.get(String(r.transferFromId))
          : null
        if (!toReg && !fromReg) return r
        return {
          ...r,
          ...(toReg ? { transferToCourseName: String(toReg.course || "") } : {}),
          ...(fromReg ? { transferFromCourseName: String(fromReg.course || "") } : {}),
        }
      }),
    [registrations, registrationMap]
  )
}

export function useCardRegistrations(enrichedRegistrations: RegistrationRow[]) {
  return useMemo(
    () =>
      enrichedRegistrations.filter(
        (r) => !r?.isTransferredOut && !r?.transferToId
      ),
    [enrichedRegistrations]
  )
}

// ── visibleRows 병합 (RegistrationsGantt용) ──

export function useVisibleRows(
  rows: ModelRow[],
  showTransferHistory: boolean,
  registrationMap?: Map<string, RegistrationRow>
) {
  return useMemo(() => {
    const activeRows = rows.filter((row) => !row.isTransferredOut)
    if (!showTransferHistory) return activeRows

    const transferredRows = rows.filter((row) => row.isTransferredOut)
    if (!transferredRows.length) return activeRows

    const transferredById = new Map<string, ModelRow>()
    for (const row of transferredRows) {
      if (row.r?.id != null) transferredById.set(String(row.r.id), row)
    }

    // 활성 행에서 transferFromId 체인을 거슬러 올라가며 같은 차트에 있는 전반 원본 수집
    const segmentMap = new Map<string, ModelRow[]>()
    for (const row of activeRows) {
      const rowId = row.r?.id != null ? String(row.r.id) : ""
      if (!rowId) continue
      const segments: ModelRow[] = []
      const visited = new Set<string>()
      let currentId = row.r?.transferFromId
        ? String(row.r.transferFromId)
        : null
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const localRow = transferredById.get(currentId)
        if (localRow) segments.unshift(localRow)
        const regEntry = registrationMap?.get(currentId)
        currentId = regEntry?.transferFromId
          ? String(regEntry.transferFromId)
          : null
      }
      if (segments.length) segmentMap.set(rowId, segments)
    }

    // 병합된 전반 원본 ID 수집
    const mergedIds = new Set<string>()
    for (const segments of segmentMap.values()) {
      for (const seg of segments) {
        if (seg.r?.id != null) mergedIds.add(String(seg.r.id))
      }
    }

    // 병합 대상이 없는 전반 원본은 독립 고스트 행으로 표시
    const orphanRows = transferredRows.filter(
      (row) => row.r?.id != null && !mergedIds.has(String(row.r.id))
    )

    const merged = activeRows.map((row) => {
      const rowId = row.r?.id != null ? String(row.r.id) : ""
      const segments = segmentMap.get(rowId)
      if (!segments?.length) return row
      return { ...row, transferSegments: segments }
    })

    return [...merged, ...orphanRows]
  }, [rows, showTransferHistory, registrationMap])
}

// ── transferHistory 체인 빌드 (사이드바용) ──

export function useTransferHistory(
  target: RegistrationRow | null,
  registrationMap?: Map<string, RegistrationRow>
) {
  return useMemo(() => {
    if (!target || !registrationMap?.size) return []
    const chain: RegistrationRow[] = []
    const visited = new Set<string>()
    // 거슬러 올라가기
    let current: RegistrationRow | undefined = target
    const backward: RegistrationRow[] = []
    while (current?.transferFromId) {
      const fromId = String(current.transferFromId)
      if (visited.has(fromId)) break
      visited.add(fromId)
      const prev = registrationMap.get(fromId)
      if (!prev) break
      backward.unshift(prev)
      current = prev
    }
    chain.push(...backward)
    chain.push(target)
    visited.clear()
    // 앞으로 따라가기
    current = target
    while (current?.transferToId) {
      const toId = String(current.transferToId)
      if (visited.has(toId)) break
      visited.add(toId)
      const next = registrationMap.get(toId)
      if (!next) break
      chain.push(next)
      current = next
    }
    return chain.length > 1 ? chain : []
  }, [target, registrationMap])
}
