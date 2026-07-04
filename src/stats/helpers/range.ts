import moment from "moment"

export type Range = "day" | "week" | "month" | "custom" | "all"

// a user-picked [from, to] window (yyyy-MM-dd), used when range === "custom"
export interface CustomRange {
  from: string
  to: string
}

// sessionStorage keys: remembered per browser tab/session, clean slate on a fresh visit
export const STATS_RANGE_STORAGE_KEY = "dreamingsheep.stats.range"
export const STATS_CUSTOM_RANGE_STORAGE_KEY = "dreamingsheep.stats.customRange"
export const ADVANCED_STATS_FILTERS_STORAGE_KEY = "dreamingsheep.stats.advancedFilters"
export const ADVANCED_STATS_PANEL_STORAGE_KEY = "dreamingsheep.stats.advancedPanel"
export const SLEEP_CHART_STYLE_STORAGE_KEY = "dreamingsheep.stats.sleepChartStyle"

export const DEFAULT_RANGE: Range = "month"

// days to subtract from "today" for the preset ranges; null = no lower bound (all time).
// "custom" is resolved from its {from, to} window, not from here.
export const RANGE_TO_DAYS: Record<Exclude<Range, "custom">, number | null> = {
  day: 0,
  week: 6,
  month: 31,
  all: null,
}

// the preset toggle buttons, in display order; the "custom" (from–to) toggle is
// rendered separately by the Stats page because its label is the chosen span
export const RANGE_BUTTONS: {
  value: Exclude<Range, "custom">
  label: string
  shortLabel: string
}[] = [
  { value: "day", label: "day", shortLabel: "day" },
  { value: "week", label: "week", shortLabel: "week" },
  { value: "month", label: "month", shortLabel: "month" },
  { value: "all", label: "all", shortLabel: "all" },
]

const startOfDay = (value: moment.MomentInput) =>
  moment(value).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

export function isCompleteCustomRange(custom?: CustomRange | null): custom is CustomRange {
  return !!custom && !!custom.from && !!custom.to
}

// inclusive day-level [start, end] moments for the chart zero-fill loops.
// `earliest` is the earliest data point (used only for the "all" range).
// Preset math is byte-identical to the old inline logic (end = today, go back N days).
export function resolveChartWindow(
  range: Range,
  custom: CustomRange | null | undefined,
  earliest: moment.Moment
): { start: moment.Moment; end: moment.Moment } {
  const today = startOfDay(moment())
  if (range === "custom" && isCompleteCustomRange(custom)) {
    return { start: startOfDay(custom.from), end: startOfDay(custom.to) }
  }
  // incomplete custom falls back to the default preset so charts never break
  const preset = range === "custom" ? DEFAULT_RANGE : range
  const subtractDays = RANGE_TO_DAYS[preset] ?? today.diff(earliest, "days") + 1
  return { start: today.clone().subtract(subtractDays, "days"), end: today }
}

// ISO {gte, lte} bounds for the dreamAt/sleepingAt query filter, or null for no
// bound ("all"). Preset bounds match the old inline query math exactly.
export function resolveRangeBounds(
  range: Range,
  custom?: CustomRange | null
): { gte: string; lte: string } | null {
  if (range === "all") return null
  if (range === "custom") {
    if (!isCompleteCustomRange(custom)) return resolveRangeBounds(DEFAULT_RANGE)
    return {
      gte: startOfDay(custom.from).toISOString(),
      lte: startOfDay(custom.to).add(1, "days").toISOString(),
    }
  }
  const today = startOfDay(moment())
  return {
    gte: today.clone().subtract(RANGE_TO_DAYS[range]!, "days").toISOString(),
    lte: today.clone().add(1, "days").toISOString(),
  }
}
