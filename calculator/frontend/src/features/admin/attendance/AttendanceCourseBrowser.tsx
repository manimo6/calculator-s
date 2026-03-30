import type { ChangeEvent } from "react"

import { BookOpen, CalendarCheck, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { ATTENDANCE_TAB_COPY as COPY } from "./attendanceTabCopy"
import type { AttendanceVariantTab, TimeGroupedTabs } from "./attendanceTabModel"

type AttendanceCourseBrowserProps = {
  variantTabs: AttendanceVariantTab[]
  filteredVariantTabs: AttendanceVariantTab[]
  variantFilter: string
  courseSearch: string
  todayOnly: boolean
  todayCoursesCount: number
  timeGroupedTabs?: TimeGroupedTabs
  onVariantFilterChange: (value: string) => void
  onCourseSearchChange: (value: string) => void
  onTodayOnlyChange: (value: boolean) => void
}

export default function AttendanceCourseBrowser({
  variantTabs,
  filteredVariantTabs,
  variantFilter,
  courseSearch,
  todayOnly,
  todayCoursesCount,
  timeGroupedTabs,
  onVariantFilterChange,
  onCourseSearchChange,
  onTodayOnlyChange,
}: AttendanceCourseBrowserProps) {
  if (!variantTabs.length) return null

  function CourseButton({ tab, isActive, onClick }: { tab: AttendanceVariantTab; isActive: boolean; onClick: (key: string) => void }) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onClick(tab.key)}
            className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
              isActive
                ? "border-violet-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/20"
                : "border-slate-200/80 bg-white hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
            }`}
          >
            <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${isActive ? "text-white" : "text-slate-700 group-hover:text-violet-700"}`}>
              {tab.label}
            </span>
            <Badge
              variant="secondary"
              className={`shrink-0 rounded px-1.5 py-0 text-[10px] font-bold leading-tight ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600"
              }`}
            >
              {tab.count}
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tab.label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 shadow-lg shadow-black/5 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200/60 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100">
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{COPY.courseBrowserTitle}</h3>
              <p className="text-xs text-slate-500">
                {filteredVariantTabs.length === variantTabs.length
                  ? `${variantTabs.length}${COPY.courseCountSuffix}`
                  : `${filteredVariantTabs.length}${COPY.courseCountSuffix} / ${variantTabs.length}${COPY.courseCountSuffix}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onTodayOnlyChange(!todayOnly)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              todayOnly
                ? "border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                : "border-slate-200/80 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            <span>{COPY.todayOnly}</span>
            <Badge
              variant="secondary"
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                todayOnly
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {todayCoursesCount}
              {COPY.courseCountSuffix.replace(" \uACFC\uBAA9", "")}
            </Badge>
          </button>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={courseSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onCourseSearchChange(e.target.value)}
            placeholder={COPY.searchPlaceholder}
            className="h-10 rounded-xl border-slate-200/60 bg-white/80 pl-10 pr-10 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:shadow-md"
          />
          {courseSearch ? (
            <button
              type="button"
              onClick={() => onCourseSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        {filteredVariantTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {todayOnly && !courseSearch ? (
              <>
                <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">{COPY.emptyTodayOnly}</p>
                <button
                  type="button"
                  onClick={() => onTodayOnlyChange(false)}
                  className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  {COPY.showAllCourses}
                </button>
              </>
            ) : (
              <>
                <Search className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  {courseSearch ? `"${courseSearch}" ${COPY.emptyNoSearchResult}` : COPY.emptyNoCourses}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onCourseSearchChange("")
                    onTodayOnlyChange(false)
                  }}
                  className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  {COPY.resetFilters}
                </button>
              </>
            )}
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
          <ScrollArea>
            {todayOnly && timeGroupedTabs && timeGroupedTabs.length > 0 ? (
              <div className="space-y-3">
                {timeGroupedTabs.map((group) => (
                  <div key={group.time}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">{group.label}</span>
                      <div className="h-px flex-1 bg-slate-200/60" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {group.tabs.map((tab) => (
                        <CourseButton key={tab.key} tab={tab} isActive={variantFilter === tab.key} onClick={onVariantFilterChange} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {filteredVariantTabs.map((tab) => (
                  <CourseButton key={tab.key} tab={tab} isActive={variantFilter === tab.key} onClick={onVariantFilterChange} />
                ))}
              </div>
            )}
          </ScrollArea>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
