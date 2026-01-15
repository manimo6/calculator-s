export function normalizeCourseConfigSets(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((p) => (typeof p === "string" ? { name: p, data: null } : p))
      .filter((p) => p && typeof p.name === "string")
      .map((p) => ({ name: p.name, data: p.data }))
  }
  if (typeof raw === "object") {
    return Object.keys(raw).map((name) => ({ name, data: raw[name] }))
  }
  return []
}

export function extractCourseTreeFromCourseConfigSet(courseConfigSet) {
  return Array.isArray(courseConfigSet?.data?.courseTree)
    ? courseConfigSet.data.courseTree
    : []
}

export function extractCoursesFromCourseTree(courseTree) {
  const out = []
  const tree = courseTree || []
  tree.forEach((g) => (g.items || []).forEach((i) => out.push(i.label)))
  return Array.from(new Set(out.filter(Boolean)))
}

export function extractCoursesFromCourseConfigSet(courseConfigSet) {
  return extractCoursesFromCourseTree(
    extractCourseTreeFromCourseConfigSet(courseConfigSet)
  )
}

export function extractCategoriesFromCourseTree(courseTree) {
  return Array.from(new Set((courseTree || []).map((g) => g.cat).filter(Boolean)))
}

export function buildCourseCategoryMap(courseTree) {
  const map = new Map()
  const tree = courseTree || []
  tree.forEach((g) => (g.items || []).forEach((i) => map.set(i.label, g.cat)))
  return map
}
