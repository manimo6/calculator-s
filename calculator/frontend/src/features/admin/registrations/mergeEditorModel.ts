import {
  getActiveMergesToday,
  type MergeEntry as MergeEntryUtil,
} from "@/utils/mergeUtils"

import { normalizeWeekRanges } from "./utils"
import { parseWeekNumber } from "./registrationsSelectors"
import type { MergeEntry, MergeWeekRange } from "./registrationsTypes"

export type MergeWeekRangeInput = { start: string; end: string }

export function createEmptyMergeWeekRangeInputs(): MergeWeekRangeInput[] {
  return [{ start: "", end: "" }]
}

export function buildMergeRefDateMap(activeMergesFromApi: MergeEntry[]) {
  const map = new Map<string, string | null>()
  for (const merge of activeMergesFromApi || []) {
    map.set(String(merge.id || ""), merge.referenceStartDate || null)
  }
  return map
}

export function buildActiveMergesTodayEntries({
  merges,
  activeMergesFromApi,
  simulationDate,
  refDateMap,
}: {
  merges: MergeEntry[]
  activeMergesFromApi: MergeEntry[]
  simulationDate: Date | null
  refDateMap: Map<string, string | null>
}) {
  const source = merges.length > 0 ? merges : activeMergesFromApi
  const all = (source || []).map((merge) => ({
    id: String(merge.id || ""),
    name: String(merge.name || ""),
    courses: Array.isArray(merge.courses) ? merge.courses.map(String) : [],
    weekRanges: normalizeWeekRanges(merge.weekRanges),
    isActive: merge.isActive !== false,
    courseConfigSetName: String(merge.courseConfigSetName || ""),
    referenceStartDate: refDateMap.get(String(merge.id || "")) || merge.referenceStartDate || null,
  })) as MergeEntryUtil[]

  return getActiveMergesToday(all, undefined, simulationDate || undefined)
}

export function validateMergeDraft({
  mergeCourses,
  mergeWeekMode,
  mergeWeekRangeInputs,
}: {
  mergeCourses: string[]
  mergeWeekMode: "all" | "range"
  mergeWeekRangeInputs: MergeWeekRangeInput[]
}) {
  const selected = (mergeCourses || []).filter(Boolean)
  if (selected.length < 2) {
    return {
      ok: false as const,
      error: "\uD569\uBC18\uD560 \uACFC\uBAA9\uC740 2\uAC1C \uC774\uC0C1 \uC120\uD0DD\uD574\uC57C \uD569\uB2C8\uB2E4.",
    }
  }

  let weekRanges: MergeWeekRange[] = []
  if (mergeWeekMode === "range") {
    const parsed: MergeWeekRange[] = []
    for (let i = 0; i < mergeWeekRangeInputs.length; i++) {
      const input = mergeWeekRangeInputs[i]
      const start = parseWeekNumber(input.start)
      const end = parseWeekNumber(input.end)
      if (!Number.isInteger(start) || start < 1) {
        return {
          ok: false as const,
          error: `\uBC94\uC704 ${i + 1}: \uC2DC\uC791 \uC8FC\uCC28\uB97C 1 \uC774\uC0C1\uC758 \uC22B\uC790\uB85C \uC785\uB825\uD558\uC138\uC694.`,
        }
      }
      if (!Number.isInteger(end) || end < start) {
        return {
          ok: false as const,
          error: `\uBC94\uC704 ${i + 1}: \uC885\uB8CC \uC8FC\uCC28\uB97C \uC2DC\uC791 \uC8FC\uCC28 \uC774\uC0C1\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.`,
        }
      }
      parsed.push({ start, end })
    }
    weekRanges = normalizeWeekRanges(parsed)
  }

  return {
    ok: true as const,
    selected: Array.from(new Set(selected)),
    weekRanges,
  }
}

export function buildNextMerges({
  merges,
  editingMergeId,
  mergeName,
  selectedCourses,
  selectedCourseConfigSet,
  weekRanges,
}: {
  merges: MergeEntry[]
  editingMergeId: string | null
  mergeName: string
  selectedCourses: string[]
  selectedCourseConfigSet: string
  weekRanges: MergeWeekRange[]
}) {
  const name = String(mergeName || "").trim()

  if (editingMergeId) {
    return merges.map((merge) =>
      String(merge.id) === editingMergeId
        ? { ...merge, name, courses: selectedCourses, weekRanges }
        : merge
    )
  }

  const id = Date.now().toString()
  return [
    ...merges,
    {
      id,
      name,
      courses: selectedCourses,
      weekRanges,
      isActive: true,
      courseConfigSetName: selectedCourseConfigSet,
    },
  ]
}

export function buildMergeEditDraft(target: MergeEntry | undefined) {
  if (!target) {
    return {
      mergeName: "",
      mergeCourses: [] as string[],
      mergeWeekMode: "all" as const,
      mergeWeekRangeInputs: createEmptyMergeWeekRangeInputs(),
    }
  }

  const ranges = Array.isArray(target.weekRanges) && target.weekRanges.length > 0
    ? target.weekRanges.map((range) => ({
        start: String(range.start ?? ""),
        end: String(range.end ?? ""),
      }))
    : null

  return {
    mergeName: String(target.name || ""),
    mergeCourses: Array.isArray(target.courses) ? [...target.courses] : [],
    mergeWeekMode: ranges ? ("range" as const) : ("all" as const),
    mergeWeekRangeInputs: ranges || createEmptyMergeWeekRangeInputs(),
  }
}
