/**
 * 합반 주차 판단 유틸리티
 * - 오늘 날짜 기준으로 합반 활성/개별 전환
 * - 주차 겹침 검증
 */

export type WeekRange = { start: number; end: number }

export type MergeEntry = {
  id: string
  name: string
  courses: string[]
  weekRanges: WeekRange[]
  isActive: boolean
  courseConfigSetName: string
  referenceStartDate: string | null
}

export type RegistrationRow = {
  id?: string
  course?: string
  startDate?: string | Date | null
  withdrawnAt?: string | null
}

/**
 * 합반 소속 과목의 registration 중 가장 빠른 startDate 반환
 * (API에서 referenceStartDate를 내려주지만, 프론트 fallback용)
 */
export function getMergeReferenceDate(
  merge: MergeEntry,
  registrations: RegistrationRow[]
): string | null {
  if (merge.referenceStartDate) return merge.referenceStartDate
  const courseSet = new Set(merge.courses)
  let earliest: string | null = null
  for (const reg of registrations) {
    if (!reg.course || !courseSet.has(reg.course)) continue
    if (reg.withdrawnAt) continue
    const d = typeof reg.startDate === "string"
      ? reg.startDate
      : reg.startDate instanceof Date
        ? reg.startDate.toISOString().slice(0, 10)
        : null
    if (d && (!earliest || d < earliest)) earliest = d
  }
  return earliest
}

/**
 * 기준일로부터 오늘이 몇 주차인지 계산 (1-based)
 * 월요일 시작 기준
 */
export function getCurrentWeek(referenceDate: string, today?: Date): number {
  const ref = new Date(referenceDate + "T00:00:00")
  const now = today || new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = todayStart.getTime() - ref.getTime()
  if (diffMs < 0) return 0
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

/**
 * 해당 주차가 합반의 weekRanges에 포함되는지 확인
 * weekRanges가 비어있으면 전체 주차 합반 (always true)
 */
export function isWeekInMergeRanges(
  weekRanges: WeekRange[],
  currentWeek: number
): boolean {
  if (!weekRanges || weekRanges.length === 0) return true
  return weekRanges.some((r) => currentWeek >= r.start && currentWeek <= r.end)
}

/**
 * 오늘 기준으로 합반이 활성 상태인지 종합 판단
 * - isActive가 false면 무조건 비활성
 * - referenceStartDate가 없으면 비활성 (소속 학생 0명)
 * - 오늘 주차가 weekRanges에 포함되어야 활성
 */
export function isMergeActiveToday(
  merge: MergeEntry,
  registrations?: RegistrationRow[],
  today?: Date
): boolean {
  if (!merge.isActive) return false
  const refDate = merge.referenceStartDate
    || (registrations ? getMergeReferenceDate(merge, registrations) : null)
  if (!refDate) return false
  const currentWeek = getCurrentWeek(refDate, today)
  if (currentWeek < 1) return false
  return isWeekInMergeRanges(merge.weekRanges, currentWeek)
}

/**
 * 오늘 기준 활성 합반 목록 필터링
 */
export function getActiveMergesToday(
  merges: MergeEntry[],
  registrations?: RegistrationRow[],
  today?: Date
): MergeEntry[] {
  return merges.filter((m) => isMergeActiveToday(m, registrations, today))
}

/**
 * 오늘 활성 합반에 소속된 과목 Set 반환
 * (사이드바에서 개별 과목을 숨기거나 비활성 처리할 때 사용)
 */
export function getMergedCourseSet(
  activeMerges: MergeEntry[]
): Set<string> {
  const set = new Set<string>()
  for (const m of activeMerges) {
    for (const c of m.courses) set.add(c)
  }
  return set
}

/**
 * 주차 겹침 검증 — 같은 과목이 같은 주차에 2개 이상 합반에 속하는지
 */
function rangesOverlap(a: WeekRange[], b: WeekRange[]): boolean {
  for (const ra of a) {
    for (const rb of b) {
      if (ra.start <= rb.end && rb.start <= ra.end) return true
    }
  }
  return false
}

export function validateNoWeekOverlap(
  merges: MergeEntry[]
): { valid: boolean; error?: string } {
  const activeMerges = merges.filter((m) => m.isActive)
  const courseMap = new Map<string, Array<{ mergeName: string; weekRanges: WeekRange[] }>>()
  for (const merge of activeMerges) {
    for (const course of merge.courses) {
      if (!courseMap.has(course)) courseMap.set(course, [])
      courseMap.get(course)!.push({
        mergeName: merge.name,
        weekRanges: merge.weekRanges,
      })
    }
  }
  for (const [course, entries] of courseMap) {
    if (entries.length < 2) continue
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]
        const b = entries[j]
        const aRanges = a.weekRanges.length > 0 ? a.weekRanges : [{ start: 1, end: 9999 }]
        const bRanges = b.weekRanges.length > 0 ? b.weekRanges : [{ start: 1, end: 9999 }]
        if (rangesOverlap(aRanges, bRanges)) {
          return {
            valid: false,
            error: `"${course}" 과목이 "${a.mergeName}"과(와) "${b.mergeName}"에서 주차가 겹칩니다.`,
          }
        }
      }
    }
  }
  return { valid: true }
}
