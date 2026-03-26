import { RefreshCw, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ATTENDANCE_TAB_COPY as COPY } from "./attendanceTabCopy"

type AttendanceTabHeroProps = {
  loading: boolean
  onRefresh: () => void
}

export default function AttendanceTabHero({
  loading,
  onRefresh,
}: AttendanceTabHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-orange-400/10 p-6 shadow-lg shadow-black/5 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{COPY.title}</h2>
            <p className="text-sm text-slate-600">{COPY.subtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="gap-2 rounded-xl border-white/40 bg-white/60 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {COPY.refresh}
        </Button>
      </div>
    </div>
  )
}
