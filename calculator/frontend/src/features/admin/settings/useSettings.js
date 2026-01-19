import { useCallback, useEffect, useState } from "react"

import { apiClient } from "@/api-client"

const SETTINGS_UPDATED_KEY = "settings.updatedAt"

const notifySettingsUpdated = () => {
  if (typeof window === "undefined") return
  const updatedAt = String(Date.now())
  try {
    localStorage.setItem(SETTINGS_UPDATED_KEY, updatedAt)
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(
    new CustomEvent("settings:updated", { detail: { updatedAt } })
  )
}

export function useSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [settings, setSettings] = useState({})
  const [minMonth, setMinMonth] = useState("")
  const [maxMonth, setMaxMonth] = useState("")

  const syncFromSettings = useCallback((next) => {
    const nextSettings = next || {}
    const calendarRange = nextSettings?.calendarRange || {}
    setSettings(nextSettings)
    setMinMonth(calendarRange.minMonth || "")
    setMaxMonth(calendarRange.maxMonth || "")
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    setMessage("")
    try {
      const res = await apiClient.getSettings()
      syncFromSettings(res?.settings || {})
    } catch (e) {
      setError(e?.message || "설정을 불러오지 못했습니다.")
      syncFromSettings({})
    } finally {
      setLoading(false)
    }
  }, [syncFromSettings])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const nextSettings = {
        ...(settings || {}),
        calendarRange: {
          minMonth: (minMonth || "").trim(),
          maxMonth: (maxMonth || "").trim(),
        },
      }

      const res = await apiClient.saveSettings(nextSettings)
      syncFromSettings(res?.settings || nextSettings)
      setMessage("설정이 저장되었습니다.")
      notifySettingsUpdated()
    } catch (e) {
      setError(e?.message || "저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }, [maxMonth, minMonth, settings, syncFromSettings])

  return {
    loading,
    saving,
    error,
    message,
    settings,
    minMonth,
    maxMonth,
    setMinMonth,
    setMaxMonth,
    load,
    save,
  }
}

