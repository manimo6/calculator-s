import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { formatDateYmd } from "../registrations/utils"
import { COURSE_DIALOG_BASIC_COPY } from "./courseDialogBasicCopy"
import {
  parseDateYmd,
  type CourseDialogBreakRangesSectionProps,
} from "./courseDialogBasicShared"

type BreakRangeDateFieldProps = {
  value: string
  pickerKey: string
  openKey: string | null
  onOpenChange: (nextOpen: boolean) => void
  onSelect: (value: string) => void
}

function BreakRangeDateField({
  value,
  pickerKey,
  openKey,
  onOpenChange,
  onSelect,
}: BreakRangeDateFieldProps) {
  return (
    <Popover open={openKey === pickerKey} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="max-w-[180px] justify-between text-left font-normal"
        >
          {value || "YYYY-MM-DD"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        align="start"
      >
        <Calendar
          mode="single"
          selected={parseDateYmd(value)}
          onSelect={(date: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
            const selectedDate = date instanceof Date ? date : null
            onSelect(selectedDate ? formatDateYmd(selectedDate) : "")
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function CourseDialogBreakRangesSection({
  state,
  dispatch,
  breakPickerOpen,
  setBreakPickerOpen,
}: CourseDialogBreakRangesSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_BASIC_COPY.breakRangesTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_BASIC_COPY.breakRangesDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.breakRanges.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            {COURSE_DIALOG_BASIC_COPY.emptyBreakRanges}
          </div>
        ) : null}
        {state.breakRanges.map((range, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <BreakRangeDateField
              value={range.startDate}
              pickerKey={`start-${index}`}
              openKey={breakPickerOpen}
              onOpenChange={(open) => setBreakPickerOpen(open ? `start-${index}` : null)}
              onSelect={(value) => {
                dispatch({
                  type: "UPDATE_BREAK_RANGE",
                  index,
                  key: "startDate",
                  value,
                })
                setBreakPickerOpen(null)
              }}
            />
            <span className="text-xs text-muted-foreground">~</span>
            <BreakRangeDateField
              value={range.endDate}
              pickerKey={`end-${index}`}
              openKey={breakPickerOpen}
              onOpenChange={(open) => setBreakPickerOpen(open ? `end-${index}` : null)}
              onSelect={(value) => {
                dispatch({
                  type: "UPDATE_BREAK_RANGE",
                  index,
                  key: "endDate",
                  value,
                })
                setBreakPickerOpen(null)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "REMOVE_BREAK_RANGE", index })}
            >
              {COURSE_DIALOG_BASIC_COPY.removeBreakRange}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "ADD_BREAK_RANGE" })}
        >
          {COURSE_DIALOG_BASIC_COPY.addBreakRange}
        </Button>
      </CardContent>
    </Card>
  )
}
