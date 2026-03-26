export const ALL_MERGE_TAB = "__all__"

export type MergeWeekRange = { start: number; end: number }
export type MergeWeekMode = "all" | "range"
export type WeekRangeInput = { start: string; end: string }

export type MergeEntry = {
  id?: string | number
  name?: string
  courses?: string[]
  weekRanges?: MergeWeekRange[]
  isActive?: boolean
  courseConfigSetName?: string
  referenceStartDate?: string | null
} & Record<string, unknown>

export function formatMergeWeekRanges(ranges: MergeWeekRange[] | null | undefined) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "\uC804\uCCB4 \uC8FC\uCC28"
  }
  return ranges.map((range) => `${range.start}~${range.end}\uC8FC\uCC28`).join(", ")
}

export function buildAvailableMergeTabs(courseTabs: string[], courseOptions: string[]) {
  const bases = Array.isArray(courseTabs) ? courseTabs.filter(Boolean) : []
  if (!bases.length) return []

  const out: string[] = []
  for (const base of bases) {
    const label = String(base || "").trim()
    if (!label) continue
    const hasMatch = (courseOptions || []).some((course) =>
      String(course || "").startsWith(label)
    )
    if (hasMatch) out.push(label)
  }

  return out
}

export function filterMergeCourses({
  courseOptions,
  courseTab,
  search,
}: {
  courseOptions: string[]
  courseTab: string
  search: string
}) {
  const tabFilteredCourses =
    courseTab === ALL_MERGE_TAB
      ? courseOptions
      : (courseOptions || []).filter((course) =>
          String(course || "").startsWith(String(courseTab || "").trim())
        )

  const query = String(search || "").trim().toLowerCase()
  if (!query) return tabFilteredCourses

  return tabFilteredCourses.filter((course) =>
    String(course || "").toLowerCase().includes(query)
  )
}

export function toggleMergeCourseSelection(
  mergeCourses: string[],
  selectedSet: Set<string>,
  course: string
) {
  const value = String(course || "").trim()
  if (!value) return mergeCourses || []

  return selectedSet.has(value)
    ? (mergeCourses || []).filter((item) => item !== value)
    : [...(mergeCourses || []), value]
}
