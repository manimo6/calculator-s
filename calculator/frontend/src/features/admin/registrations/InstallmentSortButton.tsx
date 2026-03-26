import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import type { SortConfig, SortKey } from "./installmentBoardModel"

type InstallmentSortButtonProps = {
  label: string
  sortKey: SortKey
  sortConfig: SortConfig
  onSort: (key: SortKey) => void
  disabled?: boolean
}

function renderSortIcon(sortConfig: SortConfig, key: SortKey) {
  if (sortConfig.key !== key) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
  }
  return sortConfig.direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
  )
}

export default function InstallmentSortButton({
  label,
  sortKey,
  sortConfig,
  onSort,
  disabled = false,
}: InstallmentSortButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      disabled={disabled}
      className={`group inline-flex items-center gap-1.5 text-left text-xs font-bold uppercase tracking-wider transition-colors ${
        disabled
          ? "cursor-not-allowed text-slate-400/60"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      {disabled ? null : renderSortIcon(sortConfig, sortKey)}
    </button>
  )
}
