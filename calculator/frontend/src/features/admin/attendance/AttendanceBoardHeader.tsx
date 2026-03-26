import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar, ChevronLeft, ChevronRight, EyeOff, Paintbrush } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { ATTENDANCE_BOARD_COPY as COPY } from "./attendanceBoardCopy"
import {
  PAINTABLE_STATUSES,
  type AttendanceStatusKey,
} from "./attendanceBoardModel"

type AttendanceBoardHeaderProps = {
  month: Date
  hideInactive: boolean
  paintStatus: AttendanceStatusKey
  onPrevMonth: () => void
  onNextMonth: () => void
  onHideInactiveChange: (value: boolean) => void
  onPaintStatusChange: (status: AttendanceStatusKey) => void
}

export default function AttendanceBoardHeader({
  month,
  hideInactive,
  paintStatus,
  onPrevMonth,
  onNextMonth,
  onHideInactiveChange,
  onPaintStatusChange,
}: AttendanceBoardHeaderProps) {
  return (
    <CardHeader className="flex flex-col gap-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/90 via-white/95 to-violet-50/90 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-slate-200/60 bg-white/80 shadow-sm transition-all hover:bg-white hover:shadow-md"
              onClick={onPrevMonth}
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </Button>
            <div className="min-w-[140px] rounded-xl border border-slate-200/60 bg-white/90 px-5 py-2 text-center text-base font-bold text-slate-800 shadow-sm">
              {format(month, COPY.monthFormat, { locale: ko })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-slate-200/60 bg-white/80 shadow-sm transition-all hover:bg-white hover:shadow-md"
              onClick={onNextMonth}
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2.5 shadow-sm">
          <EyeOff className="h-4 w-4 text-slate-400" />
          <Switch
            id="attendance-hide-inactive"
            checked={hideInactive}
            onCheckedChange={onHideInactiveChange}
          />
          <Label htmlFor="attendance-hide-inactive" className="cursor-pointer text-sm font-medium text-slate-600">
            {COPY.hideInactive}
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Paintbrush className="h-4 w-4" />
          <span>{COPY.paintStatus}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PAINTABLE_STATUSES.map((status) => {
            const isActive = paintStatus === status.key
            return (
              <button
                key={status.key}
                type="button"
                onClick={() => onPaintStatusChange(status.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${status.className} ${
                  isActive
                    ? "ring-2 ring-violet-400/60 ring-offset-2"
                    : "hover:scale-105"
                }`}
                aria-pressed={isActive}
              >
                {status.label}
              </button>
            )
          })}
        </div>
      </div>
    </CardHeader>
  )
}
