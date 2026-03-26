import { normalizeCourse } from "./utils"

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

export function makeCourseValue(courseId: unknown, courseName: unknown) {
  const id = normalizeCourse(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourse(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

export function parseCourseValue(value: unknown) {
  const raw = normalizeCourse(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id" as const, value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name" as const, value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name" as const, value: raw }
}

export function makeCourseNameValue(courseName: string) {
  return `${COURSE_NAME_PREFIX}${courseName}`
}
