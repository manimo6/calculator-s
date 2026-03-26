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
import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { WITHDRAW_COPY } from "./withdrawCopy"
import { formatDateYmd, parseDate } from "./utils"

type RegistrationRow = {
  name?: string
  course?: string
} & Record<string, unknown>

type WithdrawDialogProps = {
  open: boolean
  onClose: () => void
  target: RegistrationRow | null
  date: string
  onDateChange: (value: string) => void
  pickerOpen: boolean
  onPickerOpenChange: (value: boolean) => void
  error: string
  saving: boolean
  onSave: () => void
}

export default function WithdrawDialog({
  open,
  onClose,
  target,
  date,
  onDateChange,
  pickerOpen,
  onPickerOpenChange,
  error,
  saving,
  onSave,
}: WithdrawDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{WITHDRAW_COPY.dialogTitle}</DialogTitle>
          <DialogDescription>
            {WITHDRAW_COPY.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <div className="text-xs text-muted-foreground">{WITHDRAW_COPY.studentLabel}</div>
              <div className="font-semibold">{target?.name || "-"}</div>
              <div className="mt-2 text-xs text-muted-foreground">{WITHDRAW_COPY.courseLabel}</div>
              <div className="font-semibold">{target?.course || "-"}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawDate">{WITHDRAW_COPY.withdrawDateLabel}</Label>
              <Popover open={pickerOpen} onOpenChange={onPickerOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    id="withdrawDate"
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    {date || "YYYY-MM-DD"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto border-none bg-transparent p-0 shadow-none"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={parseDate(date) ?? undefined}
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
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {WITHDRAW_COPY.cancel}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {WITHDRAW_COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
