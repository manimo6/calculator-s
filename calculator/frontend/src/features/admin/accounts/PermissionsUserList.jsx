import React from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

import { cn } from "@/lib/utils"
import { formatRoleLabel } from "./permissionsConstants"

export default function PermissionsUserList({
  visibleUsers,
  totalUsers,
  selectedUsername,
  userSearch,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  disableUserControls,
  hasUsers,
  pinnedSelectedUser,
  onSelectUser,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">계정 목록</div>
        <Badge variant="outline">
          {visibleUsers.length}/{totalUsers}
        </Badge>
      </div>
      <div className="grid gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="permissions-user-search">계정 검색</Label>
          <Input
            id="permissions-user-search"
            value={userSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="아이디 또는 역할로 검색"
            disabled={disableUserControls}
          />
        </div>
        <div className="space-y-1.5">
          <Label>역할 필터</Label>
          <Select
            value={roleFilter}
            onValueChange={onRoleFilterChange}
            disabled={disableUserControls}
          >
            <SelectTrigger>
              <SelectValue placeholder="역할을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role === "all" ? "전체 역할" : formatRoleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="h-[420px] rounded-lg border border-border/60">
        <div className="space-y-2 p-2">
          {!hasUsers ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              사용 가능한 계정이 없습니다.
            </div>
          ) : visibleUsers.length ? (
            visibleUsers.map((user) => {
              const username = String(user?.username || "")
              const roleLabel = formatRoleLabel(user?.role)
              const isSelected = username === selectedUsername
              return (
                <button
                  key={username || roleLabel}
                  type="button"
                  onClick={() => onSelectUser(username)}
                  disabled={disableUserControls}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left transition",
                    isSelected
                      ? "border-primary/40 bg-muted/70"
                      : "hover:bg-muted/40",
                    disableUserControls &&
                      "cursor-not-allowed opacity-60 hover:bg-transparent"
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {username || "이름 없음"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                    </div>
                  </div>
                  {isSelected ? <Badge variant="secondary">선택됨</Badge> : null}
                </button>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </ScrollArea>
      {pinnedSelectedUser ? (
        <div className="text-xs text-muted-foreground">
          필터와 무관하게 현재 선택한 계정을 표시합니다.
        </div>
      ) : null}
      <div className="text-xs text-muted-foreground">
        기본은 역할 권한을 따릅니다. 차단이 허용보다 우선합니다.
      </div>
    </div>
  )
}
