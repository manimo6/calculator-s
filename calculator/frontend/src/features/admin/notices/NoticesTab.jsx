import React, { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import NoticeEditorCard from "./NoticeEditorCard"
import NoticeList from "./NoticeList"
import { useNotices } from "./useNotices"
import { useReauthDialog } from "../components/useReauthDialog"

export default function NoticesTab({ user }) {
  const isMaster = user?.role === "master"

  const { loading, error, setError, notices, reload, createNotice, updateNotice, deleteNotice } =
    useNotices()
  const { withReauth, dialog: reauthDialog } = useReauthDialog()

  const [editNotice, setEditNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  const headerDesc = useMemo(
    () => (isMaster ? "" : "조회만 가능합니다."),
    [isMaster]
  )

  async function handleSubmit(payload) {
    if (!payload?.title || !payload?.body) {
      setError("제목과 내용을 입력해주세요.")
      return
    }
    setError("")
    setSaving(true)
    try {
      if (editNotice?.id) {
        const result = await withReauth(() => updateNotice(editNotice.id, payload))
        if (!result?.ok) return
      } else {
        const result = await withReauth(() => createNotice(payload))
        if (!result?.ok) return
      }
      setEditNotice(null)
      await reload()
    } catch (e) {
      setError(e?.message || "저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!id) return
    if (!confirm("삭제하시겠습니까?")) return
    setSaving(true)
    try {
      const result = await withReauth(() => deleteNotice(id))
      if (!result?.ok) return
      await reload()
    } catch (e) {
      setError(e?.message || "삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setEditNotice(null)
    setError("")
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">공지사항</h2>
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

      <NoticeEditorCard
        isMaster={isMaster}
        editNotice={editNotice}
        saving={saving}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">불러오는 중...</div>
      ) : (
        <NoticeList
          notices={notices}
          isMaster={isMaster}
          onEdit={(n) => setEditNotice(n)}
          onDelete={handleDelete}
        />
      )}
      </div>
      {reauthDialog}
    </>
  )
}

