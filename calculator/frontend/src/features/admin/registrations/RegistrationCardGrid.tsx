import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  TimerOff,
  User,
  Video,
} from "lucide-react"

import {
  formatDateYmd,
  formatTimestampKo,
  getRegistrationStatus,
  getStatusLabel,
  getStatusSortRank,
  parseDate,
} from "./utils"

type RegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  courseId?: string | number
  startDate?: string | Date
  endDate?: string | Date
  weeks?: string | number
  recordingDates?: string[]
  note?: string
  excludeMath?: boolean
  isWithdrawn?: boolean
  withdrawnAt?: string | Date
  isTransferredOut?: boolean
  transferToId?: string | number
  timestamp?: string | number | Date
  updatedAt?: string | Date
} & Record<string, unknown>

type RegistrationAction = (row: RegistrationRow) => void

function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = getStatusLabel(status)
  const Icon =
    status === "active"
      ? CheckCircle2
      : status === "pending"
        ? Clock
        : status === "completed"
          ? TimerOff
          : HelpCircle

  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "completed"
          ? "border-zinc-200 bg-zinc-50 text-zinc-700"
          : ""

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

function stripMathExcludeLabel(value: string | null | undefined) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  return raw.replace(/\s*\(?수학 제외\)?\s*$/g, "").trim()
}

type RegistrationCardProps = {
  r: RegistrationRow
  onWithdraw?: RegistrationAction
  onRestore?: RegistrationAction
  onTransfer?: RegistrationAction
  onNote?: RegistrationAction
}

function RegistrationCard({ r, onWithdraw, onRestore, onTransfer, onNote }: RegistrationCardProps) {
  const status = getRegistrationStatus(r)
  const start = formatDateYmd(r?.startDate)
  const end = formatDateYmd(r?.endDate)
  const weeks = r?.weeks ? String(r.weeks) : ""
  const recordingCount = Array.isArray(r?.recordingDates) ? r.recordingDates.length : 0
  const courseLabel = stripMathExcludeLabel(r?.course)
  const noteText = String(r?.note || "").trim()
  const hasNote = noteText.length > 0
  const isMathExcluded =
    !!r?.excludeMath || String(r?.course || "").includes("수학 제외")
  const isWithdrawn = Boolean(r?.isWithdrawn || r?.withdrawnAt)
  const isTransferredOut = Boolean(r?.isTransferredOut || r?.transferToId)
  const canWithdraw = !isWithdrawn && !isTransferredOut
  const canTransfer = !isWithdrawn && !isTransferredOut

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-extrabold">
              {r?.name || "-"}
            </CardTitle>
            {isMathExcluded ? (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                수학 제외
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isTransferredOut ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                전반
              </Badge>
            ) : isWithdrawn ? (
              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                중도퇴원
              </Badge>
            ) : (
              <StatusBadge status={status} />
            )}
            {isWithdrawn ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-3 text-xs font-semibold"
                onClick={() => onRestore?.(r)}
              >
                복구
              </Button>
            ) : null}
            {canTransfer && onTransfer ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-3 text-xs font-semibold"
                onClick={() => onTransfer?.(r)}
              >
                전반
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-3 text-xs font-semibold"
                onClick={() => onWithdraw?.(r)}
              >
                퇴원
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {r?.name || "-"}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {courseLabel || "-"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {start && end
              ? `${start} ~ ${end}`
              : formatDateYmd(r?.startDate) || "-"}
          </span>
          {weeks ? (
            <Badge variant="secondary" className="ml-2">
              {weeks}주차
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {recordingCount ? (
            <span className="inline-flex items-center gap-1">
              <Video className="h-3.5 w-3.5" /> 녹화 {recordingCount}회
            </span>
          ) : null}
          {r?.timestamp ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatTimestampKo(r.timestamp)}
            </span>
          ) : null}
        </div>
        {typeof onNote === "function" ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between rounded-2xl border border-slate-200/70 bg-white/80 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
            onClick={() => onNote(r)}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              메모
            </span>
            <span className="text-xs">
              {hasNote ? (
                <span className="text-emerald-600">있음</span>
              ) : (
                <span className="text-muted-foreground">없음</span>
              )}
            </span>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

type RegistrationCardGridProps = {
  registrations: RegistrationRow[]
  onWithdraw?: RegistrationAction
  onRestore?: RegistrationAction
  onTransfer?: RegistrationAction
  onNote?: RegistrationAction
}

export default function RegistrationCardGrid({
  registrations,
  onWithdraw,
  onRestore,
  onTransfer,
  onNote,
}: RegistrationCardGridProps) {
  const sorted = useMemo(() => {
    const list = (registrations || []).slice()
    list.sort((a, b) => {
      const aStatus = getRegistrationStatus(a)
      const bStatus = getRegistrationStatus(b)
      const r = getStatusSortRank(aStatus) - getStatusSortRank(bStatus)
      if (r !== 0) return r

      const aStart = parseDate(a?.startDate)
      const bStart = parseDate(b?.startDate)
      if (aStart && bStart) return aStart.getTime() - bStart.getTime()
      if (aStart) return -1
      if (bStart) return 1
      return String(a?.name || "").localeCompare(String(b?.name || ""), "ko-KR")
    })
    return list
  }, [registrations])

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((r, idx) => (
        <RegistrationCard
          key={`${r.id || idx}`}
          r={r}
          onWithdraw={onWithdraw}
          onRestore={onRestore}
          onTransfer={onTransfer}
          onNote={onNote}
        />
      ))}
    </div>
  )
}
