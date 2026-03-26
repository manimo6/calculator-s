import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

export type CourseInfoRecord = Record<string, CourseInfo | undefined>

export type CourseConfigSet = {
  name?: string
  data?: {
    courseTree?: CourseTreeGroup[]
    courseInfo?: CourseInfoRecord
    timeTable?: unknown
  } | null
}

export type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  courseConfigSetName?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  skipWeeks?: Array<number | string>
  withdrawnAt?: string | Date
  transferAt?: string | Date
  transferToId?: string | number
  transferFromId?: string | number
  note?: string
  noteUpdatedAt?: string | number | Date
  timestamp?: string | number | Date
} & Record<string, unknown>

export type MergeWeekRange = { start: number; end: number }

export type MergeEntry = {
  id?: string | number
  name?: string
  courses?: string[]
  weekRanges?: MergeWeekRange[]
  isActive?: boolean
  courseConfigSetName?: string
  referenceStartDate?: string | null
} & Record<string, unknown>

export type ExtensionRow = {
  registrationId?: string | number
} & Record<string, unknown>

export type WeekRange = { start: number; end: number }

export type GanttGroup = {
  key: string
  label: string
  registrations: RegistrationRow[]
  rangeRegistrations: RegistrationRow[]
  courseDays: number[]
  count: number
  mergeWeekRanges?: WeekRange[]
}

export type CourseOption = {
  value: string
  label: string
}
