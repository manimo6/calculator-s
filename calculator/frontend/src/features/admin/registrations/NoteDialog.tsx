import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { NOTE_COPY } from "./noteCopy"

type RegistrationRow = {
  name?: string
  course?: string
} & Record<string, unknown>

type NoteDialogProps = {
  open: boolean
  onClose: () => void
  target: RegistrationRow | null
  value: string
  onValueChange: (value: string) => void
  updatedAtLabel: string
  error: string
  saving: boolean
  onSave: () => void
}

export default function NoteDialog({
  open,
  onClose,
  target,
  value,
  onValueChange,
  updatedAtLabel,
  error,
  saving,
  onSave,
}: NoteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-xl border-white/60 bg-white/80 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl ring-1 ring-slate-200/60 sm:rounded-[28px]">
        <DialogHeader>
          <DialogTitle>{NOTE_COPY.dialogTitle}</DialogTitle>
          <DialogDescription>
            {NOTE_COPY.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {NOTE_COPY.studentLabel}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {target?.name || "-"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {NOTE_COPY.courseLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {target?.course || "-"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center rounded-full bg-slate-100/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {NOTE_COPY.badge}
                </span>
                {updatedAtLabel ? (
                  <span>
                    {NOTE_COPY.updatedPrefix} {updatedAtLabel}
                  </span>
                ) : (
                  <span>{NOTE_COPY.newMemo}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteContent" className="text-sm font-semibold text-slate-700">
                {NOTE_COPY.textareaLabel}
              </Label>
              <Textarea
                id="noteContent"
                value={value}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onValueChange(event.target.value)
                }
                className="min-h-[180px] resize-none rounded-2xl border border-slate-200/70 bg-white/80 shadow-inner shadow-slate-200/30 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300"
                placeholder={NOTE_COPY.textareaPlaceholder}
              />
              <div className="text-xs text-slate-400">
                {NOTE_COPY.helperText}
              </div>
            </div>
            {error ? (
              <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {NOTE_COPY.emptyTarget}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-full px-6"
          >
            {NOTE_COPY.cancel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !target}
            className="rounded-full bg-slate-900 px-6 text-white shadow-sm transition hover:bg-slate-800"
          >
            {NOTE_COPY.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
