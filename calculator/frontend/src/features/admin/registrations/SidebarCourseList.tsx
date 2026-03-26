import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Book,
  BookCopy,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Search,
  X,
} from "lucide-react"

import { REGISTRATIONS_SIDEBAR_COPY as COPY } from "./registrationsSidebarCopy"
import type { SidebarItem } from "./registrationsSidebarModel"

function SidebarSearchBox({
  searchQuery,
  onSearchQueryChange,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
      <Input
        type="text"
        placeholder={COPY.searchPlaceholder}
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="h-8 border-slate-200/60 bg-slate-50/80 pl-8 pr-8 text-xs placeholder:text-muted-foreground/50"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchQueryChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export function SidebarCourseList({
  courseFilter,
  onCourseFilterChange,
  filteredCourseGroups,
  totalCourseGroups,
  searchQuery,
  onSearchQueryChange,
  expandedMerges,
  onToggleMergeExpand,
}: {
  courseFilter: string
  onCourseFilterChange: (value: string) => void
  filteredCourseGroups: SidebarItem[]
  totalCourseGroups: number
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  expandedMerges: Set<string>
  onToggleMergeExpand: (mergeKey: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button
          variant={!courseFilter ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-2",
            !courseFilter
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "text-muted-foreground hover:text-slate-900"
          )}
          onClick={() => onCourseFilterChange("")}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="flex-1 text-left text-sm font-medium">{COPY.allView}</span>
        </Button>
      </div>

      <SidebarSearchBox
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
      />

      <div>
        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
          {COPY.byCourse}
          {searchQuery ? ` (${filteredCourseGroups.length}/${totalCourseGroups})` : ""}
        </h3>
        <div className="space-y-0.5">
          {filteredCourseGroups.length === 0 && searchQuery ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              {COPY.noResults}
            </div>
          ) : null}
          {filteredCourseGroups.map((group) =>
            group.isMerge ? (
              <div key={group.key}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onToggleMergeExpand(group.key)}
                    className="flex h-10 w-5 items-center justify-center text-slate-400 hover:text-slate-600"
                  >
                    {expandedMerges.has(group.key) ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-10 flex-1 justify-start gap-2 px-1",
                      courseFilter === group.key
                        ? "bg-purple-50 font-semibold text-purple-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    onClick={() => onCourseFilterChange(group.key)}
                  >
                    <BookCopy
                      className={cn(
                        "h-4 w-4",
                        courseFilter === group.key ? "text-purple-500" : "text-purple-400"
                      )}
                    />
                    <span className="flex-1 truncate text-left text-sm font-medium">
                      {group.label}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 rounded-md bg-white/50 px-1.5 text-[10px] font-normal text-muted-foreground"
                    >
                      {group.count}
                    </Badge>
                  </Button>
                </div>
                {expandedMerges.has(group.key) && group.subCourses ? (
                  <div className="ml-5 space-y-0.5 border-l border-purple-100 pl-1">
                    {group.subCourses.map((course) => (
                      <Button
                        key={course.key}
                        variant="ghost"
                        className={cn(
                          "h-8 w-full justify-start gap-2 px-2 text-xs",
                          courseFilter === course.key
                            ? "bg-purple-50/50 font-medium text-purple-600"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                        onClick={() => onCourseFilterChange(course.key)}
                      >
                        <Book className="h-3 w-3 text-slate-400" />
                        <span className="flex-1 truncate text-left">{course.label}</span>
                        <span className="text-[10px] text-muted-foreground">{course.count}</span>
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Button
                key={group.key}
                variant="ghost"
                className={cn(
                  "h-10 w-full justify-start gap-2 px-2",
                  courseFilter === group.key
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => onCourseFilterChange(group.key)}
              >
                <Book
                  className={cn(
                    "h-4 w-4",
                    courseFilter === group.key ? "text-indigo-500" : "text-slate-400"
                  )}
                />
                <span className="flex-1 truncate text-left text-sm font-medium">{group.label}</span>
                <Badge
                  variant="secondary"
                  className="h-5 rounded-md bg-white/50 px-1.5 text-[10px] font-normal text-muted-foreground"
                >
                  {group.count}
                </Badge>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
