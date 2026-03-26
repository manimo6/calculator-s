import type { ChangeEvent } from "react"

import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentRow } from "./installmentBoardModel"
import { formatDateYmd, parseDate } from "./utils"

type InstallmentExtensionFormProps = {
  selectedRow: InstallmentRow
  extendWeeks: number
  extendFee: string
  startDateOverride: string
  startPickerOpen: boolean
  extensionEndDate: string
  onExtendWeeksChange: (value: number) => void
  onExtendFeeChange: (value: string) => void
  onStartPickerOpenChange: (open: boolean) => void
  onStartDateChange: (value: string) => void
}

export default function InstallmentExtensionForm({
  selectedRow,
  extendWeeks,
  extendFee,
  startDateOverride,
  startPickerOpen,
  extensionEndDate,
  onExtendWeeksChange,
  onExtendFeeChange,
  onStartPickerOpenChange,
  onStartDateChange,
}: InstallmentExtensionFormProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="extendWeeks" className="text-sm font-semibold text-slate-700">
            {COPY.dialogExtendWeeks}
            <span className="ml-1.5 text-xs font-normal text-slate-500">
              ({COPY.dialogMaxPrefix} {selectedRow.remainingWeeks}
              {COPY.weekSuffix})
            </span>
          </Label>
          <Input
            id="extendWeeks"
            type="number"
            min={1}
            max={selectedRow.remainingWeeks}
            value={extendWeeks}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = Number(e.target.value) || 0
              onExtendWeeksChange(Math.min(value, selectedRow.remainingWeeks))
            }}
            className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extendFee" className="text-sm font-semibold text-slate-700">
            {COPY.dialogExtendFee}
          </Label>
          <Input
            id="extendFee"
            value={extendFee}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onExtendFeeChange(e.target.value)}
            placeholder={COPY.dialogCurrencyPlaceholder}
            className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-semibold text-slate-700">
            {COPY.dialogExtendStart}
          </Label>
          <Popover open={startPickerOpen} onOpenChange={onStartPickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                id="startDate"
                type="button"
                variant="outline"
                className="h-11 w-full justify-between rounded-xl border-slate-200/70 bg-white text-left font-medium shadow-sm transition-shadow hover:shadow-md"
              >
                {startDateOverride || COPY.dialogDatePlaceholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-none bg-transparent p-0 shadow-none"
              align="start"
            >
              <Calendar
                mode="single"
                selected={parseDate(startDateOverride) ?? undefined}
                onSelect={(value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                  const selectedDate = value instanceof Date ? value : null
                  onStartDateChange(selectedDate ? formatDateYmd(selectedDate) : "")
                  onStartPickerOpenChange(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {COPY.dialogEndDate}
        </div>
        <div className="mt-2 text-lg font-bold text-slate-900">{extensionEndDate || "-"}</div>
      </div>
    </>
  )
}
