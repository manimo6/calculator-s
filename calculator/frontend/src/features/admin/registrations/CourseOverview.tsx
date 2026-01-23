import { useMemo } from "react"

import { BookOpen, CheckCircle2, Clock, Grid3X3, TimerOff } from "lucide-react"

import { getRegistrationStatus } from "./utils"

type RegistrationRow = {
  courseId?: string | number
  course?: string
  startDate?: string | Date
  endDate?: string | Date
} & Record<string, unknown>

type CourseBreakdown = {
  active: number
  pending: number
  completed: number
}

type CourseCardProps = {
  course: string
  count: number
  breakdown: CourseBreakdown
  selected: boolean
  onClick: () => void
}

function CourseCard({ course, count, breakdown, selected, onClick }: CourseCardProps) {
  const baseClass = selected
    ? "relative overflow-hidden rounded-2xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 shadow-lg ring-2 ring-indigo-200/50 transition-all hover:shadow-xl"
    : "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"

  return (
    <button type="button" onClick={onClick} className="text-left w-full">
      <div className={baseClass}>
        {/* 배경 장식 */}
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100/40 to-purple-100/40 blur-2xl" />

        {/* 헤더 */}
        <div className="relative mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="truncate text-sm font-semibold text-slate-700">{course}</span>
        </div>

        {/* 메인 숫자 */}
        <div className="relative mb-4">
          <div className="text-4xl font-black tracking-tight text-slate-900">
            {count}
            <span className="ml-1 text-lg font-semibold text-slate-500">명</span>
          </div>
        </div>

        {/* 상태별 breakdown */}
        <div className="relative flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-emerald-700">{breakdown.active}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-3 w-3 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-amber-700">{breakdown.pending}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
              <TimerOff className="h-3 w-3 text-slate-500" />
            </div>
            <span className="text-xs font-semibold text-slate-600">{breakdown.completed}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

type CourseOverviewProps = {
  registrations: RegistrationRow[]
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet?: Set<string>
}

export default function CourseOverview({
  registrations,
  courseFilter,
  onCourseFilterChange,
  courseIdToLabel,
  courseVariantRequiredSet,
}: CourseOverviewProps) {
  const isMergeFilter = typeof courseFilter === "string" && courseFilter.startsWith("__merge__")
  const selectedCourse = !isMergeFilter ? courseFilter : ""
  const courseIdLabelMap = courseIdToLabel instanceof Map ? courseIdToLabel : new Map()
  const variantSet = courseVariantRequiredSet instanceof Set ? courseVariantRequiredSet : new Set<string>()

  const getCourseKey = (registration: RegistrationRow) => {
    const courseId = String(registration?.courseId || "").trim()
    const courseName = String(registration?.course || "").trim()

    // 동적시간 수업인 경우 courseName(라벨)을 키로 사용하여 별도 카드로 분리
    if (courseName && variantSet.size > 0) {
      for (const base of variantSet) {
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

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { key: string; course: string; rows: RegistrationRow[]; breakdown: CourseBreakdown }
    >()
    for (const r of registrations || []) {
      const course = String(r?.course || "")
      const key = getCourseKey(r)
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, {
          key,
          course: getCourseLabel(key, course),
          rows: [],
          breakdown: { active: 0, pending: 0, completed: 0 },
        })
      }
      const entry = map.get(key)
      if (!entry) continue
      entry.rows.push(r)
      const status = getRegistrationStatus(r)
      if (status === "active") entry.breakdown.active += 1
      else if (status === "pending") entry.breakdown.pending += 1
      else if (status === "completed") entry.breakdown.completed += 1
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.rows.length !== a.rows.length) return b.rows.length - a.rows.length
      return a.course.localeCompare(b.course, "ko-KR")
    })
  }, [registrations, courseIdLabelMap, variantSet])

  if (!grouped.length) return null

  // 선택된 카드만 표시 또는 전체 표시
  const displayGroups = selectedCourse 
    ? grouped.filter(g => g.key === selectedCourse)
    : grouped

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Grid3X3 className="h-4 w-4" />
        과목별 요약 (클릭해서 필터)
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayGroups.map((g) => (
          <CourseCard
            key={g.key}
            course={g.course}
            count={g.rows.length}
            breakdown={g.breakdown}
            selected={selectedCourse === g.key}
            onClick={() =>
              onCourseFilterChange(selectedCourse === g.key ? "" : g.key)
            }
          />
        ))}
      </div>
    </div>
  )
}
