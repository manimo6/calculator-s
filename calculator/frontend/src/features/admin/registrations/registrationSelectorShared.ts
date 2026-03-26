import { normalizeCourse } from "./utils"

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

export type CourseConfigSetTreeItem = {
  val?: string
  label?: string
}

export type CourseConfigSetTreeGroup = {
  cat?: string
  items?: CourseConfigSetTreeItem[]
}

export function isMergeKey(value: unknown) {
  return typeof value === "string" && value.startsWith("__merge__")
}

export function makeCourseFilterValue(courseId: unknown, courseName: unknown) {
  const id = normalizeCourse(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourse(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

export function parseCourseFilterValue(value: unknown) {
  const raw = normalizeCourse(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id" as const, value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name" as const, value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name" as const, value: raw }
}

export function isTimeVariantEntry(entry: unknown) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false
  const record = entry as Record<string, unknown>
  const isOnOff =
    record.type === "onoff" ||
    Object.prototype.hasOwnProperty.call(record, "온라인") ||
    Object.prototype.hasOwnProperty.call(record, "오프라인") ||
    Object.prototype.hasOwnProperty.call(record, "online") ||
    Object.prototype.hasOwnProperty.call(record, "offline")
  const isDynamic =
    record.type === "dynamic" ||
    (!record.type && !isOnOff && Object.keys(record).length > 0)
  return isOnOff || isDynamic
}

export function normalizeCourseConfigSetName(value: unknown) {
  return String(value || "").trim()
}

export function parseWeekNumber(value: unknown) {
  const num = Number(value)
  return Number.isInteger(num) ? num : NaN
}

export function isPermissionDeniedError(error: unknown) {
  const message = String((error as { message?: string })?.message || "").toLowerCase()
  return (
    message.includes("permission denied") ||
    message.includes("forbidden") ||
    message.includes("http 403") ||
    message.includes("권한")
  )
}
