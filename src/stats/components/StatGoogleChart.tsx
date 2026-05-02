import { Card, CardContent, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { Chart, GoogleChartWrapperChartType } from "react-google-charts"
import { useWindowSize } from "usehooks-ts"

export type StatType = "dream" | "mood" | "time" | "type" | "recall"

const chartType = {
  dream: "ColumnChart",
  mood: "LineChart",
  time: "BarChart",
  type: "PieChart",
  recall: "LineChart",
}

const options = {
  dream: {
    legend: "none",
    backgroundColor: "transparent",
    hAxis: {
      baselineColor: "transparent",
      gridlineColor: "transparent",
      textPosition: "none",
    },
    vAxis: {
      baselineColor: "transparent",
      gridlineColor: "transparent",
      textPosition: "none",
    },
  },
  mood: {
    curveType: "function",
    colors: ["#c70039"],
    legend: "none",
    backgroundColor: "transparent",
    hAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
      textPosition: "none",
    },
    vAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
      textPosition: "none",
    },
  },
  time: {
    legend: "none",
    backgroundColor: "transparent",
    hAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
      textPosition: "none",
    },
    vAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
    },
  },
  type: {
    backgroundColor: "transparent",
    pieSliceText: "none",
    colors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"],
    slices: {
      0: { offset: 0.2 },
    },
  },
  recall: {
    legend: "none",
    backgroundColor: "transparent",
    hAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
      textPosition: "none",
    },
    vAxis: {
      baselineColor: "#fff",
      gridlineColor: "#fff",
      textPosition: "none",
    },
  },
}

export interface StatGoogleChartProps {
  type: StatType
  data: any[][]
  isPdf?: boolean
}

export function StatGoogleChart({ type, data, isPdf = false }: StatGoogleChartProps) {
  const [key, setkey] = useState(0)
  const size = useWindowSize()

  useEffect(() => {
    setkey(size.width)
  }, [size.width])

  if (isPdf) {
    return (
      <Chart
        chartType={chartType[type] as GoogleChartWrapperChartType}
        data={data}
        options={options[type]}
      />
    )
  }
  return (
    <Card className="bg-white translate-x-0 translate-y-0 transform-gpu">
      <CardContent>
        <Typography variant="subtitle1">{type}</Typography>
        <Chart
          key={key}
          chartType={chartType[type] as GoogleChartWrapperChartType}
          data={data}
          options={options[type]}
        />
      </CardContent>
    </Card>
  )
}
