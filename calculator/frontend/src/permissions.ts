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

type PermissionUser = {
  permissions?: string[]
  permissionDenies?: string[]
} & Record<string, unknown>

export function getPermissionSets(user: PermissionUser | null | undefined) {
  const allow = new Set(
    Array.isArray(user?.permissions) ? user.permissions : []
  )
  const deny = new Set(
    Array.isArray(user?.permissionDenies) ? user.permissionDenies : []
  )
  return { allow, deny }
}

export function hasPermission(
  user: PermissionUser | null | undefined,
  key: string
) {
  if (!key) return false
  const { allow, deny } = getPermissionSets(user)
  if (deny.has(key)) return false
  return allow.has(key)
}
