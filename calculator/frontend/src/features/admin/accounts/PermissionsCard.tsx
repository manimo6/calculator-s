import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { auth } from "@/auth"
import { useAuth } from "@/auth-context"
import type { AuthUser } from "@/auth-routing"
import PermissionsEditor from "./PermissionsEditor"
import PermissionsUserList from "./PermissionsUserList"
import { useUserPermissions } from "./useUserPermissions"
import { useReauthDialog } from "../components/useReauthDialog"
import {
  EFFECT_DENY,
  ROLE_ORDER,
  formatRoleLabel,
} from "./permissionsConstants"

const HIDDEN_PERMISSION_KEYS = new Set(["tabs.attendance"])
const REGISTRATIONS_TAB_KEY = "tabs.registrations"
const REGISTRATION_CHILD_KEYS = [
  "registrations.merges.manage",
  "registrations.installments.view",
]
const REGISTRATION_CHILD_KEY_SET = new Set(REGISTRATION_CHILD_KEYS)

type PermissionUser = {
  username?: string
  role?: string
} & Record<string, unknown>

type Permission = { key?: string; effect?: string } & Record<string, unknown>

export default function PermissionsCard({
  users,
  defaultUsername,
}: {
  users?: PermissionUser[]
  defaultUsername?: string
}) {
  const { user: currentUser, setUser } = useAuth() as {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
  }
  const { withReauth, dialog: reauthDialog } = useReauthDialog()
  const sortedUsers = useMemo(() => {
    return (users || [])
      .slice()
      .sort((a, b) =>
        String(a.username || "").localeCompare(String(b.username || ""), "ko-KR")
      )
  }, [users])

  const [selectedUsername, setSelectedUsername] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  useEffect(() => {
    if (sortedUsers.length === 0) {
      setSelectedUsername("")
      return
    }
    if (
      selectedUsername &&
      sortedUsers.some((u) => u.username === selectedUsername)
    ) {
      return
    }
    const preferred = sortedUsers.find((u) => u.username === defaultUsername)
    setSelectedUsername(preferred?.username || sortedUsers[0].username || "")
  }, [defaultUsername, selectedUsername, sortedUsers])

  const {
    loading,
    saving,
    error,
    permissions,
    permissionState,
    categoryState,
    courseConfigSets,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    categories,
    setPermissionEffect,
    setPermissionEffects,
    setCategoryEffect,
    setAllCategoriesEffect,
  } = useUserPermissions(selectedUsername) as {
    loading: boolean
    saving: boolean
    error?: string
    permissions: Permission[]
    permissionState: Record<string, string>
    categoryState: Record<string, Record<string, string>>
    courseConfigSets: Array<{ name?: string }>
    selectedCourseConfigSet: string
    setSelectedCourseConfigSet: (value: string) => void
    categories: string[]
    setPermissionEffect: (key: string, effect: string) => Promise<unknown>
    setPermissionEffects: (updates: Record<string, string>) => Promise<unknown>
    setCategoryEffect: (setName: string, categoryKey: string, effect: string) => Promise<unknown>
    setAllCategoriesEffect: (setName: string, effect: string, categoryList: string[]) => Promise<unknown>
  }

  const selectedUser = useMemo(
    () =>
      sortedUsers.find((user) => user.username === selectedUsername) || null,
    [sortedUsers, selectedUsername]
  )

  const roleOptions = useMemo(() => {
    const roleSet = new Set<string>()
    for (const user of sortedUsers) {
      const role = String(user?.role || "").trim()
      if (role) roleSet.add(role)
    }
    const roles = Array.from(roleSet)
    roles.sort((a, b) => {
      const aIndex = ROLE_ORDER.indexOf(a)
      const bIndex = ROLE_ORDER.indexOf(b)
      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      }
      return a.localeCompare(b, "ko-KR")
    })
    return ["all", ...roles]
  }, [sortedUsers])

  const normalizedSearch = useMemo(
    () => userSearch.trim().toLowerCase(),
    [userSearch]
  )
  const filteredUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      const role = String(user?.role || "").trim()
      if (roleFilter !== "all" && role !== roleFilter) return false
      if (!normalizedSearch) return true
      const username = String(user?.username || "")
      const roleLabel = formatRoleLabel(role)
      const haystack = `${username} ${role} ${roleLabel}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [sortedUsers, normalizedSearch, roleFilter])
  const filteredUsernames = useMemo(
    () =>
      new Set(
        filteredUsers.map((user) => String(user?.username || "")).filter(Boolean)
      ),
    [filteredUsers]
  )
  const pinnedSelectedUser =
    Boolean(selectedUser && !filteredUsernames.has(String(selectedUser?.username || "")))
  const visibleUsers = pinnedSelectedUser && selectedUser
    ? [selectedUser, ...filteredUsers]
    : filteredUsers

  const tabPermissions = useMemo(() => {
    return (permissions || [])
      .filter((perm) => {
        const key = String(perm?.key || "")
        return key.startsWith("tabs.") && !HIDDEN_PERMISSION_KEYS.has(key)
      })
      .sort((a, b) =>
        String(a.key || "").localeCompare(String(b.key || ""), "en-US")
      )
  }, [permissions])

  const buttonPermissions = useMemo(() => {
    return (permissions || [])
      .filter((perm) => !String(perm?.key || "").startsWith("tabs."))
      .sort((a, b) =>
        String(a.key || "").localeCompare(String(b.key || ""), "en-US")
      )
  }, [permissions])

  const sortedCategories = useMemo(() => {
    return (categories || [])
      .slice()
      .sort((a, b) => String(a).localeCompare(String(b), "ko-KR"))
  }, [categories])
  const courseConfigSetNames = useMemo(
    () =>
      (courseConfigSets || [])
        .map((set) => String(set?.name || "").trim())
        .filter(Boolean),
    [courseConfigSets]
  )

  const selectedCategories =
    selectedCourseConfigSet && categoryState[selectedCourseConfigSet]
      ? categoryState[selectedCourseConfigSet]
      : {}

  const hasUsers = sortedUsers.length > 0
  const disableUserControls = !hasUsers
  const disableControls = !hasUsers || loading || saving || !selectedUsername
  const selectedRoleLabel = selectedUser
    ? formatRoleLabel(selectedUser.role)
    : ""
  const registrationsTabDenied =
    permissionState[REGISTRATIONS_TAB_KEY] === EFFECT_DENY

  const refreshCurrentUser = useCallback(async () => {
    if (!currentUser?.username) return
    if (currentUser.username !== selectedUsername) return
    const next = await auth.restore()
    if (next) setUser(next)
  }, [currentUser?.username, selectedUsername, setUser])

  const handlePermissionEffect = useCallback(
    async (key: string, effect: string) => {
      const result = await withReauth(async () => {
        if (key === REGISTRATIONS_TAB_KEY && effect === EFFECT_DENY) {
          const updates: Record<string, string> = {
            [REGISTRATIONS_TAB_KEY]: EFFECT_DENY,
          }
          for (const childKey of REGISTRATION_CHILD_KEYS) {
            updates[childKey] = EFFECT_DENY
          }
          await setPermissionEffects(updates)
        } else {
          await setPermissionEffect(key, effect)
        }
      })
      if (!result?.ok) return
      await refreshCurrentUser()
    },
    [refreshCurrentUser, setPermissionEffect, setPermissionEffects, withReauth]
  )

  const handleCategoryEffect = useCallback(
    async (setName: string, categoryKey: string, effect: string) => {
      const result = await withReauth(() =>
        setCategoryEffect(setName, categoryKey, effect)
      )
      if (!result?.ok) return
      await refreshCurrentUser()
    },
    [refreshCurrentUser, setCategoryEffect, withReauth]
  )

  const handleAllCategoriesEffect = useCallback(
    async (setName: string, effect: string, categoryList: string[]) => {
      const result = await withReauth(() =>
        setAllCategoriesEffect(setName, effect, categoryList)
      )
      if (!result?.ok) return
      await refreshCurrentUser()
    },
    [refreshCurrentUser, setAllCategoriesEffect, withReauth]
  )

  return (
    <>
      <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">권한 관리</CardTitle>
          <CardDescription>
            계정별 오버라이드입니다. 변경 즉시 저장됩니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? <Badge variant="outline">불러오는 중</Badge> : null}
          {saving ? <Badge variant="secondary">저장 중</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <PermissionsUserList
            visibleUsers={visibleUsers}
            totalUsers={sortedUsers.length}
            selectedUsername={selectedUsername}
            userSearch={userSearch}
            onSearchChange={setUserSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            roleOptions={roleOptions}
            disableUserControls={disableUserControls}
            hasUsers={hasUsers}
            pinnedSelectedUser={pinnedSelectedUser}
            onSelectUser={setSelectedUsername}
          />
          <PermissionsEditor
            selectedUsername={selectedUsername}
            selectedRoleLabel={selectedRoleLabel}
            hasSelectedUser={!!selectedUser}
            tabPermissions={tabPermissions}
            buttonPermissions={buttonPermissions}
            permissionState={permissionState}
            registrationsTabDenied={registrationsTabDenied}
            registrationChildKeySet={REGISTRATION_CHILD_KEY_SET}
            disableControls={disableControls}
            onPermissionEffect={handlePermissionEffect}
            courseConfigSetNames={courseConfigSetNames}
            selectedCourseConfigSet={selectedCourseConfigSet}
            onSelectCourseConfigSet={setSelectedCourseConfigSet}
            sortedCategories={sortedCategories}
            selectedCategories={selectedCategories}
            onCategoryEffect={handleCategoryEffect}
            onAllCategoriesEffect={handleAllCategoriesEffect}
          />
        </div>
      </CardContent>
      </Card>
      {reauthDialog}
    </>
  )
}
