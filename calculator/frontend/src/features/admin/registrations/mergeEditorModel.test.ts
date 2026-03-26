import { describe, expect, it } from "vitest"

import {
  buildMergeEditDraft,
  buildNextMerges,
  createEmptyMergeWeekRangeInputs,
  validateMergeDraft,
} from "./mergeEditorModel"

describe("mergeEditorModel", () => {
  it("returns a stable empty draft", () => {
    expect(createEmptyMergeWeekRangeInputs()).toEqual([{ start: "", end: "" }])
    expect(buildMergeEditDraft(undefined)).toEqual({
      mergeName: "",
      mergeCourses: [],
      mergeWeekMode: "all",
      mergeWeekRangeInputs: [{ start: "", end: "" }],
    })
  })

  it("validates minimum course count and ranged week inputs", () => {
    expect(
      validateMergeDraft({
        mergeCourses: ["Math A"],
        mergeWeekMode: "all",
        mergeWeekRangeInputs: [{ start: "", end: "" }],
      })
    ).toEqual({
      ok: false,
      error: "\uD569\uBC18\uD560 \uACFC\uBAA9\uC740 2\uAC1C \uC774\uC0C1 \uC120\uD0DD\uD574\uC57C \uD569\uB2C8\uB2E4.",
    })

    expect(
      validateMergeDraft({
        mergeCourses: ["Math A", "Math B"],
        mergeWeekMode: "range",
        mergeWeekRangeInputs: [{ start: "2", end: "4" }],
      })
    ).toEqual({
      ok: true,
      selected: ["Math A", "Math B"],
      weekRanges: [{ start: 2, end: 4 }],
    })
  })

  it("builds add and edit merge payloads", () => {
    const base = [
      {
        id: "m1",
        name: "Merge 1",
        courses: ["Math A", "Math B"],
        weekRanges: [],
        isActive: true,
        courseConfigSetName: "Spring",
      },
    ]

    const edited = buildNextMerges({
      merges: base,
      editingMergeId: "m1",
      mergeName: "Edited",
      selectedCourses: ["Math A", "Math C"],
      selectedCourseConfigSet: "Spring",
      weekRanges: [{ start: 3, end: 5 }],
    })

    expect(edited).toEqual([
      {
        id: "m1",
        name: "Edited",
        courses: ["Math A", "Math C"],
        weekRanges: [{ start: 3, end: 5 }],
        isActive: true,
        courseConfigSetName: "Spring",
      },
    ])

    const draft = buildMergeEditDraft(edited[0])
    expect(draft).toEqual({
      mergeName: "Edited",
      mergeCourses: ["Math A", "Math C"],
      mergeWeekMode: "range",
      mergeWeekRangeInputs: [{ start: "3", end: "5" }],
    })
  })
})
