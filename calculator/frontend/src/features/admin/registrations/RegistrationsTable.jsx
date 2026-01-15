import React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { formatTimestampKo } from "./utils"

export default function RegistrationsTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
      <div className="border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">
        총 {rows.length}건
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>과목</TableHead>
              <TableHead>시작</TableHead>
              <TableHead>종료</TableHead>
              <TableHead>주수</TableHead>
              <TableHead>등록시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={`${r.id || idx}`}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.course}</TableCell>
                <TableCell>{r.startDate}</TableCell>
                <TableCell>{r.endDate}</TableCell>
                <TableCell>{r.weeks}</TableCell>
                <TableCell>{formatTimestampKo(r.timestamp)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

