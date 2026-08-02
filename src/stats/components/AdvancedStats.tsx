import { Routes } from "src/routes"
import { useQuery } from "src/core/rpc-client"
import { Box, Button, Chip, Collapse, Grid, Paper, Typography } from "@mui/material"
import { DreamTime, DreamType, RecallTime, Symbol } from "db"
import Link from "next/link"
import { useRouter } from "next/router"
import moment from "moment"
import React, { Fragment, ReactNode, Suspense, useEffect, useMemo, useState } from "react"
import { useDebounce } from "usehooks-ts"
import Form from "src/core/components/Form"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import ToggleButtonField from "src/core/components/ToggleButtonField"
import SymbolsAutocomplete from "src/dreams/components/SymbolsAutocomplete"
import { getDreams } from "src/dreams/client"
import {
  buildDreamSearchWhere,
  parseDreamSearchQuery,
} from "src/dreams/utils/buildDreamSearchWhere"
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
import {
  ADVANCED_STATS_FILTERS_STORAGE_KEY,
  CustomRange,
  Range,
  resolveRangeBounds,
} from "src/stats/helpers/range"
import { getSymbols } from "src/symbols/client"

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
  custom,
  values,
  keyword,
  onClearKeyword,
}: {
  range: Range
  custom: CustomRange | null
  values: AdvancedStatsFormValues
  /** the live (undebounced) keyword, only shown — filtering uses values.q */
  keyword: string
  onClearKeyword: () => void
}) => {
  const bounds = resolveRangeBounds(range, custom)
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
          ...(bounds ? [{ dreamAt: bounds }] : []),
        ],
      },
    },
    { keepPreviousData: true }
  )

  // facet breakdowns of the filtered subset: "for these dreams, how do the
  // other dimensions distribute?" (e.g. symbol 'dao' -> mostly night? mostly lucid?)
  const facetsData = useMemo(() => {
    return setChartsData(range, dreams, custom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, custom, dreams])

  return (
    <Fragment>
      {/* the only feedback that the filters are narrowing things down while the panel is
          collapsed; same style as the search page's result count. The keyword chip is the
          searched words carried over from the search page — deletable here, editable there */}
      <Typography variant="h4" sx={{ color: "white", mb: 1 }} component="p">
        {count} matching dream{count === 1 ? "" : "s"}
        {keyword && (
          <Chip
            variant="outlined"
            label={`"${keyword}"`}
            onDelete={onClearKeyword}
            sx={{
              ml: 1.5,
              verticalAlign: "middle",
              color: "white",
              borderColor: "white",
              "& .MuiChip-deleteIcon": {
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
              },
            }}
          />
        )}
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
  custom?: CustomRange | null
  /** the filter panel toggles from the Stats page header row (search-page pattern) */
  filtersOpen?: boolean
  /** rendered between the filter panel and the charts (e.g. the sleep chart) */
  children?: ReactNode
}

export const AdvancedStats = ({
  range,
  custom = null,
  filtersOpen = true,
  children,
}: AdvancedStatsProps) => {
  const router = useRouter()
  // null until the sessionStorage/URL restore ran, so the form mounts with the saved filters
  const [initialValues, setInitialValues] = useState<AdvancedStatsFormValues | null>(null)
  const [formValues, setFormValues] = useState<AdvancedStatsFormValues>(INITIAL_VALUES)
  // the keyword lives OUTSIDE the form: there's no search field on the stats page —
  // it only arrives via the search page's "View stats" (or sessionStorage) and is
  // cleared via the chip next to the count
  const [keyword, setKeyword] = useState("")

  // filters arriving from the search page in the shared URL param format
  const incoming = useMemo(() => parseDreamSearchQuery(router.query), [router.query])
  const [{ symbols: incomingSymbols }] = useQuery(getSymbols, {
    where: { id: { in: incoming.symbolIds } },
  })

  const filterValues = useMemo(() => ({ ...formValues, q: keyword }), [formValues, keyword])
  // one debounce for the whole form: keystrokes settle, toggles feel instant
  const debouncedValues = useDebounce(filterValues, 400)

  useEffect(() => {
    if (!router.isReady || initialValues) return
    const cameWithFilters = ["q", "favorite", "time", "mood", "recall", "type", "symbols"].some(
      (key) => router.query[key]
    )
    let values: AdvancedStatsFormValues
    if (cameWithFilters) {
      values = normalizeValues({
        q: incoming.q,
        favorite: incoming.favorite,
        time: incoming.time as DreamTime[],
        mood: incoming.mood as number[],
        recall: incoming.recall as RecallTime[],
        type: incoming.type as DreamType[],
        symbols: incomingSymbols as Symbol[],
      })
    } else {
      let saved: Partial<AdvancedStatsFormValues> | null = null
      try {
        saved = JSON.parse(
          window.sessionStorage.getItem(ADVANCED_STATS_FILTERS_STORAGE_KEY) ?? "null"
        )
      } catch (error) {
        saved = null
      }
      values = normalizeValues(saved ?? {})
    }
    setInitialValues(values)
    setFormValues({ ...values, q: "" })
    setKeyword(values.q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, initialValues, incomingSymbols])

  // persist the combined filters (toggles + keyword) once the restore has run
  useEffect(() => {
    if (!initialValues) return
    window.sessionStorage.setItem(ADVANCED_STATS_FILTERS_STORAGE_KEY, JSON.stringify(filterValues))
  }, [filterValues, initialValues])

  function onValuesChange(values: Partial<AdvancedStatsFormValues>) {
    // the form has no keyword field — ignore any stale q from the form's defaultValues
    setFormValues({ ...normalizeValues(values), q: "" })
  }

  function clearKeyword() {
    setKeyword("")
    // also strip q from the URL, so a refresh doesn't resurrect it
    if (router.query.q) {
      const { q: _q, ...rest } = router.query
      router.replace({ query: rest }, undefined, { shallow: true })
    }
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
            {/* NOTE: no keyword field on purpose — searching for words happens on the
                Search page, which carries them over via its "View stats" button */}
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
        <AdvancedStatsQueryAndCharts
          range={range}
          custom={custom}
          values={debouncedValues}
          keyword={keyword}
          onClearKeyword={clearKeyword}
        />
      </Suspense>
    </Fragment>
  )
}
