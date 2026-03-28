import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function ShadcnCalendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar bg-background p-4", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 select-none text-muted-foreground/70 hover:text-foreground aria-disabled:opacity-30",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 select-none text-muted-foreground/70 hover:text-foreground aria-disabled:opacity-30",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center px-9",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-semibold tracking-tight select-none",
          defaultClassNames.caption_label
        ),
        dropdowns: cn(
          "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-input shadow-xs",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 text-xs font-medium text-muted-foreground/60 select-none pb-1",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-9 select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-xs text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0.5 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-primary/10", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-primary/5", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-primary/10", defaultClassNames.range_end),
        today: cn(
          "font-semibold",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/30",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/30 opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(className)}
            {...props}
          />
        ),
        Chevron: ({ className, orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          ) : (
            <ChevronRightIcon className={cn("size-4", className)} {...props} />
          ),
        DayButton: ShadcnCalendarDayButton,
        Weekday: ({ className, children, ...props }) => {
          const text = String(children ?? "")
          const isSun = text.includes("일")
          const isSat = text.includes("토")
          return (
            <th
              className={cn(
                "flex-1 text-xs font-medium select-none pb-1",
                isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-muted-foreground/60",
                className
              )}
              {...props}
            >
              {children}
            </th>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function ShadcnCalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected
  const isToday = modifiers.today
  const isOutside = modifiers.outside
  const dow = day.date.getDay()
  const isSunday = dow === 0
  const isSaturday = dow === 6

  return (
    <button
      ref={ref}
      type="button"
      data-selected={isSelected || undefined}
      data-today={isToday || undefined}
      className={cn(
        "inline-flex aspect-square w-full min-w-9 items-center justify-center rounded-lg text-sm font-normal transition-all duration-150",
        "hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        isSunday && "text-red-500",
        isSaturday && "text-blue-500",
        isOutside && "!text-muted-foreground/30",
        isToday && !isSelected && "font-semibold ring-1 ring-foreground/20",
        isSelected &&
          "bg-foreground text-background font-medium shadow-sm hover:bg-foreground/85",
        className
      )}
      {...props}
    />
  )
}

export { ShadcnCalendar, ShadcnCalendarDayButton }
