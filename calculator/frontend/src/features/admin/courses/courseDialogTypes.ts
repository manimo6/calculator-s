import type { BreakRangeInput } from "@/utils/data"

type TextbookState = {
  defaultOption: string
  defaultAmount: number
  onlineOption: string
  onlineAmount: number
  offlineOption: string
  offlineAmount: number
  customNote: string
}

type DynamicOption = { label: string; time: string }
type BreakRange = { startDate: string; endDate: string }

type CourseFormState = {
  category: string
  courseName: string
  fee: number
  textbook: TextbookState
  days: number[]
  startDays: number[]
  endDays: number[]
  minDuration: number
  maxDuration: number
  timeType: "default" | "onoff" | "dynamic"
  timeDefault: string
  timeOnline: string
  timeOffline: string
  dynamicOptions: DynamicOption[]
  isRecordingAvailable: boolean
  isRecordingOnline: boolean
  isRecordingOffline: boolean
  hasMathOption: boolean
  mathExcludedFee: number
  installmentEligible: boolean
  breakRanges: BreakRange[]
}

type CourseAction =
  | { type: "RESET"; payload: Partial<CourseFormState> }
  | {
      type: "SET_FIELD"
      field: keyof CourseFormState
      value: CourseFormState[keyof CourseFormState]
    }
  | {
      type: "SET_TEXTBOOK"
      key: keyof TextbookState
      value: TextbookState[keyof TextbookState]
    }
  | {
      type: "TOGGLE_DAY"
      field: "days" | "startDays" | "endDays"
      value: number
      single?: boolean
    }
  | { type: "ADD_DYNAMIC_TIME" }
  | { type: "UPDATE_DYNAMIC_TIME"; index: number; key: keyof DynamicOption; value: string }
  | { type: "REMOVE_DYNAMIC_TIME"; index: number }
  | { type: "ADD_BREAK_RANGE" }
  | { type: "UPDATE_BREAK_RANGE"; index: number; key: keyof BreakRange; value: string }
  | { type: "REMOVE_BREAK_RANGE"; index: number }

type TimeData =
  | string
  | { type: "onoff"; online?: string; offline?: string }
  | { type: "dynamic"; options?: DynamicOption[] }
  | Record<string, string>

type RecordingData =
  | boolean
  | {
      [key: string]: boolean | undefined
      online?: boolean
      offline?: boolean
    }

type CourseData = {
  category?: string
  name?: string
  info?: {
    fee?: number
    textbook?: Partial<TextbookState>
    days?: number[]
    startDays?: number[]
    endDays?: number[]
    min?: number
    max?: number
    hasMathOption?: boolean
    mathExcludedFee?: number
    installmentEligible?: boolean
    breakRanges?: BreakRangeInput[]
  } & Record<string, unknown>
  timeData?: TimeData
  recording?: RecordingData
}

const initialCourseFormState: CourseFormState = {
  category: "",
  courseName: "",
  fee: 0,
  textbook: {
    defaultOption: "none",
    defaultAmount: 0,
    onlineOption: "none",
    onlineAmount: 0,
    offlineOption: "none",
    offlineAmount: 0,
    customNote: "",
  },
  days: [],
  startDays: [],
  endDays: [],
  minDuration: 1,
  maxDuration: 12,
  timeType: "default",
  timeDefault: "",
  timeOnline: "",
  timeOffline: "",
  dynamicOptions: [],
  isRecordingAvailable: false,
  isRecordingOnline: false,
  isRecordingOffline: false,
  hasMathOption: false,
  mathExcludedFee: 0,
  installmentEligible: false,
  breakRanges: [],
}

export { initialCourseFormState }

export type {
  BreakRange,
  CourseAction,
  CourseData,
  CourseFormState,
  DynamicOption,
  RecordingData,
  TextbookState,
  TimeData,
}
