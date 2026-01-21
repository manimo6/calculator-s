import React, { useCallback, useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { AuthUser } from "@/auth-routing"

import AttendanceBoard from "./AttendanceBoard"
import FiltersCard from "../registrations/FiltersCard"
import { useRegistrations } from "../registrations/useRegistrations"

function isValidDow(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 6
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

function getCourseDaysByName(courseName: string, courseConfigSet: CourseConfigSet | null) {
  const name = String(courseName || "").trim()
  if (!name) return []

  const configData = courseConfigSet?.data
  const configTree = Array.isArray(configData?.courseTree)
    ? configData.courseTree
    : []
  const sources: Array<{ tree: CourseTreeGroup[]; info: CourseInfoRecord }> = [
    {
      tree: configTree,
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

export default function AttendanceTab({ user }: { user: AuthUser | null }) {
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
    () =>
      courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
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
  const attendanceRegistrations = useMemo(
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">출석부</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={loadCourseConfigSets}
          disabled={courseConfigSetLoading}
        >
          설정 세트 새로고침
        </Button>
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
        showSearch
        showMergeManager={false}
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
      ) : (
        <AttendanceBoard
          registrations={attendanceRegistrations}
          getCourseDaysForCourse={resolveCourseDays}
        />
      )}
    </div>
  )
}
