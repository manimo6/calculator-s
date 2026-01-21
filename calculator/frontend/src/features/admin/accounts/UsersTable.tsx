import React, { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function UsersTable({
  users,
  loading,
  currentUsername,
  onEdit,
  onDelete,
}) {
  const sorted = useMemo(() => {
    return (users || [])
      .slice()
      .sort((a, b) =>
        String(a.username || "").localeCompare(String(b.username || ""), "ko-KR")
      )
  }, [users])

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>아이디</TableHead>
            <TableHead>권한</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                불러오는 중...
              </TableCell>
            </TableRow>
          ) : sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                계정이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((u) => (
              <TableRow key={u.username}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(u)}
                    className="mr-2"
                  >
                    수정
                  </Button>
                  {u.username === currentUsername ? (
                    <span className="text-xs text-muted-foreground">(본인)</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(u.username)}
                    >
                      삭제
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

