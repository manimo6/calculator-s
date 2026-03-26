import { normalizeCourse } from "./utils"
import { parseCourseValue } from "./transferCourseValueUtils"
import type {
  CourseConfigSet,
  RegistrationRow,
  TransferGroup,
  TransferOption,
} from "./transferModelTypes"

const UNKNOWN_CATEGORY_LABEL = "미분류"

export function buildTransferCourseGroups({
  transferCourseOptions,
  selectedCourseConfigSetObj,
  transferTarget,
}: {
  transferCourseOptions: TransferOption[]
  selectedCourseConfigSetObj: CourseConfigSet | null
  transferTarget: RegistrationRow | null
}) {
  if (!transferCourseOptions.length) return []

  const currentCourse = String(transferTarget?.course || "").trim()
  const filteredOptions = currentCourse
    ? transferCourseOptions.filter((option) => option.label !== currentCourse)
    : transferCourseOptions

  if (!filteredOptions.length) return []

  const tree = Array.isArray(selectedCourseConfigSetObj?.data?.courseTree)
    ? selectedCourseConfigSetObj.data.courseTree
    : []
  const idToCategory = new Map<string, string>()
  const labelToCategory: Array<{ label: string; category: string }> = []
  const categoryOrder: string[] = []

  for (const group of tree) {
    const category = normalizeCourse(group?.cat)
    if (category && !categoryOrder.includes(category)) {
      categoryOrder.push(category)
    }
    for (const item of group.items || []) {
      const id = normalizeCourse(item?.val)
      if (id) idToCategory.set(id, category)
      const label = normalizeCourse(item?.label)
      if (label) labelToCategory.push({ label, category })
    }
  }

  labelToCategory.sort((a, b) => b.label.length - a.label.length)

  const groupMap = new Map<string, TransferOption[]>()
  const addToGroup = (category: string, option: TransferOption) => {
    const key = category || UNKNOWN_CATEGORY_LABEL
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)?.push(option)
  }

  for (const option of filteredOptions) {
    const parsed = parseCourseValue(option.value)
    let category = ""

    if (parsed.type === "id") {
      category = idToCategory.get(parsed.value) || ""
    }

    if (!category) {
      const name = String(option.label || parsed.value || "").trim()
      if (name) {
        for (const entry of labelToCategory) {
          if (name.startsWith(entry.label)) {
            category = entry.category
            break
          }
        }
      }
    }

    addToGroup(category, option)
  }

  const sortByLabel = (a: TransferOption, b: TransferOption) =>
    a.label.localeCompare(b.label, "ko-KR")
  const ordered: TransferGroup[] = []

  for (const category of categoryOrder) {
    const items = groupMap.get(category)
    if (!items || !items.length) continue
    items.sort(sortByLabel)
    ordered.push({ label: category, items })
    groupMap.delete(category)
  }

  const restKeys = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === UNKNOWN_CATEGORY_LABEL) return 1
    if (b === UNKNOWN_CATEGORY_LABEL) return -1
    return a.localeCompare(b, "ko-KR")
  })

  for (const category of restKeys) {
    const items = groupMap.get(category)
    if (!items || !items.length) continue
    items.sort(sortByLabel)
    ordered.push({ label: category, items })
  }

  return ordered
}
