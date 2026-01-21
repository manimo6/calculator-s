import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ALL = "__all__"

type CategoryTabsProps = {
  categories: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

type IndicatorStyle = {
  left: number
  width: number
  opacity: number
}

export default function CategoryTabs({
  categories,
  value,
  onChange,
  disabled,
}: CategoryTabsProps) {
  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter(Boolean) : []),
    [categories]
  )
  const current = value || ALL
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    opacity: 0,
  })

  const setTabRef = useCallback((key: string) => {
    return (node: HTMLButtonElement | null) => {
      if (!node) {
        tabRefs.current.delete(key)
        return
      }
      tabRefs.current.set(key, node)
    }
  }, [])

  const updateIndicator = useCallback(() => {
    const activeTab = tabRefs.current.get(current)
    if (!activeTab) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    const { offsetLeft, offsetWidth } = activeTab
    setIndicatorStyle({
      left: offsetLeft,
      width: offsetWidth,
      opacity: 1,
    })
  }, [current])

  useLayoutEffect(() => {
    const raf = window.requestAnimationFrame(updateIndicator)
    return () => window.cancelAnimationFrame(raf)
  }, [updateIndicator, safeCategories.length])

  useLayoutEffect(() => {
    const handleResize = () => updateIndicator()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateIndicator])

  return (
    <div className="w-full">
      <Tabs
        value={current}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
      >
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="relative w-max justify-start rounded-full bg-muted/40 p-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-0 rounded-full border border-white/40 bg-white/20 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.6)] backdrop-blur-lg transition-[transform,width,opacity] duration-300 ease-out"
              style={{
                width: indicatorStyle.width,
                transform: `translateX(${indicatorStyle.left}px)`,
                opacity: indicatorStyle.opacity,
              }}
            />
            <TabsTrigger
              ref={setTabRef(ALL)}
              value={ALL}
              disabled={disabled}
              className="relative z-10 rounded-full px-4 text-sm font-medium text-muted-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              전체
            </TabsTrigger>
            {safeCategories.map((cat) => (
              <TabsTrigger
                key={cat}
                ref={setTabRef(cat)}
                value={cat}
                disabled={disabled}
                className="relative z-10 rounded-full px-4 text-sm font-medium text-muted-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
