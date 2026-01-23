import React, { useMemo, useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield } from "lucide-react"

import { useUsers } from "./useUsers"
import UserFormCard from "./UserFormCard"
import UsersTable from "./UsersTable"
import PermissionsCard from "./PermissionsCard"
import { useReauthDialog } from "../components/useReauthDialog"

export default function AccountsTab({ user }) {
  const isMaster = user?.role === "master"
  const currentUsername = user?.username || ""

  const { loading, error, setError, users, reload, createUser, updateUser, deleteUser } = useUsers()
  const { withReauth, dialog: reauthDialog } = useReauthDialog()

  const [editingUsername, setEditingUsername] = useState<any>("")
  const [saving, setSaving] = useState<any>(false)

  const headerDesc = useMemo(
    () => "마스터만 생성/수정/삭제가 가능합니다.",
    []
  )

  if (!isMaster) {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">계정 관리</h2>
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          마스터만 접근 가능합니다.
        </div>
      </div>
    )
  }

  async function handleSubmit({ username, role, password }) {
    setError("")
    setSaving(true)
    try {
        if (editingUsername) {
          const result = await withReauth(() =>
            updateUser(username, { role, ...(password ? { password } : {}) })
          )
          if (!result?.ok) return
        } else {
          const result = await withReauth(() => createUser({ username, password, role }))
          if (!result?.ok) return
        }
      setEditingUsername("")
      await reload()
    } catch (e) {
      setError(e?.message || "저장에 실패했습니다.")
      throw e
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setEditingUsername("")
    setError("")
  }

  async function handleDelete(targetUsername) {
    if (!targetUsername) return
    if (targetUsername === currentUsername) return
    if (!confirm(`'${targetUsername}' 계정을 삭제할까요?`)) return
    setSaving(true)
    try {
      const result = await withReauth(() => deleteUser(targetUsername))
      if (!result?.ok) return
      await reload()
    } catch (e) {
      setError(e?.message || "삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
      {/* 헤더 영역 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-400/10 p-6 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">계정 관리</h2>
            <p className="text-sm text-slate-600">{headerDesc}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">계정 생성/관리</TabsTrigger>
          <TabsTrigger value="permissions">권한 관리</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="space-y-4">
          <UserFormCard
            editingUsername={editingUsername}
            users={users}
            saving={saving}
            onSubmit={handleSubmit}
            onReset={handleReset}
            onError={setError}
          />
          <UsersTable
            users={users}
            loading={loading}
            currentUsername={currentUsername}
            onEdit={(u) => setEditingUsername(u.username)}
            onDelete={handleDelete}
          />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsCard users={users} defaultUsername={currentUsername} />
        </TabsContent>
      </Tabs>
      </div>
      {reauthDialog}
    </>
  )
}

