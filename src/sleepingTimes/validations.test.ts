import { describe, expect, it } from "vitest"
import { CreateSleepingTime, UpdateSleepingTime } from "./validations"

describe("CreateSleepingTime / UpdateSleepingTime", () => {
  it("requires sleepingAt but lets bedtime/wakeUpTime be null, absent or set independently", () => {
    expect(CreateSleepingTime.safeParse({ sleepingAt: "2026-07-02T12:00:00Z" }).success).toBe(true)
    expect(
      CreateSleepingTime.safeParse({
        sleepingAt: "2026-07-02T12:00:00Z",
        bedtime: "2026-07-02T23:00:00Z",
        wakeUpTime: null,
      }).success
    ).toBe(true)
    expect(CreateSleepingTime.safeParse({ bedtime: "2026-07-02T23:00:00Z" }).success).toBe(false)
  })

  it("update requires a numeric id", () => {
    expect(
      UpdateSleepingTime.safeParse({ id: 1, sleepingAt: "2026-07-02T12:00:00Z" }).success
    ).toBe(true)
    expect(
      UpdateSleepingTime.safeParse({ id: "1", sleepingAt: "2026-07-02T12:00:00Z" }).success
    ).toBe(false)
  })
})
