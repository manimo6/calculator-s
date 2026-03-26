import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Video } from "lucide-react"

import { REGISTRATIONS_GANTT_ROW_COPY as COPY } from "./registrationsGanttRowCopy"
import type {
  GanttBarDescriptor,
  GanttMarkerDescriptor,
} from "./registrationsGanttRowModel"
import { ROW_HEIGHT_PX } from "./registrationsGanttModel"

export function RegistrationsGanttTimeline({
  hasDates,
  timelineWidth,
  bars,
  markers,
}: {
  hasDates: boolean
  timelineWidth: number
  bars: GanttBarDescriptor[]
  markers: GanttMarkerDescriptor[]
}) {
  return (
    <div
      className="relative"
      style={{
        width: timelineWidth,
        height: ROW_HEIGHT_PX,
      }}
    >
      {hasDates ? (
        <>
          {bars.map((bar) => (
            <div
              key={bar.key}
              className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm ring-1 ring-white/20 transition-all hover:scale-[1.02] hover:shadow-md ${bar.className}`}
              style={{
                left: bar.left,
                width: bar.width,
                height: bar.height,
              }}
              title={bar.title}
            />
          ))}
          {markers.map((marker) => (
            <Tooltip key={marker.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_55%),conic-gradient(from_210deg_at_50%_50%,#F7A83E_0deg,#FB4A75_110deg,#C39CFD_210deg,#6BB5EE_310deg,#F7A83E_360deg)] p-0.5 text-white shadow-sm transition hover:scale-110 hover:shadow-md"
                  style={{ left: marker.left }}
                  aria-label={COPY.recordingDateAria}
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <div className="space-y-0.5">
                  {marker.labels.map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </>
      ) : (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">
          {COPY.noDateInfo}
        </div>
      )}
    </div>
  )
}
