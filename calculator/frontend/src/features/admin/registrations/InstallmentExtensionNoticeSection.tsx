import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { INSTALLMENT_BOARD_COPY as COPY } from "./installmentBoardCopy"

type InstallmentExtensionNoticeSectionProps = {
  noticePreview: string
  copyState: string
  onCopy: () => void | Promise<void>
}

export default function InstallmentExtensionNoticeSection({
  noticePreview,
  copyState,
  onCopy,
}: InstallmentExtensionNoticeSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-slate-700">{COPY.dialogNotice}</Label>
        <div className="flex items-center gap-2">
          {copyState ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {copyState}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md"
          >
            {COPY.dialogCopy}
          </Button>
        </div>
      </div>
      <Textarea
        value={noticePreview}
        readOnly
        className="min-h-[140px] rounded-xl border-slate-200/70 bg-white shadow-sm"
      />
    </div>
  )
}
