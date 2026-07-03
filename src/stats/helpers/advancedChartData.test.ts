import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Dream, DreamTime, DreamType, Symbol } from "db"
import { setCalendarData, setTimeAreaData, setTypeMoodComboData } from "./advancedChartData"

const NOW = new Date(2026, 6, 2, 12, 0, 0) // Thu Jul 2 2026

const TYPE_COUNT = Object.values(DreamType).length
const TIME_COUNT = Object.values(DreamTime).length

function dream(
  daysAgo: number,
  extra: Partial<Pick<Dream, "type" | "time" | "mood">> = {}
): Dream & { symbols: Symbol[] } {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return {
    dreamAt: d,
    type: DreamType.REGULAR,
    time: DreamTime.NIGHT,
    mood: 3,
    symbols: [],
    ...extra,
  } as unknown as Dream & { symbols: Symbol[] }
}

// sums the stacked type columns of a row (row = [label, ...typeCounts, avgMood])
const rowTotal = (row: any[]) => row.slice(1, 1 + TYPE_COUNT).reduce((a, b) => a + b, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe("setTypeMoodComboData", () => {
  it("zero-fills daily buckets for short ranges and counts per day", () => {
    const [header, ...rows] = setTypeMoodComboData("week", [dream(2), dream(2), dream(0)])
    expect(header).toHaveLength(1 + TYPE_COUNT + 1) // date + one column per type + avg mood
    expect(header![0]).toBe("date")
    expect(header![header!.length - 1]).toBe("avg mood")
    expect(rows).toHaveLength(7)
    expect(rows.map(rowTotal)).toEqual([0, 0, 0, 0, 2, 0, 1])
  })

  it("stacks counts into the column of the dream's type", () => {
    const rows = setTypeMoodComboData("week", [
      dream(0, { type: DreamType.LUCID }),
      dream(0, { type: DreamType.LUCID }),
      dream(0, { type: DreamType.REGULAR }),
    ]).slice(1)
    const today = rows[rows.length - 1]!
    const typeIndex = (type: DreamType) => 1 + Object.values(DreamType).indexOf(type)
    expect(today[typeIndex(DreamType.REGULAR)]).toBe(1)
    expect(today[typeIndex(DreamType.LUCID)]).toBe(2)
  })

  it("averages mood per bucket and leaves empty buckets null", () => {
    const rows = setTypeMoodComboData("week", [dream(0, { mood: 5 }), dream(0, { mood: 2 })]).slice(
      1
    )
    const moods = rows.map((row) => row[row.length - 1])
    expect(moods.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(moods[6]).toBe(3.5)
  })

  it("buckets 3-month ranges by ISO week: Sunday and Monday land in different weeks", () => {
    // Jun 28 2026 is a Sunday (week of Mon Jun 22), Jun 29 a Monday (week of Jun 29)
    const rows = setTypeMoodComboData("3months", [dream(4), dream(3)]).slice(1)
    const nonEmpty = rows.filter((row) => rowTotal(row) > 0)
    expect(nonEmpty.map((row) => [row[0], rowTotal(row)])).toEqual([
      ["Jun 22", 1],
      ["Jun 29", 1],
    ])
  })

  it("buckets year ranges by month and aggregates within the month", () => {
    // Jul 2 minus 0/1 days stays in July; minus 40 days lands on May 23
    const rows = setTypeMoodComboData("1year", [dream(0), dream(1), dream(40)]).slice(1)
    const nonEmpty = rows.filter((row) => rowTotal(row) > 0)
    expect(nonEmpty.map((row) => [row[0], rowTotal(row)])).toEqual([
      ["May 2026", 1],
      ["Jul 2026", 2],
    ])
    expect(rows).toHaveLength(13) // 365 days back spans 13 calendar months
  })

  it("spans from the earliest dream for 'all' and stays a single bucket when empty", () => {
    // Jul 2 minus 70 days = Apr 23, so the monthly buckets span Apr..Jul
    const rows = setTypeMoodComboData("all", [dream(70), dream(0)]).slice(1)
    expect(rows).toHaveLength(4)
    expect(rows.filter((row) => rowTotal(row) > 0).map((row) => [row[0], rowTotal(row)])).toEqual([
      ["Apr 2026", 1],
      ["Jul 2026", 1],
    ])
    expect(setTypeMoodComboData("all", []).slice(1)).toHaveLength(1)
  })

  it("silently drops dreams outside the selected range instead of inventing buckets", () => {
    const rows = setTypeMoodComboData("week", [dream(30)]).slice(1)
    expect(rows).toHaveLength(7)
    expect(rows.every((row) => rowTotal(row) === 0)).toBe(true)
  })
})

describe("setTimeAreaData", () => {
  it("stacks counts into the column of the dream's time of day", () => {
    const [header, ...rows] = setTimeAreaData("week", [
      dream(0, { time: DreamTime.NIGHT }),
      dream(0, { time: DreamTime.NIGHT }),
      dream(0, { time: DreamTime.MORNING }),
    ])
    expect(header).toHaveLength(1 + TIME_COUNT)
    expect(rows).toHaveLength(7)
    const today = rows[rows.length - 1]!
    const timeIndex = (time: DreamTime) => 1 + Object.values(DreamTime).indexOf(time)
    expect(today[timeIndex(DreamTime.NIGHT)]).toBe(2)
    expect(today[timeIndex(DreamTime.MORNING)]).toBe(1)
    expect(today[timeIndex(DreamTime.EVENING)]).toBe(0)
  })
})

describe("setCalendarData", () => {
  it("emits one dated row per day with dreams, sorted ascending", () => {
    const [header, ...rows] = setCalendarData([dream(1), dream(0), dream(1)])
    expect(header).toEqual([
      { type: "date", id: "date" },
      { type: "number", id: "dreams" },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]![0]).toBeInstanceOf(Date)
    expect(rows.map((row) => row[1])).toEqual([2, 1])
    expect((rows[0]![0] as Date) < (rows[1]![0] as Date)).toBe(true)
  })

  it("returns only the header when there are no dreams", () => {
    expect(setCalendarData([])).toHaveLength(1)
  })
})
