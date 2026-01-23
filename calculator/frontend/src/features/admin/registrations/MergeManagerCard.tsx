import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ChevronDown, X } from "lucide-react"

const ALL_TAB = "__all__"

type MergeWeekRange = { start: number; end: number }
type MergeWeekMode = "all" | "range"

type MergeEntry = {
  id?: string | number
  name?: string
  courses?: string[]
  weekRanges?: MergeWeekRange[]
} & Record<string, unknown>

type MergeManagerCardProps = {
  courseOptions: string[]
  courseTabs: string[]
  mergeName: string
  onMergeNameChange: (value: string) => void
  mergeCourses: string[]
  onMergeCoursesChange: (value: string[]) => void
  mergeWeekMode: MergeWeekMode
  onMergeWeekModeChange: (value: MergeWeekMode) => void
  mergeWeekStart: string | number
  onMergeWeekStartChange: (value: string) => void
  mergeWeekEnd: string | number
  onMergeWeekEndChange: (value: string) => void
  onAddMerge: () => void
  merges: MergeEntry[]
  onDeleteMerge: (id: string) => void
}

function formatWeekRanges(ranges: MergeWeekRange[] | null | undefined) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "전체 주차"
  }
  return ranges
    .map((range) => `${range.start}~${range.end}주차`)
    .join(", ")
}

export default function MergeManagerCard({
  courseOptions,
  courseTabs,
  mergeName,
  onMergeNameChange,
  mergeCourses,
  onMergeCoursesChange,
  mergeWeekMode,
  onMergeWeekModeChange,
  mergeWeekStart,
  onMergeWeekStartChange,
  mergeWeekEnd,
  onMergeWeekEndChange,
  onAddMerge,
  merges,
  onDeleteMerge,
}: MergeManagerCardProps) {
  const [search, setSearch] = useState("")
  const [courseTab, setCourseTab] = useState<string>(ALL_TAB)

  const availableTabs = useMemo(() => {
    const bases = Array.isArray(courseTabs) ? courseTabs.filter(Boolean) : []
    if (!bases.length) return []
    const out = []
    for (const base of bases) {
      const label = String(base || "").trim()
      if (!label) continue
      const hasMatch = (courseOptions || []).some((course) =>
        String(course || "").startsWith(label)
      )
      if (hasMatch) out.push(label)
    }
    return out
  }, [courseOptions, courseTabs])

  useEffect(() => {
    if (!availableTabs.length) {
      if (courseTab !== ALL_TAB) setCourseTab(ALL_TAB)
      return
    }
    if (courseTab !== ALL_TAB && !availableTabs.includes(courseTab)) {
      setCourseTab(ALL_TAB)
    }
  }, [availableTabs, courseTab])

  const selectedSet = useMemo(
    () => new Set((mergeCourses || []).filter(Boolean)),
    [mergeCourses]
  )
  const tabFilteredCourses = useMemo(() => {
    if (courseTab === ALL_TAB) return courseOptions
    const base = String(courseTab || "").trim()
    if (!base) return courseOptions
    return (courseOptions || []).filter((course) =>
      String(course || "").startsWith(base)
    )
  }, [courseOptions, courseTab])
  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    const source = tabFilteredCourses || []
    if (!query) return source
    return source.filter((course) =>
      String(course || "").toLowerCase().includes(query)
    )
  }, [tabFilteredCourses, search])

  const toggleCourse = (course: string) => {
    const value = String(course || "").trim()
    if (!value) return
    const next = selectedSet.has(value)
      ? (mergeCourses || []).filter((c) => c !== value)
      : [...(mergeCourses || []), value]
    onMergeCoursesChange(next)
  }

  const clearCourses = () => {
    if (mergeCourses?.length) onMergeCoursesChange([])
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-white/95 via-white/90 to-indigo-50/30 shadow-xl shadow-slate-200/30 backdrop-blur-xl ring-1 ring-slate-200/50">
      <CardHeader className="border-b border-slate-200/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">합반 설정</CardTitle>
            <p className="text-sm text-slate-500">여러 과목을 하나의 합반으로 관리합니다</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="space-y-3 md:col-span-4">
              <Label htmlFor="mergeName" className="text-sm font-semibold text-slate-700">합반 이름</Label>
              <Input
                id="mergeName"
                value={mergeName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onMergeNameChange(e.target.value)
                }
                placeholder="예: A반+B반"
                className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-indigo-500"
              />
              <div className="space-y-3 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50/50 to-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-slate-600">적용 주차</Label>
                <Select
                  value={mergeWeekMode}
                  onValueChange={(value) =>
                    onMergeWeekModeChange(value as MergeWeekMode)
                  }
                >
                  <SelectTrigger className="h-9 w-[130px] rounded-lg border-slate-200/70 bg-white text-xs shadow-sm">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="range">범위</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mergeWeekMode === "range" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="number"
                    min="1"
                    value={mergeWeekStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onMergeWeekStartChange(e.target.value)
                    }
                    placeholder="시작 주차"
                    className="h-9 rounded-lg border-slate-200/70 bg-white shadow-sm"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={mergeWeekEnd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onMergeWeekEndChange(e.target.value)
                    }
                    placeholder="종료 주차"
                    className="h-9 rounded-lg border-slate-200/70 bg-white shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  전체 주차에 합반을 적용합니다.
                </div>
              )}
              </div>
            </div>
            <div className="space-y-3 md:col-span-6">
              <Label htmlFor="mergeCourses" className="text-sm font-semibold text-slate-700">과목 선택 <span className="text-xs font-normal text-slate-500">(2개 이상)</span></Label>
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
                        ? `${mergeCourses.length}개 선택됨`
                        : "과목을 선택하세요"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
              <PopoverContent align="start" className="w-[400px] rounded-2xl border-slate-200/70 bg-white/95 p-4 shadow-xl backdrop-blur-xl">
                <div className="space-y-4">
                  {availableTabs.length ? (
                    <Tabs value={courseTab} onValueChange={setCourseTab}>
                      <div className="min-w-0 overflow-x-auto pb-1">
                        <TabsList className="h-auto min-w-max justify-start gap-2 rounded-lg bg-slate-100/80 p-1">
                          <TabsTrigger value={ALL_TAB} className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">전체</TabsTrigger>
                          {availableTabs.map((tab) => (
                            <TabsTrigger key={tab} value={tab} className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                              {tab}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </Tabs>
                  ) : null}
                  <Input
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearch(e.target.value)
                    }
                    placeholder="과목 검색"
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
                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                          <span className="truncate font-medium text-slate-700">{course}</span>
                        </label>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center px-2 py-8 text-center text-sm text-slate-400">
                        <svg className="mb-2 h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50/60 px-3 py-2 text-xs">
                    <span className="font-medium text-slate-600">2개 이상 선택 필요</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearCourses}
                      disabled={!mergeCourses?.length}
                      className="h-7 rounded-md text-xs hover:bg-slate-200/60"
                    >
                      전체 해제
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
                      aria-label={`${course} 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  선택된 과목이 없습니다.
                </div>
              )}
            </div>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button 
                type="button" 
                onClick={onAddMerge} 
                className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40"
              >
                합반 추가
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-indigo-500"></div>
            <h3 className="text-sm font-bold text-slate-800">등록된 합반</h3>
            {merges?.length ? (
              <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-700">
                {merges.length}개
              </Badge>
            ) : null}
          </div>
          {merges?.length ? (
            <ul className="space-y-3">
              {merges.map((m) => (
                <li
                  key={m.id}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-gradient-to-r from-white/90 to-slate-50/50 px-4 py-3.5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <Badge className="shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                        합반
                      </Badge>
                      <span className="break-all font-semibold text-slate-900">
                        {m.name || (m.courses || []).join(" + ")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      적용 주차: <span className="font-medium text-slate-700">{formatWeekRanges(m.weekRanges)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full border-rose-200/80 text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md"
                    onClick={() =>
                      m.id ? onDeleteMerge(String(m.id)) : undefined
                    }
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/30 px-4 py-8 text-center">
              <svg className="mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm font-medium text-slate-500">등록된 합반이 없습니다.</p>
              <p className="mt-1 text-xs text-slate-400">위에서 과목을 선택하고 합반을 추가하세요.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

