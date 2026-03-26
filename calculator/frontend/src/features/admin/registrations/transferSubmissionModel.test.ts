import { describe, expect, it } from "vitest"

import { TRANSFER_COPY } from "./transferCopy"
import { makeCourseValue } from "./transferModel"
import {
  buildOpenTransferDialogDraft,
  validateTransferSubmission,
} from "./transferSubmissionModel"

describe("transferSubmissionModel", () => {
  it("buildOpenTransferDialogDraft preselects a matching course and remaining weeks", () => {
    const courseValue = makeCourseValue("course_1", "SAT Math")
    const result = buildOpenTransferDialogDraft(
      {
        id: "r1",
        courseId: "course_1",
        course: "SAT Math",
        weeks: 12,
      },
      new Map([[courseValue, "SAT Math"]]),
      "2026-04-01"
    )

    expect(result).toEqual({
      transferCourseValue: courseValue,
      transferDate: "2026-04-01",
      transferWeeks: "12",
    })
  })

  it("buildOpenTransferDialogDraft leaves the date empty when the course is not selectable", () => {
    const result = buildOpenTransferDialogDraft(
      {
        id: "r1",
        courseId: "course_1",
        course: "SAT Math",
        weeks: 12,
      },
      new Map(),
      "2026-04-01"
    )

    expect(result.transferCourseValue).toBe("")
    expect(result.transferDate).toBe("")
    expect(result.transferWeeks).toBe("12")
  })

  it("validateTransferSubmission returns an error when the date is missing", () => {
    const courseValue = makeCourseValue("course_1", "SAT Math")
    const result = validateTransferSubmission({
      transferTarget: { id: "r1", startDate: "2026-03-01" },
      transferDate: "",
      transferCourseValue: courseValue,
      transferWeeks: "4",
      transferCourseLabelMap: new Map([[courseValue, "SAT Math"]]),
      selectedCourseConfigSet: "default",
    })

    expect(result).toEqual({
      ok: false,
      error: TRANSFER_COPY.startDateRequired,
    })
  })

  it("validateTransferSubmission rejects non-positive week values", () => {
    const courseValue = makeCourseValue("course_1", "SAT Math")
    const result = validateTransferSubmission({
      transferTarget: { id: "r1", startDate: "2026-03-01" },
      transferDate: "2026-04-01",
      transferCourseValue: courseValue,
      transferWeeks: "0",
      transferCourseLabelMap: new Map([[courseValue, "SAT Math"]]),
      selectedCourseConfigSet: "default",
    })

    expect(result).toEqual({
      ok: false,
      error: TRANSFER_COPY.weeksPositiveInteger,
    })
  })

  it("validateTransferSubmission builds the transfer payload", () => {
    const courseValue = makeCourseValue("course_1", "SAT Math")
    const result = validateTransferSubmission({
      transferTarget: {
        id: "r1",
        startDate: "2026-03-01",
        courseConfigSetName: "set-a",
      },
      transferDate: "2026-04-01",
      transferCourseValue: courseValue,
      transferWeeks: "5",
      transferCourseLabelMap: new Map([[courseValue, "SAT Math"]]),
      selectedCourseConfigSet: "default",
    })

    expect(result).toEqual({
      ok: true,
      transferId: "r1",
      payload: {
        transferDate: "2026-04-01",
        course: "SAT Math",
        courseId: "course_1",
        courseConfigSetName: "set-a",
        weeks: 5,
      },
    })
  })
})
