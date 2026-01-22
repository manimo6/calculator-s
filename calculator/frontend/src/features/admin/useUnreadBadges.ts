import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import {
  extractCategoriesFromCourseTree,
  normalizeCourseConfigSets,
  type CourseConfigSet,
} from "./courseConfigSets/utils"
import type { AuthUser } from "@/auth-routing"

type Notice = { id?: string; updatedAt?: string | Date }
type CourseNote = {
  id?: string
  author?: string
  updatedBy?: string
  updatedAt?: string | Date
  category?: string
}
type Settings = {
  notices?: { lastReadAt?: string }
  courseNotes?: { readAtById?: Record<string, string> }
}
type SettingsPatch = Record<string, unknown>

const normalizeDate = (value: unknown) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== "string" && typeof value !== "number") return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const mergeSettings = (base: Record<string, unknown>, patch: Record<string, unknown>) => {
  const next = { ...(base || {}) }
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = { ...(base?.[key] || {}), ...value }
    } else {
      next[key] = value
    }
  })
  return next
}

const mergeCourseNotes = (lists: CourseNote[][]) => {
  const map = new Map<string, CourseNote>()
  for (const list of lists || []) {
    for (const note of list || []) {
      if (!note?.id) continue
      const existing = map.get(note.id)
      if (!existing) {
        map.set(note.id, note)
        continue
      }
      const existingAt = normalizeDate(existing.updatedAt)
      const nextAt = normalizeDate(note.updatedAt)
      if (nextAt && (!existingAt || nextAt > existingAt)) {
        map.set(note.id, note)
      }
    }
  }
  return Array.from(map.values())
}

const buildAllowedCategoryMap = (configSets: CourseConfigSet[]) => {
  const map = new Map<string, Set<string>>()
  for (const set of configSets || []) {
    const name = String(set?.name || "").trim()
    if (!name) continue
    const courseTree = Array.isArray(set?.data?.courseTree) ? set.data?.courseTree : []
    const categories = extractCategoriesFromCourseTree(courseTree)
    map.set(
      name,
      new Set(categories.map((c) => String(c || "").trim()).filter(Boolean))
    )
  }
  return map
}

const filterNotesByAllowedCategories = (notes: CourseNote[], allowedSet?: Set<string>) => {
  if (!allowedSet || !(allowedSet instanceof Set)) return notes
  return (notes || []).filter((note) => {
    const category = String(note?.category || "").trim()
    if (!category) return true
    return allowedSet.has(category)
  })
}

const hasUnreadNotices = (notices: Notice[], readAt?: string) => {
  if (!Array.isArray(notices) || notices.length === 0) return false
  const latest = notices.reduce<Date | null>((max, notice) => {
    const updatedAt = normalizeDate(notice?.updatedAt)
    if (!updatedAt) return max
    if (!max || updatedAt > max) return updatedAt
    return max
  }, null)
  if (!latest) return false
  const read = normalizeDate(readAt)
  return !read || latest > read
}

const hasUnreadCourseNotes = (
  notes: CourseNote[],
  readMap: Record<string, string> | undefined,
  username: string
) => {
  if (!Array.isArray(notes) || notes.length === 0) return false
  return notes.some((note) => {
    if (!note?.id) return false
    const author = String(note.author || "").trim()
    const updatedBy = String(note.updatedBy || "").trim()
    if (username && (author === username || updatedBy === username)) {
      return false
    }
    const updatedAt = normalizeDate(note.updatedAt)
    if (!updatedAt) return false
    const readAt = normalizeDate(readMap?.[String(note.id)])
    return !readAt || updatedAt > readAt
  })
}

export function useUnreadBadges(options: { user?: AuthUser | null; enableNotices?: boolean; enableNotes?: boolean } = {}) {
  const { user, enableNotices = true, enableNotes = true } = options
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>({})
  const [noticeList, setNoticeList] = useState<Notice[]>([])
  const [noteList, setNoteList] = useState<CourseNote[]>([])
  const [unread, setUnread] = useState({ notices: false, notes: false })

  const username = typeof user?.username === "string" ? user.username : ""
  const noteReadMap = useMemo<Record<string, string>>(
    () => settings?.courseNotes?.readAtById || {},
    [settings]
  )

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    const res = await apiClient.getSettings()
    const current = (res?.settings || {}) as Record<string, unknown>
    const next = mergeSettings(current, patch)
    const saved = await apiClient.saveSettings(next)
    const savedSettings = (saved?.settings || next) as Settings
    setSettings(savedSettings)
    return savedSettings
  }, [])

  const recompute = useCallback(
    (nextSettings: Settings, notices: Notice[], notes: CourseNote[]) => {
      const noticeReadAt = nextSettings?.notices?.lastReadAt
      const nextUnread = {
        notices: enableNotices ? hasUnreadNotices(notices, noticeReadAt) : false,
        notes: enableNotes
          ? hasUnreadCourseNotes(notes, nextSettings?.courseNotes?.readAtById, username)
          : false,
      }
      setUnread(nextUnread)
    },
    [enableNotices, enableNotes, username]
  )

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread({ notices: false, notes: false })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const settingsRes = await apiClient.getSettings()
      const nextSettings = (settingsRes?.settings || {}) as Settings
      setSettings(nextSettings)

      const noticePromise = enableNotices
          ? apiClient.listNotices().then((res) => (res?.notices || []) as Notice[])
          : Promise.resolve([])

      const notesPromise = enableNotes
        ? apiClient.listCourseConfigSets()
            .then((res) => {
               const list = normalizeCourseConfigSets(res)
               const allowedMap = buildAllowedCategoryMap(list)
               const names = list
                 .map((item) => item?.name)
                 .filter((name): name is string => Boolean(name))
              if (names.length === 0) return []
              return Promise.all(
                names.map((name) =>
                   apiClient
                     .listCourseNotes({ courseConfigSetName: name })
                      .then((noteRes) => {
                        const allowedSet = allowedMap.get(name)
                        return filterNotesByAllowedCategories(
                          (noteRes?.results || []) as CourseNote[],
                          allowedSet
                        )
                      })
                    .catch(() => [])
                )
              ).then((all) => mergeCourseNotes(all))
            })
        : Promise.resolve([])

      const [notices, notes] = await Promise.all([noticePromise, notesPromise])
      setNoticeList(notices)
      setNoteList(notes)
      recompute(nextSettings, notices, notes)
    } catch (error) {
      setUnread({ notices: false, notes: false })
    } finally {
      setLoading(false)
    }
  }, [enableNotices, enableNotes, recompute, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markNoticesRead = useCallback(async () => {
    if (!user) return
    const now = new Date().toISOString()
    const nextSettings = await updateSettings({ notices: { lastReadAt: now } })
    recompute(nextSettings, noticeList, noteList)
  }, [noteList, noticeList, recompute, updateSettings, user])

  const markCourseNoteRead = useCallback(
    async (note: CourseNote) => {
      if (!user || !note?.id) return
      const now = new Date().toISOString()
    const nextMap = { ...(noteReadMap || {}), [String(note.id)]: now }
      const nextSettings = await updateSettings({
        courseNotes: { readAtById: nextMap },
      })
      recompute(nextSettings, noticeList, noteList)
    },
    [noteList, noteReadMap, noticeList, recompute, updateSettings, user]
  )

  return {
    loading,
    unread,
    refresh,
    markNoticesRead,
    markCourseNoteRead,
    courseNoteReadMap: noteReadMap,
  }
}
