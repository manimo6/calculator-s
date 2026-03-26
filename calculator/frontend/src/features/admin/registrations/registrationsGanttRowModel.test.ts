import { describe, expect, it } from "vitest"

import type { ModelRow } from "./registrationsGanttModel"
import { buildWeeks } from "./registrationsGanttModel"
import { buildGanttRowMeta, buildGanttTimelineDescriptors } from "./registrationsGanttRowModel"

function makeRow(overrides: Partial<ModelRow> = {}): ModelRow {
  return {
    r: {
      id: "r1",
      name: "홍길동",
      course: "중등수학 A",
      startDate: "2026-03-02",
      endDate: "2026-03-20",
      note: "테스트 메모입니다",
    },
    start: new Date("2026-03-02"),
    end: new Date("2026-03-20"),
    status: "active",
    isWithdrawn: false,
    isTransferredOut: false,
    recordingDates: [],
    courseDays: [1, 3],
    recordingWeeks: [],
    skipWeeks: [],
    startIndex: 0,
    endIndex: 2,
    transferSegments: [],
    ...overrides,
  }
}

describe("registrationsGanttRowModel", () => {
  it("builds row meta with note preview and math exclusion state", () => {
    const meta = buildGanttRowMeta({
      registration: {
        course: "중등수학 A (수학 제외)",
        note: "길이가 긴 메모입니다",
      },
      status: "pending",
      isTransferredOut: false,
    })

    expect(meta.courseLabel).toBe("중등수학 A")
    expect(meta.hasNote).toBe(true)
    expect(meta.notePreview).toBe("길이가 긴 메모입니...")
    expect(meta.isMathExcluded).toBe(true)
  })

  it("omits bars for skipped weeks and keeps recording markers", () => {
    const weeks = buildWeeks("2026-03-02", "2026-03-22", [])
    const row = makeRow({
      courseDays: [],
      skipWeeks: [2],
      recordingWeeks: [
        {
          weekIndex: 2,
          dates: [new Date("2026-03-18")],
        },
      ],
    })

    const result = buildGanttTimelineDescriptors({
      row,
      rowIndex: 0,
      weeks,
      unitWidth: 80,
      globalStartIndex: 0,
      mergeWeekRangesNormalized: [],
    })

    expect(result.hasDates).toBe(true)
    expect(result.bars).toHaveLength(2)
    expect(result.markers).toHaveLength(1)
    expect(result.markers[0].labels).toEqual(["3월 18일 (수)"])
  })

  it("adds ghost bars for transfer history segments", () => {
    const weeks = buildWeeks("2026-03-02", "2026-03-22", [1, 3])
    const row = makeRow({
      transferSegments: [
        makeRow({
          r: {
            id: "seg1",
            course: "중등영어 A",
          },
          start: new Date("2026-03-02"),
          end: new Date("2026-03-13"),
          startIndex: 0,
          endIndex: 1,
        }),
      ],
    })

    const result = buildGanttTimelineDescriptors({
      row,
      rowIndex: 0,
      weeks,
      unitWidth: 80,
      globalStartIndex: 0,
      mergeWeekRangesNormalized: [],
    })

    expect(result.bars.some((bar) => bar.key.includes("ghost"))).toBe(true)
  })
})
