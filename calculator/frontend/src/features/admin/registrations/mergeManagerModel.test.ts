import { describe, expect, it } from "vitest"

import {
  ALL_MERGE_TAB,
  buildAvailableMergeTabs,
  filterMergeCourses,
  formatMergeWeekRanges,
  toggleMergeCourseSelection,
} from "./mergeManagerModel"

describe("mergeManagerModel", () => {
  it("formats empty and ranged week labels", () => {
    expect(formatMergeWeekRanges([])).toBe("\uC804\uCCB4 \uC8FC\uCC28")
    expect(formatMergeWeekRanges([{ start: 2, end: 4 }])).toBe("2~4\uC8FC\uCC28")
  })

  it("keeps only tabs that match actual course options", () => {
    expect(
      buildAvailableMergeTabs(["Math", "SAT", "History"], ["Math A", "SAT Fire"])
    ).toEqual(["Math", "SAT"])
  })

  it("filters courses by active tab and search text", () => {
    expect(
      filterMergeCourses({
        courseOptions: ["Math A", "Math B", "SAT Fire"],
        courseTab: "Math",
        search: "b",
      })
    ).toEqual(["Math B"])

    expect(
      filterMergeCourses({
        courseOptions: ["Math A", "Math B", "SAT Fire"],
        courseTab: ALL_MERGE_TAB,
        search: "",
      })
    ).toEqual(["Math A", "Math B", "SAT Fire"])
  })

  it("toggles course selections without mutating the original list", () => {
    const current = ["Math A"]

    expect(toggleMergeCourseSelection(current, new Set(current), "Math A")).toEqual([])
    expect(toggleMergeCourseSelection(current, new Set(current), "Math B")).toEqual([
      "Math A",
      "Math B",
    ])
    expect(current).toEqual(["Math A"])
  })
})
