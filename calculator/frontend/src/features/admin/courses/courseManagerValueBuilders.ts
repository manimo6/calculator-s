import {
  BREAK_RANGE_FORMAT_ERROR,
  BREAK_RANGE_REQUIRED_ERROR,
  OFFLINE_KEY,
  ONLINE_KEY,
} from "./courseDialogConstants"

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateKey(value) {
  if (!DATE_KEY_RE.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

export function normalizeBreakRanges(ranges) {
  if (!Array.isArray(ranges)) return { ranges: [], error: "" }

  const cleaned = []
  for (const range of ranges) {
    const startDate = String(range?.startDate || range?.start || "").trim()
    const endDate = String(range?.endDate || range?.end || "").trim()
    if (!startDate && !endDate) continue
    if (!startDate || !endDate) {
      return { ranges: [], error: BREAK_RANGE_REQUIRED_ERROR }
    }
    if (!isValidDateKey(startDate) || !isValidDateKey(endDate)) {
      return { ranges: [], error: BREAK_RANGE_FORMAT_ERROR }
    }
    const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
    cleaned.push({ startDate: start, endDate: end })
  }

  cleaned.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
  return { ranges: cleaned, error: "" }
}

export function buildTimeValueFromForm(formData) {
  const currentTimeType = formData?.timeType || "default"
  if (currentTimeType === "onoff") {
    return {
      [ONLINE_KEY]: (formData?.timeOnline || "").trim(),
      [OFFLINE_KEY]: (formData?.timeOffline || "").trim(),
    }
  }
  if (currentTimeType === "dynamic") {
    const timeOptions = {}
    const options = Array.isArray(formData?.dynamicOptions)
      ? formData.dynamicOptions
      : []
    options
      .map((opt) => ({
        label: (opt?.label || "").trim(),
        time: (opt?.time || "").trim(),
      }))
      .filter((option) => option.label && option.time)
      .forEach((option) => {
        timeOptions[option.label] = option.time
      })
    return timeOptions
  }
  return (formData?.timeDefault || "").trim()
}

export function buildRecordingValueFromForm(formData) {
  const currentTimeType = formData?.timeType || "default"
  if (currentTimeType === "onoff") {
    return {
      [ONLINE_KEY]: !!formData?.isRecordingOnline,
      [OFFLINE_KEY]: !!formData?.isRecordingOffline,
    }
  }
  return !!formData?.isRecordingAvailable
}

export function buildCourseInfoValueFromForm({
  formData,
  name,
  previousInfo,
  breakRanges,
}) {
  const next = { ...(previousInfo || {}) }
  next.name = name
  next.fee = Number(formData?.fee || 0)
  next.textbook = formData?.textbook || next.textbook || {}
  next.days = Array.isArray(formData?.days) ? formData.days : []
  next.startDays = Array.isArray(formData?.startDays) ? formData.startDays : []
  next.endDays = Array.isArray(formData?.endDays) ? formData.endDays : []
  next.endDay = next.endDays?.length ? next.endDays[0] : previousInfo?.endDay ?? 5
  next.min = Number(formData?.minDuration || 1)
  next.max = Number(formData?.maxDuration || 12)
  next.minDuration = next.min
  next.maxDuration = next.max
  const hasMathOption = !!formData?.hasMathOption
  next.hasMathOption = hasMathOption
  next.mathExcludedFee = hasMathOption ? Number(formData?.mathExcludedFee || 0) : 0
  next.installmentEligible = !!formData?.installmentEligible
  next.durationUnit = formData?.durationUnit || "weekly"
  if (next.durationUnit === "daily") {
    next.dailyFees = Array.isArray(formData?.dailyFees)
      ? formData.dailyFees.filter((f) => f && f.days > 0 && f.fee >= 0)
      : []
    next.availableDates = Array.isArray(formData?.availableDates)
      ? formData.availableDates.filter((d) => typeof d === "string" && d).sort()
      : []
  } else {
    delete next.dailyFees
    delete next.durationUnit
    delete next.availableDates
  }
  next.breakRanges = breakRanges
  if (formData?.timeType === "dynamic") next.dynamicTime = true
  else delete next.dynamicTime
  return next
}
