import React, { useEffect, useRef } from "react"
import * as d3 from "d3"
import { Card, CardContent, Container, Typography } from "@mui/material"

export interface StatSymbolChartProps {
  data: {
    symbol: string
    count: number
  }[]
  isPdf?: boolean
}

export function StatSymbolChart({ data, isPdf = false }: StatSymbolChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svgEl = d3.select(chartRef.current)
    svgEl.selectAll("*").remove()
    if (data.length > 0) {
      const dataset = { children: data }

      const diameter = 200

      const bubble = d3.pack(dataset).size([diameter, diameter]).padding(1.5)

      const svg = svgEl
        .append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble")

      const nodes = d3.hierarchy(dataset).sum((d) => d.count)

      const node = svg
        .selectAll(".node")
        .data(bubble(nodes).descendants())
        .enter()
        .filter((d) => !d.children)
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")

      node.append("title").text((d) => d.data.symbol + ": " + d.data.count)

      node
        .append("circle")
        .attr("r", (d) => d.r)
        .style("fill", (d) => "hsl(" + (d.r + 365) + ",100%,50%)")

      node
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .attr("font-family", "Arial")
        .attr("font-size", "11")
        .text((d) => d.data.symbol.substring(0, d.r / 3))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (isPdf) {
    return <div ref={chartRef} style={{ display: "flex", justifyContent: "center" }}></div>
  }
  return (
    <Card className="translate-x-0 translate-y-0 transform-gpu">
      <CardContent className="bg-white">
        <Typography variant="subtitle1">symbols</Typography>
        <Container ref={chartRef} sx={{ display: "flex", justifyContent: "center" }}></Container>
      </CardContent>
    </Card>
  )
}
