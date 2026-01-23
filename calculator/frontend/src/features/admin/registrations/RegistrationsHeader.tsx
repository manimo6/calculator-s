import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RotateCw, Layers, CreditCard, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import CategoryTabs from "./CategoryTabs"
import CourseConfigSetPicker from "../courseConfigSets/CourseConfigSetPicker"
import type { CourseConfigSet } from "../courseConfigSets/utils"

type RegistrationsHeaderProps = {
  courseConfigSetLoading: boolean
  courseConfigSets: CourseConfigSet[]
  selectedCourseConfigSet: string
  onSelectCourseConfigSet: (value: string) => void
  courseConfigSetCategories: string[]
  categoryFilter: string
  onCategoryChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
  loading: boolean
  onRefresh: () => void
  mergeManagerOpen?: boolean
  onToggleMergeManager?: () => void
  showMergeManager?: boolean
  installmentMode?: boolean
  onToggleInstallmentMode?: () => void
  showInstallmentToggle?: boolean
}

export default function RegistrationsHeader({
  courseConfigSetLoading,
  courseConfigSets,
  selectedCourseConfigSet,
  onSelectCourseConfigSet,
  courseConfigSetCategories,
  categoryFilter,
  onCategoryChange,
  search,
  onSearchChange,
  loading,
  onRefresh,
  mergeManagerOpen,
  onToggleMergeManager,
  showMergeManager = true,
  installmentMode,
  onToggleInstallmentMode,
  showInstallmentToggle = true,
}: RegistrationsHeaderProps) {
  
  return (
    <div className="sticky top-0 z-20 flex w-full items-center gap-4 border-b border-border/60 bg-white/80 px-6 py-3 backdrop-blur-xl transition-all">
      {/* 1. Config Set Picker */}
      <div className="w-[240px] shrink-0">
        <CourseConfigSetPicker
          courseConfigSetList={courseConfigSets.map(s => s.name || "").filter(Boolean)}
          selectedCourseConfigSet={selectedCourseConfigSet}
          onSelectCourseConfigSet={onSelectCourseConfigSet}
          disabled={courseConfigSetLoading}
          label=""
          placeholder="설정 세트 선택"
          storageScope="registrations"
          triggerClassName="h-9 rounded-full border-slate-200 bg-white/50 text-xs font-medium shadow-sm transition-colors hover:bg-white focus:ring-1 focus:ring-indigo-500"
          showClear={true}
          showArchiveButton={true}
        />
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* 2. Categories */}
      <div className="flex-1 overflow-hidden">
        <CategoryTabs
          categories={courseConfigSetCategories}
          value={categoryFilter}
          onChange={onCategoryChange}
          disabled={!selectedCourseConfigSet}
        />
      </div>

      {/* 3. Search */}
      <div className="relative w-[200px] shrink-0">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={!selectedCourseConfigSet}
          placeholder="이름 검색..."
          className="h-9 w-full rounded-full border-slate-200 bg-slate-50/50 pl-8 pr-8 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* 4. Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={!selectedCourseConfigSet || loading}
                className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>새로고침</TooltipContent>
          </Tooltip>

          {showMergeManager && onToggleMergeManager && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mergeManagerOpen ? "secondary" : "ghost"}
                  size="icon"
                  onClick={onToggleMergeManager}
                  disabled={!selectedCourseConfigSet}
                  className={`h-9 w-9 rounded-full transition-colors ${
                    mergeManagerOpen 
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200" 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>합반 관리</TooltipContent>
            </Tooltip>
          )}

          {showInstallmentToggle && onToggleInstallmentMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={installmentMode ? "secondary" : "ghost"}
                  size="icon"
                  onClick={onToggleInstallmentMode}
                  disabled={!selectedCourseConfigSet}
                  className={`h-9 w-9 rounded-full transition-colors ${
                    installmentMode 
                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>분납 현황</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  )
}
