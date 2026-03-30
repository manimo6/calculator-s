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
import InstallmentExtensionForm from "./InstallmentExtensionForm"
import InstallmentExtensionNoticeSection from "./InstallmentExtensionNoticeSection"
import InstallmentExtensionOverview from "./InstallmentExtensionOverview"
import InstallmentExtensionScheduleOptions from "./InstallmentExtensionScheduleOptions"
import InstallmentExtensionFeeBreakdown from "./InstallmentExtensionFeeBreakdown"
import type { useInstallmentExtensionDraft } from "./useInstallmentExtensionDraft"

type InstallmentExtensionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: ReturnType<typeof useInstallmentExtensionDraft>
}

export default function InstallmentExtensionDialog({
  open,
  onOpenChange,
  draft,
}: InstallmentExtensionDialogProps) {
  const {
    selectedRow,
    extendWeeks,
    extendFee,
    extensionStartDate,
    extensionEndDate,
    noticePreview,
    copyState,
    saveError,
    currentFeeLabel,
    handleCopy,
    handleSave,
    setExtendWeeks,
    setExtendFee,
    skipWeeksEnabled,
    setSkipWeeksEnabled,
    skipWeeks,
    handleSkipWeekToggle,
    maxSkipWeeks,
    scheduleWeeks,
    recordingEnabled,
    setRecordingEnabled,
    recordingDates,
    handleRecordingDateToggle,
    availableRecordingDates,
    isRecordingAvailable,
    feeBreakdown,
    totalDays,
    recordingDays,
    weeklyFee,
    savedDiscount,
    effectiveFee,
  } = draft


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:rounded-[24px]">
        <DialogHeader className="space-y-2 pb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
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
              <DialogTitle className="text-lg font-bold text-slate-900">{COPY.dialogTitle}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {COPY.dialogDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {selectedRow ? (
          <div className="space-y-4">
            <InstallmentExtensionOverview
              selectedRow={selectedRow}
              currentFeeLabel={currentFeeLabel}
            />

            <InstallmentExtensionForm
              selectedRow={selectedRow}
              extendWeeks={extendWeeks}
              extendFee={extendFee}
              extensionEndDate={extensionEndDate}
              weeklyFee={weeklyFee}
              savedDiscount={savedDiscount}
              effectiveFee={effectiveFee}
              onExtendWeeksChange={setExtendWeeks}
              onExtendFeeChange={setExtendFee}
            />

            <InstallmentExtensionScheduleOptions
              extendWeeks={extendWeeks}
              scheduleWeeks={scheduleWeeks}
              skipWeeksEnabled={skipWeeksEnabled}
              onSkipWeeksEnabledChange={setSkipWeeksEnabled}
              skipWeeks={skipWeeks}
              onSkipWeekToggle={handleSkipWeekToggle}
              maxSkipWeeks={maxSkipWeeks}
              isRecordingAvailable={isRecordingAvailable}
              recordingEnabled={recordingEnabled}
              onRecordingEnabledChange={setRecordingEnabled}
              recordingDates={recordingDates}
              onRecordingDateToggle={handleRecordingDateToggle}
              availableRecordingDates={availableRecordingDates}
              extensionStartDate={extensionStartDate}
              courseDays={selectedRow.courseDays}
            />

            <InstallmentExtensionFeeBreakdown
              feeBreakdown={feeBreakdown}
              totalDays={totalDays}
              recordingDays={recordingDays}
            />

            <InstallmentExtensionNoticeSection
              noticePreview={noticePreview}
              copyState={copyState}
              onCopy={handleCopy}
            />
          </div>
        ) : null}

        {saveError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{saveError}</span>
          </div>
        ) : null}

        <DialogFooter className="gap-2 pt-2">
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
            onClick={handleSave}
            disabled={!selectedRow}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/35"
          >
            {COPY.dialogConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
