import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
      </CardContent>
    </Card>
  )
}
