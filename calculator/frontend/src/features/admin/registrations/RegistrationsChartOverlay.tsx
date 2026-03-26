import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog"

import RegistrationsGantt from "./RegistrationsGantt"
import type { GanttGroup, RegistrationRow } from "./registrationsTypes"

const REGISTRATIONS_CHART_OVERLAY_COPY = {
  eyebrow: "\uD655\uB300 \uBCF4\uAE30",
  title: "\uAC04\uD2B8 \uCC28\uD2B8 (\uC804\uCCB4)",
  close: "\uB2EB\uAE30",
  empty: "\uD45C\uC2DC\uD560 \uB370\uC774\uD130\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
} as const

type RegistrationsChartOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeGanttGroup: GanttGroup | null
  registrationMap: Map<string, RegistrationRow>
  resolveCourseDays: (courseName: string) => number[]
  openWithdrawDialog: (...args: any[]) => void
  handleRestore: (...args: any[]) => void
  openTransferDialog: (...args: any[]) => void
  handleTransferCancel: (...args: any[]) => void
  openNoteDialog: (...args: any[]) => void
  showTransferChain: boolean
  simulationDate: Date | null
  canManageTransfers: boolean
}

export default function RegistrationsChartOverlay({
  open,
  onOpenChange,
  activeGanttGroup,
  registrationMap,
  resolveCourseDays,
  openWithdrawDialog,
  handleRestore,
  openTransferDialog,
  handleTransferCancel,
  openNoteDialog,
  showTransferChain,
  simulationDate,
  canManageTransfers,
}: RegistrationsChartOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] overflow-hidden border-slate-200/70 bg-white/90 p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[28px] [&>button]:hidden">
        <DialogDescription className="sr-only">
          등록현황 전체 간트 차트를 확대해서 확인합니다.
        </DialogDescription>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200/70 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400">
                  {REGISTRATIONS_CHART_OVERLAY_COPY.eyebrow}
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  {REGISTRATIONS_CHART_OVERLAY_COPY.title}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-4"
                onClick={() => onOpenChange(false)}
              >
                {REGISTRATIONS_CHART_OVERLAY_COPY.close}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {activeGanttGroup ? (
              <RegistrationsGantt
                registrations={activeGanttGroup.registrations}
                rangeRegistrations={activeGanttGroup.rangeRegistrations}
                courseDays={activeGanttGroup.courseDays}
                mergeWeekRanges={activeGanttGroup.mergeWeekRanges || []}
                registrationMap={registrationMap}
                getCourseDaysForCourse={resolveCourseDays}
                onWithdraw={openWithdrawDialog}
                onRestore={handleRestore}
                onTransfer={canManageTransfers ? openTransferDialog : () => {}}
                onTransferCancel={canManageTransfers ? handleTransferCancel : () => {}}
                onNote={openNoteDialog}
                showTransferChain={showTransferChain}
                simulationDate={simulationDate}
                maxHeightClassName="max-h-[calc(100vh-10rem)]"
                disableCardOverflow={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {REGISTRATIONS_CHART_OVERLAY_COPY.empty}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
