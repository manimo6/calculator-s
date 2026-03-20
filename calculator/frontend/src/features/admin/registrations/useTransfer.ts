import { useCallback, useMemo, useState } from "react"

import { apiClient } from "@/api-client"
import type { CourseInfo, CourseTreeGroup } from "@/utils/data"

import { formatDateYmd, parseDate } from "./utils"

// ── Types ──

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  courseConfigSetName?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: number | string
  withdrawnAt?: string | Date
  transferToId?: string | number
  transferFromId?: string | number
  transferAt?: string | Date
  note?: string
} & Record<string, unknown>

export type TransferOption = { value: string; label: string }
export type TransferGroup = { label: string; items: TransferOption[] }

type CourseInfoRecord = Record<string, CourseInfo | undefined>
type CourseConfigSet = {
  name?: string
  data?: { courseTree?: CourseTreeGroup[]; courseInfo?: CourseInfoRecord } | null
}

// ── Utility functions ──

const COURSE_ID_PREFIX = "__courseid__"
const COURSE_NAME_PREFIX = "__coursename__"

function normalizeCourseValue(value: unknown) {
  return String(value || "").trim()
}

export function makeCourseValue(courseId: unknown, courseName: unknown) {
  const id = normalizeCourseValue(courseId)
  if (id) return `${COURSE_ID_PREFIX}${id}`
  const name = normalizeCourseValue(courseName)
  return name ? `${COURSE_NAME_PREFIX}${name}` : ""
}

export function parseCourseValue(value: unknown) {
  const raw = normalizeCourseValue(value)
  if (raw.startsWith(COURSE_ID_PREFIX)) {
    return { type: "id" as const, value: raw.slice(COURSE_ID_PREFIX.length) }
  }
  if (raw.startsWith(COURSE_NAME_PREFIX)) {
    return { type: "name" as const, value: raw.slice(COURSE_NAME_PREFIX.length) }
  }
  return { type: "name" as const, value: raw }
}

function calcRemainingWeeks(registration: RegistrationRow, transferDate: string | Date) {
  const totalWeeks = Number(registration?.weeks) || 0
  if (totalWeeks <= 0) return 0
  const start = parseDate(registration?.startDate)
  const transfer = parseDate(transferDate)
  if (!start || !transfer || transfer <= start) return totalWeeks
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsedWeeks = Math.ceil((transfer.getTime() - start.getTime()) / msPerWeek)
  const skipWeeks = Array.isArray(registration?.skipWeeks)
    ? (registration.skipWeeks as Array<number | string>).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= elapsedWeeks)
    : []
  const attendedWeeks = Math.max(0, elapsedWeeks - skipWeeks.length)
  return Math.max(1, totalWeeks - attendedWeeks)
}

// ── Hook ──

type RegistrationRowForOptions = {
  course?: string
  courseId?: string | number
} & Record<string, unknown>

type UseTransferParams = {
  courseOptions: Array<string | { value?: string; label?: string }>
  registrations: RegistrationRowForOptions[]
  selectedCourseConfigSetObj: CourseConfigSet | null
  selectedCourseConfigSet: string
  loadRegistrations: () => Promise<void>
  setError: (msg: string) => void
  resolveCourseDays?: (courseName: string) => number[]
}

export function useTransfer({
  courseOptions,
  registrations,
  selectedCourseConfigSetObj,
  selectedCourseConfigSet,
  loadRegistrations,
  setError,
  resolveCourseDays,
}: UseTransferParams) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<RegistrationRow | null>(null)
  const [transferDate, setTransferDate] = useState("")
  const [transferPickerOpen, setTransferPickerOpen] = useState(false)
  const [transferCourseValue, setTransferCourseValue] = useState("")
  const [transferWeeks, setTransferWeeks] = useState("")
  const [transferError, setTransferError] = useState("")
  const [transferSaving, setTransferSaving] = useState(false)

  const transferCourseOptions = useMemo(() => {
    const list: TransferOption[] = []
    const seen = new Set<string>()

    // courseOptions의 라벨이 상위 이름("SAT")인 경우,
    // 실제 등록 데이터에서 세분화된 이름("SAT 온라인", "SAT 오프라인")을 추출
    const variantsByBase = new Map<string, Set<string>>()
    for (const r of registrations || []) {
      const courseName = String(r?.course || "").trim()
      if (!courseName) continue
      for (const opt of courseOptions || []) {
        const baseLabel = String(typeof opt === "string" ? opt : opt?.label || "").trim()
        if (!baseLabel || baseLabel === courseName) continue
        if (courseName.startsWith(baseLabel) && courseName.length > baseLabel.length) {
          if (!variantsByBase.has(baseLabel)) variantsByBase.set(baseLabel, new Set())
          variantsByBase.get(baseLabel)!.add(courseName)
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
        // 세분화된 이름으로 개별 옵션 생성
        for (const variantName of Array.from(variants).sort((a, b) => a.localeCompare(b, "ko-KR"))) {
          const variantKey = `${COURSE_NAME_PREFIX}${variantName}`
          if (seen.has(variantKey)) continue
          seen.add(variantKey)
          list.push({ value: variantKey, label: variantName })
        }
        seen.add(key)
      } else {
        seen.add(key)
        list.push({ value: key, label: labelStr })
      }
    }

    return list
  }, [courseOptions, registrations])

  const transferCourseLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of transferCourseOptions) {
      map.set(opt.value, opt.label)
    }
    return map
  }, [transferCourseOptions])

  const transferCourseGroups = useMemo<TransferGroup[]>(() => {
    if (!transferCourseOptions.length) return []

    // 현재 속한 반은 드롭다운에서 제외
    const currentCourse = String(transferTarget?.course || "").trim()
    const filteredOptions = currentCourse
      ? transferCourseOptions.filter((opt) => opt.label !== currentCourse)
      : transferCourseOptions

    if (!filteredOptions.length) return []
    const tree = Array.isArray(selectedCourseConfigSetObj?.data?.courseTree)
      ? selectedCourseConfigSetObj.data.courseTree
      : []
    const idToCategory = new Map<string, string>()
    const labelToCategory: Array<{ label: string; category: string }> = []
    const categoryOrder: string[] = []

    for (const group of tree) {
      const category = normalizeCourseValue(group?.cat)
      if (category && !categoryOrder.includes(category)) {
        categoryOrder.push(category)
      }
      for (const item of group.items || []) {
        const id = normalizeCourseValue(item?.val)
        if (id) idToCategory.set(id, category)
        const label = normalizeCourseValue(item?.label)
        if (label) labelToCategory.push({ label, category })
      }
    }

    labelToCategory.sort((a, b) => b.label.length - a.label.length)

    const groupMap = new Map<string, TransferOption[]>()
    const addToGroup = (category: string, option: TransferOption) => {
      const key = category || "기타"
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
      if (a === "기타") return 1
      if (b === "기타") return -1
      return a.localeCompare(b, "ko-KR")
    })

    for (const category of restKeys) {
      const items = groupMap.get(category)
      if (!items || !items.length) continue
      items.sort(sortByLabel)
      ordered.push({ label: category, items })
    }

    return ordered
  }, [selectedCourseConfigSetObj, transferCourseOptions, transferTarget])

  const openTransferDialog = useCallback((registration: RegistrationRow) => {
    if (!registration) return
    const today = formatDateYmd(new Date())
    const targetValue = makeCourseValue(
      registration?.courseId,
      registration?.course
    )
    const hasTargetValue =
      !!targetValue && transferCourseLabelMap.has(targetValue)
    setTransferTarget(registration)
    setTransferCourseValue(hasTargetValue ? targetValue : "")
    const date = hasTargetValue ? today : ""
    setTransferDate(date)
    const remaining = date
      ? calcRemainingWeeks(registration, date)
      : Number(registration?.weeks) || 0
    setTransferWeeks(remaining > 0 ? String(remaining) : "")
    setTransferError("")
    setTransferDialogOpen(true)
  }, [transferCourseLabelMap])

  const handleTransferSave = useCallback(async () => {
    if (!transferTarget) return
    if (!transferDate) {
      setTransferError("전반일을 선택해 주세요.")
      return
    }

    if (!transferCourseValue) {
      setTransferError("전반 과목을 선택해 주세요.")
      return
    }

    const start = parseDate(transferTarget?.startDate)
    const transferDay = parseDate(transferDate)
    if (start && transferDay && transferDay.getTime() <= start.getTime()) {
      setTransferError("전반일은 시작일 이후로만 가능합니다.")
      return
    }

    if (!transferWeeks) {
      setTransferError("기간(주)을 입력해 주세요.")
      return
    }
    const weeksValue = Number(transferWeeks)
    if (!Number.isInteger(weeksValue) || weeksValue <= 0) {
      setTransferError("기간(주)은 1 이상의 숫자로 입력해 주세요.")
      return
    }

    const parsedCourse = parseCourseValue(transferCourseValue)
    const courseLabel = transferCourseLabelMap.get(String(transferCourseValue))
    if (!courseLabel) {
      setTransferError("전반 과목을 선택해 주세요.")
      return
    }

    setTransferSaving(true)
    setTransferError("")
    const transferId = transferTarget?.id
    if (!transferId) {
      setTransferError("대상을 확인해 주세요.")
      return
    }
    try {
      await apiClient.transferRegistration(String(transferId), {
        transferDate,
        course: courseLabel,
        courseId: parsedCourse.type === "id" ? parsedCourse.value : "",
        courseConfigSetName:
          transferTarget?.courseConfigSetName || selectedCourseConfigSet,
        ...(weeksValue ? { weeks: weeksValue } : {}),
      })
      await loadRegistrations()
      setTransferDialogOpen(false)
      setTransferTarget(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "전반 처리에 실패했습니다."
      setTransferError(message)
    } finally {
      setTransferSaving(false)
    }
  }, [
    loadRegistrations,
    selectedCourseConfigSet,
    transferCourseLabelMap,
    transferCourseValue,
    transferDate,
    transferTarget,
    transferWeeks,
  ])

  const handleTransferCancel = useCallback(
    async (registration: RegistrationRow) => {
      if (!registration?.id) return
      const name = registration?.name || "학생"
      if (!window.confirm(`${name}의 전반을 취소할까요?`)) return

      try {
        await apiClient.cancelTransferRegistration(String(registration.id))
        await loadRegistrations()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "전반 취소에 실패했습니다."
        setError(message)
      }
    },
    [loadRegistrations, setError]
  )

  // 선택된 과목의 수업 요일 (0=일, 1=월, ..., 6=토)
  const transferCourseDays = useMemo(() => {
    if (!transferCourseValue || typeof resolveCourseDays !== "function") return []
    const label = transferCourseLabelMap.get(transferCourseValue) || ""
    if (!label) return []
    return resolveCourseDays(label)
  }, [transferCourseValue, transferCourseLabelMap, resolveCourseDays])

  const closeTransferDialog = useCallback(() => {
    setTransferDialogOpen(false)
    setTransferTarget(null)
    setTransferError("")
    setTransferPickerOpen(false)
    setTransferCourseValue("")
    setTransferWeeks("")
  }, [])

  const handleTransferDateChange = useCallback(
    (date: string) => {
      setTransferDate(date)
      if (transferTarget && date) {
        const remaining = calcRemainingWeeks(transferTarget, date)
        setTransferWeeks(remaining > 0 ? String(remaining) : "")
      }
    },
    [transferTarget]
  )

  const handleTransferCourseChange = useCallback(
    (value: string) => {
      setTransferCourseValue(value)
      setTransferDate("")
      setTransferPickerOpen(false)
    },
    []
  )

  const transferExpectedEndDate = useMemo(() => {
    if (!transferDate || !transferWeeks) return ""
    const start = parseDate(transferDate)
    const weeks = Number(transferWeeks)
    if (!start || !weeks || weeks <= 0) return ""
    const end = new Date(start.getTime())
    end.setDate(end.getDate() + weeks * 7 - 1)
    return formatDateYmd(end)
  }, [transferDate, transferWeeks])

  return {
    transferDialogOpen,
    transferTarget,
    transferDate,
    setTransferDate: handleTransferDateChange,
    transferPickerOpen,
    setTransferPickerOpen,
    transferCourseValue,
    setTransferCourseValue: handleTransferCourseChange,
    transferWeeks,
    transferError,
    transferSaving,
    transferCourseGroups,
    transferCourseDays,
    transferExpectedEndDate,
    openTransferDialog,
    handleTransferSave,
    handleTransferCancel,
    closeTransferDialog,
  }
}
