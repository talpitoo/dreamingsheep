import moment from "moment"
import { Dream, DreamTime, DreamType, Symbol } from "db"
import { TIME_ICONS, TYPE_ICONS } from "src/core/helpers/icons"
import { Range, RANGE_TO_BUCKET, RANGE_TO_DAYS } from "src/stats/helpers/range"

type DreamWithSymbols = Dream & { symbols: Symbol[] }

// same rainbow as the type pie (StatGoogleChart options.type): series i = Object.values(DreamType)[i]
export const TYPE_COMBO_COLORS = [
  "#FF0000",
  "#FF7F00",
  "#FFFF00",
  "#00FF00",
  "#0000FF",
  "#4B0082",
  "#9400D3",
]
// the average-mood line on top of the rainbow columns
export const MOOD_LINE_COLOR = "#202020"

// same palette as the time facet's bars (chartsData timeChartBarColors), in enum order
export const TIME_AREA_COLORS = ["#581845", "#ff5733", "#c70039", "#900c3f"]

// calendar heatmap ramp: canvas teal, darker = more dreams
export const CALENDAR_COLORS = ["#d9edf0", "#0097a7"]

const typeLabel = (type: DreamType) =>
  TYPE_ICONS.find((icon) => icon.value === type)?.label ?? type.toLowerCase()
const timeLabel = (time: DreamTime) =>
  TIME_ICONS.find((icon) => icon.value === time)?.label ?? time.toLowerCase()

// zero-filled, range-driven buckets (ISO weeks so a "week" bucket always starts on Monday);
// shared by the combined hero charts
function buildBuckets(range: Range, dreams: DreamWithSymbols[]) {
  const bucket = RANGE_TO_BUCKET[range]
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

  const keys: string[] = []
  const labels: Record<string, string> = {}
  const cursor = bucketStart(currentMoment.clone().subtract(subtractDays, "days"))
  const endMoment = bucketStart(currentMoment)
  while (cursor <= endMoment) {
    const key = cursor.format(keyFormat)
    keys.push(key)
    labels[key] = cursor.format(labelFormat)
    cursor.add(1, bucket)
  }

  const keyOf = (dream: DreamWithSymbols) => bucketStart(moment(dream.dreamAt)).format(keyFormat)
  return { keys, labels, keyOf }
}

// hero: dreams per bucket stacked by type + average-mood line (ComboChart)
export function setTypeMoodComboData(range: Range, dreams: DreamWithSymbols[]) {
  const { keys, labels, keyOf } = buildBuckets(range, dreams)
  const types = Object.values(DreamType)

  const typeCounts: Record<string, number[]> = {}
  const mood: Record<string, { total: number; count: number }> = {}
  keys.forEach((key) => {
    typeCounts[key] = types.map(() => 0)
    mood[key] = { total: 0, count: 0 }
  })

  dreams.forEach((dream) => {
    const key = keyOf(dream)
    if (!typeCounts[key]) return // outside the zero-filled range
    typeCounts[key]![types.indexOf(dream.type)] += 1
    mood[key]!.total += dream.mood
    mood[key]!.count += 1
  })

  return [
    ["date", ...types.map(typeLabel), "avg mood"],
    ...keys.map((key) => [
      labels[key],
      ...typeCounts[key]!,
      // null keeps the line off empty buckets (bridged via interpolateNulls)
      mood[key]!.count > 0 ? mood[key]!.total / mood[key]!.count : null,
    ]),
  ]
}

// hero: dreams per bucket stacked by time of day (AreaChart)
export function setTimeAreaData(range: Range, dreams: DreamWithSymbols[]) {
  const { keys, labels, keyOf } = buildBuckets(range, dreams)
  const times = Object.values(DreamTime)

  const timeCounts: Record<string, number[]> = {}
  keys.forEach((key) => {
    timeCounts[key] = times.map(() => 0)
  })

  dreams.forEach((dream) => {
    const key = keyOf(dream)
    if (!timeCounts[key]) return
    timeCounts[key]![times.indexOf(dream.time)] += 1
  })

  return [
    ["date", ...times.map(timeLabel)],
    ...keys.map((key) => [labels[key], ...timeCounts[key]!]),
  ]
}

// hero: GitHub-style calendar heatmap — always daily, independent of the range bucket
export function setCalendarData(dreams: DreamWithSymbols[]) {
  const daily: Record<string, number> = {}
  dreams.forEach((dream) => {
    const key = moment(dream.dreamAt).format("YYYY-MM-DD")
    daily[key] = (daily[key] ?? 0) + 1
  })

  return [
    [
      { type: "date", id: "date" },
      { type: "number", id: "dreams" },
    ],
    ...Object.keys(daily)
      .sort()
      .map((key) => [moment(key).toDate(), daily[key]]),
  ] as any[][]
}
