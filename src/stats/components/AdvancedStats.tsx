import { Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { Box, Button, Collapse, Grid, Paper, Typography } from "@mui/material"
import { DreamTime, DreamType, RecallTime, Symbol } from "db"
import Link from "next/link"
import moment from "moment"
import React, { Fragment, ReactNode, Suspense, useEffect, useMemo, useState } from "react"
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
import { StatGoogleChart } from "src/stats/components/StatGoogleChart"
import { StatSymbolChart } from "src/stats/components/StatSymbolChart"
import { setChartsData } from "src/stats/helpers/chartsData"
import { ADVANCED_STATS_FILTERS_STORAGE_KEY, Range, RANGE_TO_DAYS } from "src/stats/helpers/range"

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

const AdvancedStatsQueryAndCharts = ({
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

  // facet breakdowns of the filtered subset: "for these dreams, how do the
  // other dimensions distribute?" (e.g. symbol 'dao' -> mostly night? mostly lucid?)
  const facetsData = useMemo(() => {
    return setChartsData(range, dreams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, dreams])

  return (
    <Fragment>
      {/* the only feedback that the filters are narrowing things down while the panel is
          collapsed; same style as the search page's result count */}
      <Typography variant="h4" sx={{ color: "white", mb: 1 }} component="p">
        {count} matching dream{count === 1 ? "" : "s"}
      </Typography>
      <Grid container spacing={3}>
        {/* facet layout mirrors the static stats grid */}
        <Grid item xs={12} sm={7}>
          <StatGoogleChart data={facetsData.dream} type="dream" />
        </Grid>
        <Grid item xs={12} sm={5}>
          <StatGoogleChart data={facetsData.mood} type="mood" />
        </Grid>

        <Grid item xs={12} sm={5}>
          <StatGoogleChart data={facetsData.time} type="time" />
        </Grid>
        <Grid item xs={12} sm={7}>
          <StatGoogleChart data={facetsData.type} type="type" />
        </Grid>

        <Grid item xs={12} sm={7} className="chart-card">
          <StatSymbolChart data={facetsData.symbol} />
        </Grid>
        <Grid item xs={12} sm={5}>
          <StatGoogleChart data={facetsData.recall} type="recall" />
        </Grid>
      </Grid>
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

function normalizeValues(values: Partial<AdvancedStatsFormValues>): AdvancedStatsFormValues {
  return {
    q: values.q ?? "",
    favorite: values.favorite ?? "",
    time: values.time ?? [],
    mood: values.mood ?? [],
    recall: values.recall ?? [],
    type: values.type ?? [],
    symbols: (values.symbols ?? []).filter(Boolean),
  }
}

export interface AdvancedStatsProps {
  range: Range
  /** the filter panel toggles from the Stats page header row (search-page pattern) */
  filtersOpen?: boolean
  /** rendered between the filter panel and the charts (e.g. the sleep chart) */
  children?: ReactNode
}

export const AdvancedStats = ({ range, filtersOpen = true, children }: AdvancedStatsProps) => {
  // null until the sessionStorage restore ran, so the form mounts with the saved filters
  const [initialValues, setInitialValues] = useState<AdvancedStatsFormValues | null>(null)
  const [formValues, setFormValues] = useState<AdvancedStatsFormValues>(INITIAL_VALUES)
  // one debounce for the whole form: keystrokes settle, toggles feel instant
  const debouncedValues = useDebounce(formValues, 400)

  useEffect(() => {
    let saved: Partial<AdvancedStatsFormValues> | null = null
    try {
      saved = JSON.parse(
        window.sessionStorage.getItem(ADVANCED_STATS_FILTERS_STORAGE_KEY) ?? "null"
      )
    } catch (error) {
      saved = null
    }
    const values = normalizeValues(saved ?? {})
    setInitialValues(values)
    setFormValues(values)
  }, [])

  function onValuesChange(values: Partial<AdvancedStatsFormValues>) {
    const normalized = normalizeValues(values)
    setFormValues(normalized)
    window.sessionStorage.setItem(ADVANCED_STATS_FILTERS_STORAGE_KEY, JSON.stringify(normalized))
  }

  if (!initialValues) {
    return <LoadingSpiral />
  }

  return (
    <Fragment>
      <Form id="advanced-stats" initialValues={initialValues} onValuesChange={onValuesChange}>
        {/* Collapse (not conditional render) keeps the form mounted, so the active
            filter values survive toggling the panel */}
        <Collapse in={filtersOpen} id="advanced-stats-panel">
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
        </Collapse>
      </Form>

      {children}

      <Suspense fallback={<LoadingSpiral />}>
        <AdvancedStatsQueryAndCharts range={range} values={debouncedValues} />
      </Suspense>
    </Fragment>
  )
}
