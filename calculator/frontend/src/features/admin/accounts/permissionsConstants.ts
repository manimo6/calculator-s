export const EFFECT_INHERIT = "inherit"
export const EFFECT_ALLOW = "allow"
export const EFFECT_DENY = "deny"

export const EFFECT_OPTIONS = [
  { value: EFFECT_INHERIT, label: "기본(상속)" },
  { value: EFFECT_ALLOW, label: "허용" },
  { value: EFFECT_DENY, label: "차단" },
]

export const PERMISSION_LABELS = {
  "tabs.calendar": "캘린더 탭",
  "tabs.courses": "수업 목록 탭",
  "tabs.registrations": "등록현황 탭",
  "tabs.attendance": "출석부 탭",
  "tabs.course_notes": "과목별 메모 탭",
  "registrations.merges.manage": "등록현황 > 합반관리 버튼",
  "registrations.installments.view": "등록현황 > 분납현황 버튼",
  "registrations.transfers.manage": "등록현황 > 전반 버튼",
}

export const ROLE_LABELS: Record<string, string> = {
  master: "마스터",
  admin: "관리자",
  teacher: "강사",
  parttime: "파트타임",
}
export const ROLE_ORDER = ["master", "admin", "teacher", "parttime"]

export function formatRoleLabel(role: string | undefined | null) {
  const key = String(role || "").trim()
  if (!key) return "역할 없음"
  return ROLE_LABELS[key] || key
}
