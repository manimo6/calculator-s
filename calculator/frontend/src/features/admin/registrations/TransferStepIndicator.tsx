import { Check } from "lucide-react"

export function TransferStepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number
  currentStep: number
  label: string
}) {
  const isComplete = currentStep > step
  const isActive = currentStep === step

  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
        isComplete
          ? "bg-indigo-500 text-white"
          : isActive
            ? "bg-indigo-500 text-white ring-4 ring-indigo-100"
            : "bg-slate-100 text-slate-400"
      }`}>
        {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={`text-xs font-medium transition-colors ${
        isActive ? "text-slate-900" : isComplete ? "text-slate-600" : "text-slate-400"
      }`}>
        {label}
      </span>
    </div>
  )
}
