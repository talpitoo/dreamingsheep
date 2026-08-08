import moment from "moment"
import { SleepingTime } from "db"
import { CustomRange, Range, resolveChartWindow } from "src/stats/helpers/range"

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

// One entry per day (always daily, no bucketing). A chart column for day D is
// the NIGHT ENDING on D: the wake-up recorded on D, paired with the matching
// bedtime. In the everyday flow the two live on different rows ("now" pressed
// at night on yesterday's journal page, wake-up this morning on today's), so
// the bedtime is resolved in this order:
//   1. day D's own bedtime before 18:00 — went to bed after midnight (or a
//      daytime sleep), recorded on the wake day itself
//   2. day D-1's evening bedtime — the 95% case (split rows)
//   3. day D's own evening bedtime — legacy/backfilled same-row entries;
//      physically the previous calendar evening, rendered as a negative offset
// Nights that can't be completed (bedtime pressed but no wake-up yet, or
// vice versa) stay uncolored (null -> gap in the chart).
export function setSleepChartData(
  range: Range,
  sleepingTimes: SleepingTime[],
  style: SleepChartStyle,
  custom?: CustomRange | null
) {
  const earliestDate = sleepingTimes.reduce((earliest, sleepingTime) => {
    const sleepingDate = moment(sleepingTime.sleepingAt)
    return sleepingDate.isBefore(earliest) ? sleepingDate : earliest
  }, moment())
  const { start: windowStart, end: windowEnd } = resolveChartWindow(range, custom, earliestDate)

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

  const cursor = windowStart.clone()
  while (cursor <= windowEnd) {
    const key = cursor.format("YYYY-MM-DD")
    const previousKey = cursor.clone().subtract(1, "days").format("YYYY-MM-DD")
    const label = cursor.format("MMM D")
    const today = byDay[key]
    const yesterday = byDay[previousKey]

    let bed: number | null = null
    let wake: number | null = null
    // did the sleep start on the previous calendar day? (drives the tooltip span)
    let startedPreviousDay = false
    if (today?.wakeUpTime) {
      wake = toHours(today.wakeUpTime)
      const ownHours = today.bedtime ? toHours(today.bedtime) : null
      const previousEveningHours =
        yesterday?.bedtime && toHours(yesterday.bedtime) >= 18 ? toHours(yesterday.bedtime) : null
      if (ownHours !== null && ownHours < 18) {
        bed = ownHours // after-midnight or daytime bedtime on the wake day itself
      } else if (previousEveningHours !== null) {
        bed = previousEveningHours - 24 // yesterday evening (the split-row flow)
        startedPreviousDay = true
      } else if (ownHours !== null) {
        bed = normalizeBedtime(ownHours) // legacy same-row evening entry
        startedPreviousDay = true
      }
      // implausible ranges (wake before bed) stay uncolored instead of breaking the chart
      if (bed !== null && wake <= bed) {
        bed = null
        wake = null
      }
    }

    if (bed !== null && wake !== null) {
      hasData = true
      minHours = Math.min(minHours, bed)
      maxHours = Math.max(maxHours, wake)
      const nightLabel = startedPreviousDay
        ? `${cursor.clone().subtract(1, "days").format("MMM D")} → ${cursor.format("MMM D, YYYY")}`
        : cursor.format("LL")
      const tooltip = `${nightLabel}\nbedtime ${formatClock(bed)}\nwake-up ${formatClock(wake)}`
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
