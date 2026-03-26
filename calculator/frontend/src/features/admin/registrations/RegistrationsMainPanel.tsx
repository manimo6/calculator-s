import MergeManagerCard from "./MergeManagerCard"
import RegistrationsPanelContent from "./RegistrationsPanelContent"
import type {
  CourseConfigSet,
  ExtensionRow,
  GanttGroup,
  MergeEntry,
  RegistrationRow,
} from "./registrationsTypes"

type RegistrationsMainPanelProps = {
  courseConfigSetError: string
  error: string
  installmentMode: boolean
  extensionsError: string
  mergeManagerOpen: boolean
  selectedCourseConfigSet: string
  canManageMerges: boolean
  mergeCourseOptions: string[]
  mergeCourseTabs: string[]
  mergeName: string
  setMergeName: (value: string) => void
  mergeCourses: string[]
  setMergeCourses: (value: string[]) => void
  mergeWeekMode: "all" | "range"
  setMergeWeekMode: (value: "all" | "range") => void
  mergeWeekRangeInputs: Array<{ start: string; end: string }>
  setMergeWeekRangeInputs: (value: Array<{ start: string; end: string }>) => void
  addMerge: () => void
  merges: MergeEntry[]
  deleteMerge: (id: string) => void
  toggleMergeActive: (id: string, isActive: boolean) => void | Promise<void>
  editingMergeId?: string | null
  startEditMerge: (id: string) => void
  cancelEditMerge: () => void
  loading: boolean
  courseConfigSetCourseSet: Set<string>
  filteredRegistrations: RegistrationRow[]
  canViewInstallments: boolean
  extensions: ExtensionRow[]
  extensionsLoading: boolean
  selectedCourseConfigSetObj: CourseConfigSet | null
  courseIdToLabel: Map<string, string>
  resolveCourseDays: (courseName: string) => number[]
  onCreateExtension: (payload: Record<string, unknown>) => Promise<void>
  categoryFilter: string
  courseFilter: string
  showGantt: boolean
  showTransferChain: boolean
  setShowTransferChain: (value: boolean) => void
  ganttGroups: GanttGroup[]
  setActiveGanttTab: (value: string) => void
  setChartOverlayOpen: (value: boolean) => void
  registrationMap: Map<string, RegistrationRow>
  openWithdrawDialog: (registration: RegistrationRow) => void
  handleRestore: (registration: RegistrationRow) => void | Promise<void>
  canManageTransfers: boolean
  openTransferDialog: (registration: RegistrationRow) => void
  handleTransferCancel: (registration: RegistrationRow) => void | Promise<void>
  openNoteDialog: (registration: RegistrationRow) => void
  simulationDate: Date | null
  isAllView: boolean
  viewSource: string
  baseRegistrations: RegistrationRow[]
  handleCourseFilterFromCard: (value: string) => void
  courseVariantRequiredSet: Set<string>
  activeMergesToday: MergeEntry[]
  mergedCourseSetToday: Set<string>
  cardFilteredRegistrations: RegistrationRow[]
}

export default function RegistrationsMainPanel({
  courseConfigSetError,
  error,
  installmentMode,
  extensionsError,
  mergeManagerOpen,
  selectedCourseConfigSet,
  canManageMerges,
  mergeCourseOptions,
  mergeCourseTabs,
  mergeName,
  setMergeName,
  mergeCourses,
  setMergeCourses,
  mergeWeekMode,
  setMergeWeekMode,
  mergeWeekRangeInputs,
  setMergeWeekRangeInputs,
  addMerge,
  merges,
  deleteMerge,
  toggleMergeActive,
  editingMergeId,
  startEditMerge,
  cancelEditMerge,
  loading,
  courseConfigSetCourseSet,
  filteredRegistrations,
  canViewInstallments,
  extensions,
  extensionsLoading,
  selectedCourseConfigSetObj,
  courseIdToLabel,
  resolveCourseDays,
  onCreateExtension,
  categoryFilter,
  courseFilter,
  showGantt,
  showTransferChain,
  setShowTransferChain,
  ganttGroups,
  setActiveGanttTab,
  setChartOverlayOpen,
  registrationMap,
  openWithdrawDialog,
  handleRestore,
  canManageTransfers,
  openTransferDialog,
  handleTransferCancel,
  openNoteDialog,
  simulationDate,
  isAllView,
  viewSource,
  baseRegistrations,
  handleCourseFilterFromCard,
  courseVariantRequiredSet,
  activeMergesToday,
  mergedCourseSetToday,
  cardFilteredRegistrations,
}: RegistrationsMainPanelProps) {
  return (
    <div className="space-y-6">
      {courseConfigSetError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {courseConfigSetError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {installmentMode && extensionsError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {extensionsError}
        </div>
      ) : null}

      {mergeManagerOpen && selectedCourseConfigSet && canManageMerges ? (
        <MergeManagerCard
          courseOptions={mergeCourseOptions}
          courseTabs={mergeCourseTabs}
          mergeName={mergeName}
          onMergeNameChange={setMergeName}
          mergeCourses={mergeCourses}
          onMergeCoursesChange={setMergeCourses}
          mergeWeekMode={mergeWeekMode}
          onMergeWeekModeChange={setMergeWeekMode}
          mergeWeekRangeInputs={mergeWeekRangeInputs}
          onMergeWeekRangeInputsChange={setMergeWeekRangeInputs}
          onAddMerge={addMerge}
          merges={merges}
          onDeleteMerge={deleteMerge}
          onToggleMergeActive={toggleMergeActive}
          editingMergeId={editingMergeId}
          onEditMerge={startEditMerge}
          onCancelEdit={cancelEditMerge}
        />
      ) : null}

      <RegistrationsPanelContent
        loading={loading}
        selectedCourseConfigSet={selectedCourseConfigSet}
        courseConfigSetCourseSet={courseConfigSetCourseSet}
        filteredRegistrations={filteredRegistrations}
        installmentMode={installmentMode}
        canViewInstallments={canViewInstallments}
        extensions={extensions}
        extensionsLoading={extensionsLoading}
        selectedCourseConfigSetObj={selectedCourseConfigSetObj}
        courseIdToLabel={courseIdToLabel}
        resolveCourseDays={resolveCourseDays}
        onCreateExtension={onCreateExtension}
        categoryFilter={categoryFilter}
        courseFilter={courseFilter}
        showGantt={showGantt}
        showTransferChain={showTransferChain}
        setShowTransferChain={setShowTransferChain}
        ganttGroups={ganttGroups}
        setActiveGanttTab={setActiveGanttTab}
        setChartOverlayOpen={setChartOverlayOpen}
        registrationMap={registrationMap}
        openWithdrawDialog={openWithdrawDialog}
        handleRestore={handleRestore}
        canManageTransfers={canManageTransfers}
        openTransferDialog={openTransferDialog}
        handleTransferCancel={handleTransferCancel}
        openNoteDialog={openNoteDialog}
        simulationDate={simulationDate}
        isAllView={isAllView}
        viewSource={viewSource}
        baseRegistrations={baseRegistrations}
        handleCourseFilterFromCard={handleCourseFilterFromCard}
        courseVariantRequiredSet={courseVariantRequiredSet}
        activeMergesToday={activeMergesToday}
        mergedCourseSetToday={mergedCourseSetToday}
        cardFilteredRegistrations={cardFilteredRegistrations}
      />
    </div>
  )
}
