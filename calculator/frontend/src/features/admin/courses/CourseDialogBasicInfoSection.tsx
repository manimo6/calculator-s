import { useMemo } from "react"
import { Trash2, X } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { ShadcnCalendar } from "@/components/ui/shadcn-calendar"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { COURSE_DIALOG_BASIC_COPY } from "./courseDialogBasicCopy"
import type { CourseDialogBasicInfoSectionProps } from "./courseDialogBasicShared"

export function CourseDialogBasicInfoSection({
  state,
  dispatch,
  categories,
  categoryValue,
  categoryPlaceholder,
  editingCourseId,
}: CourseDialogBasicInfoSectionProps) {
  const isDaily = state.durationUnit === "daily"

  const selectedDatesSet = useMemo(
    () => new Set(state.availableDates),
    [state.availableDates]
  )

  const sortedDates = useMemo(
    () => [...state.availableDates].sort(),
    [state.availableDates]
  )

  const handleCalendarSelect = (value: Date | Date[] | undefined) => {
    if (!value) return
    const dates = Array.isArray(value) ? value : [value]
    for (const d of dates) {
      const dateStr = format(d, "yyyy-MM-dd")
      dispatch({ type: "TOGGLE_AVAILABLE_DATE", date: dateStr })
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_BASIC_COPY.basicInfoTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_BASIC_COPY.basicInfoDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{COURSE_DIALOG_BASIC_COPY.categoryLabel}</Label>
            <Select
              value={categoryValue}
              onValueChange={(value) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "category",
                  value: value === categoryPlaceholder ? "" : value,
                })
              }
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder={COURSE_DIALOG_BASIC_COPY.categoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={categoryPlaceholder} disabled>
                  {COURSE_DIALOG_BASIC_COPY.categoryPlaceholder}
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.cat} value={category.cat}>
                    {category.cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseName">{COURSE_DIALOG_BASIC_COPY.courseNameLabel}</Label>
            <Input
              id="courseName"
              value={state.courseName}
              onChange={(e) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "courseName",
                  value: e.target.value,
                })
              }
              placeholder={COURSE_DIALOG_BASIC_COPY.courseNamePlaceholder}
              required
              disabled={Boolean(editingCourseId)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{COURSE_DIALOG_BASIC_COPY.durationUnitLabel}</Label>
          <RadioGroup
            value={state.durationUnit}
            onValueChange={(value) =>
              dispatch({
                type: "SET_FIELD",
                field: "durationUnit",
                value,
              })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="unit-weekly" />
              <Label htmlFor="unit-weekly" className="cursor-pointer font-normal">
                {COURSE_DIALOG_BASIC_COPY.durationUnitWeekly}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="unit-daily" />
              <Label htmlFor="unit-daily" className="cursor-pointer font-normal">
                {COURSE_DIALOG_BASIC_COPY.durationUnitDaily}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {isDaily ? (
          <div className="space-y-4">
            {/* Fee table */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">{COURSE_DIALOG_BASIC_COPY.dailyFeeTableTitle}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {COURSE_DIALOG_BASIC_COPY.dailyFeeTableDescription}
                </p>
              </div>

              {state.dailyFees.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>{COURSE_DIALOG_BASIC_COPY.dailyFeeDaysLabel}</span>
                    <span>{COURSE_DIALOG_BASIC_COPY.dailyFeeFeeLabel}</span>
                    <span />
                  </div>
                  {state.dailyFees.map((entry, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                      <Input
                        type="number"
                        min={1}
                        value={entry.days || ""}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_DAILY_FEE",
                            index,
                            key: "days",
                            value: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="3"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={entry.fee || ""}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_DAILY_FEE",
                            index,
                            key: "fee",
                            value: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="330,000"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => dispatch({ type: "REMOVE_DAILY_FEE", index })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => dispatch({ type: "ADD_DAILY_FEE" })}
              >
                {COURSE_DIALOG_BASIC_COPY.dailyFeeAddButton}
              </Button>
            </div>

            {/* Available dates calendar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">
                    {COURSE_DIALOG_BASIC_COPY.availableDatesTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {COURSE_DIALOG_BASIC_COPY.availableDatesDescription}
                  </p>
                </div>
                {sortedDates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {sortedDates.length}{COURSE_DIALOG_BASIC_COPY.availableDatesCount}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => dispatch({ type: "SET_AVAILABLE_DATES", dates: [] })}
                    >
                      {COURSE_DIALOG_BASIC_COPY.availableDatesClear}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-center rounded-2xl border border-border/60 bg-white shadow-sm">
                <ShadcnCalendar
                  mode="multiple"
                  locale={ko}
                  selected={sortedDates.map((d) => new Date(d + "T00:00:00"))}
                  onSelect={(dates) => {
                    const next = (dates || []).map((d) => format(d, "yyyy-MM-dd"))
                    dispatch({ type: "SET_AVAILABLE_DATES", dates: next })
                  }}
                  className="rounded-2xl"
                />
              </div>

              {sortedDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sortedDates.map((dateStr) => {
                    const d = new Date(dateStr + "T00:00:00")
                    const label = format(d, "M/d(EEE)", { locale: ko })
                    return (
                      <Badge
                        key={dateStr}
                        variant="outline"
                        className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() =>
                          dispatch({ type: "TOGGLE_AVAILABLE_DATE", date: dateStr })
                        }
                      >
                        {label}
                        <X className="h-3 w-3" />
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="courseFee">{COURSE_DIALOG_BASIC_COPY.feeLabel}</Label>
            <Input
              id="courseFee"
              type="number"
              value={state.fee}
              onChange={(e) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "fee",
                  value: parseInt(e.target.value) || 0,
                })
              }
              required
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
