import * as React from "react"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef(
  (
    {
      className,
      checked,
      defaultChecked = false,
      disabled = false,
      onCheckedChange,
      onClick,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      Boolean(defaultChecked)
    )
    const isControlled = typeof checked === "boolean"
    const currentChecked = isControlled ? checked : internalChecked

    const toggle = () => {
      if (disabled) return
      const next = !currentChecked
      if (!isControlled) setInternalChecked(next)
      if (typeof onCheckedChange === "function") onCheckedChange(next)
    }

    const handleClick = (event) => {
      if (typeof onClick === "function") onClick(event)
      if (event.defaultPrevented) return
      toggle()
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={currentChecked}
        data-state={currentChecked ? "checked" : "unchecked"}
        className={cn(
          "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border/60 bg-muted/40 p-[3px] transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-emerald-500/70 data-[state=checked]:bg-emerald-500/80",
          className
        )}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        <span
          data-state={currentChecked ? "checked" : "unchecked"}
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_6px_12px_-6px_rgba(0,0,0,0.45)] ring-0 transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
