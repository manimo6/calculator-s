import { useCallback, useEffect, useState } from "react"

import { apiClient } from "@/api-client"

export function useUsers() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [users, setUsers] = useState([])

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.listUsers()
      setUsers(res?.users || [])
    } catch (e) {
      setUsers([])
      setError(e?.message || "계정 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const createUser = useCallback(async (payload) => {
    await apiClient.createUser(payload)
  }, [])

  const updateUser = useCallback(async (username, payload) => {
    await apiClient.updateUser(username, payload)
  }, [])

  const deleteUser = useCallback(async (username) => {
    await apiClient.deleteUser(username)
  }, [])

  return {
    loading,
    error,
    setError,
    users,
    reload,
    createUser,
    updateUser,
    deleteUser,
  }
}

