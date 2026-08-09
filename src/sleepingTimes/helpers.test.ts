import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DateTime } from "luxon"
import { bedtimeNightTarget } from "./helpers"

// noon local time avoids DST/midnight ambiguity in date arithmetic
const NOW = new Date(2026, 7, 8, 12, 0, 0) // Sat Aug 8 2026

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

const at = (h: number, m = 0) => {
  const d = new Date(NOW)
  d.setHours(h, m, 0, 0)
  return d
}

// the dreams page builds currentDate exactly like this — formats must stay comparable
const pageStyleDay = (d: Date) =>
  DateTime.fromJSDate(d).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISO()

describe("bedtimeNightTarget", () => {
  it("an after-midnight press belongs to yesterday's night", () => {
    const yesterday = new Date(NOW)
    yesterday.setDate(yesterday.getDate() - 1)
    expect(bedtimeNightTarget(at(2, 0))).toBe(pageStyleDay(yesterday))
    expect(bedtimeNightTarget(at(0, 5))).toBe(pageStyleDay(yesterday))
    expect(bedtimeNightTarget(at(11, 55))).toBe(pageStyleDay(yesterday))
  })

  it("from noon on, the press belongs to today's night", () => {
    expect(bedtimeNightTarget(at(12, 0))).toBe(pageStyleDay(NOW))
    expect(bedtimeNightTarget(at(23, 0))).toBe(pageStyleDay(NOW))
    expect(bedtimeNightTarget(at(18, 30))).toBe(pageStyleDay(NOW))
  })

  it("returns the same ISO shape the dreams page uses for currentDate", () => {
    expect(bedtimeNightTarget(at(23, 0))).toBe(pageStyleDay(NOW))
  })
})
