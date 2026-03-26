import {
  cloneCourseTreeGroups,
  deleteObjectKeys,
  findCategoryIndex,
  findCourseLocation,
} from "./courseManagerSharedUtils"
import {
  buildCourseInfoValueFromForm,
  buildRecordingValueFromForm,
  buildTimeValueFromForm,
} from "./courseManagerValueBuilders"

export function findDuplicateCourseByName(groups, name, courseId) {
  return (groups || [])
    .flatMap((group) => group.items || [])
    .find((item) => item.label === name && item.val !== courseId)
}

function ensureCategoryGroup(groups, categoryName) {
  let groupIndex = findCategoryIndex(groups, categoryName)
  if (groupIndex === -1) {
    groups.push({ cat: categoryName, items: [] })
    groupIndex = groups.length - 1
  }
  return groups[groupIndex]
}

export function buildSavedCourseState({
  currentCourseTree,
  currentCourseInfo,
  currentTimeTable,
  currentRecordingAvailable,
  formData,
  courseId,
  name,
  category,
  breakRanges,
}) {
  const nextCourseTree = cloneCourseTreeGroups(currentCourseTree)
  const nextCourseInfo = { ...(currentCourseInfo || {}) }
  const nextTimeTable = { ...(currentTimeTable || {}) }
  const nextRecordingAvailable = { ...(currentRecordingAvailable || {}) }
  const nextTimeValue = buildTimeValueFromForm(formData)
  const nextRecordingValue = buildRecordingValueFromForm(formData)

  if (courseId) {
    const location = findCourseLocation(nextCourseTree, courseId)
    if (!location) return null

    const fromGroup = nextCourseTree[location.groupIndex]
    const previousItem = fromGroup.items[location.itemIndex]
    const oldLabel = previousItem?.label
    const targetGroup = ensureCategoryGroup(nextCourseTree, category)
    const nextItem = { ...previousItem, label: name }

    if (fromGroup !== targetGroup) {
      fromGroup.items = (fromGroup.items || []).filter((_, index) => index !== location.itemIndex)
      targetGroup.items = [...(targetGroup.items || []), nextItem]
    } else {
      fromGroup.items = (fromGroup.items || []).map((item, index) =>
        index === location.itemIndex ? nextItem : item
      )
    }

    nextCourseInfo[courseId] = buildCourseInfoValueFromForm({
      formData,
      name,
      previousInfo: nextCourseInfo[courseId],
      breakRanges,
    })
    deleteObjectKeys(nextTimeTable, [courseId, oldLabel])
    nextTimeTable[name] = nextTimeValue
    nextRecordingAvailable[courseId] = nextRecordingValue
  } else {
    const newId = `course_${Date.now()}`
    const targetGroup = ensureCategoryGroup(nextCourseTree, category)
    targetGroup.items = [...(targetGroup.items || []), { val: newId, label: name }]
    nextCourseInfo[newId] = buildCourseInfoValueFromForm({
      formData,
      name,
      previousInfo: {},
      breakRanges,
    })
    nextTimeTable[name] = nextTimeValue
    nextRecordingAvailable[newId] = nextRecordingValue
  }

  return {
    nextCourseTree,
    nextCourseInfo,
    nextTimeTable,
    nextRecordingAvailable,
  }
}

export function buildDeletedCourseState({
  currentCourseTree,
  currentCourseInfo,
  currentTimeTable,
  currentRecordingAvailable,
  courseId,
}) {
  if (!courseId) return null

  const nextCourseTree = cloneCourseTreeGroups(currentCourseTree)
  const location = findCourseLocation(nextCourseTree, courseId)
  if (!location) return null

  const group = nextCourseTree[location.groupIndex]
  const label = group.items[location.itemIndex]?.label
  group.items = (group.items || []).filter((_, index) => index !== location.itemIndex)

  const nextCourseInfo = { ...(currentCourseInfo || {}) }
  const nextTimeTable = { ...(currentTimeTable || {}) }
  const nextRecordingAvailable = { ...(currentRecordingAvailable || {}) }
  deleteObjectKeys(nextCourseInfo, [courseId])
  deleteObjectKeys(nextRecordingAvailable, [courseId])
  deleteObjectKeys(nextTimeTable, [courseId, label])

  return {
    label,
    nextCourseTree,
    nextCourseInfo,
    nextTimeTable,
    nextRecordingAvailable,
  }
}

export function buildCourseConfigSetSnapshot({
  weekdayName,
  courseTree,
  courseInfo,
  timeTable,
  recordingAvailable,
}) {
  return {
    weekdayName: Array.isArray(weekdayName) ? [...weekdayName] : [],
    courseTree: cloneCourseTreeGroups(courseTree),
    courseInfo: { ...(courseInfo || {}) },
    timeTable: { ...(timeTable || {}) },
    recordingAvailable: { ...(recordingAvailable || {}) },
  }
}
