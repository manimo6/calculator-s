import { parseDate } from "./utils"

type DateInput = string | number | Date | null | undefined

type ChainRow = {
  id?: string | number
  transferFromId?: string | number
  transferToId?: string | number
  startDate?: DateInput
  endDate?: DateInput
} & Record<string, unknown>

export function getChainRoot<T extends ChainRow>(
  reg: T,
  regMap: Map<string, T>
): T {
  let current = reg
  const visited = new Set<string>()
  while (current.transferFromId) {
    const id = String(current.transferFromId)
    if (visited.has(id)) break
    visited.add(id)
    const parent = regMap.get(id)
    if (!parent) break
    current = parent
  }
  return current
}

export function getFullChain<T extends ChainRow>(
  reg: T,
  regMap: Map<string, T>
): T[] {
  const root = getChainRoot(reg, regMap)
  const chain: T[] = [root]
  const visited = new Set<string>([String(root.id)])
  let current = root
  while (current.transferToId) {
    const id = String(current.transferToId)
    if (visited.has(id)) break
    visited.add(id)
    const next = regMap.get(id)
    if (!next) break
    chain.push(next)
    current = next
  }
  return chain
}

export function findActiveInChain<T extends ChainRow>(
  chain: T[],
  refDate: Date
): T | null {
  // refDate에 활성인 등록 찾기
  for (const reg of chain) {
    const start = parseDate(reg.startDate)
    const end = parseDate(reg.endDate)
    if (!start) continue
    if (start > refDate) continue
    if (end && end < refDate) continue
    return reg
  }

  // 활성 등록 없음 → refDate에 가장 가까운 등록 반환
  let closest: T | null = null
  let closestDist = Infinity
  for (const reg of chain) {
    const start = parseDate(reg.startDate)
    const end = parseDate(reg.endDate)
    if (!start) continue
    // 미래 등록: start까지의 거리
    if (start > refDate) {
      const dist = start.getTime() - refDate.getTime()
      if (dist < closestDist) { closestDist = dist; closest = reg }
    }
    // 과거 등록: end(또는 start)부터의 거리
    if (end && end < refDate) {
      const dist = refDate.getTime() - end.getTime()
      if (dist < closestDist) { closestDist = dist; closest = reg }
    }
  }
  return closest || chain[0] || null
}
