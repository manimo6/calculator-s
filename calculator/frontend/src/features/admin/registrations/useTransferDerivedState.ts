import { useMemo } from "react"

import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

import {
  buildTransferCourseGroups,
  buildTransferCourseLabelMap,
  buildTransferCourseOptions,
  getDailyTransferExpectedEndDate,
  getTransferExpectedEndDate,
} from "./transferModel"
import { isDailyRegistration } from "./utils"

type RegistrationRow = {
  course?: string
  courseId?: string | number
} & Record<string, unknown>

type TransferTarget = {
  course?: string
  courseId?: string | number
  durationUnit?: "weekly" | "daily"
  selectedDates?: string[]
} & Record<string, unknown>

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSet = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

export function useTransferDerivedState({
  courseOptions,
  registrations,
  selectedCourseConfigSetObj,
  transferTarget,
  transferCourseValue,
  transferDate,
  transferWeeks,
  resolveCourseDays,
}: {
  courseOptions: Array<string | { value?: string; label?: string }>
  registrations: RegistrationRow[]
  selectedCourseConfigSetObj: CourseConfigSet | null
  transferTarget: TransferTarget | null
  transferCourseValue: string
  transferDate: string
  transferWeeks: string
  resolveCourseDays?: (courseName: string) => number[]
}) {
  const transferCourseOptions = useMemo(() => {
    return buildTransferCourseOptions({
      courseOptions,
      registrations,
    })
  }, [courseOptions, registrations])

  const transferCourseLabelMap = useMemo(() => {
    return buildTransferCourseLabelMap(transferCourseOptions)
  }, [transferCourseOptions])

  const transferCourseGroups = useMemo(() => {
    return buildTransferCourseGroups({
      transferCourseOptions,
      selectedCourseConfigSetObj,
      transferTarget,
    })
  }, [selectedCourseConfigSetObj, transferCourseOptions, transferTarget])

  const transferCourseDays = useMemo(() => {
    if (!transferCourseValue || typeof resolveCourseDays !== "function") return []
    const label = transferCourseLabelMap.get(transferCourseValue) || ""
    if (!label) return []
    return resolveCourseDays(label)
  }, [resolveCourseDays, transferCourseLabelMap, transferCourseValue])

  const isDaily = isDailyRegistration(transferTarget)

  const transferExpectedEndDate = useMemo(() => {
    if (isDaily && transferTarget) {
      return getDailyTransferExpectedEndDate(transferTarget, transferDate)
    }
    return getTransferExpectedEndDate(transferDate, transferWeeks)
  }, [isDaily, transferDate, transferTarget, transferWeeks])

  return {
    transferCourseLabelMap,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
  }
}
