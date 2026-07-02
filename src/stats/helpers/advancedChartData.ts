import moment from "moment"
import { Dream, Symbol } from "db"
import { Range, RANGE_TO_BUCKET, RANGE_TO_DAYS } from "src/stats/helpers/range"

// timeline of the advanced (filtered) chart: dream counts per range-driven bucket
export function setAdvancedChartData(range: Range, dreams: (Dream & { symbols: Symbol[] })[]) {
  const bucket = RANGE_TO_BUCKET[range]
  // ISO weeks so a "week" bucket always starts on Monday
  const bucketStart = (m: moment.Moment) =>
    m.clone().startOf(bucket === "week" ? "isoWeek" : bucket)
  const keyFormat = bucket === "day" ? "YYYY-MM-DD" : bucket === "week" ? "GGGG-WW" : "YYYY-MM"
  const labelFormat = bucket === "day" ? "LL" : bucket === "week" ? "MMM D" : "MMM YYYY"

  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const earliestDate = dreams.reduce((earliest, dream) => {
    const dreamDate = moment(dream.dreamAt)
    return dreamDate.isBefore(earliest) ? dreamDate : earliest
  }, moment())
  const subtractDays = RANGE_TO_DAYS[range] ?? currentMoment.diff(earliestDate, "days") + 1

  // zero-fill every bucket of the range so gaps stay visible
  const counts: Record<string, { label: string; count: number }> = {}
  const cursor = bucketStart(currentMoment.clone().subtract(subtractDays, "days"))
  const endMoment = bucketStart(currentMoment)
  while (cursor <= endMoment) {
    counts[cursor.format(keyFormat)] = { label: cursor.format(labelFormat), count: 0 }
    cursor.add(1, bucket)
  }

  dreams.forEach((dream) => {
    const key = bucketStart(moment(dream.dreamAt)).format(keyFormat)
    const entry = counts[key]
    if (entry) {
      entry.count += 1
    }
  })

  return [["date", "dreams"], ...Object.values(counts).map(({ label, count }) => [label, count])]
}
