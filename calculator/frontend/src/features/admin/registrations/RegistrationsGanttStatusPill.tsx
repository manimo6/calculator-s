import { CheckCircle2, Clock, TimerOff } from "lucide-react"

import { getStatusLabel } from "./utils"

type RegistrationsGanttStatusPillProps = {
  status: string
}

export default function RegistrationsGanttStatusPill({
  status,
}: RegistrationsGanttStatusPillProps) {
  const Icon =
    status === "active" ? CheckCircle2 : status === "pending" ? Clock : TimerOff
  const styles =
    status === "active"
      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20"
      : status === "pending"
        ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 ring-1 ring-amber-500/20"
        : "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 ring-1 ring-zinc-500/20"

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${styles}`}
    >
      <Icon className="h-3 w-3" />
      {getStatusLabel(status)}
    </div>
  )
}
