import { useCallback, useEffect, useState } from "react"

import { apiClient } from "@/api-client"

export function useNotices() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notices, setNotices] = useState([])

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.listNotices()
      setNotices(res?.notices || [])
    } catch (e) {
      setNotices([])
      setError(e?.message || "공지사항을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const createNotice = useCallback(async (payload) => {
    await apiClient.createNotice(payload)
  }, [])

  const updateNotice = useCallback(async (id, payload) => {
    await apiClient.updateNotice(id, payload)
  }, [])

  const deleteNotice = useCallback(async (id) => {
    await apiClient.deleteNotice(id)
  }, [])

  return {
    loading,
    error,
    setError,
    notices,
    reload,
    createNotice,
    updateNotice,
    deleteNotice,
  }
}

