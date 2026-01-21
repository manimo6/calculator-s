import React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { Archive, ChevronDown, Star, Undo2, X } from "lucide-react"

import { useCourseConfigSetPicker } from "./useCourseConfigSetPicker"

type CourseConfigSetPickerProps = {
  courseConfigSetList?: string[]
  selectedCourseConfigSet?: string
  onSelectCourseConfigSet: (value: string) => void
  storageScope?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  showClear?: boolean
  showArchiveButton?: boolean
  triggerContent?: React.ReactNode
  triggerClassName?: string
  popoverSide?: "bottom" | "top" | "left" | "right"
  popoverAlign?: "start" | "center" | "end"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type ArchiveSort = "recent" | "name-asc" | "name-desc"

export default function CourseConfigSetPicker(props: CourseConfigSetPickerProps) {
  const {
    courseConfigSetList = [],
    selectedCourseConfigSet,
    onSelectCourseConfigSet,
    storageScope,
    label = "설정 세트",
    placeholder = "설정 세트를 선택하세요",
    disabled = false,
    className,
    showClear = true,
    showArchiveButton = true,
    triggerContent,
    triggerClassName,
    popoverSide = "bottom",
    popoverAlign = "start",
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
  } = props || {}
  const {
    open,
    setOpen,
    archiveOpen,
    setArchiveOpen,
    query,
    setQuery,
    archiveQuery,
    setArchiveQuery,
    archiveSort,
    setArchiveSort,
    archivedSet,
    favoriteSet,
    visibleRecents,
    visibleFavorites,
    visibleAll,
    filteredSets,
    filteredArchivedSets,
    isSearching,
    archivedCount,
    toggleFavorite,
    toggleArchive,
  } = useCourseConfigSetPicker({
    courseConfigSetList,
    selectedCourseConfigSet,
    storageScope,
  })

  const resolvedOpen = typeof controlledOpen === "boolean" ? controlledOpen : open
  const hasControlledOpen = typeof controlledOpen === "boolean"
  const notifyOpenChange =
    typeof controlledOnOpenChange === "function"
      ? controlledOnOpenChange
      : null

  React.useEffect(() => {
    if (!hasControlledOpen) return
    if (open !== controlledOpen) {
      setOpen(controlledOpen)
    }
  }, [controlledOpen, hasControlledOpen, open, setOpen])

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return
    setOpen(nextOpen)
    if (notifyOpenChange) notifyOpenChange(nextOpen)
  }

  const handleSelect = (name: string, closeArchive = false) => {
    if (disabled) return
    onSelectCourseConfigSet(name)
    setOpen(false)
    if (notifyOpenChange) notifyOpenChange(false)
    if (closeArchive) {
      setArchiveOpen(false)
    }
  }

  const handleClearSelection = () => {
    if (disabled) return
    onSelectCourseConfigSet("")
    setOpen(false)
    if (notifyOpenChange) notifyOpenChange(false)
  }

  const handleOpenArchive = () => {
    if (disabled) return
    setOpen(false)
    if (notifyOpenChange) notifyOpenChange(false)
    setArchiveOpen(true)
  }

  const renderItem = (name: string, closeArchive = false) => {
    const isArchived = archivedSet.has(name)
    const isFavorite = favoriteSet.has(name)
    const isSelected = selectedCourseConfigSet === name

    return (
      <div
        key={name}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
        onClick={() => handleSelect(name, closeArchive)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleSelect(name, closeArchive)
          }
        }}
        className={cn(
          "group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">{name}</span>
          {isArchived ? (
            <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              보관됨
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {!isArchived ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggleFavorite(name)
              }}
              className={cn(
                "rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground",
                isFavorite && "text-amber-500 hover:text-amber-500"
              )}
              title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
              aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggleArchive(name)
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            title={isArchived ? "보관 해제" : "보관하기"}
            aria-label={isArchived ? "보관 해제" : "보관하기"}
          >
            {isArchived ? (
              <Undo2 className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    )
  }

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  const handleArchiveQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setArchiveQuery(event.target.value)
  }

  const handleArchiveSortChange = (value: string) => {
    if (value === "recent" || value === "name-asc" || value === "name-desc") {
      setArchiveSort(value as ArchiveSort)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <Popover open={resolvedOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={resolvedOpen}
            className={cn("h-9 w-full justify-between bg-background", triggerClassName)}
            disabled={disabled}
          >
            {triggerContent ? (
              triggerContent
            ) : (
              <>
                <span
                  className={cn(
                    "truncate text-left",
                    selectedCourseConfigSet ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {selectedCourseConfigSet || placeholder}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align={popoverAlign} side={popoverSide} className="w-[320px] p-3">
          <div className="space-y-3">
            <Input
              placeholder="설정 세트 검색..."
              value={query}
              onChange={handleQueryChange}
              className="h-9"
              disabled={disabled}
            />
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1 no-scrollbar">
              {showClear && selectedCourseConfigSet ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                  선택 해제
                </button>
              ) : null}
              {isSearching ? (
                <div className="space-y-1">
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    검색 결과
                  </p>
                  {filteredSets.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    filteredSets.map((name) => renderItem(name))
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      최근 사용
                    </p>
                    {visibleRecents.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        최근 항목이 없습니다.
                      </p>
                    ) : (
                      visibleRecents.map((name) => renderItem(name))
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      즐겨찾기
                    </p>
                    {visibleFavorites.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        즐겨찾기가 없습니다.
                      </p>
                    ) : (
                      visibleFavorites.map((name) => renderItem(name))
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      전체
                    </p>
                    {visibleAll.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        전체 설정 세트가 없습니다.
                      </p>
                    ) : (
                      visibleAll.map((name) => renderItem(name))
                    )}
                  </div>
                </>
              )}
            </div>
            {showArchiveButton ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={handleOpenArchive}
                disabled={disabled || archivedCount === 0}
              >
                <span className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  보관함 보기
                </span>
                <span className="text-muted-foreground">
                  {archivedCount}
                </span>
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>보관함</DialogTitle>
            <DialogDescription>
              보관된 설정 세트를 다시 활성화할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="보관함 검색..."
                value={archiveQuery}
                onChange={handleArchiveQueryChange}
                className="h-9 flex-1"
              />
              <Select value={archiveSort} onValueChange={handleArchiveSortChange}>
                <SelectTrigger className="h-9 w-[150px] bg-background">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">최근 보관</SelectItem>
                  <SelectItem value="name-asc">이름 A-Z</SelectItem>
                  <SelectItem value="name-desc">이름 Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
              {archivedCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  보관된 세트가 없습니다.
                </p>
              ) : filteredArchivedSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </p>
              ) : (
                filteredArchivedSets.map((name) => renderItem(name, true))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
