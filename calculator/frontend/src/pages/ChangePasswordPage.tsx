import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { apiClient } from "@/api-client"
import { auth } from "@/auth"
import { useAuth } from "@/auth-context"
import { getDefaultRoute, ROUTES } from "@/auth-routing"

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState<any>("")
  const [newPassword, setNewPassword] = useState<any>("")
  const [confirmPassword, setConfirmPassword] = useState<any>("")
  const [saving, setSaving] = useState<any>(false)
  const [error, setError] = useState<any>("")
  const [message, setMessage] = useState<any>("")

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (!currentPassword || !newPassword) {
      setError("현재 비밀번호와 새 비밀번호를 입력해주세요.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.")
      return
    }
    if (newPassword === "0") {
      setError("새 비밀번호는 0으로 설정할 수 없습니다.")
      return
    }

    setSaving(true)
    try {
      await apiClient.changePassword({
        currentPassword,
        newPassword,
      })
      const nextUser = await auth.restore()
      if (!nextUser) {
        setUser(null)
        navigate(ROUTES.login, { replace: true })
        return
      }
      setUser(nextUser)
      setMessage("비밀번호가 변경되었습니다.")
      navigate(getDefaultRoute(nextUser), { replace: true })
    } catch (err) {
      setError(err?.message || "비밀번호 변경에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.mustChangePassword ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              초기 비밀번호(0)로 로그인했습니다. 원하는 비밀번호로 변경해주세요.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={saving}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              변경하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
