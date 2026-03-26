import { cn } from "@/lib/utils"

export function SidebarVariantTabs({
  variantTabs,
  variantFilter,
  onVariantFilterChange,
}: {
  variantTabs: Array<{ key: string; label: string; count: number }>
  variantFilter?: string
  onVariantFilterChange?: (value: string) => void
}) {
  if (!variantTabs.length || !onVariantFilterChange) return null

  return (
    <div className="border-t border-border/40 bg-slate-50/50 p-3">
      <div className="flex flex-wrap gap-1">
        {variantTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onVariantFilterChange(tab.key)}
            className={cn(
              "rounded-full border px-2 py-1 text-[10px] transition-colors",
              variantFilter === tab.key
                ? "border-slate-300 bg-white font-medium text-slate-900 shadow-sm"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-white/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
