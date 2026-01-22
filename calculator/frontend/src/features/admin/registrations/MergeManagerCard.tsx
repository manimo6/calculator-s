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
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">합반 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="mergeName">합반 이름</Label>
            <Input
              id="mergeName"
              value={mergeName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onMergeNameChange(e.target.value)
              }
              placeholder="예: A반+B반"
            />
            <div className="space-y-2 rounded-md border border-border/60 bg-background p-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">적용 주차</Label>
                <Select
                  value={mergeWeekMode}
                  onValueChange={(value) =>
                    onMergeWeekModeChange(value as MergeWeekMode)
                  }
                >
                  <SelectTrigger className="h-8 w-[120px] bg-background text-xs">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="range">범위</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mergeWeekMode === "range" ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    type="number"
                    min="1"
                    value={mergeWeekStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onMergeWeekStartChange(e.target.value)
                    }
                    placeholder="시작 주차"
                    className="h-8"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={mergeWeekEnd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onMergeWeekEndChange(e.target.value)
                    }
                    placeholder="종료 주차"
                    className="h-8"
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  전체 주차에 합반을 적용합니다.
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor="mergeCourses">과목 선택(2개 이상)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  id="mergeCourses"
                >
                  <span className="truncate">
                    {mergeCourses?.length
                      ? `${mergeCourses.length}개 선택됨`
                      : "과목을 선택하세요"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[360px] p-3">
                <div className="space-y-3">
                  {availableTabs.length ? (
                    <Tabs value={courseTab} onValueChange={setCourseTab}>
                      <div className="min-w-0 overflow-x-auto pb-1">
                        <TabsList className="h-auto min-w-max justify-start gap-2 bg-transparent p-0">
                          <TabsTrigger value={ALL_TAB}>전체</TabsTrigger>
                          {availableTabs.map((tab) => (
                            <TabsTrigger key={tab} value={tab}>
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
                  />
                  <div className="max-h-64 space-y-1 overflow-auto rounded-md border border-border/60 p-2">
                    {filteredCourses.length ? (
                      filteredCourses.map((course) => (
                        <label
                          key={course}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                  <Checkbox
                    checked={selectedSet.has(course)}
                    onCheckedChange={() => toggleCourse(course)}
                  />
                          <span className="truncate">{course}</span>
                        </label>
                      ))
                    ) : (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>2개 이상 선택</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearCourses}
                      disabled={!mergeCourses?.length}
                    >
                      전체 해제
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2 pt-1">
              {mergeCourses?.length ? (
                mergeCourses.map((course) => (
                  <Badge
                    key={course}
                    variant="secondary"
                    className="flex max-w-full items-center gap-1"
                  >
                    <span className="max-w-[220px] truncate">{course}</span>
                    <button
                      type="button"
                      onClick={() => toggleCourse(course)}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted"
                      aria-label={`${course} 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  선택된 과목이 없습니다.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end md:col-span-2">
            <Button type="button" onClick={onAddMerge} className="w-full">
              합반 추가
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">등록된 합반</div>
          {merges?.length ? (
            <ul className="space-y-2">
              {merges.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-semibold">[합반]</span>{" "}
                    <span className="break-all">
                      {m.name || (m.courses || []).join(" + ")}
                    </span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      적용 주차: {formatWeekRanges(m.weekRanges)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
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
            <div className="text-sm text-muted-foreground">
              등록된 합반이 없습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

