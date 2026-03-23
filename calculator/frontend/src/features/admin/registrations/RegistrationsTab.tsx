import { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient } from "@/api-client"
import { PERMISSION_KEYS, hasPermission } from "@/permissions"

import type { CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { AuthUser } from "@/auth-routing"

import RegistrationsHeader from "./RegistrationsHeader"
import RegistrationsSidebar from "./RegistrationsSidebar"
import CourseOverview from "./CourseOverview"
import MergeManagerCard from "./MergeManagerCard"
import InstallmentBoard from "./InstallmentBoard"
import RegistrationCardGrid from "./RegistrationCardGrid"
import RegistrationsGantt from "./RegistrationsGantt"
import NoteDialog from "./NoteDialog"
import TransferDialog from "./TransferDialog"
import WithdrawDialog from "./WithdrawDialog"
import { useRegistrations } from "./useRegistrations"
import { useRegistrationMap, useEnrichedRegistrations, useCardRegistrations } from "./useTransferDisplay"
import { useNote } from "./useNote"
import { useTransfer } from "./useTransfer"
import { useWithdraw } from "./useWithdraw"
import { getCourseDaysByName, matchesCourseName, normalizeCourse, getCourseKey, getCourseLabel } from "./utils"
import { getFullChain, findActiveInChain } from "./transferChain"
import { Switch } from "@/components/ui/switch"

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
  rangeRegistrations: RegistrationRow[]
  courseDays: number[]
  count: number
  mergeWeekRanges?: WeekRange[]
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
  
  const {
    noteDialogOpen,
    noteTarget,
    noteValue,
    setNoteValue,
    noteUpdatedAtLabel,
    noteError,
    noteSaving,
    openNoteDialog,
    handleNoteSave,
    closeNoteDialog,
  } = useNote({ onSuccess: loadRegistrations })
  const [chartOverlayOpen, setChartOverlayOpen] = useState(false)
  const [showTransferChain, setShowTransferChain] = useState(false)

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
    transferError,
    transferSaving,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
    openTransferDialog,
    handleTransferSave,
    handleTransferCancel,
    closeTransferDialog,
  } = useTransfer({
    courseOptions,
    registrations,
    selectedCourseConfigSetObj,
    selectedCourseConfigSet,
    onTransferSuccess: loadRegistrations,
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

  const {
    withdrawDialogOpen,
    withdrawTarget,
    withdrawDate,
    setWithdrawDate,
    withdrawPickerOpen,
    setWithdrawPickerOpen,
    withdrawError,
    withdrawSaving,
    openWithdrawDialog,
    handleWithdrawSave,
    handleRestore,
    closeWithdrawDialog,
  } = useWithdraw({
    onSuccess: loadRegistrations,
    setError,
  })


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

  // 전반 출처/대상 이름 조회용 맵 + enrichment + 카드뷰 필터
  const registrationMap = useRegistrationMap(registrations || [])
  const chartFilteredRegistrations = useEnrichedRegistrations(filteredRegistrations || [], registrationMap)
  const chartBaseRegistrations = useEnrichedRegistrations(baseRegistrations || [], registrationMap)
  const cardFilteredRegistrations = useCardRegistrations(chartFilteredRegistrations)

  const ganttGroups = useMemo<GanttGroup[]>(() => {
    if (!selectedCourseConfigSet) return []
    const isMergeFilter = Boolean(courseFilter) && courseFilter.startsWith("__merge__")
    const sourceList = isMergeFilter
      ? chartFilteredRegistrations || []
      : courseFilter
        ? chartFilteredRegistrations || []
        : chartBaseRegistrations || []

    if (!sourceList.length) return []

    // 주차 범위 계산용: 검색 필터 없는 전체 등록 데이터
    const allRegistrations = registrations || []

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
      const rangeRows = allRegistrations.filter((r) =>
        courseNames.some((name) => matchesCourseName(r?.course, name))
      )
      return [
        {
          key: courseFilter,
          label,
          registrations: sourceList,
          rangeRegistrations: rangeRows,
          courseDays: collectCourseDays(courseNames),
          mergeWeekRanges: merge?.weekRanges || [],
          count: sourceList.filter((r) => !r?.transferToId && !r?.isTransferredOut).length,
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
          courseNames.some((name) => matchesCourseName(r?.course, name))
        )
        if (!rows.length) continue
        for (const cn of courseNames) todayMergedCourses.add(cn)
        const labelBase = merge?.name || courseNames.join(" + ")
        const rangeRows = allRegistrations.filter((r) =>
          courseNames.some((name) => matchesCourseName(r?.course, name))
        )
        mergeGroups.push({
          key: `__merge__${merge.id}`,
          label: labelBase ? `[합반] ${labelBase}` : "[합반]",
          registrations: rows,
          rangeRegistrations: rangeRows,
          courseDays: collectCourseDays(courseNames),
          mergeWeekRanges: merge?.weekRanges || [],
          count: rows.filter((r) => !r?.transferToId && !r?.isTransferredOut).length,
        })
      }
    }

    const courseIdLabelMap =
      courseConfigSetIdToLabel instanceof Map ? courseConfigSetIdToLabel : new Map()

    const refDate = simulationDate || new Date()
    const processedChainIds = new Set<string>()

    const map = new Map<string, RegistrationRow[]>()
    for (const r of sourceList) {
      const rid = String(r?.id || "")
      if (processedChainIds.has(rid)) continue
      // 오늘 합반 중인 과목은 개별 그룹에서 제외
      if (todayMergedCourses.size > 0 && todayMergedCourses.has(normalizeCourse(r?.course))) continue

      // 전반 체인이 없으면 기존 로직
      if (!registrationMap.size || (!r?.transferFromId && !r?.transferToId)) {
        const courseKey = getCourseKey(r, courseVariantRequiredSet)
        if (!courseKey) continue
        if (!map.has(courseKey)) map.set(courseKey, [])
        map.get(courseKey)?.push(r)
        continue
      }

      // 전반 체인 해소
      const chain = getFullChain(r, registrationMap)
      const activeReg = findActiveInChain(chain, refDate)
      for (const c of chain) processedChainIds.add(String(c?.id || ""))

      for (const c of chain) {
        if (!sourceList.some((s) => String(s?.id) === String(c?.id))) continue
        const isActiveAtRef = activeReg && String(c?.id) === String(activeReg?.id)
        const courseKey = getCourseKey(c, courseVariantRequiredSet)
        if (!courseKey) continue

        if (isActiveAtRef) {
          // refDate 기준 활성 → 정상 막대 (각자 원래 과목 그룹)
          if (!map.has(courseKey)) map.set(courseKey, [])
          map.get(courseKey)?.push({ ...c, isTransferredOut: false, transferToId: undefined })
        } else if (showTransferChain) {
          // 비활성 체인 멤버 → 각자 원래 과목 그룹에 고스트 바
          if (!map.has(courseKey)) map.set(courseKey, [])
          map.get(courseKey)?.push({ ...c, isTransferredOut: true })
        }
      }
    }

    // 주차 범위용: 전체 등록 데이터를 과목별로 그룹핑
    const rangeMap = new Map<string, RegistrationRow[]>()
    for (const r of allRegistrations) {
      if (todayMergedCourses.size > 0 && todayMergedCourses.has(normalizeCourse(r?.course))) continue
      const courseKey = getCourseKey(r, courseVariantRequiredSet)
      if (!courseKey) continue
      if (!rangeMap.has(courseKey)) rangeMap.set(courseKey, [])
      rangeMap.get(courseKey)?.push(r)
    }

    const courseGroups = Array.from(map.entries())
      .sort((a, b) => {
        const aLabel = getCourseLabel(a[0], courseIdLabelMap, a[1]?.[0]?.course)
        const bLabel = getCourseLabel(b[0], courseIdLabelMap, b[1]?.[0]?.course)
        return aLabel.localeCompare(bLabel, "ko-KR")
      })
      .map(([courseKey, rows]) => {
        const courseNames = rows
          .map((row) => normalizeCourse(row?.course))
          .filter(Boolean)
        return {
          key: courseKey,
          label: getCourseLabel(courseKey, courseIdLabelMap, rows?.[0]?.course),
          registrations: rows,
          rangeRegistrations: rangeMap.get(courseKey) || rows,
          courseDays: collectCourseDays(courseNames),
          count: rows.filter((r) => !r?.transferToId && !r?.isTransferredOut).length,
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
    registrations,
    selectedCourseConfigSet,
    selectedCourseConfigSetObj,
    courseConfigSetIdToLabel,
    courseVariantRequiredSet,
    simulationDate,
    showTransferChain,
    registrationMap,
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
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showTransferChain}
                    onCheckedChange={setShowTransferChain}
                    id="transferChainToggle"
                  />
                  <label htmlFor="transferChainToggle" className="cursor-pointer text-xs font-semibold text-slate-500">
                    전반 이력
                  </label>
                </div>
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
                      rangeRegistrations={group.rangeRegistrations}
                      courseDays={group.courseDays}
                      mergeWeekRanges={group.mergeWeekRanges || []}
                      registrationMap={registrationMap}
                      getCourseDaysForCourse={resolveCourseDays}
                      onWithdraw={openWithdrawDialog}
                      onRestore={handleRestore}
                      onTransfer={canManageTransfers ? openTransferDialog : () => {}}
                      onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
                      onNote={openNoteDialog}
                      showTransferChain={showTransferChain}
                      simulationDate={simulationDate}
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
                    registrations={cardFilteredRegistrations}
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
                  rangeRegistrations={activeGanttGroup.rangeRegistrations}
                  courseDays={activeGanttGroup.courseDays}
                  mergeWeekRanges={activeGanttGroup.mergeWeekRanges || []}
                  registrationMap={registrationMap}
                  getCourseDaysForCourse={resolveCourseDays}
                  onWithdraw={openWithdrawDialog}
                  onRestore={handleRestore}
                  onTransfer={canManageTransfers ? openTransferDialog : () => {}}
                  onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
                  onNote={openNoteDialog}
                  showTransferChain={showTransferChain}
                  simulationDate={simulationDate}
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


      <NoteDialog
        open={noteDialogOpen}
        onClose={closeNoteDialog}
        target={noteTarget}
        value={noteValue}
        onValueChange={setNoteValue}
        updatedAtLabel={noteUpdatedAtLabel}
        error={noteError}
        saving={noteSaving}
        onSave={handleNoteSave}
      />

      <WithdrawDialog
        open={withdrawDialogOpen}
        onClose={closeWithdrawDialog}
        target={withdrawTarget}
        date={withdrawDate}
        onDateChange={setWithdrawDate}
        pickerOpen={withdrawPickerOpen}
        onPickerOpenChange={setWithdrawPickerOpen}
        error={withdrawError}
        saving={withdrawSaving}
        onSave={handleWithdrawSave}
      />

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
        error={transferError}
        saving={transferSaving}
        courseGroups={transferCourseGroups}
        courseDays={transferCourseDays}
        expectedEndDate={transferExpectedEndDate}
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




