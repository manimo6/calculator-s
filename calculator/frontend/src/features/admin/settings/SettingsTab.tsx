import React from "react"

import { Button } from "@/components/ui/button"

import CalendarRangeCard from "./CalendarRangeCard"
import { useSettings } from "./useSettings"

export default function SettingsTab() {
  const {
    loading,
    saving,
    error,
    message,
    minMonth,
    maxMonth,
    setMinMonth,
    setMaxMonth,
    load,
    save,
  } = useSettings()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">설정</h2>
          <p className="mt-1 text-sm text-muted-foreground">개인 설정입니다.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={load}
          disabled={loading || saving}
        >
          새로고침
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      <CalendarRangeCard
        loading={loading}
        saving={saving}
        minMonth={minMonth}
        maxMonth={maxMonth}
        onMinMonthChange={setMinMonth}
        onMaxMonthChange={setMaxMonth}
        onSave={save}
      />
    </div>
  )
}

