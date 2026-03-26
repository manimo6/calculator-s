import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentRow, SortConfig, SortKey } from "./installmentBoardModel"
import InstallmentSortButton from "./InstallmentSortButton"
import InstallmentStatusBadge from "./InstallmentStatusBadge"
import { formatDateYmd } from "./utils"

type InstallmentBoardTableProps = {
  rows: InstallmentRow[]
  canSortCourse: boolean
  sortConfig: SortConfig
  onSort: (key: SortKey) => void
  onOpen: (row: InstallmentRow) => void
}

export default function InstallmentBoardTable({
  rows,
  canSortCourse,
  sortConfig,
  onSort,
  onOpen,
}: InstallmentBoardTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-xl shadow-slate-200/20 backdrop-blur-xl">
      <div className="overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-slate-50/95 to-slate-100/95 backdrop-blur-md">
            <TableRow className="border-b border-slate-200/60 hover:bg-transparent">
              <TableHead className="h-12">
                <InstallmentSortButton
                  label={COPY.tableStudent}
                  sortKey="student"
                  sortConfig={sortConfig}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>
                <InstallmentSortButton
                  label={COPY.tableCourse}
                  sortKey="course"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  disabled={!canSortCourse}
                />
              </TableHead>
              <TableHead>
                <InstallmentSortButton
                  label={COPY.tablePeriod}
                  sortKey="period"
                  sortConfig={sortConfig}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {COPY.tableRegisteredMax}
              </TableHead>
              <TableHead>
                <InstallmentSortButton
                  label={COPY.tableStatus}
                  sortKey="status"
                  sortConfig={sortConfig}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                {COPY.tableExtend}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const tone =
                row.isWithdrawn
                  ? "bg-rose-50/60 hover:bg-rose-100/70"
                  : row.status === "notice_needed"
                    ? "bg-amber-50/60 hover:bg-amber-100/70"
                    : row.status === "notice_done"
                      ? "bg-sky-50/60 hover:bg-sky-100/70"
                      : "bg-emerald-50/40 hover:bg-emerald-100/60"

              return (
                <TableRow
                  key={row.registration?.id}
                  className={`group border-b border-slate-200/50 transition-all ${tone}`}
                >
                  <TableCell className="font-bold text-slate-900">
                    {row.registration?.name || "-"}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    {row.courseLabel || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="rounded-lg bg-white/60 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      {formatDateYmd(row.registration?.startDate) || "-"} ~ {formatDateYmd(row.endDate) || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-slate-900">
                      {row.weeks} / {row.studentMaxWeeks}
                      {row.studentMaxWeeks !== row.maxWeeks && (
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          ({row.maxWeeks}
                          {COPY.tableClassWeeksSuffix})
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="mt-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm"
                    >
                      {COPY.tableRemaining} {row.remainingWeeks}
                      {COPY.weekSuffix}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.isWithdrawn ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-rose-400 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 shadow-sm"
                        >
                          {COPY.tableWithdrawn}
                        </Badge>
                      ) : (
                        <InstallmentStatusBadge status={row.status} />
                      )}
                    </div>
                    {row.extensionCount ? (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {COPY.tableExtensionCount} {row.extensionCount}
                        {COPY.roundSuffix}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                      onClick={() => onOpen(row)}
                      disabled={row.isWithdrawn}
                    >
                      {COPY.tableExtendAction}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
