import { CheckCircle2, Clock, TimerOff, Users } from "lucide-react"

import { REGISTRATIONS_SIDEBAR_COPY as COPY } from "./registrationsSidebarCopy"
import type { SidebarStats } from "./registrationsSidebarModel"

export function SidebarStatsHeader({ stats }: { stats: SidebarStats }) {
  return (
    <div className="border-b border-border/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {COPY.overallStatus}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-100/50 bg-emerald-50/50 p-2">
          <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> {COPY.active}
          </div>
          <div className="text-lg font-bold text-emerald-700">{stats.active}</div>
        </div>
        <div className="rounded-lg border border-amber-100/50 bg-amber-50/50 p-2">
          <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
            <Clock className="h-3 w-3" /> {COPY.pending}
          </div>
          <div className="text-lg font-bold text-amber-700">{stats.pending}</div>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-100/50 bg-slate-50/50 p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
              <TimerOff className="h-3 w-3" /> {COPY.completed}
            </div>
            <div className="text-sm font-bold text-slate-600">{stats.completed}</div>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
              <Users className="h-3 w-3" /> {COPY.total}
            </div>
            <div className="text-sm font-bold text-slate-600">{stats.total}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
