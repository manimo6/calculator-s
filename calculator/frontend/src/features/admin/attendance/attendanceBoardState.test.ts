import { describe, expect, it } from "vitest"

import {
  applyAttendanceSocketUpdates,
  buildAttendanceCellMap,
  collectAttendanceRegistrationIds,
  updateAttendanceCellStatus,
} from "./attendanceBoardState"

describe("attendanceBoardState", () => {
  it("collects current and previous chain registration ids", () => {
    expect(
      collectAttendanceRegistrationIds([
        { id: "reg-1", _prevChainRegs: [{ id: "reg-0" }] },
        { id: "reg-2" },
      ])
    ).toEqual(["reg-1", "reg-0", "reg-2"])
  })

  it("builds a nested cell map from attendance records", () => {
    expect(
      buildAttendanceCellMap([
        { registrationId: "reg-1", date: "2026-03-01", status: "present" },
        { registrationId: "reg-1", date: "2026-03-02", status: "late" },
      ])
    ).toEqual({
      "reg-1": {
        "2026-03-01": "present",
        "2026-03-02": "late",
      },
    })
  })

  it("updates and removes socket-driven cell statuses safely", () => {
    const base = {
      "reg-1": {
        "2026-03-01": "present",
      },
    }

    const changed = updateAttendanceCellStatus(base, "reg-1", "2026-03-02", "late")
    expect(changed).toEqual({
      "reg-1": {
        "2026-03-01": "present",
        "2026-03-02": "late",
      },
    })

    const socketApplied = applyAttendanceSocketUpdates(
      changed,
      [
        { registrationId: "reg-1", date: "2026-03-02", status: "recorded" },
        { registrationId: "reg-1", date: "2026-03-01", status: "pending" },
      ],
      new Set(["reg-1"]),
      "2026-03"
    )

    expect(socketApplied).toEqual({
      "reg-1": {
        "2026-03-02": "recorded",
      },
    })
  })
})
