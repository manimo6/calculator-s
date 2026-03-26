import { describe, expect, it } from "vitest"

import { OFFLINE_KEY, ONLINE_KEY } from "./courseDialogConstants"
import {
  buildCourseFormStatePayload,
  courseFormReducer,
  initialCourseFormState,
} from "./courseDialogState"

describe("courseDialogState", () => {
  it("hydrates on/off course data with Korean keys", () => {
    const payload = buildCourseFormStatePayload({
      category: "SAT",
      name: "SAT Math",
      info: {
        fee: 250000,
        days: [1, 3],
        startDays: [1],
        endDays: [5],
        breakRanges: [{ startDate: "2026-03-10", endDate: "2026-03-14" }],
      },
      timeData: {
        [ONLINE_KEY]: "09:00~10:00",
        [OFFLINE_KEY]: "14:00~15:00",
      },
      recording: {
        [ONLINE_KEY]: true,
        [OFFLINE_KEY]: false,
      },
    })

    expect(payload.timeType).toBe("onoff")
    expect(payload.timeOnline).toBe("09:00~10:00")
    expect(payload.timeOffline).toBe("14:00~15:00")
    expect(payload.isRecordingOnline).toBe(true)
    expect(payload.isRecordingOffline).toBe(false)
    expect(payload.breakRanges).toEqual([
      { startDate: "2026-03-10", endDate: "2026-03-14" },
    ])
  })

  it("hydrates typed dynamic time data", () => {
    const payload = buildCourseFormStatePayload({
      name: "Essay Clinic",
      timeData: {
        type: "dynamic",
        options: [
          { label: "A Class", time: "09:00~10:00" },
          { label: "B Class", time: "10:00~11:00" },
        ],
      },
      recording: true,
    })

    expect(payload.timeType).toBe("dynamic")
    expect(payload.dynamicOptions).toEqual([
      { label: "A Class", time: "09:00~10:00" },
      { label: "B Class", time: "10:00~11:00" },
    ])
    expect(payload.isRecordingAvailable).toBe(true)
  })

  it("reducer updates textbook and dynamic options without mutating the base state", () => {
    const withDynamic = courseFormReducer(initialCourseFormState, { type: "ADD_DYNAMIC_TIME" })
    const updated = courseFormReducer(withDynamic, {
      type: "UPDATE_DYNAMIC_TIME",
      index: 0,
      key: "label",
      value: "Speaking",
    })
    const textbookUpdated = courseFormReducer(updated, {
      type: "SET_TEXTBOOK",
      key: "customNote",
      value: "Printer included",
    })

    expect(initialCourseFormState.dynamicOptions).toEqual([])
    expect(textbookUpdated.dynamicOptions).toEqual([{ label: "Speaking", time: "" }])
    expect(textbookUpdated.textbook.customNote).toBe("Printer included")
  })
})
