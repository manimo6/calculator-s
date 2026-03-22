import { useMemo } from "react"
import { getFullChain, findActiveInChain } from "../registrations/transferChain"

type ChainLookupRow = {
  id?: string | number
  transferFromId?: string | number
  transferToId?: string | number
  startDate?: string | number | Date | null
  endDate?: string | number | Date | null
} & Record<string, unknown>

/**
 * 전반 체인에서 오늘 기준 활성 등록만 남기는 훅.
 * - 체인에 속하지 않는 단독 등록은 그대로 통과
 * - 같은 체인의 등록은 한 번만 처리하며, 오늘 기준 활성인 것만 반환
 * - 활성 등록에 _prevChainRegs로 이전 체인 등록 정보를 첨부 (이전 출석 표시용)
 */
export function useActiveChainRegistrations<T extends ChainLookupRow>(
  targetRegistrations: T[],
  allRegistrations: ChainLookupRow[]
) {
  return useMemo(() => {
    if (!targetRegistrations?.length) return [] as T[]

    const regMap = new Map<string, ChainLookupRow>()
    for (const r of allRegistrations || []) {
      if (r?.id != null) regMap.set(String(r.id), r)
    }

    if (!regMap.size) return targetRegistrations

    const today = new Date()
    const processedChainIds = new Set<string>()
    const result: T[] = []

    for (const r of targetRegistrations) {
      const rid = r?.id != null ? String(r.id) : ""
      if (!rid || processedChainIds.has(rid)) continue

      // 체인에 속하지 않는 단독 등록
      if (!r.transferFromId && !r.transferToId) {
        result.push(r)
        continue
      }

      // 체인 전체를 한 번에 처리
      const chain = getFullChain(r, regMap)
      for (const c of chain) {
        if (c?.id != null) processedChainIds.add(String(c.id))
      }

      // 오늘 기준 활성 등록이 target 목록에 있으면 추가
      const active = findActiveInChain(chain, today)
      if (!active) continue

      const activeId = String(active.id)
      const activeInTarget = targetRegistrations.find(
        (t) => t?.id != null && String(t.id) === activeId
      )
      if (!activeInTarget) continue

      // 이전 체인 등록 수집 (활성 등록 제외)
      const prevRegs = chain.filter((c) => c?.id != null && String(c.id) !== activeId)
      if (prevRegs.length) {
        result.push({ ...activeInTarget, _prevChainRegs: prevRegs })
      } else {
        result.push(activeInTarget)
      }
    }

    return result
  }, [targetRegistrations, allRegistrations])
}
