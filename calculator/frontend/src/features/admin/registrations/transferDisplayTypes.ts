export type TransferDisplayRegistrationRow = {
  id?: string | number
  name?: string
  course?: string
  startDate?: string | Date
  endDate?: string | Date
  weeks?: string | number
  transferToId?: string | number
  transferFromId?: string | number
  isTransferredOut?: boolean
} & Record<string, unknown>

export type TransferDisplayModelRow = {
  r: TransferDisplayRegistrationRow
  start: Date | null
  end: Date | null
  status: string
  isWithdrawn: boolean
  isTransferredOut: boolean
  recordingDates: Array<string | Date>
  courseDays: number[]
  recordingWeeks: Array<{ weekIndex: number; dates: Date[] }>
  skipWeeks: number[]
  startIndex: number
  endIndex: number
  transferSegments?: TransferDisplayModelRow[]
}
