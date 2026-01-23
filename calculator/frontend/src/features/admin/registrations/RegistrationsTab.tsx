import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient } from "@/api-client"
import { Calendar } from "@/components/ui/calendar"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import { PERMISSION_KEYS, hasPermission } from "@/permissions"

import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { AuthUser } from "@/auth-routing"

import FiltersCard from "./FiltersCard"
import CourseOverview from "./CourseOverview"
import MergeManagerCard from "./MergeManagerCard"
import InstallmentBoard from "./InstallmentBoard"
import RegistrationCardGrid from "./RegistrationCardGrid"
import RegistrationsGantt from "./RegistrationsGantt"
import SummaryCards from "./SummaryCards"
import { useRegistrations } from "./useRegistrations"
import { formatDateYmd, formatTimestampKo, parseDate } from "./utils"

function isValidDow(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSet = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  courseConfigSetName?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  withdrawnAt?: string | Date
  transferToId?: string | number
  transferFromId?: string | number
  transferAt?: string | Date
  note?: string
  noteUpdatedAt?: string | number | Date
  timestamp?: string | number | Date
} & Record<string, unknown>

type TransferOption = { value: string; label: string }
type TransferGroup = { label: string; items: TransferOption[] }
type WeekRange = { start: number; end: number }
type GanttGroup = {
  key: string
  label: string
  registrations: RegistrationRow[]
  courseDays: number[]
  count: number
  mergeWeekRanges?: WeekRange[]
}

function getCourseDaysByName(courseName: string, courseConfigSet: CourseConfigSet | null) {
  const name = String(courseName || "").trim()
  if (!name) return []

  const configData = courseConfigSet?.data
  const sources: Array<{ tree: CourseTreeGroup[]; info: CourseInfoRecord }> = [
    {
      tree: Array.isArray(configData?.courseTree) ? configData.courseTree : [],
      info: configData?.courseInfo || {},
    },
    { tree: courseTree || [], info: courseInfo || {} },
  ]

  let bestDays = null
  let bestLen = 0

  for (const source of sources) {
    for (const group of source.tree || []) {
      for (const item of group.items || []) {
        const label = item?.label
        if (!label) continue
        if (!name.startsWith(label) || label.length < bestLen) continue

        const info = source.info?.[item.val]
        if (Array.isArray(info?.days)) {
          bestDays = info.days.filter(isValidDow)
          bestLen = label.length
        }
      }
    }

    const infoValues = Object.values(source.info || {})
    for (const info of infoValues) {
      const infoRecord = info && typeof info === "object" ? (info as CourseInfo) : null
      const label = infoRecord?.name
      if (!label) continue
      if (!name.startsWith(label) || label.length < bestLen) continue

      if (Array.isArray(infoRecord?.days)) {
        bestDays = infoRecord.days.filter(isValidDow)
        bestLen = label.length
      }
    }
  }

  return bestDays || []
}

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

function normalizeCourseValue(value: unknown) {
  return String(value || "").trim()
}

function makeCourseValue(courseId: unknown, courseName: unknown) {
  const id = normalizeCourseValue(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourseValue(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

function parseCourseValue(value: unknown) {
  const raw = normalizeCourseValue(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id", value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name", value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name", value: raw }
}

export default function RegistrationsTab({ user }: { user: AuthUser | null }) {
  const canAccessRegistrations = hasPermission(user, PERMISSION_KEYS.tabs.registrations)
  const canManageMerges =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.mergeManager)
  const canViewInstallments =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.installments)
  const canManageTransfers =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.transfers)

  const {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    courseConfigSetCourseSet,
    courseConfigSetBaseCourses,
    courseConfigSetIdToLabel,
    courseVariantRequiredSet,
    courseOptions,
    loadCourseConfigSets,

    loading,
    error,
    setError,
    registrations,
    filteredRegistrations,
    baseRegistrations,
    variantTabs,
    variantFilter,
    setVariantFilter,
    loadRegistrations,
    extensions,
    extensionsLoading,
    extensionsError,
    loadExtensions,

    merges,
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
  } = useRegistrations({
    loadMerges: canAccessRegistrations,
    loadExtensions: canViewInstallments,
    enableVariants: false,
  })

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )

  const [activeGanttTab, setActiveGanttTab] = useState("")
  const [activeMainTab, setActiveMainTab] = useState("dashboard")
  const [installmentMode, setInstallmentMode] = useState(false)
  const ganttTabsScrollRef = useRef<HTMLDivElement | null>(null)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState<RegistrationRow | null>(null)
  const [withdrawDate, setWithdrawDate] = useState("")
  const [withdrawPickerOpen, setWithdrawPickerOpen] = useState(false)
  const [withdrawError, setWithdrawError] = useState("")
  const [withdrawSaving, setWithdrawSaving] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<RegistrationRow | null>(null)
  const [transferDate, setTransferDate] = useState("")
  const [transferPickerOpen, setTransferPickerOpen] = useState(false)
  const [transferCourseValue, setTransferCourseValue] = useState("")
  const [transferWeeks, setTransferWeeks] = useState("")
  const [transferError, setTransferError] = useState("")
  const [transferSaving, setTransferSaving] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<RegistrationRow | null>(null)
  const [noteValue, setNoteValue] = useState("")
  const [noteError, setNoteError] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const [chartOverlayOpen, setChartOverlayOpen] = useState(false)

  const mergeCourseOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    const selectedConfig = String(selectedCourseConfigSet || "").trim()
    for (const registration of registrations || []) {
      if (selectedConfig) {
        const configName = String(registration?.courseConfigSetName || "").trim()
        if (configName !== selectedConfig) continue
      }
      const courseName = String(registration?.course || "").trim()
      if (!courseName || seen.has(courseName)) continue
      seen.add(courseName)
      list.push(courseName)
    }
    for (const course of mergeCourses || []) {
      const courseName = String(course || "").trim()
      if (!courseName || seen.has(courseName)) continue
      seen.add(courseName)
      list.push(courseName)
    }
    return list.sort((a, b) => a.localeCompare(b, "ko-KR"))
  }, [mergeCourses, registrations, selectedCourseConfigSet])

  const mergeCourseTabs = useMemo(() => {
    const list: string[] = []
    const seen = new Set<string>()
    for (const base of courseConfigSetBaseCourses || []) {
      const label = String(base || "").trim()
      if (!label || seen.has(label)) continue
      const hasMatch = mergeCourseOptions.some((course) =>
        String(course || "").startsWith(label)
      )
      if (!hasMatch) continue
      seen.add(label)
      list.push(label)
    }
    return list
  }, [courseConfigSetBaseCourses, mergeCourseOptions])

  const transferCourseLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const course of courseOptions || []) {
      const value = typeof course === "string" ? course : course?.value
      const label = typeof course === "string" ? course : course?.label
      if (!value || !label) continue
      map.set(String(value), String(label))
    }
    return map
  }, [courseOptions])

  const transferCourseOptions = useMemo(() => {
    const list: TransferOption[] = []
    const seen = new Set<string>()

    for (const course of courseOptions || []) {
      const value = typeof course === "string" ? course : course?.value
      const label = typeof course === "string" ? course : course?.label
      const key = String(value || "").trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      list.push({ value: key, label: String(label || value || "").trim() })
    }

    return list
  }, [courseOptions])

  const transferCourseGroups = useMemo<TransferGroup[]>(() => {
    if (!transferCourseOptions.length) return []
    const tree = Array.isArray(selectedCourseConfigSetObj?.data?.courseTree)
      ? selectedCourseConfigSetObj.data.courseTree
      : []
    const idToCategory = new Map<string, string>()
    const labelToCategory: Array<{ label: string; category: string }> = []
    const categoryOrder: string[] = []

    for (const group of tree) {
      const category = normalizeCourseValue(group?.cat)
      if (category && !categoryOrder.includes(category)) {
        categoryOrder.push(category)
      }
      for (const item of group.items || []) {
        const id = normalizeCourseValue(item?.val)
        if (id) idToCategory.set(id, category)
        const label = normalizeCourseValue(item?.label)
        if (label) labelToCategory.push({ label, category })
      }
    }

    labelToCategory.sort((a, b) => b.label.length - a.label.length)

    const groupMap = new Map<string, TransferOption[]>()
    const addToGroup = (category: string, option: TransferOption) => {
      const key = category || "기타"
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)?.push(option)
    }

    for (const option of transferCourseOptions) {
      const parsed = parseCourseValue(option.value)
      let category = ""
      if (parsed.type === "id") {
        category = idToCategory.get(parsed.value) || ""
      }
      if (!category) {
        const name = String(option.label || parsed.value || "").trim()
        if (name) {
          for (const entry of labelToCategory) {
            if (name.startsWith(entry.label)) {
              category = entry.category
              break
            }
          }
        }
      }
      addToGroup(category, option)
    }

    const sortByLabel = (a: TransferOption, b: TransferOption) =>
      a.label.localeCompare(b.label, "ko-KR")
    const ordered: TransferGroup[] = []

    for (const category of categoryOrder) {
      const items = groupMap.get(category)
      if (!items || !items.length) continue
      items.sort(sortByLabel)
      ordered.push({ label: category, items })
      groupMap.delete(category)
    }

    const restKeys = Array.from(groupMap.keys()).sort((a, b) => {
      if (a === "기타") return 1
      if (b === "기타") return -1
      return a.localeCompare(b, "ko-KR")
    })

    for (const category of restKeys) {
      const items = groupMap.get(category)
      if (!items || !items.length) continue
      items.sort(sortByLabel)
      ordered.push({ label: category, items })
    }

    return ordered
  }, [selectedCourseConfigSetObj, transferCourseOptions])

  const resolveCourseDays = useCallback(
    (courseName?: string) =>
      getCourseDaysByName(courseName || "", selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )

  const handleCreateExtension = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await apiClient.createRegistrationExtension(payload)
        await loadRegistrations()
        const ids = (baseRegistrations || [])
          .map((r) => r?.id)
          .filter((id): id is string | number => id !== undefined && id !== null && id !== "")
        if (ids.length) {
          await loadExtensions(ids)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "연장 저장에 실패했습니다."
        setError(message)
        throw err
      }
    },
    [baseRegistrations, loadExtensions, loadRegistrations, setError]
  )

  const openWithdrawDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    const today = formatDateYmd(new Date())
    const defaultDate = formatDateYmd(registration?.withdrawnAt) || today
    setWithdrawTarget(registration)
    setWithdrawDate(defaultDate || today)
    setWithdrawError("")
    setWithdrawDialogOpen(true)
  }, [])

  const openTransferDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    const today = formatDateYmd(new Date())
    const targetValue = makeCourseValue(
      registration?.courseId,
      registration?.course
    )
    const hasTargetValue =
      !!targetValue && transferCourseLabelMap.has(targetValue)
    setTransferTarget(registration)
    setTransferDate(today)
    setTransferCourseValue(hasTargetValue ? targetValue : "")
    setTransferWeeks(registration?.weeks ? String(registration.weeks) : "")
    setTransferError("")
    setTransferDialogOpen(true)
  }, [transferCourseLabelMap])

  const openNoteDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    setNoteTarget(registration)
    setNoteValue(String(registration?.note || ""))
    setNoteError("")
    setNoteDialogOpen(true)
  }, [])

  const noteUpdatedAtLabel = noteTarget?.noteUpdatedAt
    ? formatTimestampKo(noteTarget.noteUpdatedAt)
    : ""

  const handleWithdrawSave = useCallback(async () => {
    if (!withdrawTarget) return
    if (!withdrawDate) {
      setWithdrawError("퇴원일을 선택해 주세요.")
      return
    }

    setWithdrawSaving(true)
    setWithdrawError("")
    const withdrawId = withdrawTarget?.id
    if (!withdrawId) {
      setWithdrawError("대상을 확인해 주세요.")
      return
    }
    try {
      await apiClient.updateRegistrationWithdrawal(String(withdrawId), withdrawDate)
      await loadRegistrations()
      setWithdrawDialogOpen(false)
      setWithdrawTarget(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "퇴원 처리에 실패했습니다."
      setWithdrawError(message)
    } finally {
      setWithdrawSaving(false)
    }
  }, [loadRegistrations, withdrawDate, withdrawTarget])

  const handleTransferSave = useCallback(async () => {
    if (!transferTarget) return
    if (!transferDate) {
      setTransferError("전반일을 선택해 주세요.")
      return
    }

    if (!transferCourseValue) {
      setTransferError("전반 과목을 선택해 주세요.")
      return
    }

    const start = parseDate(transferTarget?.startDate)
    const transferDay = parseDate(transferDate)
    if (start && transferDay && transferDay.getTime() <= start.getTime()) {
      setTransferError("전반일은 시작일 이후로만 가능합니다.")
      return
    }

    let weeksValue
    if (transferWeeks) {
      const parsedWeeks = Number(transferWeeks)
      if (!Number.isInteger(parsedWeeks) || parsedWeeks <= 0) {
        setTransferError("기간(주)은 1 이상의 숫자로 입력해 주세요.")
        return
      }
      weeksValue = parsedWeeks
    }

    const parsedCourse = parseCourseValue(transferCourseValue)
    const courseLabel = transferCourseLabelMap.get(String(transferCourseValue))
    if (!courseLabel) {
      setTransferError("전반 과목을 선택해 주세요.")
      return
    }

    setTransferSaving(true)
    setTransferError("")
    const transferId = transferTarget?.id
    if (!transferId) {
      setTransferError("대상을 확인해 주세요.")
      return
    }
    try {
      await apiClient.transferRegistration(String(transferId), {
        transferDate,
        course: courseLabel,
        courseId: parsedCourse.type === "id" ? parsedCourse.value : "",
        courseConfigSetName:
          transferTarget?.courseConfigSetName || selectedCourseConfigSet,
        ...(weeksValue ? { weeks: weeksValue } : {}),
      })
      await loadRegistrations()
      setTransferDialogOpen(false)
      setTransferTarget(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "전반 처리에 실패했습니다."
      setTransferError(message)
    } finally {
      setTransferSaving(false)
    }
  }, [
    loadRegistrations,
    selectedCourseConfigSet,
    transferCourseLabelMap,
    transferCourseValue,
    transferDate,
    transferTarget,
    transferWeeks,
  ])

  const handleRestore = useCallback(async (registration: RegistrationRow) => {
    if (!registration?.id) return
    const name = registration?.name || "학생"
    if (!window.confirm(`${name}의 퇴원 상태를 복구할까요?`)) return

    try {
      await apiClient.updateRegistrationWithdrawal(String(registration.id), null)
      await loadRegistrations()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "복구 처리에 실패했습니다."
      setError(message)
    }
  }, [loadRegistrations, setError])

  const handleNoteSave = useCallback(async () => {
    if (!noteTarget?.id) return
    setNoteSaving(true)
    setNoteError("")
    const noteId = noteTarget?.id
    if (!noteId) {
      setNoteError("대상을 확인해 주세요.")
      return
    }
    try {
      await apiClient.updateRegistrationNote(String(noteId), noteValue)
      await loadRegistrations()
      setNoteDialogOpen(false)
      setNoteTarget(null)
      setNoteValue("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "메모 저장에 실패했습니다."
      setNoteError(message)
    } finally {
      setNoteSaving(false)
    }
  }, [loadRegistrations, noteTarget, noteValue])

  const handleTransferCancel = useCallback(
    async (registration: RegistrationRow) => {
      if (!registration?.id) return
      const name = registration?.name || "학생"
      if (!window.confirm(`${name}의 전반을 취소할까요?`)) return

      try {
        await apiClient.cancelTransferRegistration(String(registration.id))
        await loadRegistrations()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "전반 취소에 실패했습니다."
        setError(message)
      }
    },
    [loadRegistrations, setError]
  )

  const handleGanttTabsWheel = useCallback((event: WheelEvent) => {
    const container = ganttTabsScrollRef.current
    if (!container || container.scrollWidth <= container.clientWidth) return
    const target = event.target instanceof Node ? event.target : null
    if (!target || !container.contains(target)) return

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (!delta) return

    event.preventDefault()
    container.scrollLeft += delta
  }, [])

  useEffect(() => {
    if (activeMainTab !== "gantt") return undefined
    const handler = (event: WheelEvent) => handleGanttTabsWheel(event)
    window.addEventListener("wheel", handler, { passive: false })
    return () => {
      window.removeEventListener("wheel", handler)
    }
  }, [activeMainTab, handleGanttTabsWheel])

  useEffect(() => {
    if (!canManageMerges && mergeManagerOpen) {
      setMergeManagerOpen(false)
    }
  }, [canManageMerges, mergeManagerOpen])

  useEffect(() => {
    if (!canViewInstallments && installmentMode) {
      setInstallmentMode(false)
    }
  }, [canViewInstallments, installmentMode])

  const chartFilteredRegistrations = useMemo(
    () =>
      (filteredRegistrations || []).filter(
        (r) => !r?.isTransferredOut && !r?.transferToId
      ),
    [filteredRegistrations]
  )
  const chartBaseRegistrations = useMemo(
    () =>
      (baseRegistrations || []).filter(
        (r) => !r?.isTransferredOut && !r?.transferToId
      ),
    [baseRegistrations]
  )

  const ganttGroups = useMemo<GanttGroup[]>(() => {
    if (!selectedCourseConfigSet) return []
    const isMergeFilter = Boolean(courseFilter) && courseFilter.startsWith("__merge__")
    const sourceList = isMergeFilter
      ? chartFilteredRegistrations || []
      : courseFilter
        ? chartFilteredRegistrations || []
        : chartBaseRegistrations || []

    if (!sourceList.length) return []

    const normalizeCourse = (value: unknown) => String(value || "").trim()
    const matchesCourse = (courseName: unknown, target: unknown) => {
      const course = normalizeCourse(courseName)
      const base = normalizeCourse(target)
      if (!course || !base) return false
      return course === base || course.startsWith(base)
    }
    const collectCourseDays = (courseNames: string[]) => {
      const daySet = new Set<number>()
      for (const name of courseNames) {
        for (const d of getCourseDaysByName(name, selectedCourseConfigSetObj)) {
          const dayValue = Number(d)
          if (Number.isInteger(dayValue)) {
            daySet.add(dayValue)
          }
        }
      }
      return Array.from(daySet).sort((a, b) => a - b)
    }

    if (isMergeFilter) {
      const id = courseFilter.replace("__merge__", "")
      const merge = (merges || []).find((m) => String(m.id) === String(id))
      const courseNames = Array.from(
        new Set(
          Array.isArray(merge?.courses)
            ? merge.courses.map(normalizeCourse)
            : sourceList.map((r) => normalizeCourse(r?.course))
        )
      ).filter(Boolean)
      const labelBase = merge?.name || courseNames.join(" + ")
      const label = labelBase ? `[합반] ${labelBase}` : "[합반]"
      return [
        {
          key: courseFilter,
          label,
          registrations: sourceList,
          courseDays: collectCourseDays(courseNames),
          mergeWeekRanges: merge?.weekRanges || [],
          count: sourceList.length,
        },
      ]
    }

    const mergeGroups: GanttGroup[] = []
    if (!courseFilter && Array.isArray(merges)) {
      for (const merge of merges) {
        const courseNames = Array.from(
          new Set((merge?.courses || []).map(normalizeCourse))
        ).filter(Boolean)
        if (!courseNames.length) continue
        const rows = sourceList.filter((r) =>
          courseNames.some((name) => matchesCourse(r?.course, name))
        )
        if (!rows.length) continue
        const labelBase = merge?.name || courseNames.join(" + ")
        mergeGroups.push({
          key: `__merge__${merge.id}`,
          label: labelBase ? `[합반] ${labelBase}` : "[합반]",
          registrations: rows,
          courseDays: collectCourseDays(courseNames),
          mergeWeekRanges: merge?.weekRanges || [],
          count: rows.length,
        })
      }
    }

    const courseIdLabelMap =
      courseConfigSetIdToLabel instanceof Map ? courseConfigSetIdToLabel : new Map()

    const getCourseKey = (row: RegistrationRow) => {
      const courseId = normalizeCourse(row?.courseId)
      const courseName = normalizeCourse(row?.course)

      // 동적시간 수업인 경우 courseName(라벨)을 키로 사용하여 별도 그룹으로 분리
      if (courseName && courseVariantRequiredSet.size > 0) {
        for (const base of courseVariantRequiredSet) {
          if (courseName.startsWith(base)) {
            return `__coursename__${courseName}`
          }
        }
      }

      if (courseId) return `__courseid__${courseId}`
      return courseName ? `__coursename__${courseName}` : ""
    }

    const getCourseLabel = (key: string, fallback?: string) => {
      if (typeof key !== "string") return fallback || ""
      if (key.startsWith("__courseid__")) {
        const id = key.replace("__courseid__", "")
        return courseIdLabelMap.get(id) || fallback || ""
      }
      if (key.startsWith("__coursename__")) {
        return key.replace("__coursename__", "")
      }
      return fallback || ""
    }

    const map = new Map<string, RegistrationRow[]>()
    for (const r of sourceList) {
      const courseKey = getCourseKey(r)
      if (!courseKey) continue
      if (!map.has(courseKey)) map.set(courseKey, [])
      map.get(courseKey)?.push(r)
    }

    const courseGroups = Array.from(map.entries())
      .sort((a, b) => {
        const aLabel = getCourseLabel(a[0], a[1]?.[0]?.course)
        const bLabel = getCourseLabel(b[0], b[1]?.[0]?.course)
        return aLabel.localeCompare(bLabel, "ko-KR")
      })
      .map(([courseKey, rows]) => {
        const courseNames = rows
          .map((row) => normalizeCourse(row?.course))
          .filter(Boolean)
        return {
          key: courseKey,
          label: getCourseLabel(courseKey, rows?.[0]?.course),
          registrations: rows,
          courseDays: collectCourseDays(courseNames),
          count: rows.length,
        }
      })
    if (mergeGroups.length) {
      mergeGroups.sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
      return [...mergeGroups, ...courseGroups]
    }
    return courseGroups
  }, [
    chartBaseRegistrations,
    chartFilteredRegistrations,
    courseFilter,
    merges,
    selectedCourseConfigSet,
    selectedCourseConfigSetObj,
    courseConfigSetIdToLabel,
    courseVariantRequiredSet,
  ])

  useEffect(() => {
    if (!ganttGroups.length) {
      if (activeGanttTab) setActiveGanttTab("")
      return
    }
    if (!ganttGroups.some((g) => g.key === activeGanttTab)) {
      setActiveGanttTab(ganttGroups[0].key)
    }
  }, [activeGanttTab, ganttGroups])

  const activeGanttGroup = useMemo(
    () => ganttGroups.find((group) => group.key === activeGanttTab) || null,
    [activeGanttTab, ganttGroups]
  )

  const showCourseFilter = installmentMode || activeMainTab !== "gantt"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">등록현황</h2>
        </div>
        <Button type="button" variant="outline" onClick={loadCourseConfigSets} disabled={courseConfigSetLoading}>설정 세트 새로고침</Button>
      </div>

      {courseConfigSetError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {courseConfigSetError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {installmentMode && extensionsError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {extensionsError}
        </div>
      ) : null}

      <FiltersCard
        courseConfigSetLoading={courseConfigSetLoading}
        courseConfigSets={courseConfigSets}
        selectedCourseConfigSet={selectedCourseConfigSet}
        onSelectCourseConfigSet={selectCourseConfigSet}
        storageScope={typeof user?.username === "string" ? user.username : ""}
        courseConfigSetCategories={courseConfigSetCategories}
        categoryFilter={categoryFilter}
        onCategoryChange={changeCategoryFilter}
        mergeOptions={mergeOptionsForFilter}
        courseOptions={courseOptionsForFilter}
        courseFilter={courseFilter}
        onCourseChange={setCourseFilter}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        onRefresh={loadRegistrations}
        mergeManagerOpen={mergeManagerOpen}
        onToggleMergeManager={
          canManageMerges ? () => setMergeManagerOpen((v) => !v) : undefined
        }
        showCourseFilter={showCourseFilter}
        showSearch
        installmentMode={installmentMode}
        onToggleInstallmentMode={
          canViewInstallments ? () => setInstallmentMode((v) => !v) : undefined
        }
        showMergeManager={canManageMerges}
        showInstallmentToggle={canViewInstallments}
        installmentPlacement={activeMainTab === "gantt" ? "top" : "bottom"}
      />

      {variantTabs.length ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3">
          <Tabs
            value={variantFilter}
            onValueChange={setVariantFilter}
            className="w-full"
          >
            <div className="min-w-0 overflow-x-auto pb-1 no-scrollbar">
              <TabsList className="h-auto min-w-max justify-start gap-2 bg-transparent p-0">
                {variantTabs.map((tab) => {
                  const isActive = variantFilter === tab.key
                  const tabClassName = isActive
                    ? "group flex max-w-[240px] items-center gap-2 rounded-full border border-slate-300/60 bg-[linear-gradient(135deg,#FAD6FF_0%,#D9E7FF_52%,#FFE7C7_100%)] px-3 py-2 text-xs font-normal leading-tight text-slate-900 shadow-md"
                    : "group flex max-w-[240px] items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-normal leading-tight text-muted-foreground shadow-sm transition hover:bg-muted/60"

                  return (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className={tabClassName}
                      title={tab.label}
                    >
                      <span className="min-w-0 truncate font-tab font-bold tracking-[0.008em]">
                        {tab.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`h-5 rounded-full px-2 text-[11px] font-semibold leading-tight ${
                          isActive
                            ? "bg-white/70 text-slate-900"
                            : "bg-background/70 text-muted-foreground"
                        }`}
                      >
                        {tab.count}
                      </Badge>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </Tabs>
        </div>
      ) : null}

      {mergeManagerOpen && selectedCourseConfigSet && canManageMerges ? (
        <MergeManagerCard
          courseOptions={mergeCourseOptions}
          courseTabs={mergeCourseTabs}
          mergeName={mergeName}
          onMergeNameChange={setMergeName}
          mergeCourses={mergeCourses}
          onMergeCoursesChange={setMergeCourses}
          mergeWeekMode={mergeWeekMode}
          onMergeWeekModeChange={setMergeWeekMode}
          mergeWeekStart={mergeWeekStart}
          onMergeWeekStartChange={setMergeWeekStart}
          mergeWeekEnd={mergeWeekEnd}
          onMergeWeekEndChange={setMergeWeekEnd}
          onAddMerge={addMerge}
          merges={merges}
          onDeleteMerge={deleteMerge}
        />
      ) : null}

      {!selectedCourseConfigSet ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          설정 세트를 먼저 선택하세요.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      ) : courseConfigSetCourseSet.size === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          선택한 설정 세트에 과목이 없습니다.
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          표시할 데이터가 없습니다.
        </div>
      ) : installmentMode && canViewInstallments ? (
        <InstallmentBoard
          registrations={filteredRegistrations}
          extensions={extensions}
          extensionsLoading={extensionsLoading}
          courseConfigSet={selectedCourseConfigSetObj}
          courseIdToLabel={courseConfigSetIdToLabel}
          resolveCourseDays={resolveCourseDays}
          onCreateExtension={handleCreateExtension}
          categoryFilter={categoryFilter}
          courseFilter={courseFilter}
        />
      ) : (
        <Tabs
          value={activeMainTab}
          onValueChange={setActiveMainTab}
          className="w-full"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="gantt">차트</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="space-y-4">
            <SummaryCards registrations={filteredRegistrations} />
            <CourseOverview
              registrations={baseRegistrations}
              courseFilter={courseFilter}
              onCourseFilterChange={setCourseFilter}
              courseIdToLabel={courseConfigSetIdToLabel}
              courseVariantRequiredSet={courseVariantRequiredSet}
            />
            <RegistrationCardGrid
              registrations={filteredRegistrations}
              onWithdraw={openWithdrawDialog}
              onRestore={handleRestore}
              onTransfer={canManageTransfers ? openTransferDialog : undefined}
              onNote={openNoteDialog}
            />
          </TabsContent>
          <TabsContent value="gantt" className="space-y-3">
            {ganttGroups.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
                표시할 과목이 없습니다.
              </div>
            ) : (
              <Tabs
                value={activeGanttTab}
                onValueChange={setActiveGanttTab}
                className="w-full"
              >
                <div className="flex items-center gap-3">
                  <div
                    ref={ganttTabsScrollRef}
                    className="min-w-0 flex-1 overflow-x-auto pb-2 pt-1 no-scrollbar"
                  >
                    <TabsList className="h-auto min-w-max justify-start gap-2 bg-transparent p-0">
                      {ganttGroups.map((group) => {
                        const isActive = activeGanttTab === group.key
                        const tabClassName = isActive
                          ? "group flex max-w-[240px] items-center gap-2 rounded-full border border-slate-300/60 bg-[linear-gradient(135deg,#FAD6FF_0%,#D9E7FF_52%,#FFE7C7_100%)] px-3 py-2 text-xs font-normal leading-tight text-slate-900 shadow-md"
                          : "group flex max-w-[240px] items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-normal leading-tight text-muted-foreground shadow-sm transition hover:bg-muted/60"

                        return (
                          <TabsTrigger
                            key={group.key}
                            value={group.key}
                            className={tabClassName}
                            title={group.label}
                          >
                            <span className="min-w-0 truncate font-tab font-bold tracking-[0.008em]">
                              {group.label}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`h-5 rounded-full px-2 text-[11px] font-semibold leading-tight ${
                                isActive
                                  ? "bg-white/70 text-slate-900"
                                  : "bg-background/70 text-muted-foreground"
                              }`}
                            >
                              {group.count}
                            </Badge>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-full border-slate-200/80 bg-white/80 px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
                    onClick={() => setChartOverlayOpen(true)}
                    disabled={!activeGanttGroup}
                  >
                    차트 크게 보기
                  </Button>
                </div>
                {ganttGroups.map((group) => (
                  <TabsContent key={group.key} value={group.key}>
                    <RegistrationsGantt
                      registrations={group.registrations}
                      rangeRegistrations={group.registrations}
                      courseDays={group.courseDays}
                      mergeWeekRanges={group.mergeWeekRanges || []}
                      getCourseDaysForCourse={resolveCourseDays}
                      onWithdraw={openWithdrawDialog}
                      onRestore={handleRestore}
                      onTransfer={canManageTransfers ? openTransferDialog : () => {}}
                      onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
                      onNote={openNoteDialog}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={chartOverlayOpen}
        onOpenChange={setChartOverlayOpen}
      >
        <DialogContent className="h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] border-slate-200/70 bg-white/90 p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[28px] [&>button]:hidden">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200/70 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">등록현황</div>
                  <div className="text-lg font-semibold text-slate-900">
                    등록현황 차트 (확대)
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => setChartOverlayOpen(false)}
                >
                  닫기
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-4 pt-4">
              {activeGanttGroup ? (
                <RegistrationsGantt
                  registrations={activeGanttGroup.registrations}
                  rangeRegistrations={activeGanttGroup.registrations}
                  courseDays={activeGanttGroup.courseDays}
                  mergeWeekRanges={activeGanttGroup.mergeWeekRanges || []}
                  getCourseDaysForCourse={resolveCourseDays}
                  onWithdraw={openWithdrawDialog}
                  onRestore={handleRestore}
                  onTransfer={canManageTransfers ? openTransferDialog : () => {}}
                  onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
                  onNote={openNoteDialog}
                  maxHeightClassName="h-full max-h-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  표시할 과목이 없습니다.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={noteDialogOpen}
        onOpenChange={(open) => {
          setNoteDialogOpen(open)
          if (!open) {
            setNoteTarget(null)
            setNoteValue("")
            setNoteError("")
          }
        }}
      >
        <DialogContent className="max-w-xl border-white/60 bg-white/80 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl ring-1 ring-slate-200/60 sm:rounded-[28px]">
          <DialogHeader>
            <DialogTitle>학생 메모</DialogTitle>
            <DialogDescription>
              학생별 특이사항을 기록하고 공유합니다.
            </DialogDescription>
          </DialogHeader>
          {noteTarget ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      학생
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {noteTarget?.name || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      과목
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                      {noteTarget?.course || "-"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center rounded-full bg-slate-100/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    메모
                  </span>
                  {noteUpdatedAtLabel ? (
                    <span>최근 수정 · {noteUpdatedAtLabel}</span>
                  ) : (
                    <span>새 메모</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteContent" className="text-sm font-semibold text-slate-700">
                  메모
                </Label>
                <Textarea
                  id="noteContent"
                  value={noteValue}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNoteValue(event.target.value)
                  }
                  className="min-h-[180px] resize-none rounded-2xl border border-slate-200/70 bg-white/80 shadow-inner shadow-slate-200/30 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="특이사항을 입력하세요."
                />
                <div className="text-xs text-slate-400">
                  저장하지 않고 닫으면 변경사항이 사라집니다.
                </div>
              </div>
              {noteError ? (
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
                  {noteError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              선택된 학생이 없습니다.
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="rounded-full px-6"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleNoteSave}
              disabled={noteSaving || !noteTarget}
              className="rounded-full bg-slate-900 px-6 text-white shadow-sm transition hover:bg-slate-800"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={withdrawDialogOpen}
        onOpenChange={(open) => {
          setWithdrawDialogOpen(open)
          if (!open) {
            setWithdrawTarget(null)
            setWithdrawError("")
            setWithdrawPickerOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>퇴원 처리</DialogTitle>
            <DialogDescription>
              퇴원일을 기준으로 당일부터 출석 입력이 제한됩니다.
            </DialogDescription>
          </DialogHeader>
          {withdrawTarget ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="text-xs text-muted-foreground">학생</div>
                <div className="font-semibold">{withdrawTarget?.name || "-"}</div>
                <div className="mt-2 text-xs text-muted-foreground">과목</div>
                <div className="font-semibold">{withdrawTarget?.course || "-"}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawDate">퇴원일</Label>
                <Popover
                  open={withdrawPickerOpen}
                  onOpenChange={setWithdrawPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="withdrawDate"
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      {withdrawDate || "YYYY-MM-DD"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-none bg-transparent p-0 shadow-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={parseDate(withdrawDate) ?? undefined}
                      onSelect={(
                        value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined
                      ) => {
                        const selectedDate = value instanceof Date ? value : null
                        setWithdrawDate(selectedDate ? formatDateYmd(selectedDate) : "")
                        setWithdrawPickerOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : null}

          {withdrawError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {withdrawError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleWithdrawSave} disabled={withdrawSaving}>
              퇴원 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          setTransferDialogOpen(open)
          if (!open) {
            setTransferTarget(null)
            setTransferError("")
            setTransferPickerOpen(false)
            setTransferCourseValue("")
            setTransferWeeks("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>전반 처리</DialogTitle>
            <DialogDescription>
              전반일을 신규 수업 시작일로 설정합니다.
            </DialogDescription>
          </DialogHeader>
          {transferTarget ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="text-xs text-muted-foreground">학생</div>
                <div className="font-semibold">{transferTarget?.name || "-"}</div>
                <div className="mt-2 text-xs text-muted-foreground">현재 과목</div>
                <div className="font-semibold">{transferTarget?.course || "-"}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferDate">전반일</Label>
                <Popover
                  open={transferPickerOpen}
                  onOpenChange={setTransferPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="transferDate"
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      {transferDate || "YYYY-MM-DD"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-none bg-transparent p-0 shadow-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={parseDate(transferDate) ?? undefined}
                      onSelect={(
                        value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined
                      ) => {
                        const selectedDate = value instanceof Date ? value : null
                        setTransferDate(selectedDate ? formatDateYmd(selectedDate) : "")
                        setTransferPickerOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>전반 과목</Label>
                <Select
                  value={transferCourseValue}
                  onValueChange={setTransferCourseValue}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="전반할 과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferCourseGroups.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        선택 가능한 과목이 없습니다.
                      </SelectItem>
                    ) : (
                      transferCourseGroups.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel className="mx-1 my-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            카테고리 · {group.label}
                          </SelectLabel>
                          {group.items.map((course) => (
                            <SelectItem key={course.value} value={course.value}>
                              {course.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferWeeks">기간(주)</Label>
                <Input
                  id="transferWeeks"
                  type="number"
                  min="1"
                  placeholder="예: 8"
                  value={transferWeeks}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setTransferWeeks(event.target.value)
                  }
                />
              </div>
            </div>
          ) : null}

          {transferError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {transferError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleTransferSave} disabled={transferSaving}>
              전반 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}








