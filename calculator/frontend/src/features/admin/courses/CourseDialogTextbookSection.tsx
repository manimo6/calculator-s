import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { TextbookState } from "./courseDialogState"
import { COURSE_DIALOG_TEXTBOOK_COPY } from "./courseDialogTextbookCopy"

type TextbookAmountKey = "defaultAmount" | "onlineAmount" | "offlineAmount"

type TextbookOptionGroupProps = {
  title?: string
  option: string
  amount: number
  onOptionChange: (value: string) => void
  onAmountChange: (value: number) => void
}

type CourseDialogTextbookSectionProps = {
  timeType: "default" | "onoff" | "dynamic"
  textbook: TextbookState
  onOptionChange: (optionKey: keyof TextbookState, amountKey: keyof TextbookState) => (value: string) => void
  onAmountChange: (key: TextbookAmountKey, value: number) => void
}

function TextbookOptionGroup({
  title,
  option,
  amount,
  onOptionChange,
  onAmountChange,
}: TextbookOptionGroupProps) {
  return (
    <div className="space-y-2">
      {title ? <Label className="text-sm font-medium">{title}</Label> : null}
      <RadioGroup
        value={option}
        onValueChange={onOptionChange}
        className="flex flex-wrap gap-4"
      >
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
          <RadioGroupItem value="none" />
          {COURSE_DIALOG_TEXTBOOK_COPY.none}
        </label>
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
          <RadioGroupItem value="tbd" />
          {COURSE_DIALOG_TEXTBOOK_COPY.tbd}
        </label>
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm">
          <RadioGroupItem value="amount" />
          {COURSE_DIALOG_TEXTBOOK_COPY.amount}
        </label>
      </RadioGroup>
      {option === "amount" ? (
        <Input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(parseInt(e.target.value) || 0)}
          placeholder={COURSE_DIALOG_TEXTBOOK_COPY.amountPlaceholder}
          className="max-w-[200px]"
        />
      ) : null}
    </div>
  )
}

export function CourseDialogTextbookSection({
  timeType,
  textbook,
  onOptionChange,
  onAmountChange,
}: CourseDialogTextbookSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COURSE_DIALOG_TEXTBOOK_COPY.title}</CardTitle>
        <CardDescription>
          {COURSE_DIALOG_TEXTBOOK_COPY.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {timeType === "onoff" ? (
          <div className="space-y-4">
            <TextbookOptionGroup
              title={COURSE_DIALOG_TEXTBOOK_COPY.onlineLabel}
              option={textbook.onlineOption}
              amount={textbook.onlineAmount}
              onOptionChange={onOptionChange("onlineOption", "onlineAmount")}
              onAmountChange={(value) => onAmountChange("onlineAmount", value)}
            />
            <TextbookOptionGroup
              title={COURSE_DIALOG_TEXTBOOK_COPY.offlineLabel}
              option={textbook.offlineOption}
              amount={textbook.offlineAmount}
              onOptionChange={onOptionChange("offlineOption", "offlineAmount")}
              onAmountChange={(value) => onAmountChange("offlineAmount", value)}
            />
          </div>
        ) : (
          <TextbookOptionGroup
            option={textbook.defaultOption}
            amount={textbook.defaultAmount}
            onOptionChange={onOptionChange("defaultOption", "defaultAmount")}
            onAmountChange={(value) => onAmountChange("defaultAmount", value)}
          />
        )}
      </CardContent>
    </Card>
  )
}
