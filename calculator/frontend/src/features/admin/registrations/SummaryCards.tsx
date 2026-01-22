import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CalendarRange, CheckCircle2, Clock, Users } from "lucide-react"

import { getRegistrationStatus, getStatusLabel } from "./utils"

type StatCardProps = {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass?: string
  footer?: React.ReactNode
}

function StatCard({ title, value, icon: Icon, badgeClass, footer }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-extrabold tracking-tight">{value}</div>
        {footer ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
        {badgeClass ? (
          <Badge className={badgeClass} variant="outline">
            {title}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}

type RegistrationSummary = {
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
} & Record<string, unknown>

export default function SummaryCards({ registrations }: { registrations?: RegistrationSummary[] }) {
  const stats = useMemo(() => {
    const list = registrations || []
    const counts = { total: list.length, active: 0, pending: 0, completed: 0, unknown: 0 }
    const students = new Set()
    const courses = new Set()

    for (const r of list) {
      const status = getRegistrationStatus(r)
      if (status === "active") counts.active += 1
      else if (status === "pending") counts.pending += 1
      else if (status === "completed") counts.completed += 1
      else counts.unknown += 1

      if (r?.name) students.add(String(r.name))
      if (r?.course) courses.add(String(r.course))
    }

    return { counts, students: students.size, courses: courses.size }
  }, [registrations])

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatCard
        title="총 등록"
        value={`${stats.counts.total}명`}
        icon={Users}
        footer={<span>과목 {stats.courses} · 학생 {stats.students}명</span>}
      />
      <StatCard
        title={getStatusLabel("active")}
        value={`${stats.counts.active}명`}
        icon={CheckCircle2}
        badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
      />
      <StatCard
        title={getStatusLabel("pending")}
        value={`${stats.counts.pending}명`}
        icon={Clock}
        badgeClass="border-amber-200 bg-amber-50 text-amber-800"
      />
      <StatCard
        title={getStatusLabel("completed")}
        value={`${stats.counts.completed}명`}
        icon={CalendarRange}
        badgeClass="border-zinc-200 bg-zinc-50 text-zinc-700"
      />
    </div>
  )
}
