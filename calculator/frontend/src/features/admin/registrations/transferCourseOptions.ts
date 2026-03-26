import type { RegistrationRowForOptions, TransferOption } from "./transferModelTypes"
import { makeCourseNameValue } from "./transferCourseValueUtils"

export function buildTransferCourseOptions({
  courseOptions,
  registrations,
}: {
  courseOptions: Array<string | { value?: string; label?: string }>
  registrations: RegistrationRowForOptions[]
}) {
  const list: TransferOption[] = []
  const seen = new Set<string>()
  const variantsByBase = new Map<string, Set<string>>()

  for (const registration of registrations || []) {
    const courseName = String(registration?.course || "").trim()
    if (!courseName) continue

    for (const option of courseOptions || []) {
      const baseLabel = String(typeof option === "string" ? option : option?.label || "").trim()
      if (!baseLabel || baseLabel === courseName) continue
      if (courseName.startsWith(baseLabel) && courseName.length > baseLabel.length) {
        if (!variantsByBase.has(baseLabel)) variantsByBase.set(baseLabel, new Set())
        variantsByBase.get(baseLabel)?.add(courseName)
      }
    }
  }

  for (const course of courseOptions || []) {
    const value = typeof course === "string" ? course : course?.value
    const label = typeof course === "string" ? course : course?.label
    const key = String(value || "").trim()
    const labelStr = String(label || value || "").trim()
    if (!key || seen.has(key)) continue

    const variants = variantsByBase.get(labelStr)
    if (variants && variants.size > 0) {
      for (const variantName of Array.from(variants).sort((a, b) => a.localeCompare(b, "ko-KR"))) {
        const variantKey = makeCourseNameValue(variantName)
        if (seen.has(variantKey)) continue
        seen.add(variantKey)
        list.push({ value: variantKey, label: variantName })
      }
      seen.add(key)
      continue
    }

    seen.add(key)
    list.push({ value: key, label: labelStr })
  }

  return list
}

export function buildTransferCourseLabelMap(options: TransferOption[]) {
  const map = new Map<string, string>()
  for (const option of options) {
    map.set(option.value, option.label)
  }
  return map
}
