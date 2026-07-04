import Image from "next/image"
import { useSession } from "@blitzjs/auth"
import { BlitzPage, Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import React, { Fragment, Suspense, useEffect, useMemo, useState } from "react"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import Layout from "src/core/layouts/Layout"
import {
  Button,
  Collapse,
  Container,
  Grid,
  Card,
  ToggleButtonGroup,
  ToggleButton,
  Box,
} from "@mui/material"
import { KeyboardArrowDown, Settings } from "@mui/icons-material"
import { DateTime } from "luxon"
import titleStats from "public/assets/title-stats.png"
import sheepStats from "public/assets/sheep-stats.png"
import getDreams from "src/dreams/queries/getDreams"
import { StatGoogleChart } from "src/stats/components/StatGoogleChart"
import { StatSymbolChart } from "src/stats/components/StatSymbolChart"
import { AdvancedStats } from "src/stats/components/AdvancedStats"
import { SleepChart } from "src/stats/components/SleepChart"
import { DreamDatePicker } from "src/dreams/components/DreamDatePicker"
import { setChartsData } from "src/stats/helpers/chartsData"
import {
  CustomRange,
  DEFAULT_RANGE,
  Range,
  RANGE_TO_DAYS,
  RANGE_BUTTONS,
  resolveRangeBounds,
  isCompleteCustomRange,
  STATS_RANGE_STORAGE_KEY,
  STATS_CUSTOM_RANGE_STORAGE_KEY,
  ADVANCED_STATS_PANEL_STORAGE_KEY,
} from "src/stats/helpers/range"
import LoadingSpiral from "src/core/components/LoadingSpiral"
// import { useTheme } from "@mui/material/styles"
// NOTE: not used but keeping it here for syntax reference: import useMediaQuery from "@mui/material/useMediaQuery"

// NOTE: kept for backwards compatibility, the implementation moved to src/stats/helpers/chartsData
export { setChartsData } from "src/stats/helpers/chartsData"

const StaticStatsCharts = ({ range, custom }: { range: Range; custom: CustomRange | null }) => {
  const bounds = resolveRangeBounds(range, custom)
  const [{ dreams }, { isLoading }] = useQuery(getDreams, {
    orderBy: { dreamAt: "asc" },
    where: {
      ...(bounds && { dreamAt: bounds }),
    },
  })
  const chartsData = useMemo(() => {
    return setChartsData(range, dreams, custom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreams])

  if (isLoading) {
    return <LoadingSpiral />
  }

  return (
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
  )
}

export const Stats = () => {
  const router = useRouter()
  const session = useSession()
  const user = useCurrentUser()
  // const theme = useTheme()
  // const breakpointSm = useMediaQuery(theme.breakpoints.down("sm"))
  const [range, setRange] = useState<Range>(DEFAULT_RANGE)
  // the from–to window backing the "custom" range
  const [custom, setCustom] = useState<CustomRange | null>(null)
  // advanced filter panel, toggled like the search page's "Filters" button
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // restore the last selected range + custom window + panel state within this browser
  // session; arriving via the search page's "View stats" (filters in the URL) overrides
  // both: search has no day/week/month/… filter, so the range defaults to "all" and the
  // panel opens once so the carried-over filters are visible
  useEffect(() => {
    if (!router.isReady) return
    let savedCustom: CustomRange | null = null
    try {
      savedCustom = JSON.parse(
        window.sessionStorage.getItem(STATS_CUSTOM_RANGE_STORAGE_KEY) ?? "null"
      )
    } catch (error) {
      savedCustom = null
    }
    if (isCompleteCustomRange(savedCustom)) setCustom(savedCustom)

    const cameWithFilters =
      user?.advancedCharting &&
      ["q", "favorite", "time", "mood", "recall", "type", "symbols"].some(
        (key) => router.query[key]
      )
    if (cameWithFilters) {
      changeRange("all")
      setAdvancedOpen(true)
      window.sessionStorage.setItem(ADVANCED_STATS_PANEL_STORAGE_KEY, "true")
      return
    }
    const saved = window.sessionStorage.getItem(STATS_RANGE_STORAGE_KEY)
    // only restore "custom" if a complete window was saved with it
    if (saved === "custom" ? isCompleteCustomRange(savedCustom) : saved && saved in RANGE_TO_DAYS) {
      setRange(saved as Range)
    }
    setAdvancedOpen(window.sessionStorage.getItem(ADVANCED_STATS_PANEL_STORAGE_KEY) === "true")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])

  function changeRange(value: Range) {
    setRange(value)
    window.sessionStorage.setItem(STATS_RANGE_STORAGE_KEY, value)
  }

  function changeCustom(next: Partial<CustomRange>) {
    const merged = { from: custom?.from ?? "", to: custom?.to ?? "", ...next }
    setCustom(merged)
    window.sessionStorage.setItem(STATS_CUSTOM_RANGE_STORAGE_KEY, JSON.stringify(merged))
  }

  // the custom toggle's label is the chosen span once both ends are set, else a prompt
  const customLabel = isCompleteCustomRange(custom)
    ? `${DateTime.fromISO(custom.from).toFormat("d MMM")} – ${DateTime.fromISO(custom.to).toFormat(
        "d MMM"
      )}`
    : "from–to"
  const customShortLabel = isCompleteCustomRange(custom)
    ? `${DateTime.fromISO(custom.from).toFormat("d/M")}–${DateTime.fromISO(custom.to).toFormat(
        "d/M"
      )}`
    : "↔"

  function toggleAdvanced() {
    setAdvancedOpen((prev) => {
      window.sessionStorage.setItem(ADVANCED_STATS_PANEL_STORAGE_KEY, String(!prev))
      return !prev
    })
  }

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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Card className="bg-white inline-block">
                <ToggleButtonGroup
                  value={range}
                  // NOTE: using sx={...} instead of orientation={breakpointSm ? "vertical" : "horizontal"}
                  color="primary"
                  exclusive
                  sx={{ flexWrap: "wrap" }}
                  onChange={(_, value) => {
                    if (value !== null) {
                      changeRange(value)
                    }
                  }}
                >
                  {/* day/week/month — [from–to] — all: the custom toggle is a direct child
                      of the group (Fragments would break MUI's child cloning) so it stays
                      between month and all; its label becomes the chosen span once set */}
                  {[
                    ...RANGE_BUTTONS.filter((button) => button.value !== "all"),
                    { value: "custom" as Range, label: customLabel, shortLabel: customShortLabel },
                    ...RANGE_BUTTONS.filter((button) => button.value === "all"),
                  ].map(({ value, label, shortLabel }) => (
                    <ToggleButton
                      key={value}
                      value={value}
                      sx={{
                        minWidth: { xs: "48px !important", sm: "86px" },
                        px: { xs: "7px", sm: "11px" },
                      }}
                    >
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        {label}
                      </Box>
                      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                        {shortLabel}
                      </Box>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Card>
              {/* range buttons left — gap — Filters toggle (search-page pattern);
                  the filter panel expands above all charts */}
              {user?.advancedCharting && (
                <Card className="bg-white inline-block">
                  <Button
                    size="large"
                    onClick={toggleAdvanced}
                    aria-expanded={advancedOpen}
                    aria-controls="advanced-stats-panel"
                    sx={{ px: 2, py: "11px" }}
                    endIcon={
                      <KeyboardArrowDown
                        sx={{
                          transform: advancedOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    }
                  >
                    <Settings sx={{ display: { xs: "inline", sm: "none" } }} />
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                      Filters
                    </Box>
                  </Button>
                </Card>
              )}
            </Box>

            {/* the from–to window for the "custom" range — expands (same Collapse animation
                as the Filters panel) with two dream-highlighted date pickers */}
            <Collapse in={range === "custom"}>
              <Card className="bg-white" sx={{ mt: 2, p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DreamDatePicker
                      label="from"
                      value={custom?.from ? DateTime.fromISO(custom.from) : null}
                      onChange={(value) =>
                        value?.isValid && changeCustom({ from: value.toISODate()! })
                      }
                      disableFuture
                      maxDate={custom?.to ? DateTime.fromISO(custom.to) : undefined}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DreamDatePicker
                      label="to"
                      value={custom?.to ? DateTime.fromISO(custom.to) : null}
                      onChange={(value) =>
                        value?.isValid && changeCustom({ to: value.toISODate()! })
                      }
                      disableFuture
                      minDate={custom?.from ? DateTime.fromISO(custom.from) : undefined}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Collapse>
          </Grid>
        </Grid>

        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} md={8}>
            {/* opted in: everything centers around the filtered advanced chart + its facets;
                the sleep chart (range-driven, independent of the filters) slots in between
                the filter panel and the charts */}
            {user?.advancedCharting ? (
              <Suspense fallback={<LoadingSpiral />}>
                <AdvancedStats range={range} custom={custom} filtersOpen={advancedOpen}>
                  {user?.trackSleepingTime && (
                    <Box sx={{ mb: 3 }}>
                      <Suspense fallback={<LoadingSpiral />}>
                        <SleepChart range={range} custom={custom} />
                      </Suspense>
                    </Box>
                  )}
                </AdvancedStats>
              </Suspense>
            ) : (
              <Fragment>
                {/* 7th stat: full-width sleep pattern, only when bedtime/wake-up tracking is on */}
                {user?.trackSleepingTime && (
                  <Box sx={{ mb: 3 }}>
                    <Suspense fallback={<LoadingSpiral />}>
                      <SleepChart range={range} custom={custom} />
                    </Suspense>
                  </Box>
                )}
                <Suspense fallback={<LoadingSpiral />}>
                  <StaticStatsCharts range={range} custom={custom} />
                </Suspense>
              </Fragment>
            )}
          </Grid>
        </Grid>
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
