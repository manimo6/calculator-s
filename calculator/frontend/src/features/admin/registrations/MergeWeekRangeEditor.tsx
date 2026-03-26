import type { ChangeEvent } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"

import { MERGE_MANAGER_COPY as COPY } from "./mergeManagerCopy"
import type { MergeWeekMode, WeekRangeInput } from "./mergeManagerModel"

type MergeWeekRangeEditorProps = {
  mergeWeekMode: MergeWeekMode
  onMergeWeekModeChange: (value: MergeWeekMode) => void
  mergeWeekRangeInputs: WeekRangeInput[]
  onMergeWeekRangeInputsChange: (value: WeekRangeInput[]) => void
}

export function MergeWeekRangeEditor({
  mergeWeekMode,
  onMergeWeekModeChange,
  mergeWeekRangeInputs,
  onMergeWeekRangeInputsChange,
}: MergeWeekRangeEditorProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50/50 to-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-slate-600">{COPY.applyWeeks}</Label>
        <Select
          value={mergeWeekMode}
          onValueChange={(value) => onMergeWeekModeChange(value as MergeWeekMode)}
        >
          <SelectTrigger className="h-9 w-[130px] rounded-lg border-slate-200/70 bg-white text-xs shadow-sm">
            <SelectValue placeholder={COPY.all} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{COPY.all}</SelectItem>
            <SelectItem value="range">{COPY.range}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mergeWeekMode === "range" ? (
        <div className="space-y-2">
          {mergeWeekRangeInputs.map((range, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={range.start}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...mergeWeekRangeInputs]
                  next[idx] = { ...next[idx], start: e.target.value }
                  onMergeWeekRangeInputsChange(next)
                }}
                placeholder={COPY.rangeStart}
                className="h-9 w-20 rounded-lg border-slate-200/70 bg-white text-center shadow-sm"
              />
              <span className="text-xs text-slate-400">~</span>
              <Input
                type="number"
                min="1"
                value={range.end}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...mergeWeekRangeInputs]
                  next[idx] = { ...next[idx], end: e.target.value }
                  onMergeWeekRangeInputsChange(next)
                }}
                placeholder={COPY.rangeEnd}
                className="h-9 w-20 rounded-lg border-slate-200/70 bg-white text-center shadow-sm"
              />
              <span className="text-xs text-slate-500">{COPY.week}</span>
              {mergeWeekRangeInputs.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = mergeWeekRangeInputs.filter((_, i) => i !== idx)
                    onMergeWeekRangeInputsChange(next)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onMergeWeekRangeInputsChange([...mergeWeekRangeInputs, { start: "", end: "" }])
            }
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {COPY.rangeAdd}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {COPY.allWeeksInfo}
        </div>
      )}
    </div>
  )
}
