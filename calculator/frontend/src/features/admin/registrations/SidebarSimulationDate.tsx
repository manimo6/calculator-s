import { CalendarDays, Eye, RotateCcw } from "lucide-react"
import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ReactNode } from "react"

import { REGISTRATIONS_SIDEBAR_COPY as COPY } from "./registrationsSidebarCopy"

function SimulationCalendarPopover({
  selected,
  onSelect,
  children,
}: {
  selected: Date
  onSelect: (date: Date) => void
  children: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        align="start"
        side="right"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 px-4 py-3">
            <div className="text-xs font-semibold text-violet-700">{COPY.simulationTitle}</div>
            <div className="mt-0.5 text-[10px] text-violet-500">{COPY.simulationDescription}</div>
          </div>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
              const date = value instanceof Date ? value : null
              if (date) onSelect(date)
            }}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SidebarSimulationDate({
  simulationDate,
  onSimulationDateChange,
}: {
  simulationDate: Date | null
  onSimulationDateChange?: (date: Date | null) => void
}) {
  if (!onSimulationDateChange) return null

  return (
    <div className="border-b border-border/40 px-4 py-2.5">
      {simulationDate ? (
        <div className="flex items-center gap-2 rounded-xl border border-violet-200/60 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 shadow-sm">
          <Eye className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <SimulationCalendarPopover
            selected={simulationDate}
            onSelect={onSimulationDateChange}
          >
            <button className="flex-1 cursor-pointer text-left text-xs font-semibold text-violet-700 transition-colors hover:text-violet-900">
              {simulationDate.getFullYear()}.{String(simulationDate.getMonth() + 1).padStart(2, "0")}.{String(
                simulationDate.getDate()
              ).padStart(2, "0")} {COPY.basedOn}
            </button>
          </SimulationCalendarPopover>
          <button
            onClick={() => onSimulationDateChange(null)}
            className="flex h-5 w-5 items-center justify-center rounded-md text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600"
            title={COPY.resetToToday}
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <SimulationCalendarPopover selected={new Date()} onSelect={onSimulationDateChange}>
          <button className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-violet-200/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 px-3 py-2 text-xs font-semibold text-violet-500 shadow-sm transition-all hover:from-violet-100 hover:to-indigo-100 hover:text-violet-700 hover:shadow-md">
            <CalendarDays className="h-3.5 w-3.5" />
            {COPY.simulationTitle}
          </button>
        </SimulationCalendarPopover>
      )}
    </div>
  )
}
