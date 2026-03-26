import InstallmentBoard from "./InstallmentBoard"
import RegistrationsCardPanel from "./RegistrationsCardPanel"
import RegistrationsGanttPanel from "./RegistrationsGanttPanel"
import {
  RegistrationsConfigRequiredState,
  RegistrationsInlineState,
  RegistrationsLoadingState,
} from "./RegistrationsPanelStates"
import { REGISTRATIONS_PANEL_COPY as COPY } from "./registrationsPanelCopy"
import type {
  CourseConfigSet,
  ExtensionRow,
  GanttGroup,
  MergeEntry,
  RegistrationRow,
} from "./registrationsTypes"

type RegistrationsPanelContentProps = {
  loading: boolean
  selectedCourseConfigSet: string
  courseConfigSetCourseSet: Set<string>
  filteredRegistrations: RegistrationRow[]
  installmentMode: boolean
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

export default function RegistrationsPanelContent({
  loading,
  selectedCourseConfigSet,
  courseConfigSetCourseSet,
  filteredRegistrations,
  installmentMode,
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
}: RegistrationsPanelContentProps) {
  if (!selectedCourseConfigSet) {
    return <RegistrationsConfigRequiredState />
  }

  if (loading) {
    return <RegistrationsLoadingState />
  }

  if (courseConfigSetCourseSet.size === 0) {
    return <RegistrationsInlineState message={COPY.noCourses} />
  }

  if (filteredRegistrations.length === 0) {
    return <RegistrationsInlineState message={COPY.noResults} />
  }

  if (installmentMode && canViewInstallments) {
    return (
      <InstallmentBoard
        registrations={filteredRegistrations}
        extensions={extensions}
        extensionsLoading={extensionsLoading}
        courseConfigSet={selectedCourseConfigSetObj}
        courseIdToLabel={courseIdToLabel}
        resolveCourseDays={resolveCourseDays}
        onCreateExtension={onCreateExtension}
        categoryFilter={categoryFilter}
        courseFilter={courseFilter}
      />
    )
  }

  if (showGantt) {
    return (
      <RegistrationsGanttPanel
        showTransferChain={showTransferChain}
        setShowTransferChain={setShowTransferChain}
        ganttGroups={ganttGroups}
        setActiveGanttTab={setActiveGanttTab}
        setChartOverlayOpen={setChartOverlayOpen}
        registrationMap={registrationMap}
        resolveCourseDays={resolveCourseDays}
        openWithdrawDialog={openWithdrawDialog}
        handleRestore={handleRestore}
        canManageTransfers={canManageTransfers}
        openTransferDialog={openTransferDialog}
        handleTransferCancel={handleTransferCancel}
        openNoteDialog={openNoteDialog}
        simulationDate={simulationDate}
      />
    )
  }

  return (
    <RegistrationsCardPanel
      baseRegistrations={baseRegistrations}
      courseFilter={viewSource === "card" ? courseFilter : ""}
      handleCourseFilterFromCard={handleCourseFilterFromCard}
      courseIdToLabel={courseIdToLabel}
      courseVariantRequiredSet={courseVariantRequiredSet}
      activeMergesToday={activeMergesToday}
      mergedCourseSetToday={mergedCourseSetToday}
      isAllView={isAllView}
      selectedGroupLabel={ganttGroups[0]?.label || ""}
      cardFilteredRegistrations={cardFilteredRegistrations}
      openWithdrawDialog={openWithdrawDialog}
      handleRestore={handleRestore}
      canManageTransfers={canManageTransfers}
      openTransferDialog={openTransferDialog}
      handleTransferCancel={handleTransferCancel}
      openNoteDialog={openNoteDialog}
    />
  )
}
