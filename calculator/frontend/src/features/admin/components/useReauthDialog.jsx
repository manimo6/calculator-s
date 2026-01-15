import React, { useCallback, useRef, useState } from "react"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const REAUTH_ERROR_MESSAGE = "Recent authentication required."

function isReauthError(error) {
  return String(error?.message || "") === REAUTH_ERROR_MESSAGE
}

export function useReauthDialog() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const resolvingRef = useRef(null)
  const pendingRef = useRef(false)

  const resetState = useCallback(() => {
    setOpen(false)
    setPassword("")
    setError("")
    pendingRef.current = false
  }, [])

  const requestReauth = useCallback(async () => {
    if (auth.hasRecentReauth()) return true
    if (pendingRef.current) return false
    pendingRef.current = true
    setOpen(true)
    return await new Promise((resolve) => {
      resolvingRef.current = resolve
    })
  }, [])

  const closeDialog = useCallback(() => {
    if (resolvingRef.current) {
      resolvingRef.current(false)
      resolvingRef.current = null
    }
    resetState()
  }, [resetState])

  const confirmReauth = useCallback(async () => {
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.")
      return
    }
    try {
      await auth.reauth(password.trim())
      if (resolvingRef.current) {
        resolvingRef.current(true)
        resolvingRef.current = null
      }
      resetState()
    } catch (err) {
      setError(err?.message || "재인증에 실패했습니다.")
    }
  }, [password, resetState])

  const withReauth = useCallback(
    async (action) => {
      if (!auth.hasRecentReauth()) {
        const ok = await requestReauth()
        if (!ok) return { ok: false }
      }
      try {
        const value = await action()
        return { ok: true, value }
      } catch (err) {
        if (!isReauthError(err)) throw err
        const ok = await requestReauth()
        if (!ok) return { ok: false }
        const value = await action()
        return { ok: true, value }
      }
    },
    [requestReauth]
  )

  const dialog = (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? closeDialog() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>재인증 필요</DialogTitle>
          <DialogDescription>
            중요한 작업입니다. 비밀번호를 다시 입력해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeDialog}>
            취소
          </Button>
          <Button type="button" onClick={confirmReauth}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { withReauth, dialog }
}
