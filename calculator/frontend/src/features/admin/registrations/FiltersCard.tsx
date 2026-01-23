import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import CategoryTabs from "./CategoryTabs"
import CourseConfigSetPicker from "../courseConfigSets/CourseConfigSetPicker"
import type { CourseConfigSet } from "../courseConfigSets/utils"

const COURSE_FILTER_ALL = "__course_filter_all__"

type OptionItem = { value: string; label: string }

type FiltersCardProps = {
  courseConfigSetLoading: boolean
  courseConfigSets: CourseConfigSet[]
  selectedCourseConfigSet: string
  onSelectCourseConfigSet: (value: string) => void
  storageScope?: string
  courseConfigSetCategories: string[]
  categoryFilter: string
  onCategoryChange: (value: string) => void
  mergeOptions: OptionItem[]
  courseOptions: Array<string | OptionItem>
  courseFilter: string
  onCourseChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
  loading: boolean
  onRefresh: () => void
  mergeManagerOpen?: boolean
  onToggleMergeManager?: () => void
  showCourseFilter?: boolean
  showSearch?: boolean
  showMergeManager?: boolean
  showRefreshButton?: boolean
  installmentMode?: boolean
  onToggleInstallmentMode?: () => void
  showInstallmentToggle?: boolean
  installmentPlacement?: "top" | "bottom"
}

export default function FiltersCard({
  courseConfigSetLoading,
  courseConfigSets,
  selectedCourseConfigSet,
  onSelectCourseConfigSet,
  storageScope,
  courseConfigSetCategories,
  categoryFilter,
  onCategoryChange,
  mergeOptions,
  courseOptions,
  courseFilter,
  onCourseChange,
  search,
  onSearchChange,
  loading,
  onRefresh,
  mergeManagerOpen,
  onToggleMergeManager,
  showCourseFilter = true,
  showSearch = true,
  showMergeManager = true,
  showRefreshButton = true,
  installmentMode,
  onToggleInstallmentMode,
  showInstallmentToggle = true,
  installmentPlacement = "bottom",
}: FiltersCardProps) {
  const courseFilterValue = courseFilter || COURSE_FILTER_ALL
  const showMergeButton =
    showMergeManager && typeof onToggleMergeManager === "function"
  const showInstallmentButton =
    showInstallmentToggle && typeof onToggleInstallmentMode === "function"
  const showInstallmentInTop =
    showInstallmentButton && installmentPlacement === "top"
  const showInstallmentInBottom =
    showInstallmentButton && installmentPlacement !== "top"

  // 오른쪽 버튼 영역에 표시할 버튼이 있는지 확인
  const hasRightButtons = showRefreshButton || showMergeButton || showInstallmentInTop
  const categoryColSpan = hasRightButtons ? "md:col-span-6" : "md:col-span-9"

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="grid gap-4 pt-4 md:grid-cols-12">
        <CourseConfigSetPicker
          className="md:col-span-3"
          courseConfigSetList={courseConfigSets
            .map((p) => p.name)
            .filter((name): name is string => Boolean(name))
          }
          selectedCourseConfigSet={selectedCourseConfigSet}
          onSelectCourseConfigSet={onSelectCourseConfigSet}
          storageScope={storageScope}
          disabled={courseConfigSetLoading}
        />
        <div className={`space-y-2 ${categoryColSpan}`}>
          <Label>카테고리</Label>
          <CategoryTabs
            categories={courseConfigSetCategories}
            value={categoryFilter}
            onChange={onCategoryChange}
            disabled={!selectedCourseConfigSet}
          />
        </div>
        {hasRightButtons ? (
          <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
            {showRefreshButton ? (
              <Button
                type="button"
                variant="outline"
                onClick={onRefresh}
                disabled={!selectedCourseConfigSet || loading}
              >
                새로고침
              </Button>
            ) : null}
            {showMergeButton ? (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleMergeManager}
                disabled={!selectedCourseConfigSet}
                aria-pressed={mergeManagerOpen}
              >
                합반 관리
              </Button>
            ) : null}
            {showInstallmentInTop ? (
              <Button
                type="button"
                variant={installmentMode ? "default" : "outline"}
                onClick={onToggleInstallmentMode}
                disabled={!selectedCourseConfigSet || loading}
                aria-pressed={installmentMode}
              >
                분납현황
              </Button>
            ) : null}
          </div>
        ) : null}

        {showCourseFilter ? (
          <div className="space-y-2 md:col-span-4">
            <Label>과목</Label>
            <Select
              value={courseFilterValue}
              onValueChange={(value) =>
                onCourseChange(value === COURSE_FILTER_ALL ? "" : value)
              }
              disabled={!selectedCourseConfigSet}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="-- 전체 --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_FILTER_ALL}>-- 전체 --</SelectItem>
              {mergeOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
                {courseOptions.map((course) => {
                  const value = typeof course === "string" ? course : course.value
                  const label = typeof course === "string" ? course : course.label
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {showSearch ? (
          <div className="space-y-2 md:col-span-5">
            <Label htmlFor="regSearch">검색(이름)</Label>
            <Input
              id="regSearch"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(e.target.value)
              }
              disabled={!selectedCourseConfigSet}
              placeholder="이름으로 검색"
            />
          </div>
        ) : null}

        {showInstallmentInBottom ? (
          <div className="flex items-end justify-end md:col-span-3">
            <Button
              type="button"
              variant={installmentMode ? "default" : "outline"}
              onClick={onToggleInstallmentMode}
              disabled={!selectedCourseConfigSet || loading}
              aria-pressed={installmentMode}
            >
              분납현황
            </Button>
          </div>
        ) : null}

      </CardContent>
    </Card>
  )
}
