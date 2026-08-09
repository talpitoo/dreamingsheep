# Sleep tracking: night-anchored rows (design spec)

- **Date**: 2026-08-09 · **Status**: approved (maintainer), small feature
- **Context**: follow-up to the v4.0.0 sleep-chart pairing fix, which anchored on
  _clock time_ (yesterday's bedtime only counted if ≥ 18:00). The maintainer's
  actual convention — and the only data that exists, single tracked user — is
  **row-anchored**: after-midnight bedtimes are manually entered on the
  _previous_ day's page.

## The model

**A `SleepingTime` row for day N describes the night N → N+1**:

- `row N.bedtime` = when that night started — `23:00` (before midnight) or
  `02:00` (after midnight of N's night, i.e. physically N+1 02:00). The clock
  value never changes which night it belongs to; the row does.
- `row N+1.wakeUpTime` = when that night ended.
- One row per day ⇒ one night per row ⇒ **no collisions** (the flaw of
  clock-anchoring: day N+1's single bedtime slot would need to hold both the
  2 AM value of night N and the 23:00 value of night N+1).

## Form behavior (`SleepingTimeForm`)

- **"now" button on bedtime**: the target night derives from the _clock_, not
  the viewed page — local hour **< 12:00** ⇒ the night of `clockDate − 1 day`;
  otherwise the night of `clockDate`. When the target differs from the viewed
  day, the value is written to the target day's row (create-or-update,
  overwrite-latest-wins) and a self-dismissing toast explains:

  > 🌙 after midnight — saved as **Aug 7**'s bedtime

  The viewed day's field is left untouched in that case.

- **Picker-typed values**: always write to the _viewed_ day's row, never
  shifted — deliberate backfilling (including typing `02:00` on yesterday's
  page) is respected as-is.
- **"now" on wake-up**: unchanged (the true morning is the viewed today).

## Chart pairing (`sleepChartData`)

For the column of wake-day D (`row D.wakeUpTime` required, else gap):

1. `row D−1.bedtime` if present — **any clock value** (≥ 18:00 renders as a
   negative offset before midnight; < 18:00 renders positive, after midnight).
   Tooltip shows the night span ("Aug 7 → Aug 8").
2. else `row D.bedtime` (legacy backfilled same-row pairs and same-day
   daytime sleeps): ≥ 18:00 renders negative with a span tooltip; < 18:00
   renders positive with a single-date tooltip.
3. The implausibility guard stays: `wake ≤ bed` ⇒ uncolored gap.

Incomplete nights (either half missing) stay gaps, both directions.

## Accepted limits (unchanged scope)

- One sleep episode per day: separate naps + night sleep can't coexist
  (schema has one slot). Nap-only days still plot; a nap on a day whose
  bedtime slot is needed for the night loses to the night.
- Night-shift patterns aren't modeled — though morning bedtimes (e.g. 09:00
  after a night shift) accidentally pair correctly under rule 1.
- Timezone: clock times are read in the viewer's local zone (pre-existing).

## Release note draft (next minor, e.g. v4.1.0)

> 🌙 **the sleep tracker now thinks in nights, not calendar days** — pressing
> "now" for a bedtime after midnight files it to the evening it belongs to
> (with a little toast telling you so), and the stats chart pairs every
> bedtime with the following morning's wake-up. your 2 AM self no longer has
> to time-travel back to yesterday's page.
