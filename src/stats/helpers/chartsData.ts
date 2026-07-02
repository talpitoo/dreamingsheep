import moment from "moment"
import { Dream, DreamTime, DreamType, Symbol } from "db"
import { Range, RANGE_TO_DAYS } from "src/stats/helpers/range"

// Aggregates a dreams array into the data shapes the stat charts consume.
// Used by the static Stats grid, the advanced (filtered) facet charts and the PDF export.
export function setChartsData(range: Range, dreams: (Dream & { symbols: Symbol[] })[]) {
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

  // find the earliest dream date
  const earliestDate = dreams.reduce((earliest, dream) => {
    const dreamDate = moment(dream.dreamAt)
    return dreamDate.isBefore(earliest) ? dreamDate : earliest
  }, moment())

  // calculate the number of days between the earliest date and the current date
  const daysDifference = currentMoment.diff(earliestDate, "days") + 1

  const subtractDays = RANGE_TO_DAYS[range] ?? daysDifference
  const dreamCount = {}
  if (subtractDays !== null) {
    const startMoment = currentMoment.clone().subtract(subtractDays, "days")
    while (startMoment <= currentMoment) {
      dreamCount[startMoment.format("YYYY-MM-DD")] = 0
      startMoment.add(1, "days")
    }
  }
  const timeChartBarColors = {
    NIGHT: "#581845",
    MORNING: "#ff5733",
    AFTERNOON: "#c70039",
    EVENING: "#900c3f",
  }
  const dailyMood = {}
  const timeCount = Object.values(DreamTime).reduce((arr, key) => ({ ...arr, [key]: 0 }), {})
  const typeCount = Object.values(DreamType).reduce((arr, key) => ({ ...arr, [key]: 0 }), {})
  const dailyRecall = {}
  // mapping for RecallTime enum
  const recallMapping = {
    BLURRY: -1,
    N_A: 0,
    CLEAR: 1,
  }
  const symbolCount = {}

  dreams.forEach((dream) => {
    const dreamKey = moment(dream.dreamAt).format("YYYY-MM-DD")
    if (dreamCount[dreamKey]) {
      dreamCount[dreamKey] += 1
    } else {
      dreamCount[dreamKey] = 1
    }
    if (dailyMood[dreamKey]) {
      // update total mood and dream count for the day
      dailyMood[dreamKey].totalMood += dream.mood
      dailyMood[dreamKey].dreamCount += 1
    } else {
      // initialize total mood and dream count for the day
      dailyMood[dreamKey] = {
        totalMood: dream.mood,
        dreamCount: 1,
      }
    }
    timeCount[dream.time] += 1
    typeCount[dream.type] += 1
    if (dailyRecall[dreamKey]) {
      // update total recall and dream count for the day
      dailyRecall[dreamKey].totalRecall += recallMapping[dream.recall]
      dailyRecall[dreamKey].dreamCount += 1
    } else {
      // initialize total recall and dream count for the day
      dailyRecall[dreamKey] = {
        totalRecall: recallMapping[dream.recall],
        dreamCount: 1,
      }
    }

    dream.symbols.forEach((symbol) => {
      if (symbolCount[symbol.id]) {
        symbolCount[symbol.id].count += 1
      } else {
        symbolCount[symbol.id] = {
          symbol: symbol.name,
          count: 1,
        }
      }
    })
  })

  // calculate the average mood and recall for each day
  const averageMood = Object.keys(dailyMood).map((key) => {
    const average = dailyMood[key].totalMood / dailyMood[key].dreamCount // Calculate the average mood
    return [moment(key).format("LL"), average]
  })

  const averageRecall = Object.keys(dailyRecall).map((key) => {
    const average = dailyRecall[key].totalRecall / dailyRecall[key].dreamCount // Calculate the average recall
    return [moment(key).format("LL"), average]
  })

  // fill in missing days with the middle value (3)
  if (subtractDays !== null) {
    const startMoment = currentMoment.clone().subtract(subtractDays, "days")
    while (startMoment <= currentMoment) {
      const key = startMoment.format("YYYY-MM-DD")
      if (!dailyMood[key]) {
        averageMood.push([moment(key).format("LL"), 3]) // Add the middle value for missing days
      }
      if (!dailyRecall[key]) {
        averageRecall.push([moment(key).format("LL"), 0]) // Add the default recall value for missing days
      }

      startMoment.add(1, "days")
    }
  }

  // sort the array by date
  averageMood.sort((a, b) => moment(a[0]).valueOf() - moment(b[0]).valueOf())
  averageRecall.sort((a, b) => moment(a[0]).valueOf() - moment(b[0]).valueOf())

  return {
    dream: [
      ["date", "count"],
      ...Object.keys(dreamCount).map((key) => [moment(key).format("LL"), dreamCount[key]]),
    ],
    mood: [["date", "mood"], ...averageMood],
    time: [
      ["time", "count", { role: "style" }],
      ...Object.keys(timeCount).map((key) => [key, timeCount[key], timeChartBarColors[key]]),
    ],
    type: [["type", "count"], ...Object.keys(typeCount).map((key) => [key, typeCount[key]])],
    recall: [["date", "recall"], ...averageRecall],
    symbol: [...Object.keys(symbolCount).map((key) => symbolCount[key])],
  }
}
