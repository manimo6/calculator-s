import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type MergeErrorDialogProps = {
  mergeError: string
  onClose: () => void
}

export default function MergeErrorDialog({
  mergeError,
  onClose,
}: MergeErrorDialogProps) {
  return (
    <Dialog open={!!mergeError} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm border-none bg-white/90 p-0 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:rounded-3xl [&>button]:hidden">
        <div className="flex flex-col items-center px-7 pt-8 pb-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-base font-bold text-slate-800">
              {"\uD569\uBC18 \uC800\uC7A5 \uC624\uB958"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-slate-500">
              {mergeError}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="border-t border-slate-100 px-7 py-4">
          <Button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-slate-700 hover:to-slate-600 hover:shadow-lg"
          >
            {"\uD655\uC778"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
