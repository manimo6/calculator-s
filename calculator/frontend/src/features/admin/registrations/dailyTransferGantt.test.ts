import { describe, expect, it } from "vitest"

import { buildCourseGroupMaps, buildCourseGroups } from "./registrationsGanttCourseGroups"
import { buildRegistrationsGanttModel } from "./registrationsGanttModel"
import { resolveRegistrationRows } from "./registrationRowResolver"
import type { RegistrationRow } from "./registrationsTypes"

/**
 * Scenario: 4/6~9일 4일 수업. A반에서 6,7일 수강 → B반으로 전반(4/8~9일).
 * Sim date 4/8 → B반 간트차트에 바가 나와야 함.
 */
describe("daily transfer Gantt chart", () => {
  // 전반 후 데이터
  const regA: RegistrationRow = {
    id: "reg-a",
    name: "테스트학생",
    course: "SAT 오프라인",
    courseId: "course-a",
    courseConfigSetName: "기본",
    startDate: "2026-04-06",
    endDate: "2026-04-07",
    weeks: "2",
    durationUnit: "daily",
    selectedDates: ["2026-04-06", "2026-04-07"],
    transferToId: "reg-b",
    transferFromId: undefined,
    isTransferredOut: true,
    skipWeeks: [],
    recordingDates: [],
  }

  const regB: RegistrationRow = {
    id: "reg-b",
    name: "테스트학생",
    course: "SAT 온라인",
    courseId: "course-b",
    courseConfigSetName: "기본",
    startDate: "2026-04-08",
    endDate: "2026-04-09",
    weeks: "2",
    durationUnit: "daily",
    selectedDates: ["2026-04-08", "2026-04-09"],
    transferFromId: "reg-a",
    transferToId: undefined,
    isTransferredOut: false,
    skipWeeks: [],
    recordingDates: [],
  }

  const allRegistrations = [regA, regB]
  const registrationMap = new Map<string, RegistrationRow>(
    allRegistrations.map((r) => [String(r.id), r])
  )

  it("shows regB in course B group when sim date is April 8", () => {
    // sourceList = B반 등록만 (courseFilter가 B로 설정된 상태)
    const sourceList = [regB]
    const simulationDate = new Date(2026, 3, 8) // April 8

    const { map, rangeMap } = buildCourseGroupMaps({
      sourceList,
      allRegistrations,
      todayMergedCourses: new Set(),
      courseVariantRequiredSet: new Set(),
      registrationMap,
      simulationDate,
      showTransferChain: false,
    })

    // regB should appear in the map under its course key
    expect(map.size).toBe(1)
    const entries = Array.from(map.values())
    expect(entries[0]).toHaveLength(1)
    expect(entries[0][0].id).toBe("reg-b")
    expect(entries[0][0].isTransferredOut).toBe(false)
  })

  it("shows regA as transferred-out in course A when sim date is April 8", () => {
    // sourceList = A반 등록만
    const sourceList = [regA]
    const simulationDate = new Date(2026, 3, 8) // April 8

    const { map } = buildCourseGroupMaps({
      sourceList,
      allRegistrations,
      todayMergedCourses: new Set(),
      courseVariantRequiredSet: new Set(),
      registrationMap,
      simulationDate,
      showTransferChain: true,
    })

    expect(map.size).toBe(1)
    const entries = Array.from(map.values())
    expect(entries[0]).toHaveLength(1)
    expect(entries[0][0].id).toBe("reg-a")
    expect(entries[0][0].isTransferredOut).toBe(true)
  })

  it("buildCourseGroups resolves durationUnit as daily for transferred registration", () => {
    const sourceList = [regB]
    const simulationDate = new Date(2026, 3, 8)

    const { map, rangeMap } = buildCourseGroupMaps({
      sourceList,
      allRegistrations,
      todayMergedCourses: new Set(),
      courseVariantRequiredSet: new Set(),
      registrationMap,
      simulationDate,
      showTransferChain: false,
    })

    const groups = buildCourseGroups({
      map,
      rangeMap,
      courseConfigSetIdToLabel: new Map(),
      selectedCourseConfigSetObj: null,
    })

    expect(groups).toHaveLength(1)
    expect(groups[0].durationUnit).toBe("daily")
    expect(groups[0].registrations).toHaveLength(1)
    expect(groups[0].registrations[0].id).toBe("reg-b")
  })

  it("buildRegistrationsGanttModel creates daily columns for transferred daily course", () => {
    const model = buildRegistrationsGanttModel({
      registrations: [regB],
      rangeRegistrations: [regB],
      courseDays: [],
      durationUnit: "daily",
    })

    // Should have 2 day columns (April 8 and 9)
    expect(model.weeks.length).toBe(2)
    expect(model.rows).toHaveLength(1)
    expect(model.rows[0].startIndex).toBe(0)
    expect(model.rows[0].endIndex).toBe(1)
  })

  it("shows regA active in course A when sim date is April 6", () => {
    const sourceList = [regA]
    const simulationDate = new Date(2026, 3, 6) // April 6

    const { map } = buildCourseGroupMaps({
      sourceList,
      allRegistrations,
      todayMergedCourses: new Set(),
      courseVariantRequiredSet: new Set(),
      registrationMap,
      simulationDate,
      showTransferChain: false,
    })

    expect(map.size).toBe(1)
    const entries = Array.from(map.values())
    expect(entries[0]).toHaveLength(1)
    expect(entries[0][0].id).toBe("reg-a")
    expect(entries[0][0].isTransferredOut).toBe(false)
  })

  it("no courseFilter: both regA and regB appear in separate course groups", () => {
    // sourceList = all registrations (no courseFilter)
    const sourceList = allRegistrations
    const simulationDate = new Date(2026, 3, 8)

    const { map } = buildCourseGroupMaps({
      sourceList,
      allRegistrations,
      todayMergedCourses: new Set(),
      courseVariantRequiredSet: new Set(),
      registrationMap,
      simulationDate,
      showTransferChain: true,
    })

    // Should have 2 course keys (SAT 오프라인, SAT 온라인)
    expect(map.size).toBe(2)

    // Find the entries
    let courseAEntries: RegistrationRow[] = []
    let courseBEntries: RegistrationRow[] = []
    for (const [, rows] of map) {
      for (const row of rows) {
        if (row.course === "SAT 오프라인") courseAEntries.push(row)
        if (row.course === "SAT 온라인") courseBEntries.push(row)
      }
    }

    // regB should be active (not transferred out) in course B
    expect(courseBEntries).toHaveLength(1)
    expect(courseBEntries[0].isTransferredOut).toBe(false)

    // regA should be transferred out in course A
    expect(courseAEntries).toHaveLength(1)
    expect(courseAEntries[0].isTransferredOut).toBe(true)
  })

  it("resolveRegistrationRows preserves daily endDate (does not recalculate as weekly)", () => {
    // Simulate: regB has durationUnit=daily but course config does NOT have it
    // (e.g., the course was resolved to null or weekly config)
    const resolved = resolveRegistrationRows(
      [
        {
          id: "reg-b",
          name: "테스트학생",
          course: "알수없는과목",
          courseId: "",
          courseConfigSetName: "기본",
          startDate: "2026-04-08",
          endDate: "2026-04-09",
          weeks: "2",
          durationUnit: "daily",
          selectedDates: ["2026-04-08", "2026-04-09"],
          transferFromId: "reg-a",
          skipWeeks: [],
          recordingDates: [],
        },
      ],
      null // no courseConfigSet → resolveCourseInfo returns null
    )

    expect(resolved).toHaveLength(1)
    // endDate should remain 2026-04-09, NOT be recalculated to 2 weeks later
    expect(resolved[0].endDate).toBe("2026-04-09")
  })

  it("resolveRegistrationRows preserves daily endDate when selectedDates present", () => {
    const resolved = resolveRegistrationRows(
      [
        {
          id: "reg-c",
          name: "일단위학생",
          course: "미설정과목",
          courseId: "",
          startDate: "2026-04-06",
          endDate: "2026-04-09",
          weeks: "4",
          selectedDates: ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09"],
          skipWeeks: [],
          recordingDates: [],
        },
      ],
      null
    )

    expect(resolved).toHaveLength(1)
    // endDate should NOT be recalculated to 4 weeks later
    expect(resolved[0].endDate).toBe("2026-04-09")
  })
})
