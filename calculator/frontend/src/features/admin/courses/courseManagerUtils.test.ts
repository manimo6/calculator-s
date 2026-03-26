import { describe, expect, it } from "vitest"

import { OFFLINE_KEY, ONLINE_KEY } from "./courseDialogConstants"
import {
  buildCourseCategoryMapFromTree,
  buildCourseConfigSetSnapshot,
  buildCourseInfoValueFromForm,
  buildDeletedCourseState,
  buildRecordingValueFromForm,
  buildSavedCourseState,
  buildTimeValueFromForm,
  cloneCourseTreeGroups,
  deleteObjectKeys,
  findCategoryIndex,
  findCourseLocation,
  findDuplicateCourseByName,
  normalizeBreakRanges,
  replaceArrayContents,
  replaceObjectContents,
} from "./courseManagerUtils"

describe("courseManagerUtils", () => {
  it("replaceArrayContents keeps the target reference and swaps contents", () => {
    const target = [1, 2, 3]

    replaceArrayContents(target, ["a", "b"])

    expect(target).toEqual(["a", "b"])
  })

  it("replaceObjectContents clears stale keys before assigning next values", () => {
    const target = { a: 1, b: 2 }

    replaceObjectContents(target, { b: 3, c: 4 })

    expect(target).toEqual({ b: 3, c: 4 })
  })

  it("deleteObjectKeys removes only the requested keys", () => {
    const target = { a: 1, b: 2, c: 3 }

    deleteObjectKeys(target, ["b", "", "missing"])

    expect(target).toEqual({ a: 1, c: 3 })
  })

  it("cloneCourseTreeGroups creates a detached copy", () => {
    const original = [
      {
        cat: "Math",
        items: [{ val: "course_1", label: "Algebra" }],
      },
    ]

    const cloned = cloneCourseTreeGroups(original)
    cloned[0].cat = "English"
    cloned[0].items[0].label = "Grammar"

    expect(original[0].cat).toBe("Math")
    expect(original[0].items[0].label).toBe("Algebra")
  })

  it("buildCourseCategoryMapFromTree maps course ids to their category", () => {
    const courseTree = [
      {
        cat: "Math",
        items: [
          { val: "course_1", label: "Algebra" },
          { val: "course_2", label: "Geometry" },
        ],
      },
      {
        cat: "English",
        items: [{ val: "course_3", label: "Grammar" }],
      },
    ]

    expect(buildCourseCategoryMapFromTree(courseTree)).toEqual({
      course_1: "Math",
      course_2: "Math",
      course_3: "English",
    })
  })

  it("findCategoryIndex and findCourseLocation return stable positions", () => {
    const courseTree = [
      {
        cat: "Math",
        items: [{ val: "course_1", label: "Algebra" }],
      },
      {
        cat: "English",
        items: [{ val: "course_2", label: "Grammar" }],
      },
    ]

    expect(findCategoryIndex(courseTree, "English")).toBe(1)
    expect(findCategoryIndex(courseTree, "Science")).toBe(-1)
    expect(findCourseLocation(courseTree, "course_2")).toEqual({ groupIndex: 1, itemIndex: 0 })
    expect(findCourseLocation(courseTree, "course_9")).toBeNull()
  })

  it("normalizeBreakRanges sorts valid ranges and rejects invalid partial input", () => {
    expect(
      normalizeBreakRanges([
        { startDate: "2026-04-05", endDate: "2026-04-01" },
        { startDate: "2026-05-01", endDate: "2026-05-03" },
      ])
    ).toEqual({
      ranges: [
        { startDate: "2026-04-01", endDate: "2026-04-05" },
        { startDate: "2026-05-01", endDate: "2026-05-03" },
      ],
      error: "",
    })

    expect(normalizeBreakRanges([{ startDate: "2026-04-01" }]).error).not.toBe("")
  })

  it("buildTimeValueFromForm and buildRecordingValueFromForm support default/onoff/dynamic", () => {
    expect(buildTimeValueFromForm({ timeType: "default", timeDefault: "7:00 PM" })).toBe("7:00 PM")
    expect(buildRecordingValueFromForm({ timeType: "default", isRecordingAvailable: true })).toBe(true)

    expect(
      buildTimeValueFromForm({
        timeType: "onoff",
        timeOnline: "6:00 PM",
        timeOffline: "7:00 PM",
      })
    ).toEqual({
      [ONLINE_KEY]: "6:00 PM",
      [OFFLINE_KEY]: "7:00 PM",
    })
    expect(
      buildRecordingValueFromForm({
        timeType: "onoff",
        isRecordingOnline: true,
        isRecordingOffline: false,
      })
    ).toEqual({
      [ONLINE_KEY]: true,
      [OFFLINE_KEY]: false,
    })

    expect(
      buildTimeValueFromForm({
        timeType: "dynamic",
        dynamicOptions: [
          { label: "A1", time: "5:00 PM" },
          { label: "B1", time: "6:00 PM" },
        ],
      })
    ).toEqual({
      A1: "5:00 PM",
      B1: "6:00 PM",
    })
  })

  it("buildCourseInfoValueFromForm preserves defaults and maps flags", () => {
    expect(
      buildCourseInfoValueFromForm({
        formData: {
          fee: "180",
          textbook: { price: 30 },
          days: [1, 3],
          startDays: [1],
          endDays: [3],
          minDuration: "4",
          maxDuration: "12",
          hasMathOption: true,
          mathExcludedFee: "150",
          installmentEligible: true,
          timeType: "dynamic",
        },
        name: "SAT Math",
        previousInfo: { endDay: 5 },
        breakRanges: [{ startDate: "2026-04-01", endDate: "2026-04-05" }],
      })
    ).toMatchObject({
      name: "SAT Math",
      fee: 180,
      days: [1, 3],
      startDays: [1],
      endDays: [3],
      endDay: 3,
      min: 4,
      max: 12,
      minDuration: 4,
      maxDuration: 12,
      hasMathOption: true,
      mathExcludedFee: 150,
      installmentEligible: true,
      dynamicTime: true,
      breakRanges: [{ startDate: "2026-04-01", endDate: "2026-04-05" }],
    })
  })

  it("findDuplicateCourseByName returns a conflicting item when labels collide", () => {
    const courseTree = [
      {
        cat: "Math",
        items: [
          { val: "course_1", label: "SAT Math" },
          { val: "course_2", label: "SAT Verbal" },
        ],
      },
    ]

    expect(findDuplicateCourseByName(courseTree, "SAT Math", "course_9")).toEqual({
      val: "course_1",
      label: "SAT Math",
    })
    expect(findDuplicateCourseByName(courseTree, "SAT Math", "course_1")).toBeUndefined()
  })

  it("buildSavedCourseState updates an existing course and can move categories", () => {
    const result = buildSavedCourseState({
      currentCourseTree: [
        {
          cat: "Math",
          items: [{ val: "course_1", label: "SAT Math" }],
        },
      ],
      currentCourseInfo: {
        course_1: { name: "SAT Math", endDay: 5 },
      },
      currentTimeTable: {
        "SAT Math": "7:00 PM",
      },
      currentRecordingAvailable: {
        course_1: false,
      },
      formData: {
        fee: "200",
        textbook: { price: 40 },
        days: [2, 4],
        startDays: [2],
        endDays: [4],
        minDuration: "4",
        maxDuration: "12",
        hasMathOption: false,
        installmentEligible: true,
        timeType: "default",
        timeDefault: "8:00 PM",
        isRecordingAvailable: true,
      },
      courseId: "course_1",
      name: "Advanced Math",
      category: "Science",
      breakRanges: [{ startDate: "2026-05-01", endDate: "2026-05-03" }],
    })

    expect(result?.nextCourseTree).toEqual([
      {
        cat: "Math",
        items: [],
      },
      {
        cat: "Science",
        items: [{ val: "course_1", label: "Advanced Math" }],
      },
    ])
    expect(result?.nextCourseInfo.course_1).toMatchObject({
      name: "Advanced Math",
      fee: 200,
      days: [2, 4],
      endDay: 4,
      installmentEligible: true,
    })
    expect(result?.nextTimeTable).toEqual({
      "Advanced Math": "8:00 PM",
    })
    expect(result?.nextRecordingAvailable).toEqual({
      course_1: true,
    })
  })

  it("buildDeletedCourseState removes course references from every bucket", () => {
    const result = buildDeletedCourseState({
      currentCourseTree: [
        {
          cat: "Math",
          items: [{ val: "course_1", label: "SAT Math" }],
        },
      ],
      currentCourseInfo: {
        course_1: { name: "SAT Math" },
      },
      currentTimeTable: {
        "SAT Math": "7:00 PM",
      },
      currentRecordingAvailable: {
        course_1: true,
      },
      courseId: "course_1",
    })

    expect(result?.label).toBe("SAT Math")
    expect(result?.nextCourseTree).toEqual([{ cat: "Math", items: [] }])
    expect(result?.nextCourseInfo).toEqual({})
    expect(result?.nextTimeTable).toEqual({})
    expect(result?.nextRecordingAvailable).toEqual({})
  })

  it("buildCourseConfigSetSnapshot clones mutable inputs", () => {
    const snapshot = buildCourseConfigSetSnapshot({
      weekdayName: ["Mon", "Wed"],
      courseTree: [
        {
          cat: "Math",
          items: [{ val: "course_1", label: "SAT Math" }],
        },
      ],
      courseInfo: {
        course_1: { name: "SAT Math" },
      },
      timeTable: {
        "SAT Math": "7:00 PM",
      },
      recordingAvailable: {
        course_1: true,
      },
    })

    snapshot.weekdayName[0] = "Fri"
    snapshot.courseTree[0].items[0].label = "Changed"

    expect(snapshot.courseInfo).toEqual({
      course_1: { name: "SAT Math" },
    })
    expect(snapshot.timeTable).toEqual({
      "SAT Math": "7:00 PM",
    })
    expect(snapshot.recordingAvailable).toEqual({
      course_1: true,
    })
  })
})
