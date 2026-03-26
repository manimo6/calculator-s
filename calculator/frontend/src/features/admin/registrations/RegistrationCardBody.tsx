import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { CalendarRange, Clock, FileText, Video } from "lucide-react"

import { REGISTRATION_CARD_COPY as COPY } from "./registrationCardCopy"
import type { RegistrationRow } from "./registrationsTypes"
import { formatDateYmd, formatTimestampKo } from "./utils"

type RegistrationAction = (row: RegistrationRow) => void

export function RegistrationCardBody({
  registration,
  start,
  end,
  weeks,
  recordingCount,
  hasNote,
  onNote,
}: {
  registration: RegistrationRow
  start: string
  end: string
  weeks: string
  recordingCount: number
  hasNote: boolean
  onNote?: RegistrationAction
}) {
  return (
    <CardContent className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {start && end ? `${start} ~ ${end}` : formatDateYmd(registration?.startDate) || "-"}
        </span>
        {weeks ? (
          <Badge variant="secondary" className="ml-2">
            {weeks}
            {COPY.weekSuffix}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {recordingCount ? (
          <span className="inline-flex items-center gap-1">
            <Video className="h-3.5 w-3.5" />
            {COPY.recordingCountPrefix}
            {recordingCount}
            {COPY.recordingCountSuffix}
          </span>
        ) : null}
        {registration?.timestamp ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatTimestampKo(registration.timestamp)}
          </span>
        ) : null}
      </div>
      {typeof onNote === "function" ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between rounded-2xl border border-slate-200/70 bg-white text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
          onClick={() => onNote(registration)}
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {COPY.note}
          </span>
          <span className="text-xs">
            {hasNote ? (
              <span className="text-emerald-600">{COPY.notePresent}</span>
            ) : (
              <span className="text-muted-foreground">{COPY.noteEmpty}</span>
            )}
          </span>
        </Button>
      ) : null}
    </CardContent>
  )
}
