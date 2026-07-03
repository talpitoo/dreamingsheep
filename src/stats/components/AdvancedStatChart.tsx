import { Box, Card, CardContent, Grid, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { Chart, GoogleChartWrapperChartType } from "react-google-charts"
import { useWindowSize } from "usehooks-ts"
import {
  CALENDAR_COLORS,
  MOOD_LINE_COLOR,
  TIME_AREA_COLORS,
  TYPE_COMBO_COLORS,
} from "src/stats/helpers/advancedChartData"

const axes = {
  hAxis: {
    baselineColor: "transparent",
    gridlineColor: "transparent",
  },
  vAxis: {
    baselineColor: "#fff",
    gridlineColor: "#eee",
    minValue: 0,
    format: "0",
  },
}

// dreams per bucket stacked by type (rainbow of the type pie) + average-mood line
const typeMoodOptions = (moodSeriesIndex: number) => ({
  legend: "none",
  backgroundColor: "transparent",
  seriesType: "bars",
  isStacked: true,
  colors: TYPE_COMBO_COLORS,
  series: {
    [moodSeriesIndex]: {
      type: "line",
      targetAxisIndex: 1,
      color: MOOD_LINE_COLOR,
      lineWidth: 2,
      curveType: "function",
    },
  },
  interpolateNulls: true,
  hAxis: axes.hAxis,
  vAxes: {
    0: { baselineColor: "#fff", gridlines: { color: "#eee" }, minValue: 0, format: "0" },
    1: {
      minValue: 0,
      maxValue: 5,
      baselineColor: "transparent",
      gridlines: { color: "transparent" },
      textStyle: { color: "#999" },
    },
  },
  // edge-to-edge: count labels left, the 0-5 mood axis right
  chartArea: { left: 36, right: 28, top: 8, bottom: 24 },
})

// dreams per bucket stacked by time of day (same palette as the time facet)
const timeAreaOptions = {
  legend: "none",
  backgroundColor: "transparent",
  isStacked: true,
  colors: TIME_AREA_COLORS,
  areaOpacity: 0.8,
  lineWidth: 1,
  ...axes,
  chartArea: { left: 36, right: 8, top: 8, bottom: 24 },
}

// GitHub-style dreams-per-day heatmap
const calendarOptions = {
  backgroundColor: "transparent",
  colorAxis: { minValue: 0, colors: CALENDAR_COLORS },
  calendar: { cellSize: 13 },
  noDataPattern: { backgroundColor: "#f6f6f6", color: "#fbfbfb" },
}

export interface AdvancedStatChartProps {
  typeMoodData: any[][]
  timeAreaData: any[][]
  calendarData: any[][]
  count: number
}

// full-width row in the surrounding stats grid
function HeroCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Grid item xs={12}>
      <Card className="bg-white translate-x-0 translate-y-0 transform-gpu">
        <CardContent>
          <Typography variant="subtitle1">{title}</Typography>
          {children}
        </CardContent>
      </Card>
    </Grid>
  )
}

export function AdvancedStatChart({
  typeMoodData,
  timeAreaData,
  calendarData,
  count,
}: AdvancedStatChartProps) {
  const [key, setkey] = useState(0)
  const size = useWindowSize()

  useEffect(() => {
    setkey(size.width)
  }, [size.width])

  // header row: date + one column per type + the mood line
  const moodSeriesIndex = (typeMoodData[0]?.length ?? 2) - 2
  // one calendar row is ~145px high per spanned year
  const calendarYears =
    new Set(calendarData.slice(1).map((row) => (row[0] as Date).getFullYear())).size || 1

  return (
    <React.Fragment>
      <HeroCard title={`advanced · ${count} matching dream${count === 1 ? "" : "s"} · by type`}>
        <Chart
          key={`combo-${key}`}
          chartType={"ComboChart" as GoogleChartWrapperChartType}
          data={typeMoodData}
          options={typeMoodOptions(moodSeriesIndex)}
          width="100%"
          height="200px"
        />
      </HeroCard>

      <HeroCard title="by time of day">
        <Chart
          key={`area-${key}`}
          chartType="AreaChart"
          data={timeAreaData}
          options={timeAreaOptions}
          width="100%"
          height="200px"
        />
      </HeroCard>

      <HeroCard title="dream calendar">
        {calendarData.length > 1 ? (
          <Box sx={{ overflowX: "auto" }}>
            <Chart
              key={`calendar-${key}`}
              chartType={"Calendar" as GoogleChartWrapperChartType}
              data={calendarData}
              options={calendarOptions}
              width="100%"
              height={`${calendarYears * 145 + 20}px`}
            />
          </Box>
        ) : (
          <Typography variant="body2" className="opacity-60">
            No dreams in this range yet.
          </Typography>
        )}
      </HeroCard>
    </React.Fragment>
  )
}
