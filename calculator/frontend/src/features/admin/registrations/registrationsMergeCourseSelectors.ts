import type { RegistrationRow } from "./registrationsTypes"

export function buildMergeCourseOptions(
  registrations: RegistrationRow[],
  mergeCourses: string[],
  selectedCourseConfigSet: string
) {
  const seen = new Set<string>()
  const list: string[] = []
  const selectedConfig = String(selectedCourseConfigSet || "").trim()

  for (const registration of registrations || []) {
    if (selectedConfig) {
      const configName = String(registration?.courseConfigSetName || "").trim()
      if (configName !== selectedConfig) continue
    }
    const courseName = String(registration?.course || "").trim()
    if (!courseName || seen.has(courseName)) continue
    seen.add(courseName)
    list.push(courseName)
  }

  for (const course of mergeCourses || []) {
    const courseName = String(course || "").trim()
    if (!courseName || seen.has(courseName)) continue
    seen.add(courseName)
    list.push(courseName)
  }

  return list.sort((a, b) => a.localeCompare(b, "ko-KR"))
}

export function buildMergeCourseTabs(
  courseConfigSetBaseCourses: string[],
  mergeCourseOptions: string[]
) {
  const list: string[] = []
  const seen = new Set<string>()

  for (const base of courseConfigSetBaseCourses || []) {
    const label = String(base || "").trim()
    if (!label || seen.has(label)) continue
    const hasMatch = mergeCourseOptions.some((course) => String(course || "").startsWith(label))
    if (!hasMatch) continue
    seen.add(label)
    list.push(label)
  }

  return list
}
