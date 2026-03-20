import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { formatDateYmd, parseDate } from "./utils"
import type { TransferGroup } from "./useTransfer"

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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>전반 처리</DialogTitle>
          <DialogDescription>
            전반일을 신규 수업 시작일로 설정합니다.
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <div className="text-xs text-muted-foreground">학생</div>
              <div className="font-semibold">{target?.name || "-"}</div>
              <div className="mt-2 text-xs text-muted-foreground">현재 과목</div>
              <div className="font-semibold">{target?.course || "-"}</div>
            </div>
            <div className="space-y-2">
              <Label>전반 과목</Label>
              <Select
                value={courseValue}
                onValueChange={onCourseValueChange}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="전반할 과목을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {courseGroups.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      선택 가능한 과목이 없습니다.
                    </SelectItem>
                  ) : (
                    courseGroups.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="mx-1 my-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          카테고리 · {group.label}
                        </SelectLabel>
                        {group.items.map((course) => (
                          <SelectItem key={course.value} value={course.value}>
                            {course.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferDate">전반일 (신규 수업 시작일)</Label>
              <Popover
                open={pickerOpen}
                onOpenChange={(open) => {
                  if (hasCourseSelected) onPickerOpenChange(open)
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="transferDate"
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                    disabled={!hasCourseSelected}
                  >
                    {hasCourseSelected
                      ? date || "YYYY-MM-DD"
                      : "과목을 먼저 선택하세요"}
                  </Button>
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
            {hasPreview ? (
              <div className="rounded-lg border border-teal-200/70 bg-teal-50/50 px-4 py-3">
                <div className="mb-1 text-xs font-semibold text-teal-700">전반 후 수강 정보</div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-teal-800">{weeksNum}주</span>
                  <span className="text-teal-600">
                    {date} ~ {expectedEndDate || "..."}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            전반 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
