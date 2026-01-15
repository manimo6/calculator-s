import React, { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const ROLE_OPTIONS = [
  { value: "admin", label: "관리자" },
  { value: "teacher", label: "강사" },
  { value: "parttime", label: "알바" },
]

export default function NoticeEditorCard({
  isMaster,
  editNotice,
  saving,
  onSubmit,
  onReset,
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targets, setTargets] = useState([])

  const isEditing = Boolean(editNotice?.id)

  useEffect(() => {
    if (!editNotice) return
    setTitle(editNotice.title || "")
    setBody(editNotice.body || "")
    setTargets(Array.isArray(editNotice.targets) ? editNotice.targets : [])
  }, [editNotice])

  const titleText = useMemo(() => {
    if (!isMaster) return null
    return isEditing ? "공지 수정" : "공지 생성"
  }, [isMaster, isEditing])

  if (!isMaster) return null

  function toggleTarget(value) {
    setTargets((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      targets,
    })
  }

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{titleText}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="noticeTitle">제목</Label>
            <Input
              id="noticeTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="noticeBody">내용</Label>
            <Textarea
              id="noticeBody"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>대상</Label>
            <div className="flex flex-wrap gap-4">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Checkbox
                    checked={targets.includes(opt.value)}
                    onCheckedChange={() => toggleTarget(opt.value)}
                    disabled={saving}
                  />
                  {opt.label}
                </label>
              ))}
              <span className="text-sm text-muted-foreground">
                (미선택 시 전체)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              저장
            </Button>
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              초기화
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

