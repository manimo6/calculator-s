import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CourseDialogDayCheckboxGroup } from "./CourseDialogDayCheckboxGroup"
import { COURSE_DIALOG_SCHEDULE_COPY } from "./courseDialogScheduleCopy"
import type { CourseDialogSectionProps } from "./courseDialogBasicShared"

export function CourseDialogScheduleSection({ state, dispatch }: CourseDialogSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_SCHEDULE_COPY.scheduleTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_SCHEDULE_COPY.scheduleDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold">{COURSE_DIALOG_SCHEDULE_COPY.daysLabel}</div>
          <CourseDialogDayCheckboxGroup
            field="days"
            selected={state.days}
            onToggle={(day) => dispatch({ type: "TOGGLE_DAY", field: "days", value: day })}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold">{COURSE_DIALOG_SCHEDULE_COPY.startDaysLabel}</div>
          <CourseDialogDayCheckboxGroup
            field="startDays"
            selected={state.startDays}
            onToggle={(day) => dispatch({ type: "TOGGLE_DAY", field: "startDays", value: day })}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold">{COURSE_DIALOG_SCHEDULE_COPY.endDaysLabel}</div>
          <CourseDialogDayCheckboxGroup
            field="endDays"
            selected={state.endDays}
            single
            onToggle={(day, single) =>
              dispatch({ type: "TOGGLE_DAY", field: "endDays", value: day, single })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
