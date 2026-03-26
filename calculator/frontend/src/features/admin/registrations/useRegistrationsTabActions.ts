import { useCallback } from "react"

import { apiClient } from "@/api-client"

import { useNote } from "./useNote"
import type { CourseConfigSet, RegistrationRow } from "./registrationsTypes"
import { useTransfer } from "./useTransfer"
import { useWithdraw } from "./useWithdraw"

type UseRegistrationsTabActionsParams = {
  courseOptions: Array<string | { value?: string; label?: string }>
  registrations: RegistrationRow[]
  selectedCourseConfigSetObj: CourseConfigSet | null
  selectedCourseConfigSet: string
  loadRegistrations: () => Promise<void>
  loadExtensions: (ids: Array<string | number>) => Promise<void>
  baseRegistrations: RegistrationRow[]
  setError: (message: string) => void
  resolveCourseDays: (courseName: string) => number[]
}

export function useRegistrationsTabActions({
  courseOptions,
  registrations,
  selectedCourseConfigSetObj,
  selectedCourseConfigSet,
  loadRegistrations,
  loadExtensions,
  baseRegistrations,
  setError,
  resolveCourseDays,
}: UseRegistrationsTabActionsParams) {
  const note = useNote({ onSuccess: loadRegistrations })

  const transfer = useTransfer({
    courseOptions,
    registrations,
    selectedCourseConfigSetObj,
    selectedCourseConfigSet,
    onTransferSuccess: loadRegistrations,
    setError,
    resolveCourseDays,
  })

  const withdraw = useWithdraw({
    onSuccess: loadRegistrations,
    setError,
  })

  const handleCreateExtension = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await apiClient.createRegistrationExtension(payload)
        await loadRegistrations()
        const ids = (baseRegistrations || [])
          .map((registration) => registration?.id)
          .filter((id): id is string | number => id !== undefined && id !== null && id !== "")
        if (ids.length) {
          await loadExtensions(ids)
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "\uC5F0\uC7A5 \uC218\uAC15 \uB0B4\uC5ED\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
        setError(message)
        throw err
      }
    },
    [baseRegistrations, loadExtensions, loadRegistrations, setError]
  )

  return {
    note,
    transfer,
    withdraw,
    handleCreateExtension,
  }
}
