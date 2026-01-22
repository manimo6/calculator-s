import React, { useEffect, useReducer, useState } from "react"
import type { DateValue, DatesRangeValue } from "@mantine/dates"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"

import { type BreakRangeInput, type CourseTreeGroup, weekdayName } from "@/utils/data"

type TextbookState = {
  defaultOption: string
  defaultAmount: number
  onlineOption: string
  onlineAmount: number
  offlineOption: string
  offlineAmount: number
  customNote: string
}

type DynamicOption = { label: string; time: string }
type BreakRange = { startDate: string; endDate: string }

type CourseFormState = {
  category: string
  courseName: string
  fee: number
  textbook: TextbookState
  days: number[]
  startDays: number[]
  endDays: number[]
  minDuration: number
  maxDuration: number
  timeType: "default" | "onoff" | "dynamic"
  timeDefault: string
  timeOnline: string
  timeOffline: string
  dynamicOptions: DynamicOption[]
  isRecordingAvailable: boolean
  isRecordingOnline: boolean
  isRecordingOffline: boolean
  hasMathOption: boolean
  mathExcludedFee: number
  installmentEligible: boolean
  breakRanges: BreakRange[]
}

type CourseAction =
  | { type: "RESET"; payload: Partial<CourseFormState> }
  | { type: "SET_FIELD"; field: keyof CourseFormState; value: CourseFormState[keyof CourseFormState] }
  | { type: "SET_TEXTBOOK"; key: keyof TextbookState; value: TextbookState[keyof TextbookState] }
  | { type: "TOGGLE_DAY"; field: "days" | "startDays" | "endDays"; value: number; single?: boolean }
  | { type: "ADD_DYNAMIC_TIME" }
  | { type: "UPDATE_DYNAMIC_TIME"; index: number; key: keyof DynamicOption; value: string }
  | { type: "REMOVE_DYNAMIC_TIME"; index: number }
  | { type: "ADD_BREAK_RANGE" }
  | { type: "UPDATE_BREAK_RANGE"; index: number; key: keyof BreakRange; value: string }
  | { type: "REMOVE_BREAK_RANGE"; index: number }

type TimeData =
  | string
  | { type: "onoff"; online?: string; offline?: string }
  | { type: "dynamic"; options?: DynamicOption[] }
  | Record<string, string>

type RecordingData = boolean | { 온라인?: boolean; 오프라인?: boolean }

type CheckedState = boolean | "indeterminate"

type CourseData = {
  category?: string
  name?: string
  info?: {
    fee?: number
    textbook?: Partial<TextbookState>
    days?: number[]
    startDays?: number[]
    endDays?: number[]
    min?: number
    max?: number
    hasMathOption?: boolean
    mathExcludedFee?: number
    installmentEligible?: boolean
    breakRanges?: BreakRangeInput[]
  } & Record<string, unknown>
  timeData?: TimeData
  recording?: RecordingData
}

const initialState: CourseFormState = {
  category: "",
  courseName: "",
  fee: 0,
  textbook: {
    defaultOption: "none",
    defaultAmount: 0,
    onlineOption: "none",
    onlineAmount: 0,
    offlineOption: "none",
    offlineAmount: 0,
    customNote: "",
  },
  days: [],
  startDays: [],
  endDays: [],
  minDuration: 1,
  maxDuration: 12,
  timeType: "default", // default, onoff, dynamic
  timeDefault: "",
  timeOnline: "",
  timeOffline: "",
  dynamicOptions: [],
  isRecordingAvailable: false,
  isRecordingOnline: false,
  isRecordingOffline: false,
  hasMathOption: false,
  mathExcludedFee: 0,
  installmentEligible: false,
  breakRanges: [],
}

function parseDateYmd(value: BreakRangeInput[keyof BreakRangeInput]) {
  if (!value) return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }
  if (typeof value !== "string") return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDateYmd(date?: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function courseFormReducer(state: CourseFormState, action: CourseAction): CourseFormState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, ...action.payload }
    case "SET_FIELD":
      return { ...state, [action.field]: action.value }
    case "SET_TEXTBOOK":
      return {
        ...state,
        textbook: { ...state.textbook, [action.key]: action.value },
      }
    case "TOGGLE_DAY": {
      const list = state[action.field]
      const idx = action.value
      const single = !!action.single
      if (single) {
        return { ...state, [action.field]: [idx] }
      }
      return {
        ...state,
        [action.field]: list.includes(idx)
          ? list.filter((d) => d !== idx)
          : [...list, idx],
      }
    }
    case "ADD_DYNAMIC_TIME":
      return {
        ...state,
        dynamicOptions: [...state.dynamicOptions, { label: "", time: "" }],
      }
    case "UPDATE_DYNAMIC_TIME": {
      const newOpts = [...state.dynamicOptions]
      newOpts[action.index][action.key] = action.value
      return { ...state, dynamicOptions: newOpts }
    }
    case "REMOVE_DYNAMIC_TIME":
      return {
        ...state,
        dynamicOptions: state.dynamicOptions.filter((_, i) => i !== action.index),
      }
    case "ADD_BREAK_RANGE":
      return {
        ...state,
        breakRanges: [
          ...state.breakRanges,
          { startDate: "", endDate: "" },
        ],
      }
    case "UPDATE_BREAK_RANGE": {
      const next = [...state.breakRanges]
      next[action.index] = {
        ...next[action.index],
        [action.key]: action.value,
      }
      return { ...state, breakRanges: next }
    }
    case "REMOVE_BREAK_RANGE":
      return {
        ...state,
        breakRanges: state.breakRanges.filter((_, i) => i !== action.index),
      }
    default:
      return state
  }
}

const CATEGORY_PLACEHOLDER = "__course_category_placeholder__"

const normalizeBreakDateValue = (value: BreakRangeInput[keyof BreakRangeInput]) => {
  if (!value) return ""
  if (value instanceof Date) return formatDateYmd(value)
  return typeof value === "string" ? value : ""
}

type DayCheckboxesProps = {
  field: "days" | "startDays" | "endDays"
  state: CourseFormState
  dispatch: React.Dispatch<CourseAction>
}

function DayCheckboxes({ field, state, dispatch }: DayCheckboxesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const checked = state[field].includes(d)
        return (
          <label
            key={d}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm shadow-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                dispatch({ type: "TOGGLE_DAY", field, value: d })
              }
            />
            <span>{weekdayName[d]}</span>
          </label>
        )
      })}
    </div>
  )
}

function SingleDayCheckboxes({ field, state, dispatch }: DayCheckboxesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const checked = state[field].includes(d)
        return (
          <label
            key={d}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm shadow-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                dispatch({ type: "TOGGLE_DAY", field, value: d, single: true })
              }
            />
            <span>{weekdayName[d]}</span>
          </label>
        )
      })}
    </div>
  )
}

type CourseDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: CourseFormState, editingCourseId?: string) => boolean | void
  categories: CourseTreeGroup[]
  editingCourseId?: string
  courseData?: CourseData
}

export default function CourseDialog(props: CourseDialogProps) {
  const {
    isOpen,
    onClose,
    onSave,
    categories,
    editingCourseId,
    courseData,
  } = props || {}
  const [state, dispatch] = useReducer(courseFormReducer, initialState)
  const [breakPickerOpen, setBreakPickerOpen] = useState<string | null>(null)

  const handleTextbookOptionChange =
    (optionKey: keyof TextbookState, amountKey: keyof TextbookState) =>
    (value: string) => {
    dispatch({ type: "SET_TEXTBOOK", key: optionKey, value })
    if (value !== "amount") {
      dispatch({ type: "SET_TEXTBOOK", key: amountKey, value: 0 })
    }
  }

  useEffect(() => {
    if (!isOpen || !Array.isArray(categories) || categories.length === 0) return

    if (editingCourseId && courseData) {
      const info = courseData.info || {}
      const timeData = courseData.timeData
      const rec = courseData.recording
      const tb = info.textbook || {}
      const breakRanges = Array.isArray(info.breakRanges)
        ? info.breakRanges.map((range) => ({
            startDate: normalizeBreakDateValue(range?.startDate ?? range?.start),
            endDate: normalizeBreakDateValue(range?.endDate ?? range?.end),
          }))
        : []

      let tType: CourseFormState["timeType"] = "default"
      let tDefault = ""
      let tOnline = ""
      let tOffline = ""
      let tDynamic: DynamicOption[] = []

      if (!timeData || typeof timeData === "string") {
        tType = "default"
        tDefault = timeData || ""
      } else if (typeof timeData === "object" && timeData.type === "onoff") {
        tType = "onoff"
        tOnline = timeData.online || ""
        tOffline = timeData.offline || ""
      } else if (typeof timeData === "object" && timeData.type === "dynamic") {
        tType = "dynamic"
        tDynamic = Array.isArray(timeData.options) ? timeData.options : []
      } else if (typeof timeData === "object") {
        const timeMap = timeData as Record<string, string>
        const keys = Object.keys(timeMap)
        const hasOnOff = keys.includes("온라인") || keys.includes("오프라인")
        if (hasOnOff) {
          tType = "onoff"
          tOnline = timeMap["온라인"] || ""
          tOffline = timeMap["오프라인"] || ""
        } else {
          tType = "dynamic"
          tDynamic = keys
            .map((k) => ({ label: k, time: timeMap[k] }))
            .filter((o) => o.label)
        }
      }

      let recAvail = false
      let recOn = false
      let recOff = false
      if (typeof rec === "object" && rec !== null) {
        const recMap = rec as Record<string, boolean | undefined>
        recOn = !!recMap["온라인"]
        recOff = !!recMap["오프라인"]
      } else {
        recAvail = !!rec
      }

      dispatch({
        type: "RESET",
        payload: {
          category: courseData.category || "",
          courseName: courseData.name || "",
          fee: info.fee || 0,
          textbook: {
            defaultOption: tb.defaultOption || "none",
            defaultAmount: tb.defaultAmount || 0,
            onlineOption: tb.onlineOption || "none",
            onlineAmount: tb.onlineAmount || 0,
            offlineOption: tb.offlineOption || "none",
            offlineAmount: tb.offlineAmount || 0,
            customNote: tb.customNote || "",
          },
          days: info.days || [],
          startDays: info.startDays || [],
          endDays: Array.isArray(info.endDays) ? info.endDays.slice(0, 1) : [],
          minDuration: info.min || 1,
          maxDuration: info.max || 12,
          timeType: tType,
          timeDefault: tDefault,
          timeOnline: tOnline,
          timeOffline: tOffline,
          dynamicOptions: tDynamic,
          isRecordingAvailable: recAvail,
          isRecordingOnline: recOn,
          isRecordingOffline: recOff,
          hasMathOption: info.hasMathOption || false,
          mathExcludedFee: info.mathExcludedFee || 0,
          installmentEligible: !!info.installmentEligible,
          breakRanges,
        },
      })
    } else {
      dispatch({
        type: "RESET",
        payload: { ...initialState, category: "" },
      })
      dispatch({ type: "ADD_DYNAMIC_TIME" })
    }
  }, [categories, courseData, editingCourseId, isOpen])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const ok = onSave(state, editingCourseId)
    if (ok === false) return
    onClose()
  }

  const categoryValue = state.category || CATEGORY_PLACEHOLDER

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setBreakPickerOpen(null)
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/40 px-6 py-5 text-left">
          <DialogTitle className="text-2xl">
            {editingCourseId ? "수업 수정" : "수업 추가"}
          </DialogTitle>
          <DialogDescription>
            핵심 정보부터 옵션까지 정리해서 입력할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 no-scrollbar">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">기본 정보</CardTitle>
              <CardDescription>
                카테고리, 수업명, 수강료를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select
                    value={categoryValue}
                    onValueChange={(value) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "category",
                        value: value === CATEGORY_PLACEHOLDER ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CATEGORY_PLACEHOLDER} disabled>
                        카테고리 선택
                      </SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.cat} value={c.cat}>
                          {c.cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseName">수업 이름</Label>
                  <Input
                    id="courseName"
                    value={state.courseName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "courseName",
                        value: e.target.value,
                      })
                    }
                    placeholder="예: 겨울특강 Math"
                    required
                    disabled={Boolean(editingCourseId)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseFee">주당(Week) 수강료 (원)</Label>
                <Input
                  id="courseFee"
                  type="number"
                  value={state.fee}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "fee",
                      value: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">수강 기간</CardTitle>
              <CardDescription>
                최소/최대 주차 범위를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minDuration">최소 기간 (주)</Label>
                <Input
                  id="minDuration"
                  type="number"
                  min={1}
                  value={state.minDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "minDuration",
                      value: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDuration">최대 기간 (주)</Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min={1}
                  value={state.maxDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "maxDuration",
                      value: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">휴강 기간</CardTitle>
              <CardDescription>
                수업 전체 휴강 기간을 등록하면 종료일 계산과 출석부에 자동 반영됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.breakRanges.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  등록된 휴강 기간이 없습니다.
                </div>
              ) : null}
              {state.breakRanges.map((range, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <Popover
                    open={breakPickerOpen === `start-${index}`}
                    onOpenChange={(open) =>
                      setBreakPickerOpen(open ? `start-${index}` : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="max-w-[180px] justify-between text-left font-normal"
                      >
                        {range.startDate || "YYYY-MM-DD"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto border-none bg-transparent p-0 shadow-none"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={parseDateYmd(range.startDate)}
                        onSelect={(date: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                          const selectedDate = date instanceof Date ? date : null
                          dispatch({
                            type: "UPDATE_BREAK_RANGE",
                            index,
                            key: "startDate",
                            value: selectedDate ? formatDateYmd(selectedDate) : "",
                          })
                          setBreakPickerOpen(null)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">~</span>
                  <Popover
                    open={breakPickerOpen === `end-${index}`}
                    onOpenChange={(open) =>
                      setBreakPickerOpen(open ? `end-${index}` : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="max-w-[180px] justify-between text-left font-normal"
                      >
                        {range.endDate || "YYYY-MM-DD"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto border-none bg-transparent p-0 shadow-none"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={parseDateYmd(range.endDate)}
                        onSelect={(date: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
                          const selectedDate = date instanceof Date ? date : null
                          dispatch({
                            type: "UPDATE_BREAK_RANGE",
                            index,
                            key: "endDate",
                            value: selectedDate ? formatDateYmd(selectedDate) : "",
                          })
                          setBreakPickerOpen(null)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      dispatch({ type: "REMOVE_BREAK_RANGE", index })
                    }
                  >
                    삭제
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "ADD_BREAK_RANGE" })}
              >
                + 휴강 기간 추가
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">분납 옵션</CardTitle>
              <CardDescription>
                분납 대상 과목이면 체크하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox
                  checked={state.installmentEligible}
                  onCheckedChange={(checked: CheckedState) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "installmentEligible",
                      value: !!checked,
                    })
                  }
                />
                분납 가능 과목
              </label>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">시간 설정</CardTitle>
              <CardDescription>
                운영 방식에 맞는 시간 입력을 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">시간 설정 방식</div>
                </div>
                <RadioGroup
                  value={state.timeType}
                  onValueChange={(value) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "timeType",
                      value: value as CourseFormState["timeType"],
                    })
                  }
                  className="grid gap-2 md:grid-cols-3"
                >
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
                    <RadioGroupItem value="default" />
                    기본
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
                    <RadioGroupItem value="onoff" />
                    온라인/오프라인
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm">
                    <RadioGroupItem value="dynamic" />
                    동적 시간
                  </label>
                </RadioGroup>
              </div>

          {state.timeType === "default" ? (
            <div className="space-y-2">
              <Label htmlFor="timeDefault">수업 시간</Label>
              <Input
                id="timeDefault"
                value={state.timeDefault}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "timeDefault",
                    value: e.target.value,
                  })
                }
                placeholder="예: 09:00~12:00"
              />
            </div>
          ) : null}

          {state.timeType === "onoff" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeOnline">온라인 시간</Label>
                <Input
                  id="timeOnline"
                  value={state.timeOnline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "timeOnline",
                      value: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeOffline">오프라인 시간</Label>
                <Input
                  id="timeOffline"
                  value={state.timeOffline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "timeOffline",
                      value: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          {state.timeType === "dynamic" ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold">시간 옵션 목록</div>
              <div className="space-y-2">
                {state.dynamicOptions.map((opt, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({
                          type: "UPDATE_DYNAMIC_TIME",
                          index: i,
                          key: "label",
                          value: e.target.value,
                        })
                      }
                      placeholder="라벨"
                      className="min-w-[140px] flex-1"
                    />
                    <Input
                      value={opt.time}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({
                          type: "UPDATE_DYNAMIC_TIME",
                          index: i,
                          key: "time",
                          value: e.target.value,
                        })
                      }
                      placeholder="시간"
                      className="min-w-[200px] flex-[2]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        dispatch({ type: "REMOVE_DYNAMIC_TIME", index: i })
                      }
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "ADD_DYNAMIC_TIME" })}
              >
                + 옵션 추가
              </Button>
            </div>
          ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">요일 설정</CardTitle>
              <CardDescription>
                수업 및 시작/종료 가능 요일을 지정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold">수업 요일</div>
                <DayCheckboxes
                  field="days"
                  state={state}
                  dispatch={dispatch}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">시작 가능 요일</div>
                <DayCheckboxes
                  field="startDays"
                  state={state}
                  dispatch={dispatch}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">종료 가능 요일</div>
                <SingleDayCheckboxes
                  field="endDays"
                  state={state}
                  dispatch={dispatch}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">녹화 강의 제공</CardTitle>
              <CardDescription>
                온라인/오프라인별 녹화 제공 여부를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.timeType === "onoff" ? (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={state.isRecordingOnline}
                      onCheckedChange={(checked: CheckedState) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "isRecordingOnline",
                          value: !!checked,
                        })
                      }
                    />
                    온라인
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={state.isRecordingOffline}
                      onCheckedChange={(checked: CheckedState) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "isRecordingOffline",
                          value: !!checked,
                        })
                      }
                    />
                    오프라인
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={state.isRecordingAvailable}
                    onCheckedChange={(checked: CheckedState) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "isRecordingAvailable",
                        value: !!checked,
                      })
                    }
                  />
                  가능
                </label>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">교재비 설정</CardTitle>
              <CardDescription>
                수업 방식에 맞춰 교재비를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.timeType === "onoff" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">온라인</Label>
                    <RadioGroup
                      value={state.textbook.onlineOption}
                      onValueChange={handleTextbookOptionChange(
                        "onlineOption",
                        "onlineAmount"
                      )}
                      className="flex flex-wrap gap-4"
                    >
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="none" />
                        없음
                      </label>
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="tbd" />
                        미정
                      </label>
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="amount" />
                        금액 입력
                      </label>
                    </RadioGroup>
                    {state.textbook.onlineOption === "amount" ? (
                      <Input
                        type="number"
                        value={state.textbook.onlineAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          dispatch({
                            type: "SET_TEXTBOOK",
                            key: "onlineAmount",
                            value: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="금액(원)"
                        className="max-w-[200px]"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">오프라인</Label>
                    <RadioGroup
                      value={state.textbook.offlineOption}
                      onValueChange={handleTextbookOptionChange(
                        "offlineOption",
                        "offlineAmount"
                      )}
                      className="flex flex-wrap gap-4"
                    >
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="none" />
                        없음
                      </label>
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="tbd" />
                        미정
                      </label>
                      <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                        <RadioGroupItem value="amount" />
                        금액 입력
                      </label>
                    </RadioGroup>
                    {state.textbook.offlineOption === "amount" ? (
                      <Input
                        type="number"
                        value={state.textbook.offlineAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          dispatch({
                            type: "SET_TEXTBOOK",
                            key: "offlineAmount",
                            value: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="금액(원)"
                        className="max-w-[200px]"
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <RadioGroup
                    value={state.textbook.defaultOption}
                    onValueChange={handleTextbookOptionChange(
                      "defaultOption",
                      "defaultAmount"
                    )}
                    className="flex flex-wrap gap-4"
                  >
                    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                      <RadioGroupItem value="none" />
                      없음
                    </label>
                    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                      <RadioGroupItem value="tbd" />
                      미정
                    </label>
                    <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
                      <RadioGroupItem value="amount" />
                      금액 입력
                    </label>
                  </RadioGroup>
                  {state.textbook.defaultOption === "amount" ? (
                    <Input
                      type="number"
                      value={state.textbook.defaultAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({
                          type: "SET_TEXTBOOK",
                          key: "defaultAmount",
                          value: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="금액(원)"
                      className="max-w-[200px]"
                    />
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">안내문 추가 문구</CardTitle>
              <CardDescription>
                수강생에게 전달할 문구를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="courseCustomNote"
                value={state.textbook.customNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  dispatch({
                    type: "SET_TEXTBOOK",
                    key: "customNote",
                    value: e.target.value,
                  })
                }
                placeholder="추가 안내문을 입력하세요"
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SAT 수학 제외 옵션</CardTitle>
              <CardDescription>
                SAT 수학 제외 선택과 주당 수강료를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox
                  checked={state.hasMathOption}
                  onCheckedChange={(checked: CheckedState) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "hasMathOption",
                      value: !!checked,
                    })
                  }
                />
                SAT 수학 제외 옵션 제공
              </label>
              {state.hasMathOption ? (
                <Input
                  type="number"
                  value={state.mathExcludedFee}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "mathExcludedFee",
                      value: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="SAT 수학 제외 주당 수강료(원)"
                  className="max-w-[240px]"
                />
              ) : null}
            </CardContent>
          </Card>

          </div>

          <DialogFooter className="border-t bg-muted/40 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">확인</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
