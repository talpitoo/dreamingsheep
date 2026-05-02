import Image from "next/image"
import { useSession } from "@blitzjs/auth"
import { BlitzPage, Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import React, { Fragment, Suspense, useEffect, useMemo, useState } from "react"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import Layout from "src/core/layouts/Layout"
import { Container, Grid, Card, ToggleButtonGroup, ToggleButton, Box } from "@mui/material"
import titleStats from "public/assets/title-stats.png"
import sheepStats from "public/assets/sheep-stats.png"
import getDreams from "src/dreams/queries/getDreams"
import { StatGoogleChart } from "src/stats/components/StatGoogleChart"
import moment from "moment"
import { Dream, DreamTime, DreamType, RecallTime, Symbol } from "db"
import { StatSymbolChart } from "src/stats/components/StatSymbolChart"
import LoadingSpiral from "src/core/components/LoadingSpiral"
// import { useTheme } from "@mui/material/styles"
// NOTE: not used but keeping it here for syntax reference: import useMediaQuery from "@mui/material/useMediaQuery"

type Range = "day" | "week" | "month" | "all"

export function setChartsData(range: Range, dreams: (Dream & { symbols: Symbol[] })[]) {
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

  // find the earliest dream date
  const earliestDate = dreams.reduce((earliest, dream) => {
    const dreamDate = moment(dream.dreamAt)
    return dreamDate.isBefore(earliest) ? dreamDate : earliest
  }, moment())

  // calculate the number of days between the earliest date and the current date
  const daysDifference = currentMoment.diff(earliestDate, "days") + 1

  const subtractDays =
    range === "day" ? 0 : range === "week" ? 6 : range === "month" ? 31 : daysDifference
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

export const Stats = () => {
  const router = useRouter()
  const session = useSession()
  const user = useCurrentUser()
  // const theme = useTheme()
  // const breakpointSm = useMediaQuery(theme.breakpoints.down("sm"))
  const [range, setRange] = useState<Range>("week")
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const [{ dreams }, { isLoading }] = useQuery(getDreams, {
    orderBy: { dreamAt: "asc" },
    where: {
      ...(range !== "all" && {
        dreamAt: {
          gte:
            range === "day"
              ? currentMoment.toISOString()
              : range === "week"
              ? currentMoment.clone().subtract(6, "days").toISOString()
              : currentMoment.clone().subtract(31, "days").toISOString(),
          lte: currentMoment.clone().add(1, "days").toISOString(),
        },
      }),
    },
  })
  const chartsData = useMemo(() => {
    return setChartsData(range, dreams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreams])

  useEffect(() => {
    if (!session.userId) router.push(Routes.Home())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Fragment>
      <Container>
        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                width: { xs: "50%", sm: "100%" },
                ...(user && {
                  margin: "auto",
                }),
                ...(!user && {
                  margin: { xs: "0 auto -2rem", sm: "auto" },
                }),
              }}
            >
              <Image
                src={sheepStats}
                alt="Stats sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </Box>
          </Grid>
        </Grid>

        <Grid container sx={{ mb: 2 }}>
          <Grid item md={2} />
          <Grid item xs={12} md={8}>
            <h1 className="heading">
              <Image src={titleStats} alt="Stats" width="77" height="55" />
              <span className="sr-only">Stats</span>
            </h1>
            <Box>
              <Card className="bg-white inline-block">
                <ToggleButtonGroup
                  value={range}
                  // NOTE: using sx={...} instead of orientation={breakpointSm ? "vertical" : "horizontal"}
                  color="primary"
                  exclusive
                  onChange={(_, value) => {
                    if (value !== null) {
                      setRange(value)
                    }
                  }}
                >
                  <ToggleButton
                    value="day"
                    sx={{
                      minWidth: { xs: "70px !important", sm: "86px" },
                    }}
                  >
                    day
                  </ToggleButton>
                  <ToggleButton
                    value="week"
                    sx={{
                      minWidth: { xs: "70px !important", sm: "86px" },
                    }}
                  >
                    week
                  </ToggleButton>
                  <ToggleButton
                    value="month"
                    sx={{
                      minWidth: { xs: "70px !important", sm: "86px" },
                    }}
                  >
                    month
                  </ToggleButton>
                  <ToggleButton
                    value="all"
                    sx={{
                      minWidth: { xs: "70px !important", sm: "86px" },
                    }}
                  >
                    all
                  </ToggleButton>
                </ToggleButtonGroup>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {isLoading && <LoadingSpiral />}

        {!isLoading && (
          <Grid container>
            <Grid item md={2} />
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={7}>
                  <StatGoogleChart data={chartsData.dream} type="dream" />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <StatGoogleChart data={chartsData.mood} type="mood" />
                </Grid>

                <Grid item xs={12} sm={5}>
                  <StatGoogleChart data={chartsData.time} type="time" />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <StatGoogleChart data={chartsData.type} type="type" />
                </Grid>

                <Grid item xs={12} sm={7} className="chart-card">
                  <StatSymbolChart data={chartsData.symbol} />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <StatGoogleChart data={chartsData.recall} type="recall" />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Container>
    </Fragment>
  )
}

const StatsPage: BlitzPage = () => {
  return (
    <div>
      <Suspense fallback={<LoadingSpiral />}>
        <Stats />
      </Suspense>
    </div>
  )
}

StatsPage.authenticate = true
StatsPage.getLayout = (page) => <Layout title="Stats">{page}</Layout>

export default StatsPage
