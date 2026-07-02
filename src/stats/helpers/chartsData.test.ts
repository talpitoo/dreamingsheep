import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Dream, DreamTime, DreamType, RecallTime, Symbol } from "db"
import { setChartsData } from "./chartsData"

const NOW = new Date(2026, 6, 2, 12, 0, 0) // Thu Jul 2 2026

function dream(
  daysAgo: number,
  overrides: Partial<Dream & { symbols: Partial<Symbol>[] }> = {}
): Dream & { symbols: Symbol[] } {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return {
    dreamAt: d,
    mood: 3,
    time: DreamTime.NIGHT,
    type: DreamType.REGULAR,
    recall: RecallTime.N_A,
    symbols: [],
    ...overrides,
  } as unknown as Dream & { symbols: Symbol[] }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe("setChartsData", () => {
  it("handles zero dreams: zero-filled days, neutral mood 3, neutral recall 0", () => {
    const charts = setChartsData("week", [])
    expect(charts.dream.slice(1)).toHaveLength(7)
    expect(charts.mood.slice(1).every(([, mood]) => mood === 3)).toBe(true)
    expect(charts.recall.slice(1).every(([, recall]) => recall === 0)).toBe(true)
    expect(charts.symbol).toEqual([])
  })

  it("averages mood and recall per day when multiple dreams share a date", () => {
    const charts = setChartsData("week", [
      dream(1, { mood: 1, recall: RecallTime.BLURRY }),
      dream(1, { mood: 5, recall: RecallTime.CLEAR }),
    ])
    const dayLabel = (charts.dream[2] && charts.dream.slice(1).find(([, count]) => count === 2))![0]
    expect(charts.mood.slice(1).find(([label]) => label === dayLabel)![1]).toBe(3) // (1+5)/2
    expect(charts.recall.slice(1).find(([label]) => label === dayLabel)![1]).toBe(0) // (-1+1)/2
  })

  it("counts every time and type bucket, including untouched enum values", () => {
    const charts = setChartsData("week", [
      dream(0, { time: DreamTime.MORNING, type: DreamType.LUCID }),
      dream(1, { time: DreamTime.MORNING, type: DreamType.MEDITATION }),
    ])
    const timeCounts = Object.fromEntries(charts.time.slice(1).map(([key, count]) => [key, count]))
    expect(timeCounts.MORNING).toBe(2)
    expect(timeCounts.NIGHT).toBe(0)
    const typeCounts = Object.fromEntries(charts.type.slice(1).map(([key, count]) => [key, count]))
    expect(typeCounts.LUCID).toBe(1)
    expect(typeCounts.MEDITATION).toBe(1)
    expect(typeCounts.OTHER).toBe(0)
  })

  it("counts symbol usage across dreams by id, not by name", () => {
    const dao = { id: 64, name: "dao" }
    const dao2 = { id: 99, name: "dao" } // same name, different user-created symbol
    const charts = setChartsData("week", [
      dream(0, { symbols: [dao] }),
      dream(1, { symbols: [dao, dao2] }),
    ])
    expect(charts.symbol).toContainEqual({ symbol: "dao", count: 2 })
    expect(charts.symbol).toContainEqual({ symbol: "dao", count: 1 })
  })
})
