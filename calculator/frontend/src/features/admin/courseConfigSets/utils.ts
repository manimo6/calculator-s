import type { CourseTreeGroup as BaseCourseTreeGroup } from "@/utils/data"

export type CourseTreeGroup = BaseCourseTreeGroup
export type CourseConfigSet = { name?: string; data?: { courseTree?: CourseTreeGroup[] } | null }

export function normalizeCourseConfigSets(raw: unknown): CourseConfigSet[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((p) => (typeof p === "string" ? { name: p, data: null } : p))
      .filter((p): p is CourseConfigSet => Boolean(p && typeof (p as CourseConfigSet).name === "string"))
      .map((p) => ({ name: p.name, data: p.data }))
  }
  if (typeof raw === "object") {
    return Object.keys(raw as Record<string, unknown>).map((name) => {
      const data = (raw as Record<string, unknown>)[name]
      const normalizedData: CourseConfigSet['data'] =
        typeof data === "object" && data !== null ? (data as CourseConfigSet['data']) : null
      return { name, data: normalizedData }
    })
  }
  return []
}

export function extractCourseTreeFromCourseConfigSet(courseConfigSet?: CourseConfigSet | null) {
  return Array.isArray(courseConfigSet?.data?.courseTree)
    ? courseConfigSet.data.courseTree
    : []
}

export function extractCoursesFromCourseTree(courseTree: CourseTreeGroup[]) {
  const out: string[] = []
  const tree = courseTree || []
  tree.forEach((g) => (g.items || []).forEach((i) => {
    if (i.label) out.push(i.label)
  }))
  return Array.from(new Set(out.filter(Boolean)))
}

export function extractCoursesFromCourseConfigSet(courseConfigSet?: CourseConfigSet | null) {
  return extractCoursesFromCourseTree(
    extractCourseTreeFromCourseConfigSet(courseConfigSet)
  )
}

export function extractCategoriesFromCourseTree(courseTree: CourseTreeGroup[]) {
  return Array.from(new Set((courseTree || []).map((g) => g.cat).filter(Boolean))) as string[]
}

export function buildCourseCategoryMap(courseTree: CourseTreeGroup[]) {
  const map = new Map<string, string>()
  const tree = courseTree || []
  tree.forEach((g) => (g.items || []).forEach((i) => {
    if (i.label && g.cat) map.set(i.label, g.cat)
  }))
  return map
}
