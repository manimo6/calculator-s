import type { Dispatch, SetStateAction } from "react"

import type { CourseTreeGroup } from "@/utils/data"
import type { CourseAction, CourseFormState } from "./courseDialogState"

export type CourseDialogSectionProps = {
  state: CourseFormState
  dispatch: Dispatch<CourseAction>
}

export type CourseDialogBasicInfoSectionProps = CourseDialogSectionProps & {
  categories: CourseTreeGroup[]
  categoryValue: string
  categoryPlaceholder: string
  editingCourseId?: string
}

export type CourseDialogBreakRangesSectionProps = CourseDialogSectionProps & {
  breakPickerOpen: string | null
  setBreakPickerOpen: Dispatch<SetStateAction<string | null>>
}

export function parseDateYmd(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}
