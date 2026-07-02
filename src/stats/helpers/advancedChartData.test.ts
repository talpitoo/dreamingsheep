import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Dream, Symbol } from "db"
import { setAdvancedChartData } from "./advancedChartData"

const NOW = new Date(2026, 6, 2, 12, 0, 0) // Thu Jul 2 2026

function dream(daysAgo: number): Dream & { symbols: Symbol[] } {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { dreamAt: d, symbols: [] } as unknown as Dream & { symbols: Symbol[] }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe("setAdvancedChartData", () => {
  it("zero-fills daily buckets for short ranges and counts per day", () => {
    const [header, ...rows] = setAdvancedChartData("week", [dream(2), dream(2), dream(0)])
    expect(header).toEqual(["date", "dreams"])
    expect(rows).toHaveLength(7)
    expect(rows.map((row) => row[1])).toEqual([0, 0, 0, 0, 2, 0, 1])
  })

  it("buckets 3-month ranges by ISO week: Sunday and Monday land in different weeks", () => {
    // Jun 28 2026 is a Sunday (week of Mon Jun 22), Jun 29 a Monday (week of Jun 29)
    const sunday = dream(4)
    const monday = dream(3)
    const rows = setAdvancedChartData("3months", [sunday, monday]).slice(1) as [string, number][]
    const nonEmpty = rows.filter(([, count]) => count > 0)
    expect(nonEmpty).toEqual([
      ["Jun 22", 1],
      ["Jun 29", 1],
    ])
  })

  it("buckets year ranges by month and aggregates within the month", () => {
    // Jul 2 minus 0/1 days stays in July; minus 40 days lands on May 23
    const rows = setAdvancedChartData("1year", [dream(0), dream(1), dream(40)]).slice(1) as [
      string,
      number
    ][]
    const nonEmpty = rows.filter(([, count]) => count > 0)
    expect(nonEmpty).toEqual([
      ["May 2026", 1],
      ["Jul 2026", 2],
    ])
    expect(rows).toHaveLength(13) // 365 days back spans 13 calendar months
  })

  it("spans from the earliest dream for 'all' and stays a single bucket when empty", () => {
    // Jul 2 minus 70 days = Apr 23, so the monthly buckets span Apr..Jul
    const rows = setAdvancedChartData("all", [dream(70), dream(0)]).slice(1) as [string, number][]
    expect(rows).toHaveLength(4)
    expect(rows.filter(([, count]) => count > 0)).toEqual([
      ["Apr 2026", 1],
      ["Jul 2026", 1],
    ])
    expect(setAdvancedChartData("all", []).slice(1)).toHaveLength(1)
  })

  it("silently drops dreams outside the selected range instead of inventing buckets", () => {
    const rows = setAdvancedChartData("week", [dream(30)]).slice(1) as [string, number][]
    expect(rows).toHaveLength(7)
    expect(rows.every(([, count]) => count === 0)).toBe(true)
  })
})
