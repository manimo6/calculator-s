import {
  MergeManagerFormSection,
  MergeManagerListSection,
  MergeManagerShell,
} from "./MergeManagerSections"
import {
  type MergeEntry,
  type MergeWeekMode,
  type WeekRangeInput,
} from "./mergeManagerModel"

type MergeManagerCardProps = {
  courseOptions: string[]
  courseTabs: string[]
  mergeName: string
  onMergeNameChange: (value: string) => void
  mergeCourses: string[]
  onMergeCoursesChange: (value: string[]) => void
  mergeWeekMode: MergeWeekMode
  onMergeWeekModeChange: (value: MergeWeekMode) => void
  mergeWeekRangeInputs: WeekRangeInput[]
  onMergeWeekRangeInputsChange: (value: WeekRangeInput[]) => void
  onAddMerge: () => void
  merges: MergeEntry[]
  onDeleteMerge: (id: string) => void
  onToggleMergeActive?: (id: string, isActive: boolean) => void
  editingMergeId?: string | null
  onEditMerge?: (id: string) => void
  onCancelEdit?: () => void
}

export default function MergeManagerCard({
  courseOptions,
  courseTabs,
  mergeName,
  onMergeNameChange,
  mergeCourses,
  onMergeCoursesChange,
  mergeWeekMode,
  onMergeWeekModeChange,
  mergeWeekRangeInputs,
  onMergeWeekRangeInputsChange,
  onAddMerge,
  merges,
  onDeleteMerge,
  onToggleMergeActive,
  editingMergeId,
  onEditMerge,
  onCancelEdit,
}: MergeManagerCardProps) {
  return (
    <MergeManagerShell>
      <MergeManagerFormSection
        mergeName={mergeName}
        onMergeNameChange={onMergeNameChange}
        mergeWeekMode={mergeWeekMode}
        onMergeWeekModeChange={onMergeWeekModeChange}
        mergeWeekRangeInputs={mergeWeekRangeInputs}
        onMergeWeekRangeInputsChange={onMergeWeekRangeInputsChange}
        courseOptions={courseOptions}
        courseTabs={courseTabs}
        mergeCourses={mergeCourses}
        onMergeCoursesChange={onMergeCoursesChange}
        editingMergeId={editingMergeId}
        onAddMerge={onAddMerge}
        onCancelEdit={onCancelEdit}
      />

      <MergeManagerListSection
        merges={merges}
        editingMergeId={editingMergeId}
        onDeleteMerge={onDeleteMerge}
        onToggleMergeActive={onToggleMergeActive}
        onEditMerge={onEditMerge}
      />
    </MergeManagerShell>
  )
}
