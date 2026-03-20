import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Book,
  BookCopy,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  LayoutGrid,
  RotateCcw,
  Search,
  TimerOff,
  Users,
  X
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import { getRegistrationStatus } from "./utils"

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

type RegistrationRow = {
  courseId?: string | number
  course?: string
  startDate?: string | Date
  endDate?: string | Date
} & Record<string, unknown>

type ActiveMerge = {
  id: string
  name: string
  courses: string[]
  weekRanges: Array<{ start: number; end: number }>
  isActive: boolean
  courseConfigSetName: string
  referenceStartDate: string | null
}

type SidebarProps = {
  registrations: RegistrationRow[]
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet?: Set<string>
  merges?: Array<{ id?: string | number; name?: string; courses?: string[] }>
  activeMergesToday?: ActiveMerge[]
  mergedCourseSetToday?: Set<string>
  variantTabs?: Array<{ key: string; label: string; count: number }>
  variantFilter?: string
  onVariantFilterChange?: (value: string) => void
  simulationDate?: Date | null
  onSimulationDateChange?: (date: Date | null) => void
}

export default function RegistrationsSidebar({
  registrations,
  courseFilter,
  onCourseFilterChange,
  courseIdToLabel,
  courseVariantRequiredSet,
  merges = [],
  activeMergesToday = [],
  mergedCourseSetToday = new Set(),
  variantTabs = [],
  variantFilter,
  onVariantFilterChange,
  simulationDate = null,
  onSimulationDateChange,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMerges, setExpandedMerges] = useState<Set<string>>(new Set())
  const isMergeFilter = typeof courseFilter === "string" && courseFilter.startsWith("__merge__")
  
  // Stats calculation
  const stats = useMemo(() => {
    const list = registrations || []
    const counts = { total: list.length, active: 0, pending: 0, completed: 0 }
    
    for (const r of list) {
      const status = getRegistrationStatus(r)
      if (status === "active") counts.active += 1
      else if (status === "pending") counts.pending += 1
      else if (status === "completed") counts.completed += 1
    }
    return counts
  }, [registrations])

  // Course grouping logic (reused from CourseOverview)
  const courseGroups = useMemo(() => {
    const courseIdLabelMap = courseIdToLabel instanceof Map ? courseIdToLabel : new Map()
    const variantSet = courseVariantRequiredSet instanceof Set ? courseVariantRequiredSet : new Set<string>()

    const getCourseKey = (registration: RegistrationRow) => {
      const courseId = String(registration?.courseId || "").trim()
      const courseName = String(registration?.course || "").trim()

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

    const map = new Map<string, { key: string; label: string; count: number }>()
    
    for (const r of registrations || []) {
      const course = String(r?.course || "")
      const key = getCourseKey(r)
      if (!key) continue
      
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: getCourseLabel(key, course),
          count: 0
        })
      }
      const entry = map.get(key)
      if (entry) entry.count += 1
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))
  }, [registrations, courseIdToLabel, courseVariantRequiredSet])

  type SubCourse = { label: string; count: number; key: string }
  type SidebarItem = { key: string; label: string; count: number; isMerge?: boolean; subCourses?: SubCourse[] }

  // 합반 활성 시 해당 과목 숨김 + 합반 항목 삽입 + 검색 필터
  const filteredCourseGroups = useMemo(() => {
    // 개별 과목에서 합반 중인 과목 제거
    let groups: SidebarItem[] = courseGroups
    if (mergedCourseSetToday.size > 0) {
      groups = groups.filter((g) => !mergedCourseSetToday.has(g.label))
    }

    // 오늘 활성 합반을 목록에 삽입 (하위 과목 포함)
    for (const m of activeMergesToday) {
      const subCourses = (m.courses || []).map((courseName) => {
        const matched = courseGroups.find((g) => g.label === courseName)
        return { label: courseName, count: matched?.count || 0, key: matched?.key || `__coursename__${courseName}` }
      })
      const totalCount = subCourses.reduce((sum, sc) => sum + sc.count, 0)
      groups.push({
        key: `__merge__${m.id}`,
        label: m.name || m.courses.join(" + "),
        count: totalCount,
        isMerge: true,
        subCourses,
      })
    }

    // 가나다순 정렬
    groups = groups.slice().sort((a, b) => a.label.localeCompare(b.label, "ko-KR"))

    if (searchQuery.trim()) {
      groups = groups.filter((g) => matchesSearch(g.label, searchQuery.trim()))
    }
    return groups
  }, [courseGroups, searchQuery, mergedCourseSetToday, activeMergesToday])

  const toggleMergeExpand = useCallback((mergeKey: string) => {
    setExpandedMerges((prev) => {
      const next = new Set(prev)
      if (next.has(mergeKey)) next.delete(mergeKey)
      else next.add(mergeKey)
      return next
    })
  }, [])

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/60 bg-white/60 backdrop-blur-xl">
      {/* Summary Stats Header */}
      <div className="p-4 border-b border-border/40">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          전체 현황
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50/50 p-2 border border-emerald-100/50">
            <div className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 진행중
            </div>
            <div className="text-lg font-bold text-emerald-700">{stats.active}</div>
          </div>
          <div className="rounded-lg bg-amber-50/50 p-2 border border-amber-100/50">
            <div className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
              <Clock className="h-3 w-3" /> 시작전
            </div>
            <div className="text-lg font-bold text-amber-700">{stats.pending}</div>
          </div>
          <div className="rounded-lg bg-slate-50/50 p-2 border border-slate-100/50 col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <TimerOff className="h-3 w-3" /> 완료
              </div>
              <div className="text-sm font-bold text-slate-600">{stats.completed}</div>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <Users className="h-3 w-3" /> 전체
              </div>
              <div className="text-sm font-bold text-slate-600">{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Simulation */}
      {onSimulationDateChange && (
        <div className="px-4 py-2.5 border-b border-border/40">
          {simulationDate ? (
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/60 px-3 py-2 shadow-sm">
              <Eye className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 text-left text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors cursor-pointer">
                    {simulationDate.getFullYear()}.{String(simulationDate.getMonth() + 1).padStart(2, "0")}.{String(simulationDate.getDate()).padStart(2, "0")} 기준
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" side="right">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
                      <div className="text-xs font-semibold text-violet-700">날짜 시뮬레이션</div>
                      <div className="text-[10px] text-violet-500 mt-0.5">선택한 날짜 기준으로 합반 상태를 미리봅니다</div>
                    </div>
                    <Calendar
                      mode="single"
                      selected={simulationDate}
                      onSelect={(value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                        const d = value instanceof Date ? value : null
                        if (d) onSimulationDateChange(d)
                      }}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <button
                onClick={() => onSimulationDateChange(null)}
                className="flex h-5 w-5 items-center justify-center rounded-md text-violet-400 hover:bg-violet-100 hover:text-violet-600 transition-colors"
                title="오늘로 돌아가기"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-xl border border-violet-200/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 px-3 py-2 text-xs font-semibold text-violet-500 shadow-sm hover:from-violet-100 hover:to-indigo-100 hover:text-violet-700 hover:shadow-md transition-all cursor-pointer">
                  <CalendarDays className="h-3.5 w-3.5" />
                  날짜 시뮬레이션
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" side="right">
                <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
                    <div className="text-xs font-semibold text-violet-700">날짜 시뮬레이션</div>
                    <div className="text-[10px] text-violet-500 mt-0.5">선택한 날짜 기준으로 합반 상태를 미리봅니다</div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={new Date()}
                    onSelect={(value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                      const d = value instanceof Date ? value : null
                      if (d) onSimulationDateChange(d)
                    }}
                    initialFocus
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <Button
              variant={!courseFilter ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                !courseFilter ? "bg-slate-900 text-white hover:bg-slate-800" : "text-muted-foreground hover:text-slate-900"
              )}
              onClick={() => onCourseFilterChange("")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="flex-1 text-left text-sm font-medium">전체보기</span>
            </Button>
          </div>

          {/* Course Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="과목 검색 (초성 지원)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs bg-slate-50/80 border-slate-200/60 placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Courses + Merges List */}
          <div>
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
              과목별 {searchQuery && `(${filteredCourseGroups.length}/${courseGroups.length})`}
            </h3>
            <div className="space-y-0.5">
              {filteredCourseGroups.length === 0 && searchQuery ? (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              ) : null}
              {filteredCourseGroups.map((group) =>
                group.isMerge ? (
                  <div key={group.key}>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleMergeExpand(group.key)}
                        className="flex items-center justify-center w-5 h-10 text-slate-400 hover:text-slate-600"
                      >
                        {expandedMerges.has(group.key)
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-1 justify-start gap-2 h-10 px-1",
                          courseFilter === group.key
                            ? "bg-purple-50 text-purple-700 font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                        onClick={() => onCourseFilterChange(group.key)}
                      >
                        <BookCopy className={cn("h-4 w-4", courseFilter === group.key ? "text-purple-500" : "text-purple-400")} />
                        <span className="flex-1 text-left truncate text-sm font-medium">{group.label}</span>
                        <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-normal text-muted-foreground bg-white/50">
                          {group.count}
                        </Badge>
                      </Button>
                    </div>
                    {expandedMerges.has(group.key) && group.subCourses && (
                      <div className="ml-5 border-l border-purple-100 pl-1 space-y-0.5">
                        {group.subCourses.map((sc) => (
                          <Button
                            key={sc.key}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-2 h-8 px-2 text-xs",
                              courseFilter === sc.key
                                ? "bg-purple-50/50 text-purple-600 font-medium"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                            onClick={() => onCourseFilterChange(sc.key)}
                          >
                            <Book className="h-3 w-3 text-slate-400" />
                            <span className="flex-1 text-left truncate">{sc.label}</span>
                            <span className="text-[10px] text-muted-foreground">{sc.count}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    key={group.key}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-10 px-2",
                      courseFilter === group.key
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                    onClick={() => onCourseFilterChange(group.key)}
                  >
                    <Book className={cn("h-4 w-4", courseFilter === group.key ? "text-indigo-500" : "text-slate-400")} />
                    <span className="flex-1 text-left truncate text-sm font-medium">{group.label}</span>
                    <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-normal text-muted-foreground bg-white/50">
                      {group.count}
                    </Badge>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Variant Tabs (Bottom) */}
      {variantTabs.length > 0 && onVariantFilterChange && (
        <div className="p-3 border-t border-border/40 bg-slate-50/50">
          <div className="flex flex-wrap gap-1">
             {variantTabs.map((tab) => (
               <button
                 key={tab.key}
                 onClick={() => onVariantFilterChange(tab.key)}
                 className={cn(
                   "text-[10px] px-2 py-1 rounded-full border transition-colors",
                   variantFilter === tab.key
                     ? "bg-white border-slate-300 text-slate-900 shadow-sm font-medium"
                     : "bg-transparent border-transparent text-muted-foreground hover:bg-white/50"
                 )}
               >
                 {tab.label}
               </button>
             ))}
          </div>
        </div>
      )}
    </div>
  )
}
