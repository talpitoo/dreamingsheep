import React, { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  Typography,
} from "@mui/material"
import { SYMBOL_CHART_CUSTOM_ONLY_STORAGE_KEY } from "src/stats/helpers/range"

export interface StatSymbolChartProps {
  data: {
    symbol: string
    count: number
    builtIn?: boolean
  }[]
  isPdf?: boolean
}

// grapheme-aware truncation: String.prototype.substring cuts emojis in half
// (surrogate pairs / ZWJ sequences), which rendered as empty boxes in the bubbles
function truncateLabel(label: string, maxLength: number): string {
  const length = Math.max(1, Math.floor(maxLength))
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const graphemes = [...new Intl.Segmenter().segment(label)].map((segment) => segment.segment)
    return graphemes.slice(0, length).join("")
  }
  // fallback: code points (still keeps surrogate pairs intact)
  return [...label].slice(0, length).join("")
}

export function StatSymbolChart({ data, isPdf = false }: StatSymbolChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [customOnly, setCustomOnly] = useState(false)

  // restore the last checkbox state within this browser session (sleep chart pattern)
  useEffect(() => {
    setCustomOnly(window.sessionStorage.getItem(SYMBOL_CHART_CUSTOM_ONLY_STORAGE_KEY) === "true")
  }, [])

  function changeCustomOnly(checked: boolean) {
    setCustomOnly(checked)
    window.sessionStorage.setItem(SYMBOL_CHART_CUSTOM_ONLY_STORAGE_KEY, String(checked))
  }

  // "custom only" hides the built-in symbols so the user's own creations get the room;
  // purely client-side — the aggregated data already carries each symbol's builtIn flag.
  // The PDF export has no checkbox and always renders the full set
  const chartData = useMemo(
    () => (customOnly && !isPdf ? data.filter((entry) => !entry.builtIn) : data),
    [data, customOnly, isPdf]
  )

  useEffect(() => {
    const svgEl = d3.select(chartRef.current)
    svgEl.selectAll("*").remove()
    if (chartData.length > 0) {
      const dataset = { children: chartData }

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
        // explicit emoji fallbacks — a bare "Arial" left emojis as empty boxes
        .attr(
          "font-family",
          "Arial, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif"
        )
        .attr("font-size", "11")
        .text((d) => truncateLabel(d.data.symbol, d.r / 3))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData])

  if (isPdf) {
    return <div ref={chartRef} style={{ display: "flex", justifyContent: "center" }}></div>
  }
  return (
    <Card className="translate-x-0 translate-y-0 transform-gpu">
      <CardContent className="bg-white">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1">symbols</Typography>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={customOnly}
                onChange={(_, checked) => changeCustomOnly(checked)}
              />
            }
            label={<Typography variant="body2">custom only</Typography>}
          />
        </Box>
        <Container ref={chartRef} sx={{ display: "flex", justifyContent: "center" }}></Container>
      </CardContent>
    </Card>
  )
}
