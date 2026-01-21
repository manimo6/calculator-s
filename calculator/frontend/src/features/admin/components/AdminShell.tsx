import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, LogOut, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { ADMIN_TABS } from "../constants"
import { canAccessCalculator, ROUTES } from "../../../auth-routing"

const ROLE_LABEL = {
  master: "마스터",
  admin: "관리자",
  teacher: "강사",
  parttime: "알바",
}

const AdminShell = ({ user, activeTab, onTabChange, onLogout, children, tabs }) => {
  const [isCollapsed, setIsCollapsed] = useState<any>(false)
  const visibleTabs = useMemo(() => {
    const baseTabs = Array.isArray(tabs) ? tabs : ADMIN_TABS
    if (user?.role === "master") return baseTabs
    return baseTabs.filter((t) => t.id !== "accounts")
  }, [tabs, user?.role])
  const showCalculatorLink = canAccessCalculator(user)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen w-full">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border/60 bg-card/60 p-4 transition-[width] duration-200 md:flex md:flex-col",
            isCollapsed ? "w-16 overflow-hidden" : "w-72"
          )}
        >
          <div className="flex items-start justify-between gap-2 px-2 py-2">
            <div className={cn("min-w-0", isCollapsed && "sr-only")}>
              <div className="truncate text-lg font-extrabold tracking-tight">
                관리자 모드
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{user?.username || "-"}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                  {ROLE_LABEL[user?.role] || user?.role || "-"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Separator className="my-3" />

          <nav className="flex flex-col gap-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 rounded-xl",
                    isCollapsed && "justify-center px-2",
                    isActive && "font-semibold"
                  )}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className={cn("truncate", isCollapsed && "sr-only")}>
                    {tab.label}
                  </span>
                  {tab?.hasUnread ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-auto flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600",
                        isCollapsed && "hidden"
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      NEW
                    </Badge>
                  ) : null}
                </Button>
              )
            })}
          </nav>

          <div className="mt-auto pt-4">
            <Separator className="mb-3" />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 rounded-xl",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className={cn(isCollapsed && "sr-only")}>로그아웃</span>
              </Button>
              {showCalculatorLink ? (
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 rounded-xl",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Link to={ROUTES.calculator}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className={cn(isCollapsed && "sr-only")}>
                      계산기로 돌아가기
                    </span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">관리자 모드</div>
              <Button type="button" variant="outline" size="sm" onClick={onLogout}>
                로그아웃
              </Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                      isActive
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground"
                    )}
                    onClick={() => onTabChange(tab.id)}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </header>

          <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default AdminShell
