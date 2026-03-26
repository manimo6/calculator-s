import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MERGE_MANAGER_COPY as COPY } from "./mergeManagerCopy"

function MergeHeaderIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
  )
}

export function MergeManagerShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <Card className="border-0 bg-gradient-to-br from-white/95 via-white/90 to-indigo-50/30 shadow-xl shadow-slate-200/30 backdrop-blur-xl ring-1 ring-slate-200/50">
      <CardHeader className="border-b border-slate-200/50 pb-6">
        <div className="flex items-center gap-3">
          <MergeHeaderIcon />
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">{COPY.title}</CardTitle>
            <p className="text-sm text-slate-500">{COPY.subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">{children}</CardContent>
    </Card>
  )
}
