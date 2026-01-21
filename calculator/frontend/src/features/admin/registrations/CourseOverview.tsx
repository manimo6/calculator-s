import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"

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
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={
          selected
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 bg-card/60"
        }
      >
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="truncate">{course}</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold">{count}명</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {breakdown.active}명
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              {breakdown.pending}명
            </span>
            <span className="inline-flex items-center gap-1">
              <TimerOff className="h-3.5 w-3.5 text-zinc-500" />
              {breakdown.completed}명
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

type CourseOverviewProps = {
  registrations: RegistrationRow[]
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  courseIdToLabel: Map<string, string>
}

export default function CourseOverview({
  registrations,
  courseFilter,
  onCourseFilterChange,
  courseIdToLabel,
}: CourseOverviewProps) {
  const isMergeFilter = typeof courseFilter === "string" && courseFilter.startsWith("__merge__")
  const selectedCourse = !isMergeFilter ? courseFilter : ""
  const courseIdLabelMap = courseIdToLabel instanceof Map ? courseIdToLabel : new Map()

  const getCourseKey = (registration: RegistrationRow) => {
    const courseId = String(registration?.courseId || "").trim()
    if (courseId) return `__courseid__${courseId}`
    const courseName = String(registration?.course || "").trim()
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
  }, [registrations, courseIdLabelMap])

  if (!grouped.length) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Grid3X3 className="h-4 w-4" />
        과목별 요약 (클릭해서 필터)
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {grouped.map((g) => (
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
