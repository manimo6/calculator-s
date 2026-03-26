import { Badge } from "@/components/ui/badge"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentStatus } from "./installmentBoardModel"

type InstallmentStatusBadgeProps = {
  status: InstallmentStatus
}

export default function InstallmentStatusBadge({
  status,
}: InstallmentStatusBadgeProps) {
  if (status === "notice_needed") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-400 bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/20"
      >
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        {COPY.statusNoticeNeeded}
      </Badge>
    )
  }

  if (status === "notice_done") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-sky-400 bg-gradient-to-r from-sky-100 to-blue-100 px-3 py-1 text-xs font-bold text-sky-900 shadow-md shadow-sky-500/20"
      >
        {COPY.statusNoticeDone}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full border-emerald-400 bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-bold text-emerald-900 shadow-md shadow-emerald-500/20"
    >
      {COPY.statusPaid}
    </Badge>
  )
}
