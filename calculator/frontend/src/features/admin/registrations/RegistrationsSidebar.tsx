import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  LayoutGrid, 
  Layers, 
  Search,
  TimerOff,
  Users,
  X
} from "lucide-react"
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

type SidebarProps = {
  registrations: RegistrationRow[]
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet?: Set<string>
  merges?: Array<{ id?: string | number; name?: string; courses?: string[] }>
  variantTabs?: Array<{ key: string; label: string; count: number }>
  variantFilter?: string
  onVariantFilterChange?: (value: string) => void
}

export default function RegistrationsSidebar({
  registrations,
  courseFilter,
  onCourseFilterChange,
  courseIdToLabel,
  courseVariantRequiredSet,
  merges = [],
  variantTabs = [],
  variantFilter,
  onVariantFilterChange
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
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

  // 검색 필터링된 과목 리스트
  const filteredCourseGroups = useMemo(() => {
    if (!searchQuery.trim()) return courseGroups
    return courseGroups.filter((group) => matchesSearch(group.label, searchQuery.trim()))
  }, [courseGroups, searchQuery])

  // Merge groups
  const mergeGroups = useMemo(() => {
    return merges.map(m => ({
      key: `__merge__${m.id}`,
      label: m.name || (m.courses || []).join(" + "),
      count: 0 // We'd need to calculate actual count if needed, but for now simple list
    }))
  }, [merges])

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

          {/* Courses List */}
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
              {filteredCourseGroups.map((group) => (
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
                  <BookOpen className={cn("h-4 w-4", courseFilter === group.key ? "text-indigo-500" : "text-slate-400")} />
                  <span className="flex-1 text-left truncate text-sm font-medium">{group.label}</span>
                  <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-normal text-muted-foreground bg-white/50">
                    {group.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Merge Groups */}
          {mergeGroups.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">합반 그룹</h3>
              <div className="space-y-0.5">
                {mergeGroups.map((group) => (
                  <Button
                    key={group.key}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-10 px-2",
                      courseFilter === group.key 
                        ? "bg-purple-50 text-purple-700 font-semibold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                    onClick={() => onCourseFilterChange(group.key)}
                  >
                    <Layers className={cn("h-4 w-4", courseFilter === group.key ? "text-purple-500" : "text-slate-400")} />
                    <span className="flex-1 text-left truncate text-sm font-medium">{group.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
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
