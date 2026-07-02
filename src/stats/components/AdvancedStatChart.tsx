import { Card, CardContent, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { Chart } from "react-google-charts"
import { useWindowSize } from "usehooks-ts"

const options = {
  legend: "none",
  backgroundColor: "transparent",
  colors: ["#c70039"],
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

export interface AdvancedStatChartProps {
  data: any[][]
  count: number
}

export function AdvancedStatChart({ data, count }: AdvancedStatChartProps) {
  const [key, setkey] = useState(0)
  const size = useWindowSize()

  useEffect(() => {
    setkey(size.width)
  }, [size.width])

  return (
    <Card className="bg-white translate-x-0 translate-y-0 transform-gpu">
      <CardContent>
        <Typography variant="subtitle1">
          advanced · {count} matching dream{count === 1 ? "" : "s"}
        </Typography>
        <Chart
          key={key}
          chartType="ColumnChart"
          data={data}
          options={options}
          width="100%"
          height="300px"
        />
      </CardContent>
    </Card>
  )
}
