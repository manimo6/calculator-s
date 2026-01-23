import React, { useCallback, useMemo, useState } from "react"
import { Search, X, RefreshCw, Users, BookOpen, CalendarCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { courseInfo, courseTree } from "@/utils/data"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"
import type { AuthUser } from "@/auth-routing"

import AttendanceBoard from "./AttendanceBoard"
import FiltersCard from "../registrations/FiltersCard"
import { useRegistrations } from "../registrations/useRegistrations"

// 초성 추출 함수
const CHOSUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]

function getChosung(str: string): string {
  return str
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 44032
      if (code < 0 || code > 11171) return char
      return CHOSUNG[Math.floor(code / 588)]
    })
    .join("")
}

function matchesSearch(label: string, query: string): boolean {
  if (!query) return true
  const lowerLabel = label.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // 일반 검색
  if (lowerLabel.includes(lowerQuery)) return true
  
  // 초성 검색
  const chosung = getChosung(label)
  if (chosung.includes(query)) return true
  
  return false
}

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
  const [courseSearch, setCourseSearch] = useState("")
  const [todayOnly, setTodayOnly] = useState(false)
  
  // 오늘 요일 (0: 일요일 ~ 6: 토요일)
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

  // 과목 탭 필터링 (초성 검색 + 오늘 수업만)
  const filteredVariantTabs = useMemo(() => {
    let result = variantTabs

    // 오늘 수업만 필터
    if (todayOnly) {
      result = result.filter((tab) => {
        const courseDays = resolveCourseDays(tab.label)
        // courseDays가 비어있으면 기본적으로 포함 (데이터 없는 경우 대비)
        if (courseDays.length === 0) return true
        return courseDays.includes(todayDayOfWeek)
      })
    }

    // 검색 필터
    if (courseSearch.trim()) {
      result = result.filter((tab) => matchesSearch(tab.label, courseSearch.trim()))
    }

    return result
  }, [variantTabs, courseSearch, todayOnly, todayDayOfWeek, resolveCourseDays])

  // 오늘 수업이 있는 과목 수 계산
  const todayCoursesCount = useMemo(() => {
    return variantTabs.filter((tab) => {
      const courseDays = resolveCourseDays(tab.label)
      if (courseDays.length === 0) return true
      return courseDays.includes(todayDayOfWeek)
    }).length
  }, [variantTabs, todayDayOfWeek, resolveCourseDays])

  // 데이터 새로고침 (설정 세트 + 등록현황 동시)
  const handleRefresh = useCallback(() => {
    loadCourseConfigSets()
    loadRegistrations()
  }, [loadCourseConfigSets, loadRegistrations])

  return (
    <div className="space-y-5">
      {/* 헤더 영역 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-orange-400/10 p-6 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">출석부</h2>
              <p className="text-sm text-slate-600">학생 출석 현황을 관리하세요</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={courseConfigSetLoading || loading}
            className="gap-2 rounded-xl border-white/40 bg-white/60 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 ${courseConfigSetLoading || loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
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

      {/* 필터 카드 */}
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

      {/* 과목별 보기 (검색 + 그리드) */}
      {variantTabs.length ? (
        <div className="rounded-2xl border border-white/40 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl">
          {/* 헤더: 타이틀 + 오늘 수업만 + 검색 */}
          <div className="flex flex-col gap-3 border-b border-slate-200/60 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100">
                  <BookOpen className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">과목별 보기</h3>
                  <p className="text-xs text-slate-500">
                    {filteredVariantTabs.length === variantTabs.length
                      ? `${variantTabs.length}개 과목`
                      : `${filteredVariantTabs.length}개 / ${variantTabs.length}개 과목`}
                  </p>
                </div>
              </div>
              
              {/* 오늘 수업만 토글 */}
              <button
                type="button"
                onClick={() => setTodayOnly(!todayOnly)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  todayOnly
                    ? "border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                    : "border-slate-200/80 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                <span>오늘 수업만</span>
                <Badge
                  variant="secondary"
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                    todayOnly
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {todayCoursesCount}개
                </Badge>
              </button>
            </div>
            
            {/* 과목 검색 (초성 지원) */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={courseSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseSearch(e.target.value)}
                placeholder="과목 검색 (초성 지원: ㄱㄴㄷ)"
                className="h-10 rounded-xl border-slate-200/60 bg-white/80 pl-10 pr-10 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:shadow-md"
              />
              {courseSearch ? (
                <button
                  type="button"
                  onClick={() => setCourseSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>

          {/* 과목 그리드 */}
          <div className="p-4">
            {filteredVariantTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {todayOnly && !courseSearch ? (
                  <>
                    <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">오늘 수업이 있는 과목이 없습니다</p>
                    <button
                      type="button"
                      onClick={() => setTodayOnly(false)}
                      className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      전체 과목 보기
                    </button>
                  </>
                ) : (
                  <>
                    <Search className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      {courseSearch ? `"${courseSearch}" 검색 결과가 없습니다` : "표시할 과목이 없습니다"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseSearch("")
                        setTodayOnly(false)
                      }}
                      className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      필터 초기화
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[280px]">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {filteredVariantTabs.map((tab) => {
                    const isActive = variantFilter === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setVariantFilter(tab.key)}
                        className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                          isActive
                            ? "border-violet-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/20"
                            : "border-slate-200/80 bg-white hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
                        }`}
                        title={tab.label}
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-xs font-semibold ${
                            isActive ? "text-white" : "text-slate-700 group-hover:text-violet-700"
                          }`}
                        >
                          {tab.label}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 rounded px-1.5 py-0 text-[10px] font-bold leading-tight ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600"
                          }`}
                        >
                          {tab.count}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 영역 */}
      {!selectedCourseConfigSet ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/50">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-600">설정 세트를 먼저 선택하세요</p>
          <p className="mt-1 text-sm text-slate-400">상단에서 설정 세트를 선택하면 출석부가 표시됩니다</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-16 text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          <p className="text-base font-medium text-slate-600">불러오는 중...</p>
        </div>
      ) : courseConfigSetCourseSet.size === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100/50">
            <Users className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-base font-medium text-slate-600">선택한 설정 세트에 과목이 없습니다</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/50">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-600">표시할 데이터가 없습니다</p>
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
