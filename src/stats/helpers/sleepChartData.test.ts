import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SleepingTime } from "db"
import { formatClock, setSleepChartData } from "./sleepChartData"

// noon local time avoids DST/midnight ambiguity in date arithmetic
const NOW = new Date(2026, 6, 2, 12, 0, 0) // Thu Jul 2 2026

function sleepingTime(
  daysAgo: number,
  bed: [number, number] | null,
  wake: [number, number] | null
) {
  const at = (h: number, m: number) => {
    const d = new Date(NOW)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(h, m, 0, 0)
    return d
  }
  return {
    sleepingAt: at(12, 0),
    bedtime: bed ? at(bed[0], bed[1]) : null,
    wakeUpTime: wake ? at(wake[0], wake[1]) : null,
  } as SleepingTime
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe("formatClock", () => {
  it("formats plain, negative (pre-midnight) and overflowing hours as clock times", () => {
    expect(formatClock(0)).toBe("00:00")
    expect(formatClock(7.25)).toBe("07:15")
    expect(formatClock(-1.5)).toBe("22:30")
    expect(formatClock(24)).toBe("00:00")
    expect(formatClock(25.75)).toBe("01:45")
  })
})

describe("setSleepChartData", () => {
  it("zero-fills one row per day of the range, oldest first", () => {
    const { data } = setSleepChartData("week", [], "bars")
    const [header, ...rows] = data
    expect(header).toHaveLength(6) // day + low/open/close/high + tooltip
    expect(rows).toHaveLength(7)
  })

  it("plots an evening bedtime as a negative offset so the night is one continuous span", () => {
    const { data } = setSleepChartData("day", [sleepingTime(0, [23, 0], [7, 15])], "bars")
    const row = data[1] as any[]
    expect(row[1]).toBe(-1) // 23:00 -> -1h
    expect(row[3]).toBe(7.25) // 07:15
    expect(row[5]).toContain("bedtime 23:00")
    expect(row[5]).toContain("wake-up 07:15")
    // an evening bedtime physically happened the previous calendar day
    expect(row[5]).toContain("→")
  })

  it("REGRESSION: pairs yesterday's evening bedtime with this morning's wake-up (split rows)", () => {
    // the everyday flow: "now" pressed at 23:40 on yesterday's journal page,
    // wake-up "now" pressed at 07:30 this morning on today's page — two rows
    const { data } = setSleepChartData(
      "week",
      [sleepingTime(1, [23, 40], null), sleepingTime(0, null, [7, 30])],
      "bars"
    )
    const rows = data.slice(1) as any[][]
    const today = rows[rows.length - 1]!
    expect(today[1]).toBeCloseTo(23 + 40 / 60 - 24) // 23:40 -> -0h20
    expect(today[3]).toBe(7.5) // 07:30
    expect(today[5]).toContain("→") // tooltip shows the night span, e.g. "Jul 1 → Jul 2"
    expect(today[5]).toContain("bedtime 23:40")
    expect(today[5]).toContain("wake-up 07:30")
    // the bed day itself has nothing to plot — the night belongs to the wake day
    const yesterday = rows[rows.length - 2]!
    expect(yesterday.slice(1)).toEqual([null, null, null, null, null])
  })

  it("prefers the wake day's own after-midnight bedtime over yesterday's evening one", () => {
    const { data } = setSleepChartData(
      "week",
      [sleepingTime(1, [23, 0], null), sleepingTime(0, [0, 30], [7, 30])],
      "bars"
    )
    const rows = data.slice(1) as any[][]
    const today = rows[rows.length - 1]!
    expect(today[1]).toBe(0.5) // bed after midnight, recorded on the wake day
    expect(today[5]).not.toContain("→") // same calendar day, no span
  })

  it("a night in progress (bedtime pressed, no wake-up yet) stays unplotted", () => {
    const result = setSleepChartData("week", [sleepingTime(0, [23, 15], null)], "bars")
    const rows = result.data.slice(1) as any[][]
    rows.forEach((row) => expect(row.slice(1)).toEqual([null, null, null, null, null]))
    expect(result.hasData).toBe(false)
  })

  it("supports the vampire: a 09:00->17:00 sleep stays above the midnight line", () => {
    const { data } = setSleepChartData("day", [sleepingTime(0, [9, 0], [17, 0])], "bars")
    const row = data[1] as any[]
    expect(row[1]).toBe(9)
    expect(row[3]).toBe(17)
  })

  it("leaves days uncolored when a night can't be completed, or the range is implausible", () => {
    const rows = setSleepChartData(
      "week",
      [
        sleepingTime(4, [22, 15], null), // bedtime only, no wake-up the next day
        sleepingTime(1, null, [7, 0]), // wake-up only, no bedtime the evening before
        sleepingTime(0, [3, 0], [2, 0]), // wake before bed (post-midnight both)
      ],
      "bars"
    ).data.slice(1) as any[][]
    // every single day of the week stays a gap (4 values + tooltip, all null)
    rows.forEach((row) => expect(row.slice(1)).toEqual([null, null, null, null, null]))
  })

  it("reports hasData=false for empty tracking so the card can show a hint instead", () => {
    expect(setSleepChartData("month", [], "bars").hasData).toBe(false)
    expect(setSleepChartData("month", [sleepingTime(1, [23, 0], null)], "bars").hasData).toBe(false)
    expect(setSleepChartData("month", [sleepingTime(1, [23, 0], [7, 0])], "bars").hasData).toBe(
      true
    )
  })

  it("band style plots the mid-sleep point with bed/wake as the interval edges", () => {
    const { data } = setSleepChartData("day", [sleepingTime(0, [22, 30], [6, 45])], "band")
    const [header, row] = data as any[]
    expect(header).toHaveLength(5) // day + mid + 2 intervals + tooltip
    expect(row[1]).toBeCloseTo((-1.5 + 6.75) / 2) // midpoint of 22:30 -> 06:45
    expect(row[2]).toBe(-1.5)
    expect(row[3]).toBe(6.75)
  })

  it("generates 3-hourly clock ticks spanning the observed extremes", () => {
    const { ticks } = setSleepChartData("day", [sleepingTime(0, [23, 30], [10, 0])], "bars")
    const values = ticks.map((tick) => tick.v)
    expect(Math.min(...values)).toBeLessThanOrEqual(-1.5)
    expect(Math.max(...values)).toBeGreaterThanOrEqual(10)
    expect(ticks.find((tick) => tick.v === 0)?.f).toBe("00:00")
    expect(ticks.find((tick) => tick.v === -3)?.f).toBe("21:00")
  })
})
