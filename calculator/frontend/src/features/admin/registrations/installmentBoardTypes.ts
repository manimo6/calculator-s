import type { BreakRangeInput, CourseInfo, CourseTreeGroup } from "@/utils/data"

export const DEFAULT_EXTEND_WEEKS = 4

export type SortKey = "student" | "course" | "period" | "status" | null
export type SortConfig = { key: SortKey; direction: "asc" | "desc" }

export const DEFAULT_INSTALLMENT_SORT = {
  key: "status",
  direction: "asc",
} as const satisfies SortConfig

export type CourseInfoRecord = Record<string, CourseInfo | undefined>

export type CourseConfigSet = {
  name?: string
  data?: {
    courseTree?: CourseTreeGroup[]
    courseInfo?: CourseInfoRecord
  } | null
}

export type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  withdrawnAt?: string | Date
  tuitionFee?: number | string
} & Record<string, unknown>

export type ExtensionRow = {
  registrationId?: string | number
  startDate?: string | Date
} & Record<string, unknown>

export type InstallmentStatus = "notice_needed" | "notice_done" | "in_progress"

export type InstallmentRow = {
  registration: RegistrationRow
  courseLabel: string
  maxWeeks: number
  studentMaxWeeks: number
  weeks: number
  remainingWeeks: number
  courseDays: number[]
  endDay: number
  endDate: string | Date
  status: InstallmentStatus
  extensionCount: number
  breakRanges: BreakRangeInput[]
  nextStartDate: string
  isWithdrawn: boolean
}

export type BuildInstallmentRowsOptions = {
  registrations: RegistrationRow[]
  courseConfigSet: CourseConfigSet | null
  courseEarliestStartMap: Map<string, Date>
  courseIdToLabel: Map<string, string>
  extensionsByRegistration: Map<string, ExtensionRow[]>
  resolveCourseDays?: (courseName?: string) => number[]
  sortConfig: SortConfig
  today?: Date
}
