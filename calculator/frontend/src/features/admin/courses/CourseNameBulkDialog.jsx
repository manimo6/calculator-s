import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/api-client"

import { RefreshCw, RotateCcw } from "lucide-react"

export default function CourseNameBulkDialog({
  isOpen,
  onClose,
  courseConfigSetName,
  showToast,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState([])

  const loadCourseNames = useCallback(async () => {
    const trimmedSetName = String(courseConfigSetName || "").trim()
    if (!trimmedSetName) {
      setRows([])
      setError("설정 세트를 선택해 주세요.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.listRegistrationCourseNames(trimmedSetName)
      const nextRows = (res?.results || []).map((item) => ({
        course: String(item.course || ""),
        count: Number(item.count || 0),
        nextName: String(item.course || ""),
      }))
      setRows(nextRows)
    } catch (e) {
      setRows([])
      setError(e?.message || "수업명 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [courseConfigSetName])

  useEffect(() => {
    if (!isOpen) return
    loadCourseNames()
  }, [isOpen, loadCourseNames])

  useEffect(() => {
    if (isOpen) return
    setQuery("")
    setRows([])
    setError("")
  }, [isOpen])

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter((row) => row.course.toLowerCase().includes(q))
  }, [query, rows])

  const pendingChanges = useMemo(
    () =>
      rows.filter((row) => {
        const next = row.nextName.trim()
        return next.length > 0 && next !== row.course
      }),
    [rows]
  )

  const pendingCount = pendingChanges.length
  const pendingRegistrations = pendingChanges.reduce(
    (sum, row) => sum + row.count,
    0
  )

  const handleResetAll = () => {
    setRows((prev) =>
      prev.map((row) => ({ ...row, nextName: row.course }))
    )
  }

  const handleApply = async () => {
    if (saving) return
    if (pendingChanges.length === 0) {
      setError("변경할 항목이 없습니다.")
      return
    }
    const invalid = pendingChanges.find((row) => !row.nextName.trim())
    if (invalid) {
      setError("변경 이름을 입력해 주세요.")
      return
    }
    const ok = confirm(
      `총 ${pendingCount}개의 수업명을 변경할까요? (등록 ${pendingRegistrations}건)`
    )
    if (!ok) return

    setSaving(true)
    setError("")
    try {
      const payload = {
        courseConfigSetName: String(courseConfigSetName || "").trim(),
        changes: pendingChanges.map((row) => ({
          from: row.course,
          to: row.nextName.trim(),
        })),
      }
      const res = await apiClient.renameRegistrationCourseNames(payload)
      const updated = Number(res?.updated || 0)
      if (typeof showToast === "function") {
        showToast(`수업명 변경 ${pendingCount}건, 등록 ${updated}건 반영`)
      }
      await loadCourseNames()
    } catch (e) {
      setError(e?.message || "수업명 변경에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/40 px-6 py-4 text-left">
          <DialogTitle>수업명 일괄 변경</DialogTitle>
          <DialogDescription>
            선택한 설정 세트에서 등록된 수업명을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="수업명 검색..."
              className="h-9 flex-1"
              disabled={loading || saving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadCourseNames}
              disabled={loading || saving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              disabled={rows.length === 0 || loading || saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              전체 초기화
            </Button>
          </div>

          <div className="rounded-lg border border-border/60">
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">
                  수업명 목록을 불러오는 중...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">
                  표시할 수업명이 없습니다.
                </div>
              ) : (
                filteredRows.map((row) => {
                  const isChanged = row.nextName.trim() !== row.course
                  return (
                    <div
                      key={row.course}
                      className="grid grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)] items-center gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
                    >
                      <div className="truncate" title={row.course}>
                        {row.course}
                      </div>
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="whitespace-nowrap">
                          등록된 학생수 {row.count}건
                        </Badge>
                      </div>
                      <Input
                        value={row.nextName}
                        onChange={(event) => {
                          const value = event.target.value
                          setRows((prev) =>
                            prev.map((item) =>
                              item.course === row.course
                                ? { ...item, nextName: value }
                                : item
                            )
                          )
                        }}
                        className={isChanged ? "border-emerald-300 bg-emerald-50/40" : ""}
                        disabled={saving}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>변경 예정: {pendingCount}개</span>
            <span>영향 등록: {pendingRegistrations}건</span>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            적용하면 등록현황의 수업명이 즉시 변경됩니다.
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              닫기
            </Button>
            <Button type="button" onClick={handleApply} disabled={saving || pendingCount === 0}>
              변경 적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
