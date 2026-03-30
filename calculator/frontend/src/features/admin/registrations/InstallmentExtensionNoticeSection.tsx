import { Button } from "@/components/ui/button"
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {COPY.dialogNotice}
        </div>
        <div className="flex items-center gap-2">
          {copyState ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {copyState}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="h-8 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {COPY.dialogCopy}
          </Button>
        </div>
      </div>
      <Textarea
        value={noticePreview}
        readOnly
        className="min-h-[120px] rounded-xl border-slate-200/60 bg-slate-50/50 text-xs leading-relaxed shadow-inner"
      />
    </div>
  )
}
