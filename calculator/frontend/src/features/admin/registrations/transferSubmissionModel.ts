import { TRANSFER_COPY } from "./transferCopy"
import {
  calcRemainingWeeks,
  makeCourseValue,
  parseCourseValue,
} from "./transferModel"
import { formatDateYmd, parseDate } from "./utils"

type TransferRegistrationRow = {
  id?: string | number
  course?: string
  courseId?: string | number
  courseConfigSetName?: string
  startDate?: string | Date
  weeks?: number | string
} & Record<string, unknown>

export function buildOpenTransferDialogDraft(
  registration: TransferRegistrationRow,
  transferCourseLabelMap: Map<string, string>,
  today: string = formatDateYmd(new Date())
) {
  const targetValue = makeCourseValue(registration?.courseId, registration?.course)
  const hasTargetValue = !!targetValue && transferCourseLabelMap.has(targetValue)
  const transferDate = hasTargetValue ? today : ""
  const remainingWeeks = transferDate
    ? calcRemainingWeeks(registration, transferDate)
    : Number(registration?.weeks) || 0

  return {
    transferCourseValue: hasTargetValue ? targetValue : "",
    transferDate,
    transferWeeks: remainingWeeks > 0 ? String(remainingWeeks) : "",
  }
}

export function validateTransferSubmission({
  transferTarget,
  transferDate,
  transferCourseValue,
  transferWeeks,
  transferCourseLabelMap,
  selectedCourseConfigSet,
}: {
  transferTarget: TransferRegistrationRow | null
  transferDate: string
  transferCourseValue: string
  transferWeeks: string
  transferCourseLabelMap: Map<string, string>
  selectedCourseConfigSet: string
}) {
  if (!transferTarget) {
    return { ok: false as const, error: TRANSFER_COPY.targetMissing }
  }

  if (!transferDate) {
    return { ok: false as const, error: TRANSFER_COPY.startDateRequired }
  }

  if (!transferCourseValue) {
    return { ok: false as const, error: TRANSFER_COPY.targetCourseRequired }
  }

  const start = parseDate(transferTarget?.startDate)
  const transferDay = parseDate(transferDate)
  if (start && transferDay && transferDay.getTime() <= start.getTime()) {
    return { ok: false as const, error: TRANSFER_COPY.dateAfterStart }
  }

  if (!transferWeeks) {
    return { ok: false as const, error: TRANSFER_COPY.weeksRequired }
  }

  const weeksValue = Number(transferWeeks)
  if (!Number.isInteger(weeksValue) || weeksValue <= 0) {
    return { ok: false as const, error: TRANSFER_COPY.weeksPositiveInteger }
  }

  const courseLabel = transferCourseLabelMap.get(String(transferCourseValue))
  if (!courseLabel) {
    return { ok: false as const, error: TRANSFER_COPY.targetCourseRequired }
  }

  const transferId = transferTarget?.id
  if (!transferId) {
    return { ok: false as const, error: TRANSFER_COPY.targetMissing }
  }

  const parsedCourse = parseCourseValue(transferCourseValue)
  return {
    ok: true as const,
    transferId: String(transferId),
    payload: {
      transferDate,
      course: courseLabel,
      courseId: parsedCourse.type === "id" ? parsedCourse.value : "",
      courseConfigSetName: transferTarget?.courseConfigSetName || selectedCourseConfigSet,
      ...(weeksValue ? { weeks: weeksValue } : {}),
    },
  }
}
