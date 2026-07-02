import moment from "moment"
import { SleepingTime } from "db"
import { Range, RANGE_TO_DAYS } from "src/stats/helpers/range"

export type SleepChartStyle = "bars" | "band"

// hours since midnight, fractional (23:30 -> 23.5)
function toHours(date: Date) {
  const m = moment(date)
  return m.hours() + m.minutes() / 60
}

// evening bedtimes count as negative offsets from midnight so a 23:00 -> 07:00
// night renders as one continuous vertical span; a "vampire" 09:00 -> 17:00
// sleep simply sits above the midnight line
function normalizeBedtime(hours: number) {
  return hours >= 18 ? hours - 24 : hours
}

export function formatClock(value: number) {
  const positive = (((Math.round(value * 60) / 60) % 24) + 24) % 24
  const hh = Math.floor(positive)
  const mm = Math.round((positive - hh) * 60)
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// One entry per day (always daily, no bucketing). Days without BOTH bedtime and
// wake-up time stay uncolored (null -> gap in the chart).
export function setSleepChartData(
  range: Range,
  sleepingTimes: SleepingTime[],
  style: SleepChartStyle
) {
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const earliestDate = sleepingTimes.reduce((earliest, sleepingTime) => {
    const sleepingDate = moment(sleepingTime.sleepingAt)
    return sleepingDate.isBefore(earliest) ? sleepingDate : earliest
  }, moment())
  const subtractDays = RANGE_TO_DAYS[range] ?? currentMoment.diff(earliestDate, "days") + 1

  const byDay: Record<string, SleepingTime> = {}
  sleepingTimes.forEach((sleepingTime) => {
    byDay[moment(sleepingTime.sleepingAt).format("YYYY-MM-DD")] = sleepingTime
  })

  const header =
    style === "bars"
      ? ["day", "low", "bedtime", "wake-up", "high", { type: "string", role: "tooltip" }]
      : [
          "day",
          "sleep",
          { role: "interval" },
          { role: "interval" },
          { type: "string", role: "tooltip" },
        ]

  const rows: any[][] = []
  let hasData = false
  let minHours = 0
  let maxHours = 9

  const cursor = currentMoment.clone().subtract(subtractDays, "days")
  while (cursor <= currentMoment) {
    const key = cursor.format("YYYY-MM-DD")
    const label = cursor.format("MMM D")
    const sleepingTime = byDay[key]

    let bed: number | null = null
    let wake: number | null = null
    if (sleepingTime?.bedtime && sleepingTime?.wakeUpTime) {
      bed = normalizeBedtime(toHours(sleepingTime.bedtime))
      wake = toHours(sleepingTime.wakeUpTime)
      // implausible ranges (wake before bed) stay uncolored instead of breaking the chart
      if (wake <= bed) {
        bed = null
        wake = null
      }
    }

    if (bed !== null && wake !== null) {
      hasData = true
      minHours = Math.min(minHours, bed)
      maxHours = Math.max(maxHours, wake)
      const tooltip = `${cursor.format("LL")}\nbedtime ${formatClock(bed)}\nwake-up ${formatClock(
        wake
      )}`
      rows.push(
        style === "bars"
          ? [label, bed, bed, wake, wake, tooltip]
          : [label, (bed + wake) / 2, bed, wake, tooltip]
      )
    } else {
      rows.push(
        style === "bars" ? [label, null, null, null, null, null] : [label, null, null, null, null]
      )
    }

    cursor.add(1, "days")
  }

  // clock ticks every 3 hours across the observed span
  const ticks: { v: number; f: string }[] = []
  for (let v = Math.floor(minHours / 3) * 3; v <= Math.ceil(maxHours / 3) * 3; v += 3) {
    ticks.push({ v, f: formatClock(v) })
  }

  return { data: [header, ...rows], ticks, hasData }
}
