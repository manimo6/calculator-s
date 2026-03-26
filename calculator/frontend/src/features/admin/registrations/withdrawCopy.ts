export const WITHDRAW_COPY = {
  saveFailed: "\uD1F4\uC6D0 \uCC98\uB9AC\uAC00 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  restoreFailed: "\uD1F4\uC6D0 \uD574\uC81C\uAC00 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  dialogTitle: "\uD1F4\uC6D0 \uCC98\uB9AC",
  dialogDescription:
    "\uD1F4\uC6D0\uC77C\uC744 \uAE30\uC900\uC73C\uB85C \uC774\uD6C4 \uCD9C\uC11D \uC785\uB825\uC744 \uC81C\uD55C\uD569\uB2C8\uB2E4.",
  studentLabel: "\uD559\uC0DD",
  courseLabel: "\uACFC\uBAA9",
  withdrawDateLabel: "\uD1F4\uC6D0\uC77C",
  cancel: "\uCDE8\uC18C",
  submit: "\uD1F4\uC6D0 \uCC98\uB9AC",
  dateRequired: "\uD1F4\uC6D0\uC77C\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.",
  targetMissing: "\uD1F4\uC6D0 \uB300\uC0C1\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
  anonymousStudent: "\uC774 \uD559\uC0DD",
} as const

export function buildRestoreConfirmMessage(name: string) {
  return `${name}\uC758 \uD1F4\uC6D0 \uC0C1\uD0DC\uB97C \uD574\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`
}
