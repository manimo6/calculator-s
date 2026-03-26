import CourseOverview from "./CourseOverview"
import RegistrationCardGrid from "./RegistrationCardGrid"
import { REGISTRATIONS_PANEL_COPY as COPY } from "./registrationsPanelCopy"
import type { MergeEntry, RegistrationRow } from "./registrationsTypes"

type NormalizedMergeEntry = {
  id: string
  name: string
  courses: string[]
}

type RegistrationsCardPanelProps = {
  baseRegistrations: RegistrationRow[]
  courseFilter: string
  handleCourseFilterFromCard: (value: string) => void
  courseIdToLabel: Map<string, string>
  courseVariantRequiredSet: Set<string>
  activeMergesToday: MergeEntry[]
  mergedCourseSetToday: Set<string>
  isAllView: boolean
  selectedGroupLabel?: string
  cardFilteredRegistrations: RegistrationRow[]
  openWithdrawDialog: (registration: RegistrationRow) => void
  handleRestore: (registration: RegistrationRow) => void | Promise<void>
  canManageTransfers: boolean
  openTransferDialog: (registration: RegistrationRow) => void
  handleTransferCancel: (registration: RegistrationRow) => void | Promise<void>
  openNoteDialog: (registration: RegistrationRow) => void
}

function normalizeActiveMerges(activeMergesToday: MergeEntry[]) {
  return (activeMergesToday || []).map<NormalizedMergeEntry>((merge) => ({
    id: String(merge.id || ""),
    name: String(merge.name || ""),
    courses: Array.isArray(merge.courses)
      ? merge.courses.map((course) => String(course || ""))
      : [],
  }))
}

function getHeading(isAllView: boolean, selectedGroupLabel?: string) {
  if (isAllView) return COPY.allStudentsList
  return `${selectedGroupLabel || ""} ${COPY.studentsListSuffix}`.trim()
}

export default function RegistrationsCardPanel({
  baseRegistrations,
  courseFilter,
  handleCourseFilterFromCard,
  courseIdToLabel,
  courseVariantRequiredSet,
  activeMergesToday,
  mergedCourseSetToday,
  isAllView,
  selectedGroupLabel,
  cardFilteredRegistrations,
  openWithdrawDialog,
  handleRestore,
  canManageTransfers,
  openTransferDialog,
  handleTransferCancel,
  openNoteDialog,
}: RegistrationsCardPanelProps) {
  const normalizedActiveMergesToday = normalizeActiveMerges(activeMergesToday)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CourseOverview
        registrations={baseRegistrations}
        courseFilter={courseFilter}
        onCourseFilterChange={handleCourseFilterFromCard}
        courseIdToLabel={courseIdToLabel}
        courseVariantRequiredSet={courseVariantRequiredSet}
        activeMergesToday={normalizedActiveMergesToday}
        mergedCourseSetToday={mergedCourseSetToday}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {getHeading(isAllView, selectedGroupLabel)}
          </h3>
        </div>
        <RegistrationCardGrid
          registrations={cardFilteredRegistrations}
          onWithdraw={openWithdrawDialog}
          onRestore={handleRestore}
          onTransfer={canManageTransfers ? openTransferDialog : undefined}
          onTransferCancel={canManageTransfers ? handleTransferCancel : undefined}
          onNote={openNoteDialog}
        />
      </div>
    </div>
  )
}
