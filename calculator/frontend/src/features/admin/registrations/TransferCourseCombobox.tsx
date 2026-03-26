import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { TRANSFER_COPY } from "./transferCopy"
import type { TransferGroup, TransferOption } from "./useTransfer"

export function TransferCourseCombobox({
  value,
  onChange,
  courseGroups,
}: {
  value: string
  onChange: (value: string) => void
  courseGroups: TransferGroup[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const allItems = useMemo(() => {
    const items: Array<TransferOption & { group: string }> = []
    for (const group of courseGroups) {
      for (const item of group.items) {
        items.push({ ...item, group: group.label })
      }
    }
    return items
  }, [courseGroups])

  const selectedLabel = useMemo(() => {
    if (!value) return ""
    for (const item of allItems) {
      if (item.value === value) return item.label
    }
    return ""
  }, [allItems, value])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return courseGroups
    const term = search.trim().toLowerCase()
    const result: TransferGroup[] = []

    for (const group of courseGroups) {
      const filtered = group.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      )
      if (filtered.length) {
        result.push({ label: group.label, items: filtered })
      }
    }

    return result
  }, [courseGroups, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`group flex w-full items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-sm transition-all duration-200 ${
            open
              ? "border-indigo-400 ring-4 ring-indigo-50"
              : value
                ? "border-indigo-200 hover:border-indigo-300"
                : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className={value ? "font-medium text-slate-900" : "text-slate-400"}>
            {selectedLabel || TRANSFER_COPY.coursePlaceholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] rounded-xl border-slate-200 p-0 shadow-xl shadow-slate-200/50"
        align="start"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder={TRANSFER_COPY.courseSearchPlaceholder}
            autoFocus
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1.5" onWheel={(e) => e.stopPropagation()}>
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {TRANSFER_COPY.noResults}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </div>
                {group.items.map((course) => {
                  const isSelected = value === course.value
                  return (
                    <button
                      key={course.value}
                      type="button"
                      className={`relative flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-indigo-50 font-medium text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        onChange(course.value)
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      <span className={`mr-2 flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                        isSelected ? "bg-indigo-500 text-white" : "border border-slate-300"
                      }`}>
                        {isSelected ? <Check className="h-2.5 w-2.5" /> : null}
                      </span>
                      {course.label}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
