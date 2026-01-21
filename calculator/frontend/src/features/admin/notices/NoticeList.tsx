import React, { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type Notice = {
  id?: string
  title?: string
  body?: string
  targets?: string[]
  updatedAt?: string | Date
}

function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeTargets(targets: string[] | undefined) {
  if (!targets || targets.length === 0) return ["전체"]
  return targets
}

export default function NoticeList({
  notices,
  isMaster,
  onEdit,
  onDelete,
}: {
  notices: Notice[]
  isMaster: boolean
  onEdit: (notice: Notice) => void
  onDelete: (id: string) => void
}) {
  const sorted = useMemo(() => {
    return (notices || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      )
  }, [notices])

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
        공지사항이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map((notice) => (
        <Card key={notice.id} className="border-border/60 bg-card/60">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-bold">
                  {notice.title || ""}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    대상:
                    {normalizeTargets(notice.targets).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </span>
                  <span>{formatDateTime(notice.updatedAt)}</span>
                </div>
              </div>

              {isMaster ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(notice)}
                  >
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      notice.id ? onDelete(String(notice.id)) : undefined
                    }
                  >
                    삭제
                  </Button>
                </div>
              ) : null}
            </div>
            <Separator />
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {notice.body || ""}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

