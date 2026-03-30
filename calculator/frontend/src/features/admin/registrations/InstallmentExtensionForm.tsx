import type { ChangeEvent } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"
import type { InstallmentRow } from "./installmentBoardModel"

type InstallmentExtensionFormProps = {
  selectedRow: InstallmentRow
  extendWeeks: number
  extendFee: string
  extensionEndDate: string
  weeklyFee: number
  savedDiscount: number
  effectiveFee: number | string
  onExtendWeeksChange: (value: number) => void
  onExtendFeeChange: (value: string) => void
}

export default function InstallmentExtensionForm({
  selectedRow,
  extendWeeks,
  extendFee,
  extensionEndDate,
  weeklyFee,
  savedDiscount,
  effectiveFee,
  onExtendWeeksChange,
  onExtendFeeChange,
}: InstallmentExtensionFormProps) {
  const hasAutoFee = weeklyFee > 0
  const autoFeeDisplay = typeof effectiveFee === "number"
    ? effectiveFee.toLocaleString() + "원"
    : String(effectiveFee || 0) + "원"
  const discountLabel = savedDiscount > 0
    ? `${Math.round(savedDiscount * 100)}%할인`
    : ""
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="extendWeeks" className="text-xs font-semibold text-slate-500">
            {COPY.dialogExtendWeeks}
            <span className="ml-1 font-normal text-slate-400">
              ({COPY.dialogMaxPrefix} {selectedRow.remainingWeeks}{COPY.weekSuffix})
            </span>
          </Label>
          <Input
            id="extendWeeks"
            type="number"
            min={1}
            max={selectedRow.remainingWeeks}
            value={extendWeeks}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = Number(e.target.value) || 0
              onExtendWeeksChange(Math.min(value, selectedRow.remainingWeeks))
            }}
            className="h-10 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="extendFee" className="text-xs font-semibold text-slate-500">
            {COPY.dialogExtendFee}
            {hasAutoFee ? (
              <span className="ml-1 font-normal text-slate-400">
                (주당 {weeklyFee.toLocaleString()}원{discountLabel ? ` · ${discountLabel}` : ""})
              </span>
            ) : null}
          </Label>
          {hasAutoFee ? (
            <div className="flex h-10 items-center rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-3 text-sm font-semibold text-emerald-700">
              {autoFeeDisplay}
            </div>
          ) : (
            <Input
              id="extendFee"
              value={extendFee}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onExtendFeeChange(e.target.value)}
              placeholder={COPY.dialogCurrencyPlaceholder}
              className="h-10 rounded-xl border-slate-200/70 bg-white shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-emerald-500"
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 px-4 py-3 shadow-sm">
        <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {COPY.dialogEndDate}
          </span>
          <span className="text-sm font-bold text-slate-900">{extensionEndDate || "-"}</span>
        </div>
      </div>
    </div>
  )
}
