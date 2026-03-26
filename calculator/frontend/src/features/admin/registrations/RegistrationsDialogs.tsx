import MergeErrorDialog from "./MergeErrorDialog"
import NoteDialog from "./NoteDialog"
import TransferDialog from "./TransferDialog"
import WithdrawDialog from "./WithdrawDialog"

type RegistrationsDialogsProps = {
  noteDialogOpen: boolean
  closeNoteDialog: () => void
  noteTarget: any
  noteValue: string
  setNoteValue: (value: string) => void
  noteUpdatedAtLabel: string
  noteError: string
  noteSaving: boolean
  handleNoteSave: () => void
  withdrawDialogOpen: boolean
  closeWithdrawDialog: () => void
  withdrawTarget: any
  withdrawDate: string
  setWithdrawDate: (value: string) => void
  withdrawPickerOpen: boolean
  setWithdrawPickerOpen: (open: boolean) => void
  withdrawError: string
  withdrawSaving: boolean
  handleWithdrawSave: () => void
  transferDialogOpen: boolean
  closeTransferDialog: () => void
  transferTarget: any
  transferDate: string
  setTransferDate: (value: string) => void
  transferPickerOpen: boolean
  setTransferPickerOpen: (open: boolean) => void
  transferCourseValue: string
  setTransferCourseValue: (value: string) => void
  transferWeeks: string
  transferError: string
  transferSaving: boolean
  transferCourseGroups: any[]
  transferCourseDays: number[]
  transferExpectedEndDate: string
  handleTransferSave: () => void
  mergeError: string
  setMergeError: (value: string) => void
}

export default function RegistrationsDialogs(props: RegistrationsDialogsProps) {
  const {
    noteDialogOpen,
    closeNoteDialog,
    noteTarget,
    noteValue,
    setNoteValue,
    noteUpdatedAtLabel,
    noteError,
    noteSaving,
    handleNoteSave,
    withdrawDialogOpen,
    closeWithdrawDialog,
    withdrawTarget,
    withdrawDate,
    setWithdrawDate,
    withdrawPickerOpen,
    setWithdrawPickerOpen,
    withdrawError,
    withdrawSaving,
    handleWithdrawSave,
    transferDialogOpen,
    closeTransferDialog,
    transferTarget,
    transferDate,
    setTransferDate,
    transferPickerOpen,
    setTransferPickerOpen,
    transferCourseValue,
    setTransferCourseValue,
    transferWeeks,
    transferError,
    transferSaving,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
    handleTransferSave,
    mergeError,
    setMergeError,
  } = props

  return (
    <>
      <NoteDialog
        open={noteDialogOpen}
        onClose={closeNoteDialog}
        target={noteTarget}
        value={noteValue}
        onValueChange={setNoteValue}
        updatedAtLabel={noteUpdatedAtLabel}
        error={noteError}
        saving={noteSaving}
        onSave={handleNoteSave}
      />

      <WithdrawDialog
        open={withdrawDialogOpen}
        onClose={closeWithdrawDialog}
        target={withdrawTarget}
        date={withdrawDate}
        onDateChange={setWithdrawDate}
        pickerOpen={withdrawPickerOpen}
        onPickerOpenChange={setWithdrawPickerOpen}
        error={withdrawError}
        saving={withdrawSaving}
        onSave={handleWithdrawSave}
      />

      <TransferDialog
        open={transferDialogOpen}
        onClose={closeTransferDialog}
        target={transferTarget}
        date={transferDate}
        onDateChange={setTransferDate}
        pickerOpen={transferPickerOpen}
        onPickerOpenChange={setTransferPickerOpen}
        courseValue={transferCourseValue}
        onCourseValueChange={setTransferCourseValue}
        weeks={transferWeeks}
        error={transferError}
        saving={transferSaving}
        courseGroups={transferCourseGroups}
        courseDays={transferCourseDays}
        expectedEndDate={transferExpectedEndDate}
        onSave={handleTransferSave}
      />

      <MergeErrorDialog
        mergeError={mergeError}
        onClose={() => setMergeError("")}
      />
    </>
  )
}
