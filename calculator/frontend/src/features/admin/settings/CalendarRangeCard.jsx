import React, { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const parseMonthValue = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return null
  const [year, month] = raw.split("-").map(Number)
  if (!year || !month) return null
  const date = new Date(year, month - 1, 1)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatMonthValue = (date) => {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export default function CalendarRangeCard({
  loading,
  saving,
  minMonth,
  maxMonth,
  onMinMonthChange,
  onMaxMonthChange,
  onSave,
}) {
  const disabled = loading || saving
  const [minOpen, setMinOpen] = useState(false)
  const [maxOpen, setMaxOpen] = useState(false)
  const minDate = parseMonthValue(minMonth)
  const maxDate = parseMonthValue(maxMonth)

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">달력 범위 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="settingsMinMonth">시작 월</Label>
            <Popover open={minOpen} onOpenChange={setMinOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="settingsMinMonth"
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    "w-full justify-between text-left font-normal h-12 rounded-xl",
                    !minMonth && "text-muted-foreground"
                  )}
                >
                  {minMonth || "YYYY-MM"}
                  <CalendarIcon className="mr-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-none bg-transparent p-0 shadow-none"
                align="start"
              >
                <Calendar
                  mode="single"
                  picker="month"
                  selected={minDate ?? undefined}
                  onSelect={(date) => {
                    if (!date) return
                    onMinMonthChange(formatMonthValue(date))
                    setMinOpen(false)
                  }}
                  maxDate={maxDate ?? undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMinMonthChange("")}
              disabled={disabled || !minMonth}
              className="px-0 text-xs text-muted-foreground hover:text-foreground"
            >
              비우기
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settingsMaxMonth">종료 월</Label>
            <Popover open={maxOpen} onOpenChange={setMaxOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="settingsMaxMonth"
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    "w-full justify-between text-left font-normal h-12 rounded-xl",
                    !maxMonth && "text-muted-foreground"
                  )}
                >
                  {maxMonth || "YYYY-MM"}
                  <CalendarIcon className="mr-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-none bg-transparent p-0 shadow-none"
                align="start"
              >
                <Calendar
                  mode="single"
                  picker="month"
                  selected={maxDate ?? undefined}
                  onSelect={(date) => {
                    if (!date) return
                    onMaxMonthChange(formatMonthValue(date))
                    setMaxOpen(false)
                  }}
                  minDate={minDate ?? undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMaxMonthChange("")}
              disabled={disabled || !maxMonth}
              className="px-0 text-xs text-muted-foreground hover:text-foreground"
            >
              비우기
            </Button>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={onSave} disabled={disabled}>
              저장
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">* 비우면 전체 표시</div>
      </CardContent>
    </Card>
  )
}

