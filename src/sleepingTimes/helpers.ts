import { DateTime } from "luxon"

// Night-anchoring cutoff (spec: docs/superpowers/specs/2026-08-09-sleep-night-anchoring-design.md):
// a bedtime "now" press before noon means you're up past midnight — the night
// belongs to the previous calendar day's row.
export const BEDTIME_NIGHT_CUTOFF_HOUR = 12

// The journal day (local-midnight ISO, same shape as the dreams page's
// currentDate) whose night a bedtime "now" press belongs to.
export function bedtimeNightTarget(now: Date): string | null {
  const clock = DateTime.fromJSDate(now)
  const day = clock.hour < BEDTIME_NIGHT_CUTOFF_HOUR ? clock.minus({ days: 1 }) : clock
  return day.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISO()
}
