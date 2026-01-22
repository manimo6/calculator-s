
import React from "react"
import "dayjs/locale/ko"
import { MantineProvider } from "@mantine/core"
import { DatePicker, DatesProvider, MonthPicker, type DateValue, type DatesRangeValue, type DayProps } from "@mantine/dates"

import { cn } from "@/lib/utils"

type CalendarMode = "single" | "range" | "multiple"
type CalendarPicker = "date" | "month"
type CalendarDisabled = { dayOfWeek?: number[] } | ((date: Date) => boolean)
type CalendarDayProps = Omit<Partial<DayProps>, "classNames" | "styles" | "vars"> &
    Record<`data-${string}`, string | number | boolean | undefined>

type CalendarProps = {
    className?: string
    classNames?: Record<string, string>
    showOutsideDays?: boolean
    mode?: CalendarMode
    picker?: CalendarPicker
    selected?: DateValue | DatesRangeValue<DateValue> | DateValue[]
    onSelect?: (value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => void
    disabled?: CalendarDisabled
    initialFocus?: boolean
    getDayProps?: (date: Date) => CalendarDayProps
} & Record<string, unknown>

const getPickerType = (mode?: CalendarMode) => {
    if (mode === "range") return "range"
    if (mode === "multiple") return "multiple"
    return "default"
}

const toDateString = (value: unknown) => {
    if (!value) return null
    if (typeof value === "string") return value
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const toDateValue = (value: unknown) => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value !== "string") return null
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
}

const createExcludeDate = (disabled?: CalendarDisabled) => {
    if (!disabled) return undefined
    if (typeof disabled === "function") {
        return (date: Date | string | null) => {
            const parsed = toDateValue(date)
            if (!parsed) return false
            return disabled(parsed)
        }
    }
    if (disabled?.dayOfWeek && Array.isArray(disabled.dayOfWeek)) {
        const disabledDays = disabled.dayOfWeek
        return (date: Date | string | null) => {
            const parsed = toDateValue(date)
            if (!parsed) return false
            return disabledDays.includes(parsed.getDay())
        }
    }
    return undefined
}

export function Calendar(props: CalendarProps) {
    const {
        className,
        classNames,
        showOutsideDays = true,
        mode = "single",
        picker = "date",
        selected,
        onSelect,
        disabled,
        initialFocus,
        getDayProps,
        ...rest
    } = props || {}
    const type = getPickerType(mode)
    const value = type === "default" ? toDateValue(selected) : selected
    const excludeDate = createExcludeDate(disabled)
    const rootClassName = cn(
        "relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-3 shadow-sm",
        className
    )
    const mergedClassNames = {
        ...classNames,
        datePickerRoot: cn("bg-transparent", classNames?.datePickerRoot),
        day: cn(
            "text-sm font-medium transition-colors data-[dow='0']:text-red-500 data-[dow='6']:text-blue-500 data-[outside]:text-slate-300/60 data-[disabled]:!text-slate-400 data-[disabled]:opacity-25",
            classNames?.day
        ),
        weekday: cn("text-[11px] font-semibold text-muted-foreground", classNames?.weekday),
        weekdaysRow: cn("mb-1", classNames?.weekdaysRow),
        month: cn("border-collapse", classNames?.month),
    }
    const monthClassNames = {
        ...classNames,
        calendarHeader: cn("mb-1", classNames?.calendarHeader),
        calendarHeaderLevel: cn("text-sm font-semibold", classNames?.calendarHeaderLevel),
        calendarHeaderControl: cn("text-muted-foreground hover:text-foreground", classNames?.calendarHeaderControl),
        monthsList: cn("w-full", classNames?.monthsList),
        monthsListRow: cn("text-sm", classNames?.monthsListRow),
        monthsListCell: cn("p-1", classNames?.monthsListCell),
        monthsListControl: cn(
            "rounded-lg text-sm font-medium transition-colors data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:opacity-25 hover:bg-slate-100",
            classNames?.monthsListControl
        ),
    }

    const handleChange = (next: DateValue | DatesRangeValue<DateValue> | DateValue[] | null) => {
        if (!onSelect) return
        if (type === "default") {
            const date = toDateValue(next)
            onSelect(date ?? undefined)
            return
        }
        onSelect(next ?? undefined)
    }

    const handleDayProps = (date: Date | string | null) => {
        const parsed = toDateValue(date)
        const base = (parsed && typeof getDayProps === "function" ? getDayProps(parsed) : null) || {}
        if (!parsed || base["data-dow"] != null) return base
        return { ...base, "data-dow": parsed.getDay() }
    }

    return (
        <div className={cn("mantine-calendar-root", rootClassName)}>
            <MantineProvider
                theme={{ fontFamily: "var(--font-sans)", headings: { fontFamily: "var(--font-sans)" } }}
                cssVariablesSelector=".mantine-calendar-root"
                withGlobalClasses={false}
            >
                <DatesProvider settings={{ locale: "ko", firstDayOfWeek: 0 }}>
                    {picker === "month" ? (
                        <MonthPicker
                            type={type}
                            value={value}
                            onChange={handleChange}
                            className="relative z-10"
                            classNames={monthClassNames}
                            maxLevel="year"
                            {...rest}
                        />
                    ) : (
                        <DatePicker
                            type={type}
                            value={value}
                            onChange={handleChange}
                            excludeDate={excludeDate}
                            hideOutsideDates={!showOutsideDays}
                            getDayProps={handleDayProps}
                            className="relative z-10"
                            classNames={mergedClassNames}
                            {...rest}
                        />
                    )}
                </DatesProvider>
            </MantineProvider>
        </div>
    )
}
