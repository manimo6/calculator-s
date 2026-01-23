import { useCallback, useEffect, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import { getEndDate, getScheduleWeeks, normalizeBreakRanges } from "@/utils/calculatorLogic"
import { courseInfo as globalCourseInfo, courseTree as globalCourseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

import {
  buildCourseCategoryMap,
  extractCategoriesFromCourseTree,
  extractCourseTreeFromCourseConfigSet,
  extractCoursesFromCourseConfigSet,
  normalizeCourseConfigSets,
} from "../courseConfigSets/utils"
import { formatDateYmd, parseDate } from "./utils"

function isMergeKey(value: unknown) {
  return typeof value === "string" && value.startsWith("__merge__")
}

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

function normalizeCourse(value: unknown) {
  return String(value || "").trim()
}

function makeCourseFilterValue(courseId: unknown, courseName: unknown) {
  const id = normalizeCourse(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourse(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

function parseCourseFilterValue(value: unknown) {
  const raw = normalizeCourse(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id", value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name", value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name", value: raw }
}

function matchesCourseName(courseName: unknown, target: unknown) {
  const course = normalizeCourse(courseName)
  const base = normalizeCourse(target)
  if (!course || !base) return false
  return course === base || course.startsWith(base)
}

function normalizeCourseDays(days: Array<number | string> | null | undefined) {
  if (!Array.isArray(days)) return []
  return Array.from(
    new Set(
      days.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )
  ).sort((a, b) => a - b)
}

function resolveEndDay(info: CourseInfo | null | undefined) {
  const endDays = Array.isArray(info?.endDays) ? info.endDays : []
  if (endDays.length && Number.isInteger(endDays[0])) return endDays[0]
  const endDay = info?.endDay
  if (Number.isInteger(endDay)) return endDay
  return 5
}

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSet = {
  name?: string
  data?: {
    courseTree?: CourseTreeGroup[]
    courseInfo?: CourseInfoRecord
    timeTable?: unknown
  } | null
}

type RegistrationRow = {
  id?: string | number
  courseId?: string | number
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: string | number
  skipWeeks?: Array<number | string>
  withdrawnAt?: string | Date
  transferAt?: string | Date
  transferToId?: string | number
  transferFromId?: string | number
} & Record<string, unknown>

type MergeWeekRange = { start: number; end: number }
type MergeEntry = {
  id?: string | number
  name?: string
  courses?: string[]
  weekRanges?: MergeWeekRange[]
} & Record<string, unknown>
type ExtensionRow = { registrationId?: string | number } & Record<string, unknown>

function resolveCourseInfo(
  courseId: unknown,
  courseName: unknown,
  courseConfigSet: CourseConfigSet | null
) {
  const id = normalizeCourse(courseId)
  const name = normalizeCourse(courseName)
  if (!id && !name) return null

  const configData = courseConfigSet?.data
  const configInfo = configData?.courseInfo || {}
  if (id && configInfo[id]) return configInfo[id]

  const sources: Array<{ tree: CourseTreeGroup[]; info: CourseInfoRecord }> = [
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

    const infoValues = Object.values(source.info || {})
    for (const info of infoValues) {
      const infoRecord = info && typeof info === "object" ? (info as CourseInfo) : null
      const label = infoRecord?.name
      if (!label || !name) continue
      if (!name.startsWith(label) || label.length < bestLen) continue
      best = infoRecord
      bestLen = label.length
    }
  }

  return best
}

function isTimeVariantEntry(entry: unknown) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false
  const record = entry as Record<string, unknown>
  const isOnOff =
    record.type === "onoff" ||
    Object.prototype.hasOwnProperty.call(record, "온라인") ||
    Object.prototype.hasOwnProperty.call(record, "오프라인") ||
    Object.prototype.hasOwnProperty.call(record, "online") ||
    Object.prototype.hasOwnProperty.call(record, "offline")
  const isDynamic =
    record.type === "dynamic" ||
    (!record.type && !isOnOff && Object.keys(record).length > 0)
  return isOnOff || isDynamic
}

function normalizeCourseConfigSetName(value: unknown) {
  return String(value || "").trim()
}

function normalizeWeekRanges(ranges: unknown) {
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

function parseWeekNumber(value: unknown) {
  const num = Number(value)
  return Number.isInteger(num) ? num : NaN
}

function addDays(value: string | number | Date | null | undefined, days: number) {
  const date = parseDate(value)
  if (!date) return null
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isPermissionDeniedError(error: unknown) {
  const message = String((error as { message?: string })?.message || "").toLowerCase()
  return (
    message.includes("permission denied") ||
    message.includes("forbidden") ||
    message.includes("http 403") ||
    message.includes("권한")
  )
}

type UseRegistrationsOptions = {
  loadMerges?: boolean
  loadExtensions?: boolean
  enableVariants?: boolean
}

export function useRegistrations(options: UseRegistrationsOptions = {}) {
  const {
    loadMerges: shouldLoadMerges = true,
    loadExtensions: shouldLoadExtensions = true,
    enableVariants = false,
  } = options
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true)
  const [courseConfigSetError, setCourseConfigSetError] = useState("")
  const [courseConfigSets, setCourseConfigSets] = useState<CourseConfigSet[]>([])
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
    const set = new Set<string>()
    const data = selectedCourseConfigSetObj?.data || {}
    const timeTable =
      data.timeTable && typeof data.timeTable === "object"
        ? (data.timeTable as Record<string, unknown>)
        : {}
    const courseInfo =
      data.courseInfo && typeof data.courseInfo === "object"
        ? (data.courseInfo as Record<string, CourseInfo | undefined>)
        : {}
    const labelToKey = new Map<string, string>()

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
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [merges, setMerges] = useState<MergeEntry[]>([])
  const [extensions, setExtensions] = useState<ExtensionRow[]>([])
  const [extensionsLoading, setExtensionsLoading] = useState(false)
  const [extensionsError, setExtensionsError] = useState("")

  const [categoryFilter, setCategoryFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [search, setSearch] = useState("")
  const [variantFilter, setVariantFilter] = useState("")

  const [mergeManagerOpen, setMergeManagerOpen] = useState(false)
  const [mergeName, setMergeName] = useState("")
  const [mergeCourses, setMergeCourses] = useState<string[]>([])
  const [mergeWeekMode, setMergeWeekMode] = useState<"all" | "range">("all")
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
      let breakWeeks: number[] = []

      if (startDate && Number.isFinite(weeksValue) && weeksValue > 0) {
        const scheduleInput: Parameters<typeof getScheduleWeeks>[0] = {
          startDate,
          durationWeeks: weeksValue,
          skipWeeks,
          courseDays,
          endDayOfWeek: endDay,
          breakRanges,
        }
        const scheduleMeta = getScheduleWeeks(scheduleInput)
        breakWeeks = Array.from(scheduleMeta.breakWeekSet || [])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
          .sort((a, b) => a - b)
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
      const list = (normalizeCourseConfigSets(raw) as CourseConfigSet[]).sort(
        (a, b) => {
          const aName = a?.name ?? ""
          const bName = b?.name ?? ""
          return bName.localeCompare(aName, "ko-KR")
        }
      )
      setCourseConfigSets(list)
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "설정 세트를 불러오지 못했습니다."
      setCourseConfigSetError(message)
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
      const list = (Array.isArray(res?.merges) ? res.merges : []).map((merge: MergeEntry) => ({
        ...merge,
        weekRanges: normalizeWeekRanges(merge?.weekRanges),
      }))
      setMerges(list)
    } catch (e: unknown) {
      if (isPermissionDeniedError(e)) {
        setMerges([])
        return
      }
      setMerges([])
      const message =
        e instanceof Error ? e.message : "합반 목록을 불러오지 못했습니다."
      setError(message)
    }
  }, [setError, shouldLoadMerges])

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
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "등록현황을 불러오지 못했습니다."
      setError(message)
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }, [selectedCourseConfigSet])

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
      const message =
        e instanceof Error ? e.message : "연장 기록을 불러오지 못했습니다."
      setExtensionsError(message)
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
    const ids = (resolvedRegistrations || [])
      .map((r) => r?.id)
      .filter((id): id is string | number => id !== undefined && id !== null && id !== "")
    loadExtensions(ids)
  }, [loadExtensions, resolvedRegistrations, selectedCourseConfigSet, shouldLoadExtensions])

  const mapCourseToCategory = useMemo(() => {
    const bases = courseConfigSetBaseCourses
      .slice()
      .sort((a, b) => b.length - a.length)

    return (courseLabel: string) => {
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

    return (value: string) => {
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

    return (registration: RegistrationRow) => {
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

  type CourseOption = { value: string; label: string }

  const courseOptions = useMemo<CourseOption[]>(() => {
    if (!selectedCourseConfigSet) return []
    const out = new Map<string, CourseOption>()

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
      return getCategoryForCourseValue(course.value) === categoryFilter
    })
  }, [categoryFilter, courseOptions, getCategoryForCourseValue])

  const preVariantRegistrations = useMemo(() => {
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

  const variantTabs = useMemo(() => {
    if (!enableVariants) return []
    const map = new Map()
    for (const registration of preVariantRegistrations || []) {
      const courseName = normalizeCourse(registration?.course)
      if (!courseName) continue
      const entry = map.get(courseName)
      if (entry) {
        entry.count += 1
        continue
      }
      map.set(courseName, { key: courseName, label: courseName, count: 1 })
    }

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ko-KR")
    )
  }, [enableVariants, preVariantRegistrations])

  useEffect(() => {
    if (!enableVariants) {
      if (variantFilter) setVariantFilter("")
      return
    }
    if (!variantTabs.length) {
      if (variantFilter) setVariantFilter("")
      return
    }
    if (!variantFilter || !variantTabs.some((tab) => tab.key === variantFilter)) {
      setVariantFilter(variantTabs[0].key)
    }
  }, [enableVariants, variantFilter, variantTabs])

  const baseRegistrations = useMemo(() => {
    if (!enableVariants) return preVariantRegistrations
    const fallbackVariant = variantTabs[0]?.key || ""
    const activeVariant = normalizeCourse(variantFilter || fallbackVariant)
    if (!activeVariant) return []
    return (preVariantRegistrations || []).filter(
      (registration) => normalizeCourse(registration?.course) === activeVariant
    )
  }, [enableVariants, preVariantRegistrations, variantFilter, variantTabs])

  const filteredRegistrations = useMemo(() => {
    if (!courseFilter) return baseRegistrations
    let list = baseRegistrations.slice()

    if (isMergeKey(courseFilter)) {
      const id = courseFilter.replace("__merge__", "")
      const mg = merges.find((m) => String(m.id) === String(id))
      const mergeCourses = Array.isArray(mg?.courses) ? mg.courses : []
      if (mergeCourses.length) {
        list = list.filter((r) =>
          mergeCourses.some((course) => matchesCourseName(r.course, course))
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

  const persistMerges = useCallback(async (next: MergeEntry[]) => {
    try {
      const res = await apiClient.saveMerges(next)
      setMerges(res?.merges || next)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "합반 저장에 실패했습니다."
      setError(message)
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
    let weekRanges: MergeWeekRange[] = []
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
    async (id: string) => {
      const next = merges.filter((m) => String(m.id) !== String(id))
      await persistMerges(next)
    },
    [merges, persistMerges]
  )

  type MergeOption = {
    value: string
    label: string
    courses: string[]
    weekRanges: MergeWeekRange[]
  }

  const mergeOptions = useMemo<MergeOption[]>(() => {
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

  const selectCourseConfigSet = useCallback((courseConfigSetName: string) => {
    setSelectedCourseConfigSet(courseConfigSetName)
    setCategoryFilter("")
    setCourseFilter("")
    setSearch("")
    setVariantFilter("")
  }, [])

  const changeCategoryFilter = useCallback((nextCategory: string) => {
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
    courseVariantRequiredSet,
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
    variantTabs,
    variantFilter,
    setVariantFilter,
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
