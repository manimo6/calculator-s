import { useMemo } from "react"

import type { TransferDisplayRegistrationRow } from "./transferDisplayTypes"

export function useRegistrationMap(baseRegistrations: TransferDisplayRegistrationRow[]) {
  return useMemo(() => {
    const map = new Map<string, TransferDisplayRegistrationRow>()
    for (const row of baseRegistrations || []) {
      if (row?.id != null) map.set(String(row.id), row)
    }
    return map
  }, [baseRegistrations])
}

export function useEnrichedRegistrations(
  registrations: TransferDisplayRegistrationRow[],
  registrationMap: Map<string, TransferDisplayRegistrationRow>
) {
  return useMemo(
    () =>
      registrations.map((row) => {
        const toReg = row?.transferToId ? registrationMap.get(String(row.transferToId)) : null
        const fromReg = row?.transferFromId ? registrationMap.get(String(row.transferFromId)) : null
        if (!toReg && !fromReg) return row
        return {
          ...row,
          ...(toReg ? { transferToCourseName: String(toReg.course || "") } : {}),
          ...(fromReg ? { transferFromCourseName: String(fromReg.course || "") } : {}),
        }
      }),
    [registrations, registrationMap]
  )
}

export function useCardRegistrations(enrichedRegistrations: TransferDisplayRegistrationRow[]) {
  return useMemo(
    () => enrichedRegistrations.filter((row) => !row?.isTransferredOut && !row?.transferToId),
    [enrichedRegistrations]
  )
}
