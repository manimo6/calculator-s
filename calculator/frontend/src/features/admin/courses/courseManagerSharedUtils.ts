export function replaceArrayContents(target, nextItems) {
  target.splice(0, target.length, ...(Array.isArray(nextItems) ? nextItems : []))
}

export function replaceObjectContents(target, nextObject) {
  Object.keys(target).forEach((key) => delete target[key])
  Object.assign(target, nextObject || {})
}

export function deleteObjectKeys(target, keys) {
  for (const key of keys) {
    if (!key) continue
    delete target[key]
  }
}

export function cloneCourseTreeGroups(groups) {
  return Array.isArray(groups)
    ? groups.map((group) => ({
        ...group,
        items: Array.isArray(group?.items)
          ? group.items.map((item) => ({ ...item }))
          : [],
      }))
    : []
}

export function buildCourseCategoryMapFromTree(groups) {
  const nextMap = {}
  for (const group of groups || []) {
    for (const item of group.items || []) {
      nextMap[item.val] = group.cat
    }
  }
  return nextMap
}

export function findCategoryIndex(groups, categoryName) {
  return (groups || []).findIndex((group) => group?.cat === categoryName)
}

export function findCourseLocation(groups, courseId) {
  for (let groupIndex = 0; groupIndex < (groups || []).length; groupIndex += 1) {
    const items = Array.isArray(groups[groupIndex]?.items) ? groups[groupIndex].items : []
    const itemIndex = items.findIndex((item) => item?.val === courseId)
    if (itemIndex !== -1) {
      return { groupIndex, itemIndex }
    }
  }
  return null
}
