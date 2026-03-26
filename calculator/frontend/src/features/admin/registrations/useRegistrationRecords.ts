import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"

import {
  isPermissionDeniedError,
  resolveRegistrationRows,
} from "./registrationsSelectors"
import type {
  CourseConfigSet,
  ExtensionRow,
  MergeEntry,
  RegistrationRow,
} from "./registrationsTypes"

const REGISTRATIONS_LOAD_ERROR =
  "\uB4F1\uB85D \uD604\uD669\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
const EXTENSIONS_LOAD_ERROR =
  "\uC5F0\uC7A5 \uAE30\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."

export function useRegistrationRecords({
  selectedCourseConfigSet,
  selectedCourseConfigSetObj,
  shouldLoadExtensions,
  setError,
  setActiveMergesFromApi,
}: {
  selectedCourseConfigSet: string
  selectedCourseConfigSetObj: CourseConfigSet | null
  shouldLoadExtensions: boolean
  setError: (value: string) => void
  setActiveMergesFromApi: (entries: MergeEntry[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [extensions, setExtensions] = useState<ExtensionRow[]>([])
  const [extensionsLoading, setExtensionsLoading] = useState(false)
  const [extensionsError, setExtensionsError] = useState("")

  const resolvedRegistrations = useMemo(
    () => resolveRegistrationRows(registrations, selectedCourseConfigSetObj),
    [registrations, selectedCourseConfigSetObj]
  )

  const loadRegistrations = useCallback(async () => {
    if (!selectedCourseConfigSet) return
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.listRegistrations()
      const results = Array.isArray(res?.results)
        ? (res.results as RegistrationRow[])
        : []
      setRegistrations(results)
      if (Array.isArray(res?.activeMerges)) {
        setActiveMergesFromApi(res.activeMerges as MergeEntry[])
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : REGISTRATIONS_LOAD_ERROR
      setError(message)
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }, [selectedCourseConfigSet, setActiveMergesFromApi])

  const loadExtensions = useCallback(async (registrationIds: Array<string | number>) => {
    const ids = Array.isArray(registrationIds)
      ? registrationIds.map((id) => String(id || "").trim()).filter(Boolean)
      : []
    if (!ids.length) {
      setExtensions([])
      return
    }
    setExtensionsLoading(true)
    setExtensionsError("")
    try {
      const res = await apiClient.listRegistrationExtensions({ registrationIds: ids })
      const results = Array.isArray(res?.results)
        ? (res.results as ExtensionRow[])
        : []
      setExtensions(results)
    } catch (e: unknown) {
      if (isPermissionDeniedError(e)) {
        setExtensions([])
        return
      }
      const message = e instanceof Error ? e.message : EXTENSIONS_LOAD_ERROR
      setExtensionsError(message)
      setExtensions([])
    } finally {
      setExtensionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedCourseConfigSet || !shouldLoadExtensions) return
    const ids = resolvedRegistrations
      .map((registration) => registration?.id)
      .filter((id): id is string | number => id !== undefined && id !== null && id !== "")
    loadExtensions(ids)
  }, [loadExtensions, resolvedRegistrations, selectedCourseConfigSet, shouldLoadExtensions])

  return {
    loading,
    registrations: resolvedRegistrations,
    extensions,
    extensionsLoading,
    extensionsError,
    loadRegistrations,
    loadExtensions,
  }
}
