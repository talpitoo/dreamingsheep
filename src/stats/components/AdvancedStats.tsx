import { Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { Box, Button, Paper } from "@mui/material"
import { Dream, DreamTime, DreamType, RecallTime, Symbol } from "db"
import Link from "next/link"
import moment from "moment"
import React, { Fragment, Suspense, useMemo, useState } from "react"
import { useDebounce } from "usehooks-ts"
import Form from "src/core/components/Form"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import ToggleButtonField from "src/core/components/ToggleButtonField"
import { SearchKeywordField } from "src/dreams/components/DreamSearchForm"
import SymbolsAutocomplete from "src/dreams/components/SymbolsAutocomplete"
import getDreams from "src/dreams/queries/getDreams"
import { buildDreamSearchWhere } from "src/dreams/utils/buildDreamSearchWhere"
import {
  FAVORITE_ICONS,
  MOOD_ICONS,
  RECALL_ICONS,
  TIME_ICONS,
  TYPE_ICONS,
} from "src/core/helpers/icons"
import { Range, RANGE_TO_BUCKET, RANGE_TO_DAYS } from "src/stats/helpers/range"
import { AdvancedStatChart } from "./AdvancedStatChart"

interface AdvancedStatsFormValues {
  q: string
  favorite: string
  time: DreamTime[]
  mood: number[]
  recall: RecallTime[]
  type: DreamType[]
  symbols: Symbol[]
}

const INITIAL_VALUES: AdvancedStatsFormValues = {
  q: "",
  favorite: "",
  time: [],
  mood: [],
  recall: [],
  type: [],
  symbols: [],
}

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

const AdvancedStatsQueryAndChart = ({
  range,
  values,
}: {
  range: Range
  values: AdvancedStatsFormValues
}) => {
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const [{ dreams, count }] = useQuery(
    getDreams,
    {
      orderBy: { dreamAt: "asc" },
      where: {
        AND: [
          buildDreamSearchWhere({
            q: values.q,
            favorite: values.favorite,
            time: values.time,
            mood: values.mood,
            recall: values.recall,
            type: values.type,
            symbolIds: (values.symbols ?? []).map((symbol) => symbol.id),
          }),
          ...(range !== "all"
            ? [
                {
                  dreamAt: {
                    gte: currentMoment
                      .clone()
                      .subtract(RANGE_TO_DAYS[range]!, "days")
                      .toISOString(),
                    lte: currentMoment.clone().add(1, "days").toISOString(),
                  },
                },
              ]
            : []),
        ],
      },
    },
    { keepPreviousData: true }
  )

  const chartData = useMemo(() => {
    return setAdvancedChartData(range, dreams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, dreams])

  return (
    <Fragment>
      <AdvancedStatChart data={chartData} count={count} />
      <Box sx={{ mt: 2, textAlign: "right" }}>
        <Link
          href={Routes.SearchPage({
            ...(values.q && { q: encodeURI(values.q) }),
            ...(values.favorite && { favorite: encodeURI(values.favorite) }),
            ...(values.time.length > 0 && { time: encodeURI(values.time.join(",")) }),
            ...(values.mood.length > 0 && { mood: encodeURI(values.mood.join(",")) }),
            ...(values.recall.length > 0 && { recall: encodeURI(values.recall.join(",")) }),
            ...(values.type.length > 0 && { type: encodeURI(values.type.join(",")) }),
            ...(values.symbols.length > 0 && {
              symbols: encodeURI(values.symbols.map((symbol) => symbol.id).join(",")),
            }),
          })}
          passHref={true}
        >
          <Button variant="contained">View as list</Button>
        </Link>
      </Box>
    </Fragment>
  )
}

export interface AdvancedStatsProps {
  range: Range
}

export const AdvancedStats = ({ range }: AdvancedStatsProps) => {
  const [formValues, setFormValues] = useState<AdvancedStatsFormValues>(INITIAL_VALUES)
  // one debounce for the whole form: keystrokes settle, toggles feel instant
  const debouncedValues = useDebounce(formValues, 400)

  return (
    <Fragment>
      <Form
        id="advanced-stats"
        initialValues={INITIAL_VALUES}
        onValuesChange={(values) =>
          setFormValues({
            q: values.q ?? "",
            favorite: values.favorite ?? "",
            time: values.time ?? [],
            mood: values.mood ?? [],
            recall: values.recall ?? [],
            type: values.type ?? [],
            symbols: (values.symbols ?? []).filter(Boolean),
          })
        }
      >
        <Paper sx={{ mb: 2, p: 2 }}>
          <SearchKeywordField
            sx={{
              mb: 4,
              px: 1,
              width: "100%",
              border: 1,
              borderColor: "grey.400",
              borderRadius: 1,
            }}
            name="q"
            placeholder="Search..."
          />
          <ToggleButtonField
            label="favorite"
            name="favorite"
            exclusive={true}
            buttons={FAVORITE_ICONS}
            className="mb-4 flex-wrap"
          />
          <ToggleButtonField
            label="time"
            name="time"
            exclusive={false}
            buttons={TIME_ICONS}
            className="mb-4 flex-wrap"
          />
          <ToggleButtonField
            label="mood"
            name="mood"
            exclusive={false}
            buttons={MOOD_ICONS}
            className="mb-4 flex-wrap"
          />
          <ToggleButtonField
            label="recall"
            exclusive={false}
            name="recall"
            buttons={RECALL_ICONS}
            className="mb-4 flex-wrap"
          />
          <ToggleButtonField
            label="type"
            name="type"
            exclusive={false}
            buttons={TYPE_ICONS}
            className="mb-4 flex-wrap"
          />

          <Suspense fallback={<LoadingSpiral />}>
            <SymbolsAutocomplete />
          </Suspense>
        </Paper>
      </Form>

      <Suspense fallback={<LoadingSpiral />}>
        <AdvancedStatsQueryAndChart range={range} values={debouncedValues} />
      </Suspense>
    </Fragment>
  )
}
