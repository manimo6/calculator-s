import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { COURSE_DIALOG_BASIC_COPY } from "./courseDialogBasicCopy"
import type { CourseDialogSectionProps } from "./courseDialogBasicShared"

export function CourseDialogDurationSection({ state, dispatch }: CourseDialogSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_BASIC_COPY.durationTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_BASIC_COPY.durationDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minDuration">{COURSE_DIALOG_BASIC_COPY.minDurationLabel}</Label>
          <Input
            id="minDuration"
            type="number"
            min={1}
            value={state.minDuration}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "minDuration",
                value: parseInt(e.target.value) || 1,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxDuration">{COURSE_DIALOG_BASIC_COPY.maxDurationLabel}</Label>
          <Input
            id="maxDuration"
            type="number"
            min={1}
            value={state.maxDuration}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "maxDuration",
                value: parseInt(e.target.value) || 1,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
