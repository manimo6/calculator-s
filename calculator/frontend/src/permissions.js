export const PERMISSION_KEYS = {
  tabs: {
    calendar: "tabs.calendar",
    courses: "tabs.courses",
    registrations: "tabs.registrations",
    attendance: "tabs.attendance",
    courseNotes: "tabs.course_notes",
  },
  buttons: {
    mergeManager: "registrations.merges.manage",
    installments: "registrations.installments.view",
    transfers: "registrations.transfers.manage",
  },
}

export function getPermissionSets(user) {
  const allow = new Set(
    Array.isArray(user?.permissions) ? user.permissions : []
  )
  const deny = new Set(
    Array.isArray(user?.permissionDenies) ? user.permissionDenies : []
  )
  return { allow, deny }
}

export function hasPermission(user, key) {
  if (!key) return false
  const { allow, deny } = getPermissionSets(user)
  if (deny.has(key)) return false
  return allow.has(key)
}
