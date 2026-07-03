export type Range = "day" | "week" | "month" | "3months" | "6months" | "1year" | "all"

// sessionStorage keys: remembered per browser tab/session, clean slate on a fresh visit
export const STATS_RANGE_STORAGE_KEY = "dreamingsheep.stats.range"
export const ADVANCED_STATS_FILTERS_STORAGE_KEY = "dreamingsheep.stats.advancedFilters"
export const ADVANCED_STATS_PANEL_STORAGE_KEY = "dreamingsheep.stats.advancedPanel"
export const SLEEP_CHART_STYLE_STORAGE_KEY = "dreamingsheep.stats.sleepChartStyle"

// days to subtract from "today"; null = no lower bound (all time)
export const RANGE_TO_DAYS: Record<Range, number | null> = {
  day: 0,
  week: 6,
  month: 31,
  "3months": 91,
  "6months": 182,
  "1year": 365,
  all: null,
}

export const RANGE_BUTTONS: { value: Range; label: string; shortLabel: string }[] = [
  { value: "day", label: "day", shortLabel: "day" },
  { value: "week", label: "week", shortLabel: "week" },
  { value: "month", label: "month", shortLabel: "month" },
  { value: "3months", label: "3 months", shortLabel: "3m" },
  { value: "6months", label: "6 months", shortLabel: "6m" },
  { value: "1year", label: "1 year", shortLabel: "1y" },
  { value: "all", label: "all", shortLabel: "all" },
]
