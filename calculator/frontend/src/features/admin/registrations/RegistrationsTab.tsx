import { useCallback, useEffect, useMemo, useState } from "react"

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiClient } from "@/api-client"
import { Calendar } from "@/components/ui/calendar"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import { PERMISSION_KEYS, hasPermission } from "@/permissions"

import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { AuthUser } from "@/auth-routing"

import RegistrationsHeader from "./RegistrationsHeader"
import RegistrationsSidebar from "./RegistrationsSidebar"
import CourseOverview from "./CourseOverview"
import MergeManagerCard from "./MergeManagerCard"
import InstallmentBoard from "./InstallmentBoard"
import RegistrationCardGrid from "./RegistrationCardGrid"
import RegistrationsGantt from "./RegistrationsGantt"
import TransferDialog from "./TransferDialog"
import { useRegistrations } from "./useRegistrations"
import { useTransfer } from "./useTransfer"
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

export default function RegistrationsTab({ user }: { user: AuthUser | null }) {
  const canAccessRegistrations = hasPermission(user, PERMISSION_KEYS.tabs.registrations)
  const canManageMerges =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.mergeManager)
  const canViewInstallments =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.installments)
  const canManageTransfers =
    canAccessRegistrations && hasPermission(user, PERMISSION_KEYS.buttons.transfers)

  // Track where the course filter came from
  const [viewSource, setViewSource] = useState<'card' | 'sidebar' | null>(null)

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
    mergeError,
    setMergeError,
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
    mergeWeekRangeInputs,
    setMergeWeekRangeInputs,
    addMerge,
    deleteMerge,
    toggleMergeActive,
    editingMergeId,
    startEditMerge,
    cancelEditMerge,
    activeMergesToday,
    mergedCourseSetToday,
    simulationDate,
    setSimulationDate,

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
  // activeMainTab removed as we switch views based on courseFilter
  const [installmentMode, setInstallmentMode] = useState(false)
  
  // Dialog states
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)

  const [withdrawTarget, setWithdrawTarget] = useState<RegistrationRow | null>(null)
  const [withdrawDate, setWithdrawDate] = useState("")
  const [withdrawPickerOpen, setWithdrawPickerOpen] = useState(false)
  const [withdrawError, setWithdrawError] = useState("")
  const [withdrawSaving, setWithdrawSaving] = useState(false)
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

  const resolveCourseDays = useCallback(
    (courseName: string) =>
      getCourseDaysByName(courseName || "", selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )

  const {
    transferDialogOpen,
    transferTarget,
    transferDate,
    setTransferDate,
    transferPickerOpen,
    setTransferPickerOpen,
    transferCourseValue,
    setTransferCourseValue,
    transferWeeks,
    setTransferWeeks,
    transferError,
    transferSaving,
    transferCourseGroups,
    transferCourseDays,
    openTransferDialog,
    handleTransferSave,
    handleTransferCancel,
    closeTransferDialog,
  } = useTransfer({
    courseOptions,
    registrations,
    selectedCourseConfigSetObj,
    selectedCourseConfigSet,
    loadRegistrations,
    setError,
    resolveCourseDays,
  })

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

  // Wheel handler for Gantt tabs removed as tabs are replaced by sidebar

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
    const todayMergedCourses = new Set<string>()
    if (!courseFilter && activeMergesToday.length > 0) {
      for (const merge of activeMergesToday) {
        const courseNames = Array.from(
          new Set((merge?.courses || []).map(normalizeCourse))
        ).filter(Boolean)
        if (!courseNames.length) continue
        const rows = sourceList.filter((r) =>
          courseNames.some((name) => matchesCourse(r?.course, name))
        )
        if (!rows.length) continue
        for (const cn of courseNames) todayMergedCourses.add(cn)
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
      // 오늘 합반 중인 과목은 개별 그룹에서 제외
      if (todayMergedCourses.size > 0 && todayMergedCourses.has(normalizeCourse(r?.course))) continue
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
    activeMergesToday,
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


  const showCourseFilter = installmentMode

  // Wrapper functions to track where courseFilter changes came from
  const handleCourseFilterFromCard = useCallback((value: string) => {
    setViewSource('card')
    setCourseFilter(value)
  }, [setCourseFilter])

  const handleCourseFilterFromSidebar = useCallback((value: string) => {
    setViewSource('sidebar')
    setCourseFilter(value)
  }, [setCourseFilter])

  // Reset viewSource when filter is cleared
  useEffect(() => {
    if (!courseFilter) {
      setViewSource(null)
    }
  }, [courseFilter])

  // Determine which view to show
  // If courseFilter is set (specific course) -> depends on viewSource
  //   - from sidebar -> Gantt
  //   - from card -> filtered overview (no gantt)
  // If no courseFilter (All) -> Dashboard (Overview + Grid)
  const isAllView = !courseFilter
  const showGantt = viewSource === 'sidebar' && !isAllView && !installmentMode

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-6 sm:-m-8">
      <RegistrationsHeader
        courseConfigSetLoading={courseConfigSetLoading}
        courseConfigSets={courseConfigSets}
        selectedCourseConfigSet={selectedCourseConfigSet}
        onSelectCourseConfigSet={selectCourseConfigSet}
        courseConfigSetCategories={courseConfigSetCategories}
        categoryFilter={categoryFilter}
        onCategoryChange={changeCategoryFilter}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        onRefresh={loadRegistrations}
        mergeManagerOpen={mergeManagerOpen}
        onToggleMergeManager={
          canManageMerges ? () => setMergeManagerOpen((v) => !v) : undefined
        }
        showMergeManager={canManageMerges}
        installmentMode={installmentMode}
        onToggleInstallmentMode={
          canViewInstallments ? () => setInstallmentMode((v) => !v) : undefined
        }
        showInstallmentToggle={canViewInstallments}
      />

      <div className="flex flex-1 overflow-hidden">
        {selectedCourseConfigSet ? (
          <RegistrationsSidebar
            registrations={baseRegistrations}
            courseFilter={courseFilter}
            onCourseFilterChange={handleCourseFilterFromSidebar}
            courseIdToLabel={courseConfigSetIdToLabel}
            courseVariantRequiredSet={courseVariantRequiredSet}
            merges={merges || []}
            activeMergesToday={activeMergesToday}
            mergedCourseSetToday={mergedCourseSetToday}
            variantTabs={variantTabs}
            variantFilter={variantFilter}
            onVariantFilterChange={setVariantFilter}
            simulationDate={simulationDate}
            onSimulationDateChange={setSimulationDate}
          />
        ) : null}

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <div className="space-y-6">
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
                mergeWeekRangeInputs={mergeWeekRangeInputs}
                onMergeWeekRangeInputsChange={setMergeWeekRangeInputs}
                onAddMerge={addMerge}
                merges={merges}
                onDeleteMerge={deleteMerge}
                onToggleMergeActive={toggleMergeActive}
                editingMergeId={editingMergeId}
                onEditMerge={startEditMerge}
                onCancelEdit={cancelEditMerge}
              />
            ) : null}

            {!selectedCourseConfigSet ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-center text-muted-foreground">
                <div className="rounded-full bg-slate-100 p-6">
                  <Badge variant="outline" className="scale-150 border-slate-200">
                    설정 필요
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">설정 세트를 선택하세요</h3>
                  <p className="mt-1 text-sm">상단 메뉴에서 설정 세트를 선택하면 데이터를 불러옵니다.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
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
            ) : showGantt ? (
              // Gantt View for Sidebar Selection
              <div className="space-y-4">
                {ganttGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {group.label}
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                          {group.count}명
                        </Badge>
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setActiveGanttTab(group.key)
                          setChartOverlayOpen(true)
                        }}
                      >
                        크게 보기
                      </Button>
                    </div>
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
                  </div>
                ))}
              </div>
            ) : (
              // Dashboard View (All) or Course Card Selection View
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CourseOverview
                  registrations={baseRegistrations}
                  courseFilter={viewSource === 'card' ? courseFilter : ""}
                  onCourseFilterChange={handleCourseFilterFromCard}
                  courseIdToLabel={courseConfigSetIdToLabel}
                  courseVariantRequiredSet={courseVariantRequiredSet}
                  activeMergesToday={activeMergesToday}
                  mergedCourseSetToday={mergedCourseSetToday}
                />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isAllView ? "전체 학생 목록" : `${ganttGroups[0]?.label || "과목별"} 학생 목록`}
                    </h3>
                  </div>
                  <RegistrationCardGrid
                    registrations={filteredRegistrations}
                    onWithdraw={openWithdrawDialog}
                    onRestore={handleRestore}
                    onTransfer={canManageTransfers ? openTransferDialog : undefined}
                    onTransferCancel={canManageTransfers ? handleTransferCancel : undefined}
                    onNote={openNoteDialog}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog
        open={chartOverlayOpen}
        onOpenChange={setChartOverlayOpen}
      >
        <DialogContent className="h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] overflow-hidden border-slate-200/70 bg-white/90 p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[28px] [&>button]:hidden">
          <div className="flex h-full flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200/70 px-6 py-4">
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
            <div className="min-h-0 flex-1 overflow-hidden p-4">
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
                  maxHeightClassName="max-h-[calc(100vh-10rem)]"
                  disableCardOverflow={false}
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

      <TransferDialog
        open={transferDialogOpen}
        onClose={closeTransferDialog}
        target={transferTarget}
        date={transferDate}
        onDateChange={setTransferDate}
        pickerOpen={transferPickerOpen}
        onPickerOpenChange={setTransferPickerOpen}
        courseValue={transferCourseValue}
        onCourseValueChange={setTransferCourseValue}
        weeks={transferWeeks}
        onWeeksChange={setTransferWeeks}
        error={transferError}
        saving={transferSaving}
        courseGroups={transferCourseGroups}
        courseDays={transferCourseDays}
        onSave={handleTransferSave}
      />

      <Dialog open={!!mergeError} onOpenChange={(open) => { if (!open) setMergeError("") }}>
        <DialogContent className="max-w-sm border-none bg-white/90 p-0 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:rounded-3xl [&>button]:hidden">
          <div className="flex flex-col items-center px-7 pt-8 pb-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
            </div>
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-base font-bold text-slate-800">합반 설정 오류</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-slate-500">
                {mergeError}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="border-t border-slate-100 px-7 py-4">
            <Button
              type="button"
              onClick={() => setMergeError("")}
              className="w-full rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-slate-700 hover:to-slate-600 hover:shadow-lg"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




