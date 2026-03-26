import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { CourseFormState } from "./courseDialogState"
import { COURSE_DIALOG_SCHEDULE_COPY } from "./courseDialogScheduleCopy"
import type { CourseDialogSectionProps } from "./courseDialogBasicShared"

export function CourseDialogTimeSection({ state, dispatch }: CourseDialogSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_SCHEDULE_COPY.timeTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_SCHEDULE_COPY.timeDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold">
              {COURSE_DIALOG_SCHEDULE_COPY.timeModeLabel}
            </div>
          </div>
          <RadioGroup
            value={state.timeType}
            onValueChange={(value) =>
              dispatch({
                type: "SET_FIELD",
                field: "timeType",
                value: value as CourseFormState["timeType"],
              })
            }
            className="grid gap-2 md:grid-cols-3"
          >
            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
              <RadioGroupItem value="default" />
              {COURSE_DIALOG_SCHEDULE_COPY.timeModeDefault}
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
              <RadioGroupItem value="onoff" />
              {COURSE_DIALOG_SCHEDULE_COPY.timeModeOnOff}
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
              <RadioGroupItem value="dynamic" />
              {COURSE_DIALOG_SCHEDULE_COPY.timeModeDynamic}
            </label>
          </RadioGroup>
        </div>

        {state.timeType === "default" ? (
          <div className="space-y-2">
            <Label htmlFor="timeDefault">{COURSE_DIALOG_SCHEDULE_COPY.defaultTimeLabel}</Label>
            <Input
              id="timeDefault"
              value={state.timeDefault}
              onChange={(e) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "timeDefault",
                  value: e.target.value,
                })
              }
              placeholder={COURSE_DIALOG_SCHEDULE_COPY.defaultTimePlaceholder}
            />
          </div>
        ) : null}

        {state.timeType === "onoff" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeOnline">{COURSE_DIALOG_SCHEDULE_COPY.onlineTimeLabel}</Label>
              <Input
                id="timeOnline"
                value={state.timeOnline}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "timeOnline",
                    value: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeOffline">{COURSE_DIALOG_SCHEDULE_COPY.offlineTimeLabel}</Label>
              <Input
                id="timeOffline"
                value={state.timeOffline}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "timeOffline",
                    value: e.target.value,
                  })
                }
              />
            </div>
          </div>
        ) : null}

        {state.timeType === "dynamic" ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold">
              {COURSE_DIALOG_SCHEDULE_COPY.dynamicSectionLabel}
            </div>
            <div className="space-y-2">
              {state.dynamicOptions.map((option, index) => (
                <div key={index} className="flex flex-wrap gap-2">
                  <Input
                    value={option.label}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_DYNAMIC_TIME",
                        index,
                        key: "label",
                        value: e.target.value,
                      })
                    }
                    placeholder={COURSE_DIALOG_SCHEDULE_COPY.dynamicLabelPlaceholder}
                    className="min-w-[140px] flex-1"
                  />
                  <Input
                    value={option.time}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_DYNAMIC_TIME",
                        index,
                        key: "time",
                        value: e.target.value,
                      })
                    }
                    placeholder={COURSE_DIALOG_SCHEDULE_COPY.dynamicTimePlaceholder}
                    className="min-w-[200px] flex-[2]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => dispatch({ type: "REMOVE_DYNAMIC_TIME", index })}
                  >
                    {COURSE_DIALOG_SCHEDULE_COPY.removeOption}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "ADD_DYNAMIC_TIME" })}
            >
              {COURSE_DIALOG_SCHEDULE_COPY.addOption}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
