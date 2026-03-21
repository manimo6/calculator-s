import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Clock,
  Search,
  User,
} from "lucide-react"

import { formatDateYmd, parseDate } from "./utils"
import type { TransferGroup, TransferOption } from "./useTransfer"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
} & Record<string, unknown>

type TransferDialogProps = {
  open: boolean
  onClose: () => void
  target: RegistrationRow | null
  date: string
  onDateChange: (value: string) => void
  pickerOpen: boolean
  onPickerOpenChange: (value: boolean) => void
  courseValue: string
  onCourseValueChange: (value: string) => void
  weeks: string
  error: string
  saving: boolean
  courseGroups: TransferGroup[]
  courseDays: number[]
  expectedEndDate: string
  onSave: () => void
}

function CourseCombobox({
  value,
  onChange,
  courseGroups,
}: {
  value: string
  onChange: (value: string) => void
  courseGroups: TransferGroup[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const allItems = useMemo(() => {
    const items: Array<TransferOption & { group: string }> = []
    for (const group of courseGroups) {
      for (const item of group.items) {
        items.push({ ...item, group: group.label })
      }
    }
    return items
  }, [courseGroups])

  const selectedLabel = useMemo(() => {
    if (!value) return ""
    for (const item of allItems) {
      if (item.value === value) return item.label
    }
    return ""
  }, [value, allItems])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return courseGroups
    const term = search.trim().toLowerCase()
    const result: TransferGroup[] = []
    for (const group of courseGroups) {
      const filtered = group.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      )
      if (filtered.length) {
        result.push({ label: group.label, items: filtered })
      }
    }
    return result
  }, [courseGroups, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`group flex w-full items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 ${
            open
              ? "border-indigo-400 ring-4 ring-indigo-50"
              : value
                ? "border-indigo-200 hover:border-indigo-300"
                : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className={value ? "font-medium text-slate-900" : "text-slate-400"}>
            {selectedLabel || "전반할 과목을 선택하세요"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl border-slate-200 p-0 shadow-xl shadow-slate-200/50" align="start">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="과목 검색..."
            autoFocus
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1.5" onWheel={(e) => e.stopPropagation()}>
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {group.label}
                </div>
                {group.items.map((course) => {
                  const isSelected = value === course.value
                  return (
                    <button
                      key={course.value}
                      type="button"
                      className={`relative flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        onChange(course.value)
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      <span className={`mr-2 flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                        isSelected ? "bg-indigo-500 text-white" : "border border-slate-300"
                      }`}>
                        {isSelected ? <Check className="h-2.5 w-2.5" /> : null}
                      </span>
                      {course.label}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isComplete = currentStep > step
  const isActive = currentStep === step
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
        isComplete
          ? "bg-indigo-500 text-white"
          : isActive
            ? "bg-indigo-500 text-white ring-4 ring-indigo-100"
            : "bg-slate-100 text-slate-400"
      }`}>
        {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={`text-xs font-medium transition-colors ${
        isActive ? "text-slate-900" : isComplete ? "text-slate-600" : "text-slate-400"
      }`}>
        {label}
      </span>
    </div>
  )
}

export default function TransferDialog({
  open,
  onClose,
  target,
  date,
  onDateChange,
  pickerOpen,
  onPickerOpenChange,
  courseValue,
  onCourseValueChange,
  weeks,
  error,
  saving,
  courseGroups,
  courseDays,
  expectedEndDate,
  onSave,
}: TransferDialogProps) {
  const hasCourseSelected = !!courseValue
  const startDate = parseDate(target?.startDate)
  const endDate = parseDate(target?.endDate)
  const courseDaySet = new Set(courseDays || [])
  const hasCourseDayRestriction = courseDaySet.size > 0

  const isDateDisabled = (day: Date) => {
    if (startDate && day.getTime() < startDate.getTime()) return true
    if (endDate && day.getTime() > endDate.getTime()) return true
    if (hasCourseDayRestriction && !courseDaySet.has(day.getDay())) return true
    return false
  }

  const weeksNum = Number(weeks)
  const hasPreview = !!date && weeksNum > 0
  const currentStep = !courseValue ? 1 : !date ? 2 : 3

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border-0 p-0 shadow-2xl shadow-slate-300/40">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 px-6 py-5">
          <DialogTitle className="text-lg font-bold text-white">전반 처리</DialogTitle>
          <p className="mt-0.5 text-sm text-indigo-100/80">
            과목을 선택하고 전반일을 지정하세요
          </p>
        </DialogHeader>

        {target ? (
          <div className="space-y-5 px-6 py-5">
            {/* Student Info Card */}
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-slate-900">{target?.name || "-"}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {target?.course || "-"}
                  </span>
                  {target?.weeks ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                      <Clock className="h-3 w-3" />
                      {target.weeks}주
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between px-1">
              <StepIndicator step={1} currentStep={currentStep} label="과목 선택" />
              <div className="mx-2 h-px flex-1 bg-slate-200" />
              <StepIndicator step={2} currentStep={currentStep} label="날짜 선택" />
              <div className="mx-2 h-px flex-1 bg-slate-200" />
              <StepIndicator step={3} currentStep={currentStep} label="확인" />
            </div>

            {/* Step 1: Course Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                전반 과목
              </label>
              <CourseCombobox
                value={courseValue}
                onChange={onCourseValueChange}
                courseGroups={courseGroups}
              />
            </div>

            {/* Step 2: Date Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                전반일 (신규 수업 시작일)
              </label>
              <Popover
                open={pickerOpen}
                onOpenChange={(open) => {
                  if (hasCourseSelected) onPickerOpenChange(open)
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={!hasCourseSelected}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${
                      !hasCourseSelected
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                        : date
                          ? "border-indigo-200 bg-white font-medium text-slate-900 hover:border-indigo-300"
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <CalendarDays className={`h-4 w-4 shrink-0 ${
                      !hasCourseSelected ? "text-slate-300" : date ? "text-indigo-500" : "text-slate-400"
                    }`} />
                    {hasCourseSelected
                      ? date || "날짜를 선택하세요"
                      : "과목을 먼저 선택하세요"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto border-none bg-transparent p-0 shadow-none"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={parseDate(date) ?? undefined}
                    disabled={isDateDisabled}
                    defaultDate={startDate ?? undefined}
                    onSelect={(
                      value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined
                    ) => {
                      const selectedDate = value instanceof Date ? value : null
                      onDateChange(selectedDate ? formatDateYmd(selectedDate) : "")
                      onPickerOpenChange(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Preview Card */}
            {hasPreview ? (
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200/60">
                <div className="border-b border-emerald-100 px-4 py-2">
                  <span className="text-xs font-bold tracking-wide text-emerald-700 uppercase">
                    전반 후 수강 정보
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-800">{weeksNum}주</div>
                      <div className="text-xs text-emerald-600">잔여 수업 기간</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      {date}
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                      {expectedEndDate || "..."}
                    </div>
                    <div className="mt-0.5 text-xs text-emerald-500">수업 기간</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        ) : null}

        {/* Footer */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-200 px-5"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !hasPreview}
            className="rounded-xl bg-indigo-600 px-5 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? "처리 중..." : "전반 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
