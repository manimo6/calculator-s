import type { ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { MergeCourseSelector } from "./MergeCourseSelector"
import { MERGE_MANAGER_COPY as COPY } from "./mergeManagerCopy"
import { MergeWeekRangeEditor } from "./MergeWeekRangeEditor"
import type { MergeWeekMode, WeekRangeInput } from "./mergeManagerModel"

export function MergeManagerFormSection({
  mergeName,
  onMergeNameChange,
  mergeWeekMode,
  onMergeWeekModeChange,
  mergeWeekRangeInputs,
  onMergeWeekRangeInputsChange,
  courseOptions,
  courseTabs,
  mergeCourses,
  onMergeCoursesChange,
  editingMergeId,
  onAddMerge,
  onCancelEdit,
}: {
  mergeName: string
  onMergeNameChange: (value: string) => void
  mergeWeekMode: MergeWeekMode
  onMergeWeekModeChange: (value: MergeWeekMode) => void
  mergeWeekRangeInputs: WeekRangeInput[]
  onMergeWeekRangeInputsChange: (value: WeekRangeInput[]) => void
  courseOptions: string[]
  courseTabs: string[]
  mergeCourses: string[]
  onMergeCoursesChange: (value: string[]) => void
  editingMergeId?: string | null
  onAddMerge: () => void
  onCancelEdit?: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="space-y-3 md:col-span-4">
          <Label htmlFor="mergeName" className="text-sm font-semibold text-slate-700">
            {COPY.mergeName}
          </Label>
          <Input
            id="mergeName"
            value={mergeName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onMergeNameChange(e.target.value)}
            placeholder={COPY.mergeNamePlaceholder}
            className="h-11 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-indigo-500"
          />
          <MergeWeekRangeEditor
            mergeWeekMode={mergeWeekMode}
            onMergeWeekModeChange={onMergeWeekModeChange}
            mergeWeekRangeInputs={mergeWeekRangeInputs}
            onMergeWeekRangeInputsChange={onMergeWeekRangeInputsChange}
          />
        </div>

        <div className="space-y-3 md:col-span-6">
          <MergeCourseSelector
            courseOptions={courseOptions}
            courseTabs={courseTabs}
            mergeCourses={mergeCourses}
            onMergeCoursesChange={onMergeCoursesChange}
          />
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          {editingMergeId ? (
            <>
              <Button
                type="button"
                onClick={onAddMerge}
                className="h-11 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40"
              >
                {COPY.saveEdit}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                className="h-11 rounded-xl border-slate-300 font-semibold"
              >
                {COPY.cancel}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onAddMerge}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40"
            >
              {COPY.addMerge}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
