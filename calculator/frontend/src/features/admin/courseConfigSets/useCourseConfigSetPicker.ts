import { useEffect, useMemo, useState } from "react"

const STORAGE_RECENTS = "courseConfigSet.recents"
const STORAGE_FAVORITES = "courseConfigSet.favorites"
const STORAGE_ARCHIVED = "courseConfigSet.archived"

const getStorageKey = (key: string, scope?: string) => {
  const safeScope = String(scope || "").trim()
  return safeScope ? `${key}:${safeScope}` : key
}

const readStoredList = (key: string, scope?: string) => {
  if (typeof window === "undefined") return []
  try {
    const raw = JSON.parse(
      localStorage.getItem(getStorageKey(key, scope)) || "[]"
    )
    return Array.isArray(raw) ? raw.filter(Boolean) : []
  } catch {
    return []
  }
}

const writeStoredList = (key: string, scope: string | undefined, list: string[]) => {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(key, scope), JSON.stringify(list))
}

const isSameList = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const dedupeList = (list: string[] = []) => {
  const seen = new Set<string>()
  return list.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

export function useCourseConfigSetPicker({
  courseConfigSetList = [],
  selectedCourseConfigSet,
  storageScope,
  recentLimit = 5,
}: {
  courseConfigSetList?: string[]
  selectedCourseConfigSet?: string
  storageScope?: string
  recentLimit?: number
}) {
  const normalizedCourseConfigSetList = useMemo(
    () =>
      (Array.isArray(courseConfigSetList) ? courseConfigSetList : [])
        .map((name) => String(name || "").trim())
        .filter(Boolean),
    [courseConfigSetList]
  )

  const [open, setOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [archiveQuery, setArchiveQuery] = useState("")
  const [archiveSort, setArchiveSort] = useState<"recent" | "name-asc" | "name-desc">("recent")
  const [recentSets, setRecentSets] = useState<string[]>(() =>
    readStoredList(STORAGE_RECENTS, storageScope)
  )
  const [favoriteSets, setFavoriteSets] = useState<string[]>(() =>
    readStoredList(STORAGE_FAVORITES, storageScope)
  )
  const [archivedSets, setArchivedSets] = useState<string[]>(() =>
    readStoredList(STORAGE_ARCHIVED, storageScope)
  )

  useEffect(() => {
    const storedArchived = readStoredList(STORAGE_ARCHIVED, storageScope)
    const storedFavorites = readStoredList(STORAGE_FAVORITES, storageScope)
    const storedRecents = readStoredList(STORAGE_RECENTS, storageScope)
    const knownSet = new Set(normalizedCourseConfigSetList)
    const hasStored =
      storedArchived.length > 0 ||
      storedFavorites.length > 0 ||
      storedRecents.length > 0

    if (normalizedCourseConfigSetList.length === 0 && hasStored) {
      setArchivedSets(storedArchived)
      setFavoriteSets(storedFavorites)
      setRecentSets(storedRecents)
      return
    }

    const nextArchived = dedupeList(storedArchived).filter((name) =>
      knownSet.has(name)
    )
    const archivedSet = new Set(nextArchived)
    const nextFavorites = dedupeList(storedFavorites).filter(
      (name) => knownSet.has(name) && !archivedSet.has(name)
    )
    const nextRecents = dedupeList(storedRecents)
      .filter((name) => knownSet.has(name) && !archivedSet.has(name))
      .slice(0, recentLimit)

    if (!isSameList(nextArchived, storedArchived)) {
      writeStoredList(STORAGE_ARCHIVED, storageScope, nextArchived)
    }
    if (!isSameList(nextFavorites, storedFavorites)) {
      writeStoredList(STORAGE_FAVORITES, storageScope, nextFavorites)
    }
    if (!isSameList(nextRecents, storedRecents)) {
      writeStoredList(STORAGE_RECENTS, storageScope, nextRecents)
    }

    setArchivedSets(nextArchived)
    setFavoriteSets(nextFavorites)
    setRecentSets(nextRecents)
  }, [normalizedCourseConfigSetList, recentLimit, storageScope])

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  useEffect(() => {
    if (!archiveOpen) {
      setArchiveQuery("")
    }
  }, [archiveOpen])

  useEffect(() => {
    if (!selectedCourseConfigSet) return
    if (!normalizedCourseConfigSetList.includes(selectedCourseConfigSet)) return
    if (archivedSets.includes(selectedCourseConfigSet)) return

    const storedRecents = readStoredList(STORAGE_RECENTS, storageScope)
    const nextRecents = [
      selectedCourseConfigSet,
      ...storedRecents.filter((name) => name !== selectedCourseConfigSet),
    ].slice(0, recentLimit)

    writeStoredList(STORAGE_RECENTS, storageScope, nextRecents)
    setRecentSets(nextRecents)
  }, [
    archivedSets,
    normalizedCourseConfigSetList,
    recentLimit,
    selectedCourseConfigSet,
    storageScope,
  ])

  const archivedSet = useMemo(() => new Set(archivedSets), [archivedSets])
  const favoriteSet = useMemo(() => new Set(favoriteSets), [favoriteSets])
  const recentSet = useMemo(() => new Set(recentSets), [recentSets])

  const activeSets = useMemo(
    () => normalizedCourseConfigSetList.filter((name) => !archivedSet.has(name)),
    [archivedSet, normalizedCourseConfigSetList]
  )

  const visibleRecents = useMemo(
    () => recentSets.filter((name) => !archivedSet.has(name)),
    [archivedSet, recentSets]
  )

  const visibleFavorites = useMemo(
    () => favoriteSets.filter((name) => !archivedSet.has(name)),
    [archivedSet, favoriteSets]
  )

  const visibleAll = useMemo(
    () =>
      activeSets.filter(
        (name) => !favoriteSet.has(name) && !recentSet.has(name)
      ),
    [activeSets, favoriteSet, recentSet]
  )

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0
  const filteredSets = useMemo(() => {
    if (!isSearching) return []
    return activeSets.filter((name) =>
      name.toLowerCase().includes(normalizedQuery)
    )
  }, [activeSets, isSearching, normalizedQuery])

  const normalizedArchiveQuery = archiveQuery.trim().toLowerCase()
  const filteredArchivedSets = useMemo(() => {
    const baseList = normalizedArchiveQuery
      ? archivedSets.filter((name) =>
          name.toLowerCase().includes(normalizedArchiveQuery)
        )
      : [...archivedSets]

    if (archiveSort === "name-asc") {
      return [...baseList].sort((a, b) => a.localeCompare(b, "ko"))
    }
    if (archiveSort === "name-desc") {
      return [...baseList].sort((a, b) => b.localeCompare(a, "ko"))
    }
    return baseList
  }, [archiveQuery, archiveSort, archivedSets, normalizedArchiveQuery])

  const toggleFavorite = (name: string) => {
    if (archivedSet.has(name)) return
    const nextFavorites = favoriteSet.has(name)
      ? favoriteSets.filter((item) => item !== name)
      : [name, ...favoriteSets]
    const deduped = dedupeList(nextFavorites)
    writeStoredList(STORAGE_FAVORITES, storageScope, deduped)
    setFavoriteSets(deduped)
  }

  const toggleArchive = (name: string) => {
    const isArchived = archivedSet.has(name)
    const nextArchived = isArchived
      ? archivedSets.filter((item) => item !== name)
      : [name, ...archivedSets]
    const dedupedArchived = dedupeList(nextArchived)
    writeStoredList(STORAGE_ARCHIVED, storageScope, dedupedArchived)
    setArchivedSets(dedupedArchived)

    if (!isArchived) {
      const nextFavorites = favoriteSets.filter((item) => item !== name)
      const nextRecents = recentSets.filter((item) => item !== name)

      if (!isSameList(nextFavorites, favoriteSets)) {
        writeStoredList(STORAGE_FAVORITES, storageScope, nextFavorites)
        setFavoriteSets(nextFavorites)
      }
      if (!isSameList(nextRecents, recentSets)) {
        writeStoredList(STORAGE_RECENTS, storageScope, nextRecents)
        setRecentSets(nextRecents)
      }
    }
  }

  return {
    open,
    setOpen,
    archiveOpen,
    setArchiveOpen,
    query,
    setQuery,
    archiveQuery,
    setArchiveQuery,
    archiveSort,
    setArchiveSort,
    archivedSet,
    favoriteSet,
    visibleRecents,
    visibleFavorites,
    visibleAll,
    filteredSets,
    filteredArchivedSets,
    isSearching,
    archivedCount: archivedSets.length,
    toggleFavorite,
    toggleArchive,
  }
}
