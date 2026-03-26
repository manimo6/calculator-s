import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { COURSE_DIALOG_AUX_COPY } from "./courseDialogAuxCopy"

type CourseDialogInstallmentSectionProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

type CourseDialogRecordingSectionProps = {
  timeType: "default" | "onoff" | "dynamic"
  isRecordingAvailable: boolean
  isRecordingOnline: boolean
  isRecordingOffline: boolean
  onRecordingAvailableChange: (checked: boolean) => void
  onRecordingOnlineChange: (checked: boolean) => void
  onRecordingOfflineChange: (checked: boolean) => void
}

type CourseDialogAdditionalNoteSectionProps = {
  value: string
  onChange: (value: string) => void
}

type CourseDialogMathOptionSectionProps = {
  checked: boolean
  fee: number
  onToggle: (checked: boolean) => void
  onFeeChange: (value: number) => void
}

export function CourseDialogInstallmentSection({
  checked,
  onChange,
}: CourseDialogInstallmentSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_AUX_COPY.installmentTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_AUX_COPY.installmentDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Checkbox checked={checked} onCheckedChange={(value) => onChange(!!value)} />
          {COURSE_DIALOG_AUX_COPY.installmentLabel}
        </label>
      </CardContent>
    </Card>
  )
}

export function CourseDialogRecordingSection({
  timeType,
  isRecordingAvailable,
  isRecordingOnline,
  isRecordingOffline,
  onRecordingAvailableChange,
  onRecordingOnlineChange,
  onRecordingOfflineChange,
}: CourseDialogRecordingSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_AUX_COPY.recordingTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_AUX_COPY.recordingDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeType === "onoff" ? (
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isRecordingOnline}
                onCheckedChange={(value) => onRecordingOnlineChange(!!value)}
              />
              {COURSE_DIALOG_AUX_COPY.onlineLabel}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isRecordingOffline}
                onCheckedChange={(value) => onRecordingOfflineChange(!!value)}
              />
              {COURSE_DIALOG_AUX_COPY.offlineLabel}
            </label>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isRecordingAvailable}
              onCheckedChange={(value) => onRecordingAvailableChange(!!value)}
            />
            {COURSE_DIALOG_AUX_COPY.recordingAvailableLabel}
          </label>
        )}
      </CardContent>
    </Card>
  )
}

export function CourseDialogAdditionalNoteSection({
  value,
  onChange,
}: CourseDialogAdditionalNoteSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_AUX_COPY.additionalNoteTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_AUX_COPY.additionalNoteDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          id="courseCustomNote"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={COURSE_DIALOG_AUX_COPY.additionalNotePlaceholder}
          className="min-h-[120px]"
        />
      </CardContent>
    </Card>
  )
}

export function CourseDialogMathOptionSection({
  checked,
  fee,
  onToggle,
  onFeeChange,
}: CourseDialogMathOptionSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_AUX_COPY.mathOptionTitle}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_AUX_COPY.mathOptionDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Checkbox checked={checked} onCheckedChange={(value) => onToggle(!!value)} />
          {COURSE_DIALOG_AUX_COPY.mathOptionToggleLabel}
        </label>
        {checked ? (
          <Input
            type="number"
            value={fee}
            onChange={(e) => onFeeChange(parseInt(e.target.value) || 0)}
            placeholder={COURSE_DIALOG_AUX_COPY.mathOptionPlaceholder}
            className="max-w-[240px]"
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
