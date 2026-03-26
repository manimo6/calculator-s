import { describe, expect, it } from "vitest"

import {
  buildTransferCourseGroups,
  buildTransferCourseLabelMap,
  buildTransferCourseOptions,
  calcRemainingWeeks,
  getTransferExpectedEndDate,
  makeCourseValue,
  parseCourseValue,
} from "./transferModel"

describe("transferModel", () => {
  it("encodes and decodes course values by id and name", () => {
    const byId = makeCourseValue("math-a", "Math A")
    const byName = makeCourseValue("", "SAT Fire")

    expect(byId).toBe("__courseid__math-a")
    expect(parseCourseValue(byId)).toEqual({ type: "id", value: "math-a" })
    expect(byName).toBe("__coursename__SAT Fire")
    expect(parseCourseValue(byName)).toEqual({ type: "name", value: "SAT Fire" })
  })

  it("keeps skipped weeks out of attended-week calculation", () => {
    const remaining = calcRemainingWeeks(
      {
        weeks: 8,
        startDate: "2026-03-02",
        skipWeeks: [2],
      },
      "2026-03-16"
    )

    expect(remaining).toBe(7)
  })

  it("expands base course options into variant names from registrations", () => {
    const options = buildTransferCourseOptions({
      courseOptions: [
        { value: "__courseid__sat-base", label: "SAT" },
        { value: "__courseid__math-a", label: "Math" },
      ],
      registrations: [
        { course: "SAT Fire" },
        { course: "SAT Sprint" },
        { course: "Math" },
      ],
    })

    expect(options).toEqual([
      { value: "__coursename__SAT Fire", label: "SAT Fire" },
      { value: "__coursename__SAT Sprint", label: "SAT Sprint" },
      { value: "__courseid__math-a", label: "Math" },
    ])
  })

  it("groups transfer options by category and excludes the current course", () => {
    const transferCourseOptions = [
      { value: "__courseid__math-a", label: "Math A" },
      { value: "__courseid__eng-a", label: "English A" },
      { value: "__coursename__SAT Fire", label: "SAT Fire" },
    ]

    const groups = buildTransferCourseGroups({
      transferCourseOptions,
      selectedCourseConfigSetObj: {
        data: {
          courseTree: [
            {
              cat: "Math",
              items: [{ val: "math-a", label: "Math" }],
            },
            {
              cat: "English",
              items: [{ val: "eng-a", label: "English" }],
            },
            {
              cat: "SAT",
              items: [{ val: "sat-base", label: "SAT" }],
            },
          ],
        },
      },
      transferTarget: {
        course: "English A",
      },
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({
      label: "Math",
      items: [{ value: "__courseid__math-a", label: "Math A" }],
    })
    expect(groups[1]).toEqual({
      label: "SAT",
      items: [{ value: "__coursename__SAT Fire", label: "SAT Fire" }],
    })
  })

  it("falls back to a stable unknown category label", () => {
    const groups = buildTransferCourseGroups({
      transferCourseOptions: [{ value: "__coursename__Essay Lab", label: "Essay Lab" }],
      selectedCourseConfigSetObj: null,
      transferTarget: null,
    })

    expect(groups).toEqual([
      {
        label: "\uBBF8\uBD84\uB958",
        items: [{ value: "__coursename__Essay Lab", label: "Essay Lab" }],
      },
    ])
  })

  it("derives transfer end dates from start date and weeks", () => {
    expect(getTransferExpectedEndDate("2026-03-18", "4")).toBe("2026-04-14")
    expect(getTransferExpectedEndDate("", "4")).toBe("")
  })

  it("builds a stable label map for selected transfer values", () => {
    const map = buildTransferCourseLabelMap([
      { value: "__courseid__math-a", label: "Math A" },
      { value: "__coursename__SAT Fire", label: "SAT Fire" },
    ])

    expect(map.get("__courseid__math-a")).toBe("Math A")
    expect(map.get("__coursename__SAT Fire")).toBe("SAT Fire")
  })
})
