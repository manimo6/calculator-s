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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateValue, DatesRangeValue } from "@mantine/dates"
import { CalendarDays } from "lucide-react"

import {
  TransferCourseCombobox,
  TransferPreviewCard,
  TransferStepIndicator,
  TransferTargetCard,
} from "./TransferDialogSections"
import type { TransferDialogRegistrationRow } from "./TransferDialogSections"
import { TRANSFER_COPY } from "./transferCopy"
import { formatDateYmd, isDailyRegistration, parseDate } from "./utils"
import type { TransferGroup } from "./useTransfer"

type TransferDialogProps = {
  open: boolean
  onClose: () => void
  target: TransferDialogRegistrationRow | null
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
  const isDaily = isDailyRegistration(target)
  const targetSelectedDatesSet = isDaily && Array.isArray(target?.selectedDates) && target.selectedDates.length > 0
    ? new Set(target.selectedDates)
    : null

  const isDateDisabled = (day: Date) => {
    if (startDate && day.getTime() < startDate.getTime()) return true
    if (endDate && day.getTime() > endDate.getTime()) return true
    if (targetSelectedDatesSet) {
      return !targetSelectedDatesSet.has(formatDateYmd(day))
    }
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
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 px-6 py-5">
          <DialogTitle className="text-lg font-bold text-white">{TRANSFER_COPY.dialogTitle}</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-indigo-100/80">
            {TRANSFER_COPY.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="space-y-5 px-6 py-5">
            <TransferTargetCard target={target} />

            <div className="flex items-center justify-between px-1">
              <TransferStepIndicator step={1} currentStep={currentStep} label={TRANSFER_COPY.stepCourse} />
              <div className="mx-2 h-px flex-1 bg-slate-200" />
              <TransferStepIndicator step={2} currentStep={currentStep} label={TRANSFER_COPY.stepDate} />
              <div className="mx-2 h-px flex-1 bg-slate-200" />
              <TransferStepIndicator step={3} currentStep={currentStep} label={TRANSFER_COPY.stepConfirm} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {TRANSFER_COPY.transferCourseLabel}
              </label>
              <TransferCourseCombobox
                value={courseValue}
                onChange={onCourseValueChange}
                courseGroups={courseGroups}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {TRANSFER_COPY.transferDateLabel}
              </label>
              <Popover
                open={pickerOpen}
                onOpenChange={(nextOpen) => {
                  if (hasCourseSelected) onPickerOpenChange(nextOpen)
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
                      ? date || TRANSFER_COPY.chooseDate
                      : TRANSFER_COPY.selectCourseFirst}
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

            {hasPreview ? (
              <TransferPreviewCard
                date={date}
                expectedEndDate={expectedEndDate}
                weeksNum={weeksNum}
                isDaily={isDaily}
              />
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        ) : null}

        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-200 px-5"
          >
            {TRANSFER_COPY.cancel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !hasPreview}
            className="rounded-xl bg-indigo-600 px-5 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? TRANSFER_COPY.saving : TRANSFER_COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
