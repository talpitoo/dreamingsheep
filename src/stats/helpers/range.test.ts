import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import moment from "moment"
import { isCompleteCustomRange, resolveChartWindow, resolveRangeBounds } from "./range"

const NOW = new Date(2026, 6, 2, 12, 0, 0) // Thu Jul 2 2026
const day = (m: moment.Moment) => m.format("YYYY-MM-DD")

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe("isCompleteCustomRange", () => {
  it("requires both ends", () => {
    expect(isCompleteCustomRange(null)).toBe(false)
    expect(isCompleteCustomRange({ from: "2026-01-01", to: "" })).toBe(false)
    expect(isCompleteCustomRange({ from: "", to: "2026-01-01" })).toBe(false)
    expect(isCompleteCustomRange({ from: "2026-01-01", to: "2026-02-01" })).toBe(true)
  })
})

describe("resolveRangeBounds", () => {
  it("returns null (no bound) for the all range", () => {
    expect(resolveRangeBounds("all")).toBeNull()
  })

  it("presets go back N days from today and up to tomorrow", () => {
    const week = resolveRangeBounds("week")!
    // week = 6 days back
    expect(week.gte).toBe(moment(NOW).startOf("day").subtract(6, "days").toISOString())
    expect(week.lte).toBe(moment(NOW).startOf("day").add(1, "days").toISOString())
  })

  it("custom uses the picked [from, to] inclusive of the whole 'to' day", () => {
    const bounds = resolveRangeBounds("custom", { from: "2026-06-01", to: "2026-06-10" })!
    expect(bounds.gte).toBe(moment("2026-06-01").startOf("day").toISOString())
    // lte is the START of the day after 'to', so the whole 'to' day is included
    expect(bounds.lte).toBe(moment("2026-06-11").startOf("day").toISOString())
  })

  it("incomplete custom falls back to the default (month) range", () => {
    expect(resolveRangeBounds("custom", { from: "2026-06-01", to: "" })).toEqual(
      resolveRangeBounds("month")
    )
    expect(resolveRangeBounds("custom", null)).toEqual(resolveRangeBounds("month"))
  })
})

describe("resolveChartWindow", () => {
  const earliest = moment("2026-01-01")

  it("presets end today and start N days back", () => {
    const { start, end } = resolveChartWindow("week", null, earliest)
    expect(day(end)).toBe(day(moment(NOW)))
    expect(day(start)).toBe(day(moment(NOW).subtract(6, "days")))
  })

  it("all starts one day before the earliest data (parity with the old logic)", () => {
    const { start, end } = resolveChartWindow("all", null, earliest)
    expect(day(end)).toBe(day(moment(NOW)))
    // old code: subtractDays = today.diff(earliest) + 1  ->  start = earliest - 1 day
    const expected = moment(NOW)
      .startOf("day")
      .subtract(moment(NOW).startOf("day").diff(earliest, "days") + 1, "days")
    expect(day(start)).toBe(day(expected))
  })

  it("custom spans exactly [from, to]", () => {
    const { start, end } = resolveChartWindow(
      "custom",
      { from: "2026-06-01", to: "2026-06-10" },
      earliest
    )
    expect(day(start)).toBe("2026-06-01")
    expect(day(end)).toBe("2026-06-10")
  })

  it("incomplete custom falls back to the default (month) window", () => {
    const fallback = resolveChartWindow("month", null, earliest)
    const incomplete = resolveChartWindow("custom", { from: "2026-06-01", to: "" }, earliest)
    expect(day(incomplete.start)).toBe(day(fallback.start))
    expect(day(incomplete.end)).toBe(day(fallback.end))
  })
})
