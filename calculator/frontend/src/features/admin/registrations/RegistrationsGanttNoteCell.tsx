import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Plus } from "lucide-react"

import { REGISTRATIONS_GANTT_ROW_COPY as COPY } from "./registrationsGanttRowCopy"
import { LABEL_WIDTH_PX, type RegistrationRow } from "./registrationsGanttModel"
import type { GanttRowMeta } from "./registrationsGanttRowModel"

export function RegistrationsGanttNoteCell({
  row,
  meta,
  onNote,
}: {
  row: RegistrationRow
  meta: GanttRowMeta
  onNote: (row: RegistrationRow) => void
}) {
  return (
    <div
      data-gantt-left
      className="sticky left-0 relative z-20 flex items-center justify-center border-r-2 border-slate-300/80 bg-white px-2 transition-colors group-hover:bg-slate-50"
      style={{ left: LABEL_WIDTH_PX }}
    >
      {typeof onNote === "function" ? (
        meta.hasNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-slate-100 text-slate-500 shadow-sm transition-all hover:scale-105 hover:bg-white hover:text-slate-900 hover:shadow-md"
                onClick={(event) => {
                  event.stopPropagation()
                  onNote(row)
                }}
                aria-label={COPY.noteAria}
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur"
            >
              {meta.notePreview}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600"
            onClick={(event) => {
              event.stopPropagation()
              onNote(row)
            }}
            aria-label={COPY.addNoteAria}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )
      ) : null}
    </div>
  )
}
