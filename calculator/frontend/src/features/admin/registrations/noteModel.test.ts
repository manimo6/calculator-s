import { describe, expect, it } from "vitest"

import {
  getInitialNoteValue,
  getNoteSaveValidationError,
  getNoteUpdatedAtLabel,
} from "./noteModel"

describe("noteModel", () => {
  it("hydrates note text from the target registration", () => {
    expect(getInitialNoteValue({ note: "메모 내용" })).toBe("메모 내용")
    expect(getInitialNoteValue(null)).toBe("")
  })

  it("formats note updated labels through the shared timestamp formatter", () => {
    expect(getNoteUpdatedAtLabel({ noteUpdatedAt: "2026-03-24T09:15:00" })).toContain("03.24")
  })

  it("validates the note target before save", () => {
    expect(getNoteSaveValidationError({ name: "김학생" })).not.toBe("")
    expect(getNoteSaveValidationError({ id: "n1" })).toBe("")
  })
})
