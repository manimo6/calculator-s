import { describe, expect, it } from "vitest"

import {
  resolveCategoryFromLabel,
  getCategoryForRegistration,
  filterPreVariantRegistrations,
} from "./registrationCategorySelectors"
import type { RegistrationRow } from "./registrationsTypes"

describe("resolveCategoryFromLabel", () => {
  const courseCatMap = new Map([
    ["SAT", "SAT 수업"],
    ["SAT 직전대비반", "일 계산 수업"],
    ["월~금 기본", "평일"],
  ])
  const baseCourses = ["SAT", "SAT 직전대비반", "월~금 기본"]

  it("exact match returns category", () => {
    expect(resolveCategoryFromLabel("SAT", courseCatMap, baseCourses)).toBe("SAT 수업")
  })

  it("variant name picks longest matching base", () => {
    // "SAT 직전대비반 (저녁)" starts with both "SAT" and "SAT 직전대비반"
    // Should pick "SAT 직전대비반" (longer) → "일 계산 수업"
    expect(
      resolveCategoryFromLabel("SAT 직전대비반 (저녁)", courseCatMap, baseCourses)
    ).toBe("일 계산 수업")
  })

  it("variant name picks longest base regardless of array order", () => {
    // Reverse order: "SAT 직전대비반" comes before "SAT"
    const reversed = ["SAT 직전대비반", "SAT", "월~금 기본"]
    expect(
      resolveCategoryFromLabel("SAT 직전대비반 (오전)", courseCatMap, reversed)
    ).toBe("일 계산 수업")
  })

  it("short prefix still works when no longer match exists", () => {
    expect(
      resolveCategoryFromLabel("SAT 모의고사", courseCatMap, baseCourses)
    ).toBe("SAT 수업")
  })

  it("no match returns empty string", () => {
    expect(resolveCategoryFromLabel("영어", courseCatMap, baseCourses)).toBe("")
  })

  it("empty label returns empty string", () => {
    expect(resolveCategoryFromLabel("", courseCatMap, baseCourses)).toBe("")
  })
})

describe("getCategoryForRegistration", () => {
  const idToCategory = new Map([["course-a", "일 계산 수업"]])
  const courseCatMap = new Map([
    ["SAT", "SAT 수업"],
    ["SAT 직전대비반", "일 계산 수업"],
  ])
  const baseCourses = ["SAT", "SAT 직전대비반"]

  it("uses courseId when available", () => {
    const reg = { courseId: "course-a", course: "SAT 직전대비반 (저녁)" } as RegistrationRow
    expect(getCategoryForRegistration(reg, idToCategory, courseCatMap, baseCourses)).toBe(
      "일 계산 수업"
    )
  })

  it("falls back to courseName with longest-match when courseId is empty", () => {
    const reg = { courseId: "", course: "SAT 직전대비반 (저녁)" } as RegistrationRow
    expect(getCategoryForRegistration(reg, idToCategory, courseCatMap, baseCourses)).toBe(
      "일 계산 수업"
    )
  })

  it("falls back to courseName when courseId is undefined", () => {
    const reg = { course: "SAT 직전대비반 (오전)" } as RegistrationRow
    expect(getCategoryForRegistration(reg, idToCategory, courseCatMap, baseCourses)).toBe(
      "일 계산 수업"
    )
  })
})

describe("filterPreVariantRegistrations - category filter with transferred regs", () => {
  const baseCourses = ["SAT", "SAT 직전대비반"]
  const courseSet = new Set(baseCourses)
  const courseIdSet = new Set(["course-sat", "course-satprep"])

  const idToCategory = new Map([
    ["course-sat", "SAT 수업"],
    ["course-satprep", "일 계산 수업"],
  ])
  const courseCatMap = new Map([
    ["SAT", "SAT 수업"],
    ["SAT 직전대비반", "일 계산 수업"],
  ])

  const getCatFn = (reg: RegistrationRow) =>
    getCategoryForRegistration(reg, idToCategory, courseCatMap, baseCourses)

  it("transferred variant reg with empty courseId passes category filter", () => {
    const regs: RegistrationRow[] = [
      {
        id: "reg-normal",
        name: "학생A",
        course: "SAT 직전대비반 (저녁)",
        courseId: "course-satprep",
        courseConfigSetName: "기본",
        startDate: "2026-04-01",
        endDate: "2026-04-10",
        weeks: "4",
        skipWeeks: [],
        recordingDates: [],
      },
      {
        id: "reg-transferred",
        name: "학생B",
        course: "SAT 직전대비반 (저녁)",
        courseId: "",
        courseConfigSetName: "기본",
        startDate: "2026-04-08",
        endDate: "2026-04-10",
        weeks: "2",
        transferFromId: "reg-old",
        skipWeeks: [],
        recordingDates: [],
      },
    ]

    const result = filterPreVariantRegistrations({
      resolvedRegistrations: regs,
      selectedCourseConfigSet: "기본",
      courseConfigSetCourseSet: courseSet,
      courseConfigSetCourseIdSet: courseIdSet,
      categoryFilter: "일 계산 수업",
      search: "",
      getCategoryForRegistration: getCatFn,
    })

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toContain("reg-transferred")
  })
})
