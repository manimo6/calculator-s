import { Checkbox } from "@/components/ui/checkbox"

import { weekdayName } from "@/utils/data"

type CourseDialogDayCheckboxGroupProps = {
  field: "days" | "startDays" | "endDays"
  selected: number[]
  onToggle: (day: number, single?: boolean) => void
  single?: boolean
}

export function CourseDialogDayCheckboxGroup({
  field,
  selected,
  onToggle,
  single = false,
}: CourseDialogDayCheckboxGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const checked = selected.includes(day)
        return (
          <label
            key={`${field}-${day}`}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm shadow-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(day, single)}
            />
            <span>{weekdayName[day]}</span>
          </label>
        )
      })}
    </div>
  )
}
