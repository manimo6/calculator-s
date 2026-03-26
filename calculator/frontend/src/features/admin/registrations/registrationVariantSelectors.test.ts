import { describe, expect, it } from "vitest"

import {
  buildMergeOptions,
  buildVariantTabs,
  filterRegistrationsByCourseFilter,
} from "./registrationVariantSelectors"
import type { MergeEntry, RegistrationRow } from "./registrationsTypes"

describe("registrationVariantSelectors", () => {
  it("builds merge options with a readable merge prefix", () => {
    const merges: MergeEntry[] = [
      { id: "merge-1", name: "A반", courses: ["수학", "영어"], weekRanges: [] },
    ]

    expect(buildMergeOptions(merges, [{ id: "merge-1" }])[0]).toMatchObject({
      value: "__merge__merge-1",
      label: "[합반] A반",
      isActiveToday: true,
    })
  })

  it("groups registrations into merge tabs when an active merge label exists", () => {
    const rows: RegistrationRow[] = [
      { course: "수학" },
      { course: "영어" },
      { course: "과학" },
    ]
    const mergeCourseLabelMap = new Map([
      ["수학", "A반"],
      ["영어", "A반"],
    ])

    expect(buildVariantTabs(rows, mergeCourseLabelMap)).toEqual([
      { key: "과학", label: "과학", count: 1 },
      { key: "__mergetab__A반", label: "A반", count: 2 },
    ])
  })

  it("filters registrations by merge course filter", () => {
    const rows: RegistrationRow[] = [
      { course: "수학" },
      { course: "영어" },
      { course: "과학" },
    ]
    const merges: MergeEntry[] = [
      { id: "merge-1", courses: ["수학", "영어"] },
    ]

    expect(
      filterRegistrationsByCourseFilter({
        baseRegistrations: rows,
        courseFilter: "__merge__merge-1",
        merges,
      }).map((row) => row.course)
    ).toEqual(["수학", "영어"])
  })
})
