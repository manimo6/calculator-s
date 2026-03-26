import { useMemo } from "react"

import type { TransferDisplayRegistrationRow } from "./transferDisplayTypes"

export function useTransferHistory(
  target: TransferDisplayRegistrationRow | null,
  registrationMap?: Map<string, TransferDisplayRegistrationRow>
) {
  return useMemo(() => {
    if (!target || !registrationMap?.size) return []

    const chain: TransferDisplayRegistrationRow[] = []
    const visited = new Set<string>()
    let current: TransferDisplayRegistrationRow | undefined = target
    const backward: TransferDisplayRegistrationRow[] = []

    while (current?.transferFromId) {
      const fromId = String(current.transferFromId)
      if (visited.has(fromId)) break
      visited.add(fromId)
      const previous = registrationMap.get(fromId)
      if (!previous) break
      backward.unshift(previous)
      current = previous
    }

    chain.push(...backward)
    chain.push(target)
    visited.clear()
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
