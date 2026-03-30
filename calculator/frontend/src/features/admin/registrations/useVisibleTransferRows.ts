import { useMemo } from "react"

import type { TransferDisplayModelRow, TransferDisplayRegistrationRow } from "./transferDisplayTypes"

export function useVisibleRows(
  rows: TransferDisplayModelRow[],
  showTransferHistory: boolean,
  registrationMap?: Map<string, TransferDisplayRegistrationRow>,
  skipTransferFilter?: boolean
) {
  return useMemo(() => {
    if (skipTransferFilter) {
      const mainRows = rows.filter((row) => !row.isTransferredOut)
      const ghostRows = rows.filter((row) => row.isTransferredOut)
      if (!ghostRows.length) return mainRows

      const chainRootCache = new Map<string, string>()
      const getChainRootId = (registrationId: string): string => {
        if (chainRootCache.has(registrationId)) return chainRootCache.get(registrationId)!
        let currentId = registrationId
        const visited = new Set<string>()
        while (true) {
          visited.add(currentId)
          const registration = registrationMap?.get(currentId)
          if (!registration?.transferFromId) break
          const fromId = String(registration.transferFromId)
          if (visited.has(fromId)) break
          currentId = fromId
        }
        for (const visitedId of visited) chainRootCache.set(visitedId, currentId)
        return currentId
      }

      const ghostsByChain = new Map<string, TransferDisplayModelRow[]>()
      for (const row of ghostRows) {
        const rowId = row.r?.id != null ? String(row.r.id) : ""
        if (!rowId) continue
        const root = getChainRootId(rowId)
        if (!ghostsByChain.has(root)) ghostsByChain.set(root, [])
        ghostsByChain.get(root)?.push(row)
      }

      const mergedRoots = new Set<string>()
      const merged = mainRows.map((row) => {
        const rowId = row.r?.id != null ? String(row.r.id) : ""
        if (!rowId) return row
        const root = getChainRootId(rowId)
        const ghosts = ghostsByChain.get(root)
        if (!ghosts?.length) return row
        mergedRoots.add(root)
        return { ...row, transferSegments: ghosts }
      })

      const orphanRows: TransferDisplayModelRow[] = []
      for (const [root, ghosts] of ghostsByChain) {
        if (mergedRoots.has(root)) continue
        if (ghosts.length <= 1) {
          orphanRows.push(...ghosts)
        } else {
          const [primary, ...rest] = ghosts
          orphanRows.push({ ...primary, transferSegments: rest })
        }
      }

      const result = [...merged, ...orphanRows]
      result.sort((a, b) =>
        String(a.r?.name || "").localeCompare(String(b.r?.name || ""), "ko-KR")
      )
      return result
    }

    const activeRows = rows.filter((row) => !row.isTransferredOut)
    if (!showTransferHistory) return activeRows

    const transferredRows = rows.filter((row) => row.isTransferredOut)
    if (!transferredRows.length) return activeRows

    const transferredById = new Map<string, TransferDisplayModelRow>()
    for (const row of transferredRows) {
      if (row.r?.id != null) transferredById.set(String(row.r.id), row)
    }

    const segmentMap = new Map<string, TransferDisplayModelRow[]>()
    for (const row of activeRows) {
      const rowId = row.r?.id != null ? String(row.r.id) : ""
      if (!rowId) continue
      const segments: TransferDisplayModelRow[] = []
      const visited = new Set<string>()

      // 역방향: transferFromId 체인 추적
      let currentId = row.r?.transferFromId ? String(row.r.transferFromId) : null
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const localRow = transferredById.get(currentId)
        if (localRow) segments.unshift(localRow)
        const registration = registrationMap?.get(currentId)
        currentId = registration?.transferFromId ? String(registration.transferFromId) : null
      }

      // 순방향: _originalTransferToId로 forward chain 추적 (미래 체인의 active 표시용)
      const originalToId = (row.r as Record<string, unknown>)?._originalTransferToId
      let forwardId = originalToId ? String(originalToId) : null
      while (forwardId && !visited.has(forwardId)) {
        visited.add(forwardId)
        const localRow = transferredById.get(forwardId)
        if (localRow) segments.push(localRow)
        const registration = registrationMap?.get(forwardId)
        forwardId = registration?.transferToId ? String(registration.transferToId) : null
      }

      if (segments.length) segmentMap.set(rowId, segments)
    }

    const mergedIds = new Set<string>()
    for (const segments of segmentMap.values()) {
      for (const segment of segments) {
        if (segment.r?.id != null) mergedIds.add(String(segment.r.id))
      }
    }

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
  }, [rows, showTransferHistory, registrationMap, skipTransferFilter])
}
