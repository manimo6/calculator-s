import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

export type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  courseConfigSetName?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  withdrawnAt?: string | Date
  transferToId?: string | number
  transferFromId?: string | number
  transferAt?: string | Date
  note?: string
  skipWeeks?: Array<number | string>
  durationUnit?: "weekly" | "daily"
  selectedDates?: string[]
} & Record<string, unknown>

export type RegistrationRowForOptions = {
  course?: string
  courseId?: string | number
} & Record<string, unknown>

export type CourseInfoRecord = Record<string, CourseInfo | undefined>

export type CourseConfigSet = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

export type TransferOption = { value: string; label: string }
export type TransferGroup = { label: string; items: TransferOption[] }
