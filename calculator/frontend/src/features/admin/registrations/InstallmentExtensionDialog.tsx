import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentRow } from "./installmentBoardModel"
import InstallmentExtensionForm from "./InstallmentExtensionForm"
import InstallmentExtensionNoticeSection from "./InstallmentExtensionNoticeSection"
import InstallmentExtensionOverview from "./InstallmentExtensionOverview"

type InstallmentExtensionDialogProps = {
  open: boolean
  selectedRow: InstallmentRow | null
  extendWeeks: number
  extendFee: string
  startDateOverride: string
  startPickerOpen: boolean
  extensionEndDate: string
  noticePreview: string
  copyState: string
  saveError: string
  currentFeeLabel: string
  onOpenChange: (open: boolean) => void
  onCopy: () => void | Promise<void>
  onSave: () => void | Promise<void>
  onExtendWeeksChange: (value: number) => void
  onExtendFeeChange: (value: string) => void
  onStartPickerOpenChange: (open: boolean) => void
  onStartDateChange: (value: string) => void
}

export default function InstallmentExtensionDialog({
  open,
  selectedRow,
  extendWeeks,
  extendFee,
  startDateOverride,
  startPickerOpen,
  extensionEndDate,
  noticePreview,
  copyState,
  saveError,
  currentFeeLabel,
  onOpenChange,
  onCopy,
  onSave,
  onExtendWeeksChange,
  onExtendFeeChange,
  onStartPickerOpenChange,
  onStartDateChange,
}: InstallmentExtensionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:rounded-[24px]">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">{COPY.dialogTitle}</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                {COPY.dialogDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {selectedRow ? (
          <div className="space-y-5 text-sm">
            <InstallmentExtensionOverview
              selectedRow={selectedRow}
              currentFeeLabel={currentFeeLabel}
            />
            <InstallmentExtensionForm
              selectedRow={selectedRow}
              extendWeeks={extendWeeks}
              extendFee={extendFee}
              startDateOverride={startDateOverride}
              startPickerOpen={startPickerOpen}
              extensionEndDate={extensionEndDate}
              onExtendWeeksChange={onExtendWeeksChange}
              onExtendFeeChange={onExtendFeeChange}
              onStartPickerOpenChange={onStartPickerOpenChange}
              onStartDateChange={onStartDateChange}
            />
            <InstallmentExtensionNoticeSection
              noticePreview={noticePreview}
              copyState={copyState}
              onCopy={onCopy}
            />
          </div>
        ) : null}

        {saveError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{saveError}</span>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-slate-200/70 shadow-sm transition-all hover:shadow-md"
          >
            {COPY.dialogClose}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!selectedRow}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
          >
            {COPY.dialogConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
