import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import {
  extractCategoriesFromCourseTree,
  extractCourseTreeFromCourseConfigSet,
  normalizeCourseConfigSets,
} from "../courseConfigSets/utils"

const EFFECT_ALLOW = "allow"
const EFFECT_DENY = "deny"

function normalizeEffect(value) {
  if (value === EFFECT_ALLOW || value === EFFECT_DENY) return value
  return ""
}

function buildPermissionState(rows) {
  const map = {}
  for (const row of rows || []) {
    const key = String(row?.key || "").trim()
    const effect = normalizeEffect(row?.effect)
    if (!key || !effect) continue
    map[key] = effect
  }
  return map
}

function buildCategoryState(rows) {
  const map = {}
  for (const row of rows || []) {
    const setName = String(row?.courseConfigSetName || "").trim()
    const categoryKey = String(row?.categoryKey || "").trim()
    const effect = normalizeEffect(row?.effect)
    if (!setName || !categoryKey || !effect) continue
    if (!map[setName]) map[setName] = {}
    map[setName][categoryKey] = effect
  }
  return map
}

function toPermissionPayload(permissionState) {
  return Object.entries(permissionState || {})
    .filter(([, effect]) => effect === EFFECT_ALLOW || effect === EFFECT_DENY)
    .map(([key, effect]) => ({ key, effect }))
}

function toCategoryPayload(categoryState) {
  const out = []
  for (const [setName, categories] of Object.entries(categoryState || {})) {
    for (const [categoryKey, effect] of Object.entries(categories || {})) {
      if (effect !== EFFECT_ALLOW && effect !== EFFECT_DENY) continue
      out.push({ courseConfigSetName: setName, categoryKey, effect })
    }
  }
  return out
}

export function useUserPermissions(username) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [permissions, setPermissions] = useState([])
  const [permissionState, setPermissionState] = useState({})
  const [categoryState, setCategoryState] = useState({})
  const [courseConfigSets, setCourseConfigSets] = useState([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState("")

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((set) => set.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )
  const categories = useMemo(() => {
    const tree = extractCourseTreeFromCourseConfigSet(selectedCourseConfigSetObj)
    return extractCategoriesFromCourseTree(tree)
  }, [selectedCourseConfigSetObj])

  const loadPermissions = useCallback(async () => {
    try {
      const res = await apiClient.listPermissions()
      setPermissions(res?.permissions || [])
    } catch (err) {
      setPermissions([])
      setError(err?.message || "권한 목록을 불러오지 못했습니다.")
    }
  }, [])

  const loadCourseConfigSets = useCallback(async () => {
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = normalizeCourseConfigSets(raw).sort((a, b) =>
        b.name.localeCompare(a.name, "ko-KR")
      )
      setCourseConfigSets(list)
      if (!selectedCourseConfigSet && list.length) {
        setSelectedCourseConfigSet(list[0].name)
      }
    } catch (err) {
      setCourseConfigSets([])
    }
  }, [selectedCourseConfigSet])

  const loadUserPermissions = useCallback(async () => {
    if (!username) return
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.getUserPermissions(username)
      setPermissionState(buildPermissionState(res?.permissions))
      setCategoryState(buildCategoryState(res?.categoryAccess))
    } catch (err) {
      setPermissionState({})
      setCategoryState({})
      setError(err?.message || "사용자 권한을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    loadPermissions()
    loadCourseConfigSets()
  }, [loadCourseConfigSets, loadPermissions])

  useEffect(() => {
    loadUserPermissions()
  }, [loadUserPermissions])

  const savePermissions = useCallback(
    async (nextPermissionState, nextCategoryState) => {
      if (!username) return
      setSaving(true)
      setError("")
      try {
        await apiClient.updateUserPermissions(username, {
          permissions: toPermissionPayload(nextPermissionState),
          categoryAccess: toCategoryPayload(nextCategoryState),
        })
      } catch (err) {
        const message = err?.message || ""
        setError(message || "권한 저장에 실패했습니다.")
        if (message === "Recent authentication required.") {
          throw err
        }
      } finally {
        setSaving(false)
      }
    },
    [username]
  )

  const setPermissionEffect = useCallback(
    async (key, effect) => {
      const next = { ...permissionState }
      const normalized = normalizeEffect(effect)
      if (normalized) next[key] = normalized
      else delete next[key]
      setPermissionState(next)
      await savePermissions(next, categoryState)
    },
    [categoryState, permissionState, savePermissions]
  )

  const setPermissionEffects = useCallback(
    async (updates = {}) => {
      const next = { ...permissionState }
      for (const [key, effect] of Object.entries(updates)) {
        const normalized = normalizeEffect(effect)
        if (!key) continue
        if (normalized) next[key] = normalized
        else delete next[key]
      }
      setPermissionState(next)
      await savePermissions(next, categoryState)
    },
    [categoryState, permissionState, savePermissions]
  )

  const setCategoryEffect = useCallback(
    async (setName, categoryKey, effect) => {
      const normalized = normalizeEffect(effect)
      const next = { ...categoryState }
      const current = { ...(next[setName] || {}) }
      if (normalized) current[categoryKey] = normalized
      else delete current[categoryKey]
      next[setName] = current
      setCategoryState(next)
      await savePermissions(permissionState, next)
    },
    [categoryState, permissionState, savePermissions]
  )

  const setAllCategoriesEffect = useCallback(
    async (setName, nextEffect, categoryList) => {
      const normalized = normalizeEffect(nextEffect)
      const next = { ...categoryState }
      const current = { ...(next[setName] || {}) }
      for (const categoryKey of categoryList || []) {
        if (normalized) current[categoryKey] = normalized
        else delete current[categoryKey]
      }
      next[setName] = current
      setCategoryState(next)
      await savePermissions(permissionState, next)
    },
    [categoryState, permissionState, savePermissions]
  )

  return {
    loading,
    saving,
    error,
    permissions,
    permissionState,
    categoryState,
    courseConfigSets,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    categories,
    reload: loadUserPermissions,
    setPermissionEffect,
    setPermissionEffects,
    setCategoryEffect,
    setAllCategoriesEffect,
  }
}
