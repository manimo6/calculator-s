import type { BreakRangeInput } from "@/utils/data"

import { OFFLINE_KEY, ONLINE_KEY } from "./courseDialogConstants"
import type {
  CourseData,
  CourseFormState,
  DynamicOption,
  RecordingData,
  TextbookState,
  TimeData,
} from "./courseDialogTypes"

function normalizeBreakDateValue(value: BreakRangeInput[keyof BreakRangeInput]) {
  if (!value) return ""
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = `${value.getMonth() + 1}`.padStart(2, "0")
    const day = `${value.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  return typeof value === "string" ? value : ""
}

function resolveTimeState(timeData: TimeData | undefined) {
  let timeType: CourseFormState["timeType"] = "default"
  let timeDefault = ""
  let timeOnline = ""
  let timeOffline = ""
  let dynamicOptions: DynamicOption[] = []

  if (!timeData) {
    return { timeType, timeDefault, timeOnline, timeOffline, dynamicOptions }
  }

  if (typeof timeData === "string") {
    return {
      timeType: "default" as const,
      timeDefault: timeData,
      timeOnline,
      timeOffline,
      dynamicOptions,
    }
  }

  if (typeof timeData === "object" && timeData.type === "onoff") {
    return {
      timeType: "onoff" as const,
      timeDefault,
      timeOnline: timeData.online || "",
      timeOffline: timeData.offline || "",
      dynamicOptions,
    }
  }

  if (typeof timeData === "object" && timeData.type === "dynamic") {
    return {
      timeType: "dynamic" as const,
      timeDefault,
      timeOnline,
      timeOffline,
      dynamicOptions: Array.isArray(timeData.options) ? timeData.options : [],
    }
  }

  if (typeof timeData === "object") {
    const timeMap = timeData as Record<string, string>
    const keys = Object.keys(timeMap)
    const hasOnOff =
      keys.includes(ONLINE_KEY) ||
      keys.includes(OFFLINE_KEY) ||
      keys.includes("online") ||
      keys.includes("offline")

    if (hasOnOff) {
      return {
        timeType: "onoff" as const,
        timeDefault,
        timeOnline: timeMap[ONLINE_KEY] || timeMap.online || "",
        timeOffline: timeMap[OFFLINE_KEY] || timeMap.offline || "",
        dynamicOptions,
      }
    }

    return {
      timeType: "dynamic" as const,
      timeDefault,
      timeOnline,
      timeOffline,
      dynamicOptions: keys
        .map((key) => ({ label: key, time: timeMap[key] }))
        .filter((option) => option.label),
    }
  }

  return { timeType, timeDefault, timeOnline, timeOffline, dynamicOptions }
}

function resolveRecordingState(recording: RecordingData | undefined) {
  if (typeof recording === "object" && recording !== null) {
    return {
      isRecordingAvailable: false,
      isRecordingOnline: !!(recording[ONLINE_KEY] ?? recording.online),
      isRecordingOffline: !!(recording[OFFLINE_KEY] ?? recording.offline),
    }
  }

  return {
    isRecordingAvailable: !!recording,
    isRecordingOnline: false,
    isRecordingOffline: false,
  }
}

function buildTextbookState(textbook?: Partial<TextbookState>): TextbookState {
  return {
    defaultOption: textbook?.defaultOption || "none",
    defaultAmount: textbook?.defaultAmount || 0,
    onlineOption: textbook?.onlineOption || "none",
    onlineAmount: textbook?.onlineAmount || 0,
    offlineOption: textbook?.offlineOption || "none",
    offlineAmount: textbook?.offlineAmount || 0,
    customNote: textbook?.customNote || "",
  }
}

function buildBreakRanges(breakRanges?: BreakRangeInput[]) {
  if (!Array.isArray(breakRanges)) return []
  return breakRanges.map((range) => ({
    startDate: normalizeBreakDateValue(range?.startDate ?? range?.start),
    endDate: normalizeBreakDateValue(range?.endDate ?? range?.end),
  }))
}

function buildCourseFormStatePayload(courseData: CourseData): Partial<CourseFormState> {
  const info = courseData.info || {}
  const timeState = resolveTimeState(courseData.timeData)
  const recordingState = resolveRecordingState(courseData.recording)

  return {
    category: courseData.category || "",
    courseName: courseData.name || "",
    fee: info.fee || 0,
    textbook: buildTextbookState(info.textbook),
    days: info.days || [],
    startDays: info.startDays || [],
    endDays: Array.isArray(info.endDays) ? info.endDays.slice(0, 1) : [],
    minDuration: info.min || 1,
    maxDuration: info.max || 12,
    timeType: timeState.timeType,
    timeDefault: timeState.timeDefault,
    timeOnline: timeState.timeOnline,
    timeOffline: timeState.timeOffline,
    dynamicOptions: timeState.dynamicOptions,
    isRecordingAvailable: recordingState.isRecordingAvailable,
    isRecordingOnline: recordingState.isRecordingOnline,
    isRecordingOffline: recordingState.isRecordingOffline,
    hasMathOption: info.hasMathOption || false,
    mathExcludedFee: info.mathExcludedFee || 0,
    installmentEligible: !!info.installmentEligible,
    breakRanges: buildBreakRanges(info.breakRanges),
  }
}

export { buildCourseFormStatePayload }
