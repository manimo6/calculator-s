import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

import RegistrationsGantt from "./RegistrationsGantt"
import { REGISTRATIONS_PANEL_COPY as COPY } from "./registrationsPanelCopy"
import type { GanttGroup, RegistrationRow } from "./registrationsTypes"

type RegistrationsGanttPanelProps = {
  showTransferChain: boolean
  setShowTransferChain: (value: boolean) => void
  ganttGroups: GanttGroup[]
  setActiveGanttTab: (value: string) => void
  setChartOverlayOpen: (value: boolean) => void
  registrationMap: Map<string, RegistrationRow>
  resolveCourseDays: (courseName: string) => number[]
  openWithdrawDialog: (registration: RegistrationRow) => void
  handleRestore: (registration: RegistrationRow) => void | Promise<void>
  canManageTransfers: boolean
  openTransferDialog: (registration: RegistrationRow) => void
  handleTransferCancel: (registration: RegistrationRow) => void | Promise<void>
  openNoteDialog: (registration: RegistrationRow) => void
  simulationDate: Date | null
}

export default function RegistrationsGanttPanel({
  showTransferChain,
  setShowTransferChain,
  ganttGroups,
  setActiveGanttTab,
  setChartOverlayOpen,
  registrationMap,
  resolveCourseDays,
  openWithdrawDialog,
  handleRestore,
  canManageTransfers,
  openTransferDialog,
  handleTransferCancel,
  openNoteDialog,
  simulationDate,
}: RegistrationsGanttPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          checked={showTransferChain}
          onCheckedChange={setShowTransferChain}
          id="transferChainToggle"
        />
        <label
          htmlFor="transferChainToggle"
          className="cursor-pointer text-xs font-semibold text-slate-500"
        >
          {COPY.transferHistory}
        </label>
      </div>
      {ganttGroups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              {group.label}
              <Badge
                variant="secondary"
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              >
                {group.count}
                {COPY.membersSuffix}
              </Badge>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setActiveGanttTab(group.key)
                setChartOverlayOpen(true)
              }}
            >
              {COPY.openLargeView}
            </Button>
          </div>
          <RegistrationsGantt
            registrations={group.registrations}
            rangeRegistrations={group.rangeRegistrations}
            courseDays={group.courseDays}
            mergeWeekRanges={group.mergeWeekRanges || []}
            registrationMap={registrationMap}
            getCourseDaysForCourse={resolveCourseDays}
            onWithdraw={openWithdrawDialog}
            onRestore={handleRestore}
            onTransfer={canManageTransfers ? openTransferDialog : () => {}}
            onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
            onNote={openNoteDialog}
            showTransferChain={showTransferChain}
            simulationDate={simulationDate}
          />
        </div>
      ))}
    </div>
  )
}
