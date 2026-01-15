import React, { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_OPTIONS = [
  { value: "master", label: "마스터" },
  { value: "admin", label: "관리자" },
  { value: "teacher", label: "강사" },
  { value: "parttime", label: "알바" },
]

export default function UserFormCard({
  editingUsername,
  users,
  saving,
  onSubmit,
  onReset,
  onError,
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("admin")

  const isEditing = Boolean(editingUsername)

  const formTitle = useMemo(
    () => (isEditing ? "계정 수정" : "계정 생성"),
    [isEditing]
  )

  useEffect(() => {
    if (!editingUsername) return
    const target = (users || []).find((u) => u.username === editingUsername)
    if (!target) return
    setUsername(target.username || "")
    setPassword("")
    setRole(target.role || "admin")
  }, [editingUsername, users])

  function resetLocal() {
    setUsername("")
    setPassword("")
    setRole("admin")
  }

  function handleReset() {
    resetLocal()
    onReset()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed || !role) {
      onError("아이디와 권한을 입력해주세요.")
      return
    }
    onSubmit({
      username: trimmed,
      role,
      password: password || "",
    })
      .then(() => resetLocal())
      .catch(() => {})
  }

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{formTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="acctUsername">아이디</Label>
            <Input
              id="acctUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              readOnly={isEditing}
              required
              disabled={saving}
            />
          </div>
          {isEditing ? (
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="acctPassword">비밀번호 (변경할 경우만)</Label>
              <Input
                id="acctPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                placeholder="변경할 경우만 입력"
              />
            </div>
          ) : (
            <div className="space-y-2 md:col-span-1">
              <Label>초기 비밀번호</Label>
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                초기 비밀번호는 0으로 생성됩니다. 첫 로그인에서 변경해주세요.
              </div>
            </div>
          )}
          <div className="space-y-2 md:col-span-1">
            <Label>권한</Label>
            <Select value={role} onValueChange={setRole} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="권한 선택" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <Button type="submit" disabled={saving}>
              저장
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              초기화
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
