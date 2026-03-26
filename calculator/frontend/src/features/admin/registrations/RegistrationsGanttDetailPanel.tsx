import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  ArrowRightLeft,
  CalendarRange,
  RotateCcw,
  UserMinus,
  X,
} from "lucide-react"

import {
  adjustEndToLastClassDay,
  type RegistrationRow,
} from "./registrationsGanttModel"
import RegistrationsGanttStatusPill from "./RegistrationsGanttStatusPill"
import TransferHistoryTimeline from "./TransferHistoryTimeline"
import {
  formatDateYmd,
  getRegistrationStatus,
  stripMathExcludeLabel,
} from "./utils"

type RegistrationsGanttDetailPanelProps = {
  open: boolean
  target: RegistrationRow | null
  overlayClassName: string
  panelClassName: string
  closeDetail: () => void
  simulationDate?: Date | null
  transferHistory: RegistrationRow[]
  courseDays: number[]
  getCourseDaysForCourse: (courseName?: string) => number[]
  onRestore: (row: RegistrationRow) => void
  onTransfer: (row: RegistrationRow) => void
  onTransferCancel: (row: RegistrationRow) => void
  onWithdraw: (row: RegistrationRow) => void
}

export default function RegistrationsGanttDetailPanel({
  open,
  target,
  overlayClassName,
  panelClassName,
  closeDetail,
  simulationDate = null,
  transferHistory,
  courseDays,
  getCourseDaysForCourse,
  onRestore,
  onTransfer,
  onTransferCancel,
  onWithdraw,
}: RegistrationsGanttDetailPanelProps) {
  const detailStatus = target ? getRegistrationStatus(target, simulationDate || undefined) : "active"
  const detailIsWithdrawn = Boolean(target?.isWithdrawn || target?.withdrawnAt)
  const detailIsTransferredOut = Boolean(
    target?.isTransferredOut || target?.transferToId
  )
  const detailIsTransferChild = Boolean(target?.transferFromId)
  const detailCanWithdraw = !detailIsWithdrawn && !detailIsTransferredOut
  const detailCanTransfer = !detailIsWithdrawn && !detailIsTransferredOut
  const detailCanTransferCancel = detailIsTransferChild && !detailIsTransferredOut

  const detailCourseLabel = stripMathExcludeLabel(target?.course)
  const detailCourseDays =
    typeof getCourseDaysForCourse === "function"
      ? getCourseDaysForCourse(target?.course)
      : courseDays
  const detailStart = formatDateYmd(target?.startDate)
  const detailEnd = formatDateYmd(
    adjustEndToLastClassDay(target?.endDate, detailCourseDays)
  )
  const detailWeeks =
    target?.weeks !== null && target?.weeks !== undefined
      ? String(target.weeks)
      : ""

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className={overlayClassName} onClick={closeDetail} />
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full border border-slate-200/70 bg-white/80 p-1.5 text-slate-500 shadow-sm transition hover:text-slate-800"
          onClick={closeDetail}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">닫기</span>
        </button>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
              등록현황
            </div>
            <div className="text-xl font-semibold text-slate-900">등록현황 상세</div>
          </div>
          <div className="text-sm text-slate-500">
            차트에서 선택한 학생의 상태와 전반/퇴원 처리를 확인합니다.
          </div>
        </div>
        {target ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    학생
                  </div>
                  <div className="mt-1 truncate text-2xl font-semibold text-slate-900">
                    {target?.name || "-"}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {detailCourseLabel || target?.course || "-"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {detailIsTransferredOut ? (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                      전반
                    </Badge>
                  ) : detailIsWithdrawn ? (
                    <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                      중도퇴원
                    </Badge>
                  ) : (
                    <RegistrationsGanttStatusPill status={detailStatus} />
                  )}
                  {detailWeeks ? <Badge variant="secondary">{detailWeeks}주</Badge> : null}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarRange className="h-4 w-4" />
                <span>
                  {detailStart && detailEnd ? `${detailStart} ~ ${detailEnd}` : detailStart || "-"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                선택한 기간 기준으로 표시됩니다.
              </div>
            </div>
            <TransferHistoryTimeline
              history={transferHistory}
              currentId={target?.id}
              adjustEndDate={(date, course) =>
                adjustEndToLastClassDay(
                  date,
                  typeof getCourseDaysForCourse === "function"
                    ? getCourseDaysForCourse(course)
                    : courseDays
                )
              }
            />
            <div className="mt-auto border-t border-slate-200/60 pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {detailIsWithdrawn ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full rounded-lg border-emerald-200/80 text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    onClick={() => {
                      onRestore?.(target)
                      closeDetail()
                    }}
                  >
                    복구
                  </Button>
                ) : null}
                {detailCanTransfer && onTransfer ? (
                  <Button
                    type="button"
                    className="h-10 w-full gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                    onClick={() => {
                      onTransfer?.(target)
                      closeDetail()
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {detailIsTransferChild ? "재전반" : "전반"}
                  </Button>
                ) : null}
                {detailCanTransferCancel && onTransferCancel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-lg border-amber-200/80 text-amber-700 shadow-sm transition hover:bg-amber-50"
                    onClick={() => {
                      onTransferCancel?.(target)
                      closeDetail()
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    전반취소
                  </Button>
                ) : null}
                {detailCanWithdraw ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-lg border-rose-200/80 text-rose-600 shadow-sm transition hover:bg-rose-50"
                    onClick={() => {
                      onWithdraw?.(target)
                      closeDetail()
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                    퇴원
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">선택된 항목이 없습니다.</div>
        )}
      </div>
    </div>
  )
}
