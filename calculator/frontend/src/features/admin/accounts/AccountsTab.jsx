import React, { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  const [editingUsername, setEditingUsername] = useState("")
  const [saving, setSaving] = useState(false)

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">계정 관리</h2>
          <p className="mt-1 text-sm text-muted-foreground">{headerDesc}</p>
        </div>
        <Button type="button" variant="outline" onClick={reload} disabled={loading || saving}>
          새로고침
        </Button>
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

