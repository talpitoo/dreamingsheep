import { useQuery } from "@blitzjs/rpc"
import { Box, Card, CardContent, Checkbox, FormControlLabel, Typography } from "@mui/material"
import moment from "moment"
import React, { useEffect, useMemo, useState } from "react"
import { Chart } from "react-google-charts"
import { useWindowSize } from "usehooks-ts"
import getSleepingTimes from "src/sleepingTimes/queries/getSleepingTimes"
import { Range, RANGE_TO_DAYS, SLEEP_CHART_STYLE_STORAGE_KEY } from "src/stats/helpers/range"
import { SleepChartStyle, setSleepChartData } from "src/stats/helpers/sleepChartData"

// matches the NIGHT color of the time chart
const SLEEP_COLOR = "#581845"

// NOTE: react-google-charts' types don't cover {v, f} tick objects, but Google Charts supports them
function options(style: SleepChartStyle, ticks: { v: number; f: string }[]): Record<string, any> {
  const axes = {
    hAxis: {
      baselineColor: "transparent",
      gridlineColor: "transparent",
      textPosition: "none",
    },
    vAxis: {
      baselineColor: "#fff",
      gridlineColor: "#eee",
      ticks,
    },
  }
  if (style === "bars") {
    return {
      legend: "none",
      backgroundColor: "transparent",
      bar: { groupWidth: "70%" },
      candlestick: {
        risingColor: { fill: SLEEP_COLOR, stroke: SLEEP_COLOR },
        fallingColor: { fill: SLEEP_COLOR, stroke: SLEEP_COLOR },
      },
      colors: [SLEEP_COLOR],
      ...axes,
    }
  }
  return {
    legend: "none",
    backgroundColor: "transparent",
    curveType: "function",
    lineWidth: 2,
    colors: [SLEEP_COLOR],
    intervals: { style: "area", color: SLEEP_COLOR },
    ...axes,
  }
}

export interface SleepChartProps {
  range: Range
}

// full-width bedtime/wake-up chart: bottom edge = bedtime, top edge = wake-up
// time, per day; days with incomplete tracking stay uncolored
export const SleepChart = ({ range }: SleepChartProps) => {
  const [style, setStyle] = useState<SleepChartStyle>("bars")
  const [key, setkey] = useState(0)
  const size = useWindowSize()

  useEffect(() => {
    setkey(size.width)
  }, [size.width])

  // restore the last selected style within this browser session
  useEffect(() => {
    const saved = window.sessionStorage.getItem(SLEEP_CHART_STYLE_STORAGE_KEY)
    if (saved === "bars" || saved === "band") {
      setStyle(saved)
    }
  }, [])

  function changeStyle(smooth: boolean) {
    const value: SleepChartStyle = smooth ? "band" : "bars"
    setStyle(value)
    window.sessionStorage.setItem(SLEEP_CHART_STYLE_STORAGE_KEY, value)
  }

  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const [sleepingTimes] = useQuery(
    getSleepingTimes,
    {
      orderBy: { sleepingAt: "asc" },
      where: {
        ...(range !== "all" && {
          sleepingAt: {
            gte: currentMoment.clone().subtract(RANGE_TO_DAYS[range]!, "days").toISOString(),
            lte: currentMoment.clone().add(1, "days").toISOString(),
          },
        }),
      },
    },
    { keepPreviousData: true }
  )

  const { data, ticks, hasData } = useMemo(() => {
    return setSleepChartData(range, sleepingTimes, style)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, sleepingTimes, style])

  return (
    <Card className="bg-white translate-x-0 translate-y-0 transform-gpu">
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1">sleep</Typography>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={style === "band"}
                onChange={(_, checked) => changeStyle(checked)}
              />
            }
            label={<Typography variant="body2">smooth</Typography>}
          />
        </Box>
        {hasData ? (
          <Chart
            key={`${key}-${style}`}
            chartType={style === "bars" ? "CandlestickChart" : "LineChart"}
            data={data}
            options={options(style, ticks)}
            width="100%"
            height="300px"
          />
        ) : (
          <Typography variant="body2" className="opacity-60">
            No bedtime/wake-up times tracked in this range. Set them on the Dreams page.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
