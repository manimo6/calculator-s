import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { io } from "socket.io-client"
import type { PointerEvent as ReactPointerEvent } from "react"

import { apiClient } from "@/api-client"
import { getToken } from "@/auth-store"

import type {
  AttendanceBoardProps,
  AttendanceCellMap,
  AttendanceStatusKey,
} from "./attendanceBoardModel"
import {
  applyAttendanceSocketUpdates,
  buildAttendanceCellMap,
  collectAttendanceRegistrationIds,
  updateAttendanceCellStatus,
} from "./attendanceBoardState"

const API_URL = import.meta.env.VITE_API_URL || ""

export function useAttendanceBoardState({
  month,
  registrations,
  paintStatus,
}: {
  month: Date
  registrations: AttendanceBoardProps["registrations"]
  paintStatus: AttendanceStatusKey
}) {
  const [cellStatuses, setCellStatuses] = useState<AttendanceCellMap>({})
  const paintingRef = useRef(false)
  const paintStatusRef = useRef(paintStatus)

  useEffect(() => {
    paintStatusRef.current = paintStatus
  }, [paintStatus])

  useEffect(() => {
    const handlePointerUp = () => {
      paintingRef.current = false
    }

    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [])

  const registrationIds = useMemo(
    () => collectAttendanceRegistrationIds(registrations || []),
    [registrations]
  )
  const registrationIdSet = useMemo(() => new Set(registrationIds), [registrationIds])
  const monthKey = useMemo(() => format(month, "yyyy-MM"), [month])

  const loadAttendance = useCallback(async () => {
    if (!registrationIds.length) {
      setCellStatuses({})
      return
    }

    try {
      const res = await apiClient.listAttendance({
        month: format(month, "yyyy-MM"),
        registrationIds,
      })
      const results = Array.isArray(res?.results) ? res.results : []
      setCellStatuses(buildAttendanceCellMap(results))
    } catch (error) {
      console.error("Failed to load attendance records:", error)
    }
  }, [month, registrationIds])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  useEffect(() => {
    const token = getToken()
    const socket = io(API_URL || undefined, {
      withCredentials: true,
      auth: token ? { token } : undefined,
    })

    const handleUpdate = (payload: {
      updates?: Array<{ registrationId?: string; date?: string; status?: string }>
    }) => {
      setCellStatuses((prev) =>
        applyAttendanceSocketUpdates(prev, payload?.updates || [], registrationIdSet, monthKey)
      )
    }

    socket.on("attendance:update", handleUpdate)

    return () => {
      socket.off("attendance:update", handleUpdate)
      socket.disconnect()
    }
  }, [monthKey, registrationIdSet])

  const persistAttendance = useCallback(
    async (registrationId: string, dateKey: string, status: string) => {
      if (!registrationId) return
      try {
        await apiClient.saveAttendance({
          registrationId,
          date: dateKey,
          status,
        })
      } catch (error) {
        console.error("Failed to save attendance:", error)
      }
    },
    []
  )

  const handlePaintStart = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      rowKey: string,
      dateKey: string,
      registrationId: string
    ) => {
      if (event.button !== 0) return
      event.preventDefault()
      paintingRef.current = true
      const nextStatus = paintStatusRef.current
      setCellStatuses((prev) => updateAttendanceCellStatus(prev, rowKey, dateKey, nextStatus))
      persistAttendance(registrationId, dateKey, nextStatus)
    },
    [persistAttendance]
  )

  const handlePaintEnter = useCallback(
    (rowKey: string, dateKey: string, registrationId: string) => {
      if (!paintingRef.current) return
      const nextStatus = paintStatusRef.current
      setCellStatuses((prev) => updateAttendanceCellStatus(prev, rowKey, dateKey, nextStatus))
      persistAttendance(registrationId, dateKey, nextStatus)
    },
    [persistAttendance]
  )

  return {
    cellStatuses,
    handlePaintStart,
    handlePaintEnter,
  }
}
