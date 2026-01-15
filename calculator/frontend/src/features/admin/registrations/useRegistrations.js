import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import { getEndDate, getScheduleWeeks, normalizeBreakRanges } from "@/utils/calculatorLogic"
import { courseInfo as globalCourseInfo, courseTree as globalCourseTree } from "@/utils/data"

import {
  buildCourseCategoryMap,
  extractCategoriesFromCourseTree,
  extractCourseTreeFromCourseConfigSet,
  extractCoursesFromCourseConfigSet,
  normalizeCourseConfigSets,
} from "../courseConfigSets/utils"
import { formatDateYmd, parseDate } from "./utils"

function isMergeKey(value) {
  return typeof value === "string" && value.startsWith("__merge__")
}

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

function normalizeCourse(value) {
  return String(value || "").trim()
}

function makeCourseFilterValue(courseId, courseName) {
  const id = normalizeCourse(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourse(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

function parseCourseFilterValue(value) {
  const raw = normalizeCourse(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id", value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name", value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name", value: raw }
}

function matchesCourseName(courseName, target) {
  const course = normalizeCourse(courseName)
  const base = normalizeCourse(target)
  if (!course || !base) return false
  return course === base || course.startsWith(base)
}

function normalizeCourseDays(days) {
  if (!Array.isArray(days)) return []
  return Array.from(
    new Set(
      days.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )
  ).sort((a, b) => a - b)
}

function resolveEndDay(info) {
  const endDays = Array.isArray(info?.endDays) ? info.endDays : []
  if (endDays.length && Number.isInteger(endDays[0])) return endDays[0]
  if (Number.isInteger(info?.endDay)) return info.endDay
  return 5
}

function resolveCourseInfo(courseId, courseName, courseConfigSet) {
  const id = normalizeCourse(courseId)
  const name = normalizeCourse(courseName)
  if (!id && !name) return null

  const configData = courseConfigSet?.data
  const configInfo = configData?.courseInfo || {}
  if (id && configInfo[id]) return configInfo[id]

  const sources = [
    {
      tree: Array.isArray(configData?.courseTree) ? configData.courseTree : [],
      info: configInfo,
    },
    { tree: globalCourseTree || [], info: globalCourseInfo || {} },
  ]

  let best = null
  let bestLen = 0

  for (const source of sources) {
    for (const group of source.tree || []) {
      for (const item of group.items || []) {
        const label = item?.label
        if (!label || !name) continue
        if (!name.startsWith(label) || label.length < bestLen) continue
        const info = source.info?.[item.val]
        if (info) {
          best = info
          bestLen = label.length
        }
      }
    }

    for (const info of Object.values(source.info || {})) {
      const label = info?.name
      if (!label || !name) continue
      if (!name.startsWith(label) || label.length < bestLen) continue
      best = info
      bestLen = label.length
    }
  }

  return best
}

function isTimeVariantEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false
  const isOnOff =
    entry.type === "onoff" ||
    Object.prototype.hasOwnProperty.call(entry, "온라인") ||
    Object.prototype.hasOwnProperty.call(entry, "오프라인") ||
    Object.prototype.hasOwnProperty.call(entry, "online") ||
    Object.prototype.hasOwnProperty.call(entry, "offline")
  const isDynamic =
    entry.type === "dynamic" ||
    (!entry.type && !isOnOff && Object.keys(entry).length > 0)
  return isOnOff || isDynamic
}

function normalizeCourseConfigSetName(value) {
  return String(value || "").trim()
}

function normalizeWeekRanges(ranges) {
  if (!Array.isArray(ranges)) return []
  return ranges
    .map((range) => ({
      start: Number(range?.start),
      end: Number(range?.end),
    }))
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 1 &&
        range.end >= range.start
    )
    .sort((a, b) => a.start - b.start || a.end - b.end)
}

function parseWeekNumber(value) {
  const num = Number(value)
  return Number.isInteger(num) ? num : NaN
}

function addDays(value, days) {
  const date = parseDate(value)
  if (!date) return null
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isPermissionDeniedError(error) {
  const message = String(error?.message || "").toLowerCase()
  return (
    message.includes("permission denied") ||
    message.includes("forbidden") ||
    message.includes("http 403") ||
    message.includes("권한")
  )
}

export function useRegistrations(options = {}) {
  const { loadMerges: shouldLoadMerges = true, loadExtensions: shouldLoadExtensions = true } =
    options
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true)
  const [courseConfigSetError, setCourseConfigSetError] = useState("")
  const [courseConfigSets, setCourseConfigSets] = useState([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState("")

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )
  const courseConfigSetTree = useMemo(
    () => extractCourseTreeFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetIdMap = useMemo(() => {
    const idToLabel = new Map()
    const idToCategory = new Map()
    for (const group of courseConfigSetTree || []) {
      const category = group?.cat
      for (const item of group.items || []) {
        if (!item?.val) continue
        const id = String(item.val)
        idToLabel.set(id, item.label || id)
        if (category) idToCategory.set(id, category)
      }
    }
    return { idToLabel, idToCategory }
  }, [courseConfigSetTree])
  const courseConfigSetIdToLabel = courseConfigSetIdMap.idToLabel
  const courseConfigSetIdToCategory = courseConfigSetIdMap.idToCategory
  const courseConfigSetCourseIdSet = useMemo(
    () => new Set(courseConfigSetIdToLabel.keys()),
    [courseConfigSetIdToLabel]
  )
  const courseConfigSetBaseCourses = useMemo(
    () => extractCoursesFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetCourseSet = useMemo(
    () => new Set(courseConfigSetBaseCourses),
    [courseConfigSetBaseCourses]
  )
  const courseCatMap = useMemo(
    () => buildCourseCategoryMap(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseConfigSetCategories = useMemo(
    () => extractCategoriesFromCourseTree(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseVariantRequiredSet = useMemo(() => {
    const set = new Set()
    const data = selectedCourseConfigSetObj?.data || {}
    const timeTable = data.timeTable && typeof data.timeTable === "object" ? data.timeTable : {}
    const courseInfo = data.courseInfo && typeof data.courseInfo === "object" ? data.courseInfo : {}
    const labelToKey = new Map()

    for (const group of courseConfigSetTree || []) {
      for (const item of group.items || []) {
        if (item?.label) labelToKey.set(String(item.label), item.val)
      }
    }

    for (const label of courseConfigSetBaseCourses) {
      const key = labelToKey.get(label)
      const info = key ? courseInfo[key] : null
      const requiresInfoVariant = Boolean(info?.dynamicTime || info?.dynamicOptions)
      const tableEntry =
        timeTable[label] ?? (key ? timeTable[key] : null)
      const requiresTableVariant = isTimeVariantEntry(tableEntry)
      if (requiresInfoVariant || requiresTableVariant) set.add(label)
    }

    return set
  }, [courseConfigSetBaseCourses, courseConfigSetTree, selectedCourseConfigSetObj])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registrations, setRegistrations] = useState([])
  const [merges, setMerges] = useState([])
  const [extensions, setExtensions] = useState([])
  const [extensionsLoading, setExtensionsLoading] = useState(false)
  const [extensionsError, setExtensionsError] = useState("")

  const [categoryFilter, setCategoryFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [search, setSearch] = useState("")

  const [mergeManagerOpen, setMergeManagerOpen] = useState(false)
  const [mergeName, setMergeName] = useState("")
  const [mergeCourses, setMergeCourses] = useState([])
  const [mergeWeekMode, setMergeWeekMode] = useState("all")
  const [mergeWeekStart, setMergeWeekStart] = useState("")
  const [mergeWeekEnd, setMergeWeekEnd] = useState("")

  const resolvedRegistrations = useMemo(() => {
    if (!Array.isArray(registrations) || registrations.length === 0) return []
    return registrations.map((registration) => {
      const info = resolveCourseInfo(
        registration?.courseId,
        registration?.course,
        selectedCourseConfigSetObj
      )
      if (!info) return registration

      const courseDays = normalizeCourseDays(info?.days)
      const endDay = resolveEndDay(info)
      const normalizedBreaks = normalizeBreakRanges(info?.breakRanges)
      const breakRanges = normalizedBreaks.map(({ startDate, endDate }) => ({
        startDate,
        endDate,
      }))

      const startDate = registration?.startDate
      const weeksValue = Number(registration?.weeks || 0)
      const skipWeeks = Array.isArray(registration?.skipWeeks)
        ? registration.skipWeeks
        : []

      let computedEndDate = registration?.endDate || ""
      let breakWeeks = []

      if (startDate && Number.isFinite(weeksValue) && weeksValue > 0) {
        const scheduleMeta = getScheduleWeeks({
          startDate,
          durationWeeks: weeksValue,
          skipWeeks,
          courseDays,
          endDayOfWeek: endDay,
          breakRanges,
        })
        breakWeeks = Array.from(scheduleMeta.breakWeekSet || []).sort((a, b) => a - b)
        if (scheduleMeta.scheduleWeeks) {
          const endDate = getEndDate(startDate, scheduleMeta.scheduleWeeks, endDay)
          const formatted = formatDateYmd(endDate)
          if (formatted) computedEndDate = formatted
        }
      }

      const withdrawnDate = parseDate(registration?.withdrawnAt)
      const transferAt = parseDate(registration?.transferAt)
      const isTransferredOut = Boolean(registration?.transferToId)
      const isTransferredIn = Boolean(registration?.transferFromId)
      let effectiveEndDate = computedEndDate || registration?.endDate || ""

      if (isTransferredOut && transferAt) {
        const transferEnd = addDays(transferAt, -1)
        const formatted = transferEnd ? formatDateYmd(transferEnd) : ""
        if (formatted) effectiveEndDate = formatted
      }

      if (withdrawnDate) {
        const endCandidate = parseDate(effectiveEndDate)
        if (!endCandidate || withdrawnDate.getTime() <= endCandidate.getTime()) {
          effectiveEndDate = formatDateYmd(withdrawnDate)
        }
      }

      return {
        ...registration,
        endDate: effectiveEndDate || registration?.endDate || "",
        withdrawnAt: withdrawnDate ? formatDateYmd(withdrawnDate) : "",
        transferAt: transferAt ? formatDateYmd(transferAt) : "",
        isWithdrawn: Boolean(withdrawnDate),
        isTransferredOut,
        isTransferredIn,
        courseDays,
        courseEndDay: endDay,
        breakRanges,
        breakWeeks,
      }
    })
  }, [registrations, selectedCourseConfigSetObj])

  const loadCourseConfigSets = useCallback(async () => {
    setCourseConfigSetLoading(true)
    setCourseConfigSetError("")
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = normalizeCourseConfigSets(raw).sort((a, b) =>
        b.name.localeCompare(a.name, "ko-KR")
      )
      setCourseConfigSets(list)
    } catch (e) {
      setCourseConfigSetError(e?.message || "설정 세트를 불러오지 못했습니다.")
      setCourseConfigSets([])
    } finally {
      setCourseConfigSetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourseConfigSets()
  }, [loadCourseConfigSets])

  const loadMerges = useCallback(async () => {
    if (!shouldLoadMerges) return
    try {
      const res = await apiClient.listMerges()
      const list = (res?.merges || []).map((merge) => ({
        ...merge,
        weekRanges: normalizeWeekRanges(merge?.weekRanges),
      }))
      setMerges(list)
    } catch (e) {
      if (isPermissionDeniedError(e)) {
        setMerges([])
        return
      }
      setMerges([])
      setError(e?.message || "합반 목록을 불러오지 못했습니다.")
    }
  }, [setError, shouldLoadMerges])

  const loadRegistrations = useCallback(async () => {
    if (!selectedCourseConfigSet) return
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.listRegistrations()
      setRegistrations(res?.results || [])
    } catch (e) {
      setError(e?.message || "등록현황을 불러오지 못했습니다.")
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }, [selectedCourseConfigSet])

  const loadExtensions = useCallback(async (registrationIds) => {
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
      setExtensions(res?.results || [])
    } catch (e) {
      if (isPermissionDeniedError(e)) {
        setExtensions([])
        return
      }
      setExtensionsError(e?.message || "연장 기록을 불러오지 못했습니다.")
      setExtensions([])
    } finally {
      setExtensionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedCourseConfigSet) return
    if (shouldLoadMerges) {
      loadMerges()
    }
    loadRegistrations()
  }, [selectedCourseConfigSet, loadMerges, loadRegistrations, shouldLoadMerges])

  useEffect(() => {
    if (!selectedCourseConfigSet || !shouldLoadExtensions) return
    const ids = (resolvedRegistrations || []).map((r) => r?.id).filter(Boolean)
    loadExtensions(ids)
  }, [loadExtensions, resolvedRegistrations, selectedCourseConfigSet, shouldLoadExtensions])

  const mapCourseToCategory = useMemo(() => {
    const bases = courseConfigSetBaseCourses
      .slice()
      .sort((a, b) => b.length - a.length)

    return (courseLabel) => {
      const label = normalizeCourse(courseLabel)
      if (!label) return ""
      if (courseCatMap.has(label)) return courseCatMap.get(label)
      for (const base of bases) {
        if (label.startsWith(base)) return courseCatMap.get(base) || ""
      }
      return ""
    }
  }, [courseCatMap, courseConfigSetBaseCourses])

  const getCategoryForCourseValue = useMemo(() => {
    const bases = courseConfigSetBaseCourses
      .slice()
      .sort((a, b) => b.length - a.length)

    return (value) => {
      const parsed = parseCourseFilterValue(value)
      if (!parsed.value) return ""
      if (parsed.type === "id") {
        return courseConfigSetIdToCategory.get(parsed.value) || ""
      }
      const label = normalizeCourse(parsed.value)
      if (!label) return ""
      if (courseCatMap.has(label)) return courseCatMap.get(label)
      for (const base of bases) {
        if (label.startsWith(base)) return courseCatMap.get(base) || ""
      }
      return ""
    }
  }, [courseCatMap, courseConfigSetBaseCourses, courseConfigSetIdToCategory])

  const getCategoryForRegistration = useMemo(() => {
    const bases = courseConfigSetBaseCourses
      .slice()
      .sort((a, b) => b.length - a.length)

    return (registration) => {
      const courseId = normalizeCourse(registration?.courseId)
      if (courseId) {
        return courseConfigSetIdToCategory.get(courseId) || ""
      }
      const label = normalizeCourse(registration?.course)
      if (!label) return ""
      if (courseCatMap.has(label)) return courseCatMap.get(label)
      for (const base of bases) {
        if (label.startsWith(base)) return courseCatMap.get(base) || ""
      }
      return ""
    }
  }, [courseCatMap, courseConfigSetBaseCourses, courseConfigSetIdToCategory])

  const dataCourseSet = useMemo(
    () =>
      new Set(
        (resolvedRegistrations || [])
          .map((r) => normalizeCourse(r.course))
          .filter(Boolean)
      ),
    [resolvedRegistrations]
  )

  const dataCourseIdSet = useMemo(
    () =>
      new Set(
        (resolvedRegistrations || [])
          .map((r) => normalizeCourse(r.courseId))
          .filter(Boolean)
      ),
    [resolvedRegistrations]
  )

  const courseOptions = useMemo(() => {
    if (!selectedCourseConfigSet) return []
    const out = new Map()

    for (const r of resolvedRegistrations || []) {
      const courseId = normalizeCourse(r?.courseId)
      const courseName = normalizeCourse(r?.course)
      if (courseId) {
        if (courseConfigSetCourseIdSet.size && !courseConfigSetCourseIdSet.has(courseId)) {
          continue
        }
        const value = makeCourseFilterValue(courseId, courseName)
        const label = courseConfigSetIdToLabel.get(courseId) || courseName || courseId
        if (value && !out.has(value)) out.set(value, { value, label })
        continue
      }

      if (!courseName) continue
      let allowed = false
      for (const base of courseConfigSetBaseCourses) {
        if (courseName.startsWith(base)) {
          allowed = true
          break
        }
      }
      if (!allowed) continue
      const value = makeCourseFilterValue("", courseName)
      if (value && !out.has(value)) out.set(value, { value, label: courseName })
    }

    for (const group of courseConfigSetTree || []) {
      for (const item of group.items || []) {
        const label = normalizeCourse(item?.label)
        const id = normalizeCourse(item?.val)
        if (!label || !id) continue
        if (courseVariantRequiredSet.has(label)) {
          const hasData = dataCourseIdSet.has(id) || dataCourseSet.has(label)
          if (!hasData) continue
        }
        const value = makeCourseFilterValue(id, label)
        if (!out.has(value)) out.set(value, { value, label })
      }
    }

    return Array.from(out.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ko-KR")
    )
  }, [
    courseConfigSetBaseCourses,
    courseConfigSetCourseIdSet,
    courseConfigSetIdToLabel,
    courseConfigSetTree,
    courseVariantRequiredSet,
    dataCourseIdSet,
    dataCourseSet,
    resolvedRegistrations,
    selectedCourseConfigSet,
  ])

  const courseOptionsForFilter = useMemo(() => {
    if (!categoryFilter) return courseOptions
    return courseOptions.filter((course) => {
      const value = typeof course === "string" ? course : course.value
      return getCategoryForCourseValue(value) === categoryFilter
    })
  }, [categoryFilter, courseOptions, getCategoryForCourseValue])

  const baseRegistrations = useMemo(() => {
    if (!selectedCourseConfigSet) return []
    if (courseConfigSetCourseSet.size === 0 && courseConfigSetCourseIdSet.size === 0) return []

    const allowedLabels = courseConfigSetCourseSet.size ? courseConfigSetCourseSet : null
    const allowedIds = courseConfigSetCourseIdSet.size ? courseConfigSetCourseIdSet : null
    const selectedConfigName = normalizeCourseConfigSetName(
      selectedCourseConfigSet
    )
    let list = (resolvedRegistrations || []).slice()

    if (selectedConfigName) {
      list = list.filter(
        (r) =>
          normalizeCourseConfigSetName(r?.courseConfigSetName) ===
          selectedConfigName
      )
    }

    // ????? ????????????????????(???????????????????????
    if ((allowedLabels && allowedLabels.size) || (allowedIds && allowedIds.size)) {
      list = list.filter((r) => {
        const courseId = normalizeCourse(r?.courseId)
        if (courseId && allowedIds && allowedIds.has(courseId)) return true

        const courseName = normalizeCourse(r?.course)
        if (allowedLabels && allowedLabels.has(courseName)) return true
        if (allowedLabels) {
          for (const base of allowedLabels) {
            if (courseName && courseName.startsWith(base)) return true
          }
        }
        return false
      })
    }

    if (categoryFilter) {
      list = list.filter((r) => getCategoryForRegistration(r) === categoryFilter)
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter((r) => String(r.name || "").toLowerCase().includes(s))
    }

    return list
  }, [
    categoryFilter,
    courseConfigSetCourseIdSet,
    courseConfigSetCourseSet,
    getCategoryForRegistration,
    resolvedRegistrations,
    search,
    selectedCourseConfigSet,
  ])

  const filteredRegistrations = useMemo(() => {
    if (!courseFilter) return baseRegistrations
    let list = baseRegistrations.slice()

    if (isMergeKey(courseFilter)) {
      const id = courseFilter.replace("__merge__", "")
      const mg = merges.find((m) => String(m.id) === String(id))
      if (mg?.courses?.length) {
        list = list.filter((r) =>
          mg.courses.some((course) => matchesCourseName(r.course, course))
        )
      } else {
        list = []
      }
    } else {
      const parsed = parseCourseFilterValue(courseFilter)
      if (parsed.type === "id" && parsed.value) {
        list = list.filter(
          (r) => normalizeCourse(r?.courseId) === parsed.value
        )
      } else if (parsed.value) {
        const name = normalizeCourse(parsed.value)
        list = list.filter((r) => normalizeCourse(r?.course) === name)
      } else {
        list = []
      }
    }

    return list
  }, [baseRegistrations, courseFilter, merges])

  const persistMerges = useCallback(async (next) => {
    try {
      const res = await apiClient.saveMerges(next)
      setMerges(res?.merges || next)
    } catch (e) {
      setError(e?.message || "합반 저장에 실패했습니다.")
      setMerges(next)
    }
  }, [setError])

  const addMerge = useCallback(async () => {
    const name = (mergeName || "").trim()
    const selected = (mergeCourses || []).filter(Boolean)
    if (selected.length < 2) {
      setError("병합할 과목을 2개 이상 선택해야 합니다.")
      return
    }
    let weekRanges = []
    if (mergeWeekMode === "range") {
      const start = parseWeekNumber(mergeWeekStart)
      const end = parseWeekNumber(mergeWeekEnd)
      if (!Number.isInteger(start) || start < 1) {
        setError("적용 주차(시작)를 1 이상의 숫자로 입력하세요.")
        return
      }
      if (!Number.isInteger(end) || end < start) {
        setError("적용 주차(종료)를 시작 주차 이상으로 입력하세요.")
        return
      }
      weekRanges = normalizeWeekRanges([{ start, end }])
    }

    const id = Date.now().toString()
    const next = [
      ...merges,
      { id, name, courses: Array.from(new Set(selected)), weekRanges },
    ]
    setMergeName("")
    setMergeCourses([])
    setMergeWeekMode("all")
    setMergeWeekStart("")
    setMergeWeekEnd("")
    await persistMerges(next)
  }, [
    mergeCourses,
    mergeName,
    mergeWeekEnd,
    mergeWeekMode,
    mergeWeekStart,
    merges,
    persistMerges,
    setError,
  ])

  const deleteMerge = useCallback(
    async (id) => {
      const next = merges.filter((m) => String(m.id) !== String(id))
      await persistMerges(next)
    },
    [merges, persistMerges]
  )

  const mergeOptions = useMemo(() => {
    return (merges || []).map((m) => {
      const courses = Array.isArray(m.courses) ? m.courses.filter(Boolean) : []
      return {
        value: `__merge__${m.id}`,
        label: `[합반] ${m.name || courses.join(" + ")}`,
        courses,
        weekRanges: normalizeWeekRanges(m.weekRanges),
      }
    })
  }, [merges])

  const mergeOptionsForFilter = useMemo(() => {
    if (!categoryFilter) return mergeOptions
    return mergeOptions.filter((m) =>
      (m.courses || []).some(
        (course) => mapCourseToCategory(String(course)) === categoryFilter
      )
    )
  }, [categoryFilter, mapCourseToCategory, mergeOptions])

  const selectCourseConfigSet = useCallback((courseConfigSetName) => {
    setSelectedCourseConfigSet(courseConfigSetName)
    setCategoryFilter("")
    setCourseFilter("")
    setSearch("")
  }, [])

  const changeCategoryFilter = useCallback((nextCategory) => {
    setCategoryFilter(nextCategory)
    setCourseFilter("")
  }, [])

  return {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    courseConfigSetCourseSet,
    courseConfigSetCourseIdSet,
    courseConfigSetIdToLabel,
    courseConfigSetBaseCourses,
    courseOptions,
    loadCourseConfigSets,

    loading,
    error,
    setError,
    registrations: resolvedRegistrations,
    extensions,
    extensionsLoading,
    extensionsError,
    baseRegistrations,
    filteredRegistrations,
    loadRegistrations,
    loadExtensions,

    merges,
    mergeOptions,
    mergeOptionsForFilter,
    mergeManagerOpen,
    setMergeManagerOpen,
    mergeName,
    setMergeName,
    mergeCourses,
    setMergeCourses,
    mergeWeekMode,
    setMergeWeekMode,
    mergeWeekStart,
    setMergeWeekStart,
    mergeWeekEnd,
    setMergeWeekEnd,
    addMerge,
    deleteMerge,

    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,

    courseOptionsForFilter,
  }
}
