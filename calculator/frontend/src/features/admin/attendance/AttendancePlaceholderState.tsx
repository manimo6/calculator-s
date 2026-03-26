import type { LucideIcon } from "lucide-react"

type AttendancePlaceholderStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  loading?: boolean
}

export default function AttendancePlaceholderState({
  icon: Icon,
  title,
  description,
  loading = false,
}: AttendancePlaceholderStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-16 text-center">
      {loading ? (
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/50">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <p className="text-base font-medium text-slate-600">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
    </div>
  )
}
