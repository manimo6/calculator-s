import { Badge } from "@/components/ui/badge"

import { REGISTRATIONS_PANEL_COPY as COPY } from "./registrationsPanelCopy"

export function RegistrationsConfigRequiredState() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 text-center text-muted-foreground">
      <div className="rounded-full bg-slate-100 p-6">
        <Badge variant="outline" className="scale-150 border-slate-200">
          {COPY.configRequiredBadge}
        </Badge>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{COPY.configRequiredTitle}</h3>
        <p className="mt-1 text-sm">{COPY.configRequiredDescription}</p>
      </div>
    </div>
  )
}

export function RegistrationsLoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
    </div>
  )
}

export function RegistrationsInlineState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
