import React, { useCallback, useMemo } from "react"

import { Button } from "@/components/ui/button"

import { courseInfo, courseTree } from "@/utils/data"

import AttendanceBoard from "./AttendanceBoard"
import FiltersCard from "../registrations/FiltersCard"
import { useRegistrations } from "../registrations/useRegistrations"

function isValidDow(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6
}

function getCourseDaysByName(courseName, courseConfigSet) {
  const name = String(courseName || "").trim()
  if (!name) return []

  const configData = courseConfigSet?.data
  const sources = [
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

    for (const info of Object.values(source.info || {})) {
      const label = info?.name
      if (!label) continue
      if (!name.startsWith(label) || label.length < bestLen) continue

      if (Array.isArray(info?.days)) {
        bestDays = info.days.filter(isValidDow)
        bestLen = label.length
      }
    }
  }

  return bestDays || []
}

export default function AttendanceTab({ user }) {
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
    loadRegistrations,

    mergeOptionsForFilter,

    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,

    courseOptionsForFilter,
  } = useRegistrations({ loadMerges: false, loadExtensions: false })

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )

  const resolveCourseDays = useCallback(
    (courseName) => getCourseDaysByName(courseName, selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
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
        storageScope={user?.username || ""}
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
        showCourseFilter
        showSearch
        showMergeManager={false}
      />

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
          registrations={filteredRegistrations}
          getCourseDaysForCourse={resolveCourseDays}
        />
      )}
    </div>
  )
}
