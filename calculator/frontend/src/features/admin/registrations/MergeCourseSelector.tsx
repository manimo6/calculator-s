import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, X } from "lucide-react"

import { MERGE_MANAGER_COPY as COPY } from "./mergeManagerCopy"
import {
  ALL_MERGE_TAB,
  buildAvailableMergeTabs,
  filterMergeCourses,
  toggleMergeCourseSelection,
} from "./mergeManagerModel"

type MergeCourseSelectorProps = {
  courseOptions: string[]
  courseTabs: string[]
  mergeCourses: string[]
  onMergeCoursesChange: (value: string[]) => void
}

export function MergeCourseSelector({
  courseOptions,
  courseTabs,
  mergeCourses,
  onMergeCoursesChange,
}: MergeCourseSelectorProps) {
  const [courseTab, setCourseTab] = useState(ALL_MERGE_TAB)
  const [search, setSearch] = useState("")
  const availableTabs = useMemo(
    () => buildAvailableMergeTabs(courseTabs, courseOptions),
    [courseOptions, courseTabs]
  )
  const selectedSet = useMemo(
    () => new Set((mergeCourses || []).filter(Boolean)),
    [mergeCourses]
  )
  const filteredCourses = useMemo(
    () =>
      filterMergeCourses({
        courseOptions,
        courseTab,
        search,
      }),
    [courseOptions, courseTab, search]
  )

  useEffect(() => {
    if (!availableTabs.length) {
      if (courseTab !== ALL_MERGE_TAB) setCourseTab(ALL_MERGE_TAB)
      return
    }
    if (courseTab !== ALL_MERGE_TAB && !availableTabs.includes(courseTab)) {
      setCourseTab(ALL_MERGE_TAB)
    }
  }, [availableTabs, courseTab])

  const toggleCourse = (course: string) => {
    const next = toggleMergeCourseSelection(mergeCourses || [], selectedSet, course)
    onMergeCoursesChange(next)
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="mergeCourses" className="text-sm font-semibold text-slate-700">
        {COPY.courseSelect} <span className="text-xs font-normal text-slate-500">{COPY.minTwo}</span>
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between rounded-xl border-slate-200/70 bg-white shadow-sm transition-all hover:shadow-md"
            id="mergeCourses"
          >
            <span className="truncate font-medium text-slate-700">
              {mergeCourses?.length
                ? `${mergeCourses.length}${COPY.selectedCountSuffix}`
                : COPY.selectPrompt}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[400px] rounded-2xl border-slate-200/70 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
        >
          <div className="space-y-4">
            {availableTabs.length ? (
              <Tabs value={courseTab} onValueChange={setCourseTab}>
                <div className="min-w-0 overflow-x-auto pb-1">
                  <TabsList className="h-auto min-w-max justify-start gap-2 rounded-lg bg-slate-100/80 p-1">
                    <TabsTrigger
                      value={ALL_MERGE_TAB}
                      className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      {COPY.all}
                    </TabsTrigger>
                    {availableTabs.map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            ) : null}

            <Input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder={COPY.searchPlaceholder}
              className="h-10 rounded-lg border-slate-200/70 bg-white shadow-sm"
            />

            <div className="max-h-72 space-y-1 overflow-auto rounded-xl border border-slate-200/70 bg-slate-50/30 p-2">
              {filteredCourses.length ? (
                filteredCourses.map((course) => (
                  <label
                    key={course}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white hover:shadow-sm"
                  >
                    <Checkbox
                      checked={selectedSet.has(course)}
                      onCheckedChange={() => toggleCourse(course)}
                      className="border-slate-300 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600"
                    />
                    <span className="truncate font-medium text-slate-700">{course}</span>
                  </label>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center px-2 py-8 text-center text-sm text-slate-400">
                  <svg className="mb-2 h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {COPY.noResults}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50/60 px-3 py-2 text-xs">
              <span className="font-medium text-slate-600">{COPY.minTwoHint}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onMergeCoursesChange([])}
                disabled={!mergeCourses?.length}
                className="h-7 rounded-md text-xs hover:bg-slate-200/60"
              >
                {COPY.clearAll}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex min-h-[3rem] flex-wrap gap-2 rounded-lg bg-slate-50/40 p-3">
        {mergeCourses?.length ? (
          mergeCourses.map((course) => (
            <Badge
              key={course}
              variant="secondary"
              className="flex max-w-full items-center gap-2 rounded-full border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1.5 text-indigo-900 shadow-sm transition-all hover:shadow-md"
            >
              <span className="max-w-[220px] truncate font-medium">{course}</span>
              <button
                type="button"
                onClick={() => toggleCourse(course)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200/60 text-indigo-700 transition-colors hover:bg-indigo-300"
                aria-label={`${course} ${COPY.removeCourse}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            {COPY.noSelectedCourses}
          </div>
        )}
      </div>
    </div>
  )
}
