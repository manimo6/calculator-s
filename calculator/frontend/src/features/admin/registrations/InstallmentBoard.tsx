import { useEffect, useMemo, useState } from "react"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import InstallmentBoardSummary from "./InstallmentBoardSummary"
import InstallmentBoardTable from "./InstallmentBoardTable"
import InstallmentExtensionDialog from "./InstallmentExtensionDialog"
import {
  buildCourseEarliestStartMap,
  buildExtensionsByRegistration,
  buildInstallmentRows,
  type CourseConfigSet,
  type ExtensionRow,
  type RegistrationRow,
  type SortConfig,
  type SortKey,
} from "./installmentBoardModel"
import { useInstallmentExtensionDraft } from "./useInstallmentExtensionDraft"

type InstallmentBoardProps = {
  registrations: RegistrationRow[]
  extensions: ExtensionRow[]
  courseConfigSet: CourseConfigSet | null
  courseIdToLabel: Map<string, string>
  resolveCourseDays?: (courseName?: string) => number[]
  onCreateExtension?: (payload: Record<string, unknown>) => Promise<void> | void
  categoryFilter: string
  courseFilter: string
  extensionsLoading?: boolean
}

export default function InstallmentBoard({
  registrations,
  extensions,
  courseConfigSet,
  courseIdToLabel,
  resolveCourseDays,
  onCreateExtension,
  categoryFilter,
  courseFilter,
  extensionsLoading = false,
}: InstallmentBoardProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  })

  void categoryFilter

  const canSortCourse = !courseFilter

  useEffect(() => {
    if (!canSortCourse && sortConfig.key === "course") {
      setSortConfig({ key: null, direction: "asc" })
    }
  }, [canSortCourse, sortConfig.key])

  const extensionsByRegistration = useMemo(
    () => buildExtensionsByRegistration(extensions || []),
    [extensions]
  )

  const courseEarliestStartMap = useMemo(
    () => buildCourseEarliestStartMap(registrations || []),
    [registrations]
  )

  const installmentRows = useMemo(
    () =>
      buildInstallmentRows({
        registrations: registrations || [],
        courseConfigSet,
        courseEarliestStartMap,
        courseIdToLabel,
        extensionsByRegistration,
        resolveCourseDays,
        sortConfig,
      }),
    [
      courseConfigSet,
      courseEarliestStartMap,
      courseIdToLabel,
      extensionsByRegistration,
      registrations,
      resolveCourseDays,
      sortConfig,
    ]
  )

  const extensionDraft = useInstallmentExtensionDraft({ onCreateExtension, courseConfigSet })
  const {
    dialogOpen,
    handleOpen,
    handleDialogOpenChange,
  } = extensionDraft

  const handleSort = (key: SortKey) => {
    if (key === "course" && !canSortCourse) return
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" }
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" }
      }
      return { key: null, direction: "asc" }
    })
  }

  if (!installmentRows.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
        {COPY.noTargets}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <InstallmentBoardSummary count={installmentRows.length} loading={extensionsLoading} />
      <InstallmentBoardTable
        rows={installmentRows}
        canSortCourse={canSortCourse}
        sortConfig={sortConfig}
        onSort={handleSort}
        onOpen={handleOpen}
      />
      <InstallmentExtensionDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        draft={extensionDraft}
      />
    </div>
  )
}
