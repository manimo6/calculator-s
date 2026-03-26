import { useCallback, useMemo, useState } from "react"
import { BookOpen, Search, Users } from "lucide-react"

import type { AuthUser } from "@/auth-routing"

import AttendanceBoard from "./AttendanceBoard"
import AttendanceCourseBrowser from "./AttendanceCourseBrowser"
import AttendancePlaceholderState from "./AttendancePlaceholderState"
import AttendanceTabHero from "./AttendanceTabHero"
import { ATTENDANCE_TAB_COPY as COPY } from "./attendanceTabCopy"
import {
  countTodayAttendanceTabs,
  filterAttendanceVariantTabs,
} from "./attendanceTabModel"
import { useActiveChainRegistrations } from "./useActiveChainRegistrations"
import FiltersCard from "../registrations/FiltersCard"
import { useRegistrations } from "../registrations/useRegistrations"
import { getCourseDaysByName } from "../registrations/utils"

export default function AttendanceTab({ user }: { user: AuthUser | null }) {
  const [courseSearch, setCourseSearch] = useState("")
  const [todayOnly, setTodayOnly] = useState(false)

  const todayDayOfWeek = useMemo(() => new Date().getDay(), [])

  const {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    courseConfigSetCourseSet,
    loadCourseConfigSets,

    loading,
    error,
    registrations,
    filteredRegistrations,
    variantTabs,
    variantFilter,
    setVariantFilter,
    loadRegistrations,

    mergeOptionsForFilter,

    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,

    courseOptionsForFilter,
  } = useRegistrations({ loadMerges: false, loadExtensions: false, enableVariants: true })

  const selectedCourseConfigSetObj = useMemo(
    () => courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )

  const resolveCourseDays = useCallback(
    (courseName?: string) => getCourseDaysByName(courseName || "", selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )

  const safeCategories = useMemo(
    () => (courseConfigSetCategories || []).map((c) => String(c)).filter(Boolean),
    [courseConfigSetCategories]
  )

  const safeCourseOptions = useMemo(
    () => (courseOptionsForFilter || []).map((c) => String(c)).filter(Boolean),
    [courseOptionsForFilter]
  )

  const mappedRegistrations = useMemo(
    () =>
      (filteredRegistrations || []).map((row) => ({
        ...row,
        transferToId:
          row?.transferToId !== undefined && row?.transferToId !== null
            ? String(row.transferToId)
            : undefined,
      })),
    [filteredRegistrations]
  )

  const attendanceRegistrations = useActiveChainRegistrations(
    mappedRegistrations,
    registrations || []
  )

  const filteredVariantTabs = useMemo(
    () =>
      filterAttendanceVariantTabs({
        variantTabs,
        courseSearch,
        todayOnly,
        todayDayOfWeek,
        resolveCourseDays,
      }),
    [variantTabs, courseSearch, todayOnly, todayDayOfWeek, resolveCourseDays]
  )

  const todayCoursesCount = useMemo(
    () =>
      countTodayAttendanceTabs({
        variantTabs,
        todayDayOfWeek,
        resolveCourseDays,
      }),
    [variantTabs, todayDayOfWeek, resolveCourseDays]
  )

  const handleRefresh = useCallback(() => {
    loadCourseConfigSets()
    loadRegistrations()
  }, [loadCourseConfigSets, loadRegistrations])

  return (
    <div className="space-y-5">
      <AttendanceTabHero
        loading={courseConfigSetLoading || loading}
        onRefresh={handleRefresh}
      />

      {courseConfigSetError ? (
        <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
          {courseConfigSetError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
        <FiltersCard
          courseConfigSetLoading={courseConfigSetLoading}
          courseConfigSets={courseConfigSets}
          selectedCourseConfigSet={selectedCourseConfigSet}
          onSelectCourseConfigSet={selectCourseConfigSet}
          storageScope={typeof user?.username === "string" ? user.username : ""}
          courseConfigSetCategories={safeCategories}
          categoryFilter={categoryFilter}
          onCategoryChange={changeCategoryFilter}
          mergeOptions={mergeOptionsForFilter}
          courseOptions={safeCourseOptions}
          courseFilter={courseFilter}
          onCourseChange={setCourseFilter}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          onRefresh={loadRegistrations}
          showCourseFilter={false}
          showSearch={false}
          showMergeManager={false}
          showRefreshButton={false}
        />
      </div>

      <AttendanceCourseBrowser
        variantTabs={variantTabs}
        filteredVariantTabs={filteredVariantTabs}
        variantFilter={variantFilter}
        courseSearch={courseSearch}
        todayOnly={todayOnly}
        todayCoursesCount={todayCoursesCount}
        onVariantFilterChange={setVariantFilter}
        onCourseSearchChange={setCourseSearch}
        onTodayOnlyChange={setTodayOnly}
      />

      {!selectedCourseConfigSet ? (
        <AttendancePlaceholderState
          icon={BookOpen}
          title={COPY.selectConfigSet}
          description={COPY.selectConfigSetDescription}
        />
      ) : loading ? (
        <AttendancePlaceholderState
          icon={Users}
          title={COPY.loading}
          loading
        />
      ) : courseConfigSetCourseSet.size === 0 ? (
        <AttendancePlaceholderState
          icon={Users}
          title={COPY.noCoursesInConfig}
        />
      ) : filteredRegistrations.length === 0 ? (
        <AttendancePlaceholderState
          icon={Search}
          title={COPY.noAttendanceData}
        />
      ) : (
        <AttendanceBoard
          registrations={attendanceRegistrations}
          getCourseDaysForCourse={resolveCourseDays}
        />
      )}
    </div>
  )
}
