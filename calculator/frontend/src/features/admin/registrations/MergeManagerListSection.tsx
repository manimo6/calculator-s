import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"

import { MERGE_MANAGER_COPY as COPY } from "./mergeManagerCopy"
import { formatMergeWeekRanges, type MergeEntry } from "./mergeManagerModel"

function MergeListEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/30 px-4 py-8 text-center">
      <svg className="mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <p className="text-sm font-medium text-slate-500">{COPY.emptyTitle}</p>
      <p className="mt-1 text-xs text-slate-400">{COPY.emptyDescription}</p>
    </div>
  )
}

export function MergeManagerListSection({
  merges,
  editingMergeId,
  onDeleteMerge,
  onToggleMergeActive,
  onEditMerge,
}: {
  merges: MergeEntry[]
  editingMergeId?: string | null
  onDeleteMerge: (id: string) => void
  onToggleMergeActive?: (id: string, isActive: boolean) => void
  onEditMerge?: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">{COPY.registeredMerges}</h3>
        {merges?.length ? (
          <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-700">
            {merges.length}개
          </Badge>
        ) : null}
      </div>

      {merges?.length ? (
        <ul className="space-y-3">
          {merges.map((merge) => (
            <li
              key={merge.id}
              className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-gradient-to-r from-white/90 to-slate-50/50 px-4 py-3.5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <Badge
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm ${
                      merge.isActive !== false
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                        : "bg-slate-400"
                    }`}
                  >
                    {merge.isActive !== false ? COPY.mergeBadge : COPY.inactiveBadge}
                  </Badge>
                  <span
                    className={`break-all font-semibold ${
                      merge.isActive !== false ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {merge.name || (merge.courses || []).join(" + ")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {COPY.applyWeeks}:{" "}
                    <span className="font-medium text-slate-700">
                      {formatMergeWeekRanges(merge.weekRanges)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {COPY.courses}:{" "}
                    <span className="font-medium text-slate-700">
                      {(merge.courses || []).join(", ")}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-9 rounded-full shadow-sm transition-all ${
                    editingMergeId === String(merge.id)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200/80 text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() =>
                    merge.id && onEditMerge ? onEditMerge(String(merge.id)) : undefined
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-9 rounded-full shadow-sm transition-all ${
                    merge.isActive !== false
                      ? "border-amber-200/80 text-amber-600 hover:bg-amber-50"
                      : "border-emerald-200/80 text-emerald-600 hover:bg-emerald-50"
                  }`}
                  onClick={() =>
                    merge.id && onToggleMergeActive
                      ? onToggleMergeActive(String(merge.id), merge.isActive === false)
                      : undefined
                  }
                >
                  {merge.isActive !== false ? COPY.deactivate : COPY.activate}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full border-rose-200/80 text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md"
                  onClick={() => (merge.id ? onDeleteMerge(String(merge.id)) : undefined)}
                >
                  {COPY.delete}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <MergeListEmptyState />
      )}
    </div>
  )
}
