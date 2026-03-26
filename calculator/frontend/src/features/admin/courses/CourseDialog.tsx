import React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { type CourseTreeGroup } from "@/utils/data"
import {
  type CourseData,
  type CourseFormState,
} from "./courseDialogState"
import {
  CourseDialogAdditionalNoteSection,
  CourseDialogInstallmentSection,
  CourseDialogMathOptionSection,
  CourseDialogRecordingSection,
} from "./CourseDialogAuxSections"
import {
  CourseDialogBasicInfoSection,
  CourseDialogBreakRangesSection,
  CourseDialogDurationSection,
  CourseDialogScheduleSection,
  CourseDialogTimeSection,
} from "./CourseDialogCoreSections"
import { CourseDialogTextbookSection } from "./CourseDialogTextbookSection"
import { useCourseDialogForm } from "./useCourseDialogForm"

type CourseDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: CourseFormState, editingCourseId?: string) => boolean | void
  categories: CourseTreeGroup[]
  editingCourseId?: string
  courseData?: CourseData
}

export default function CourseDialog(props: CourseDialogProps) {
  const {
    isOpen,
    onClose,
    onSave,
    categories,
    editingCourseId,
    courseData,
  } = props || {}

  const {
    state,
    dispatch,
    breakPickerOpen,
    setBreakPickerOpen,
    handleTextbookOptionChange,
    handleTextbookAmountChange,
    categoryValue,
    categoryPlaceholder,
  } = useCourseDialogForm({
    isOpen,
    hasCategories: Array.isArray(categories) && categories.length > 0,
    editingCourseId,
    courseData,
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const ok = onSave(state, editingCourseId)
    if (ok === false) return
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setBreakPickerOpen(null)
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/40 px-6 py-5 text-left">
          <DialogTitle className="text-2xl">
            {editingCourseId ? "\uACFC\uBAA9 \uC218\uC815" : "\uACFC\uBAA9 \uCD94\uAC00"}
          </DialogTitle>
          <DialogDescription>
            {"\uACFC\uBAA9 \uC815\uBCF4\uBD80\uD130 \uC635\uC158\uAE4C\uC9C0 \uC815\uB9AC\uD574\uC11C \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 no-scrollbar">
            <CourseDialogBasicInfoSection
              state={state}
              dispatch={dispatch}
              categories={categories}
              categoryValue={categoryValue}
              categoryPlaceholder={categoryPlaceholder}
              editingCourseId={editingCourseId}
            />

            <CourseDialogDurationSection
              state={state}
              dispatch={dispatch}
            />

            <CourseDialogBreakRangesSection
              state={state}
              dispatch={dispatch}
              breakPickerOpen={breakPickerOpen}
              setBreakPickerOpen={setBreakPickerOpen}
            />

            <CourseDialogInstallmentSection
              checked={state.installmentEligible}
              onChange={(checked) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "installmentEligible",
                  value: checked,
                })
              }
            />

            <CourseDialogTimeSection
              state={state}
              dispatch={dispatch}
            />

            <CourseDialogScheduleSection
              state={state}
              dispatch={dispatch}
            />

            <CourseDialogRecordingSection
              timeType={state.timeType}
              isRecordingAvailable={state.isRecordingAvailable}
              isRecordingOnline={state.isRecordingOnline}
              isRecordingOffline={state.isRecordingOffline}
              onRecordingAvailableChange={(checked) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "isRecordingAvailable",
                  value: checked,
                })
              }
              onRecordingOnlineChange={(checked) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "isRecordingOnline",
                  value: checked,
                })
              }
              onRecordingOfflineChange={(checked) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "isRecordingOffline",
                  value: checked,
                })
              }
            />

            <CourseDialogTextbookSection
              timeType={state.timeType}
              textbook={state.textbook}
              onOptionChange={handleTextbookOptionChange}
              onAmountChange={handleTextbookAmountChange}
            />

            <CourseDialogAdditionalNoteSection
              value={state.textbook.customNote}
              onChange={(value) =>
                dispatch({
                  type: "SET_TEXTBOOK",
                  key: "customNote",
                  value,
                })
              }
            />

            <CourseDialogMathOptionSection
              checked={state.hasMathOption}
              fee={state.mathExcludedFee}
              onToggle={(checked) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "hasMathOption",
                  value: checked,
                })
              }
              onFeeChange={(value) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "mathExcludedFee",
                  value,
                })
              }
            />
          </div>

          <DialogFooter className="border-t bg-muted/40 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {"\uCDE8\uC18C"}
            </Button>
            <Button type="submit">{"\uD655\uC778"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
