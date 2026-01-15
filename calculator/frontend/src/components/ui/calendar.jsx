
import React from "react"
import "dayjs/locale/ko"
import { MantineProvider } from "@mantine/core"
import { DatePicker, DatesProvider, MonthPicker } from "@mantine/dates"

import { cn } from "@/lib/utils"

const getPickerType = (mode) => {
    if (mode === "range") return "range"
    if (mode === "multiple") return "multiple"
    return "default"
}

const toDateString = (value) => {
    if (!value) return null
    if (typeof value === "string") return value
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const toDateValue = (value) => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value !== "string") return null
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
}

const createExcludeDate = (disabled) => {
    if (!disabled) return undefined
    if (typeof disabled === "function") {
        return (date) => {
            const parsed = toDateValue(date)
            if (!parsed) return false
            return disabled(parsed)
        }
    }
    if (disabled?.dayOfWeek && Array.isArray(disabled.dayOfWeek)) {
        return (date) => {
            const parsed = toDateValue(date)
            if (!parsed) return false
            return disabled.dayOfWeek.includes(parsed.getDay())
        }
    }
    return undefined
}

export function Calendar({
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
    ...props
}) {
    const type = getPickerType(mode)
    const value = type === "default" ? toDateString(selected) : selected
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

    const handleChange = (next) => {
        if (!onSelect) return
        if (type === "default") {
            const date = toDateValue(next)
            onSelect(date ?? undefined)
            return
        }
        onSelect(next)
    }

    const handleDayProps = (date) => {
        const base = (typeof getDayProps === "function" ? getDayProps(date) : null) || {}
        const parsed = toDateValue(date)
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
                            {...props}
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
                            {...props}
                        />
                    )}
                </DatesProvider>
            </MantineProvider>
        </div>
    )
}
