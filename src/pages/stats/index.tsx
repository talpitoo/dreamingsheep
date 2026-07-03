import Image from "next/image"
import { useSession } from "@blitzjs/auth"
import { BlitzPage, Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import React, { Fragment, Suspense, useEffect, useMemo, useState } from "react"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import Layout from "src/core/layouts/Layout"
import { Button, Container, Grid, Card, ToggleButtonGroup, ToggleButton, Box } from "@mui/material"
import { KeyboardArrowDown, Settings } from "@mui/icons-material"
import titleStats from "public/assets/title-stats.png"
import sheepStats from "public/assets/sheep-stats.png"
import getDreams from "src/dreams/queries/getDreams"
import { StatGoogleChart } from "src/stats/components/StatGoogleChart"
import moment from "moment"
import { StatSymbolChart } from "src/stats/components/StatSymbolChart"
import { AdvancedStats } from "src/stats/components/AdvancedStats"
import { SleepChart } from "src/stats/components/SleepChart"
import { setChartsData } from "src/stats/helpers/chartsData"
import {
  Range,
  RANGE_TO_DAYS,
  RANGE_BUTTONS,
  STATS_RANGE_STORAGE_KEY,
  ADVANCED_STATS_PANEL_STORAGE_KEY,
} from "src/stats/helpers/range"
import LoadingSpiral from "src/core/components/LoadingSpiral"
// import { useTheme } from "@mui/material/styles"
// NOTE: not used but keeping it here for syntax reference: import useMediaQuery from "@mui/material/useMediaQuery"

// NOTE: kept for backwards compatibility, the implementation moved to src/stats/helpers/chartsData
export { setChartsData } from "src/stats/helpers/chartsData"

const StaticStatsCharts = ({ range }: { range: Range }) => {
  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const [{ dreams }, { isLoading }] = useQuery(getDreams, {
    orderBy: { dreamAt: "asc" },
    where: {
      ...(range !== "all" && {
        dreamAt: {
          gte: currentMoment.clone().subtract(RANGE_TO_DAYS[range]!, "days").toISOString(),
          lte: currentMoment.clone().add(1, "days").toISOString(),
        },
      }),
    },
  })
  const chartsData = useMemo(() => {
    return setChartsData(range, dreams)
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
  const [range, setRange] = useState<Range>("3months")
  // advanced filter panel, toggled like the search page's "Advanced" button
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // restore the last selected range + panel state within this browser session
  useEffect(() => {
    const saved = window.sessionStorage.getItem(STATS_RANGE_STORAGE_KEY)
    if (saved && saved in RANGE_TO_DAYS) {
      setRange(saved as Range)
    }
    setAdvancedOpen(window.sessionStorage.getItem(ADVANCED_STATS_PANEL_STORAGE_KEY) === "true")
  }, [])

  function changeRange(value: Range) {
    setRange(value)
    window.sessionStorage.setItem(STATS_RANGE_STORAGE_KEY, value)
  }

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
                  {RANGE_BUTTONS.map(({ value, label, shortLabel }) => (
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
              {/* range buttons left — gap — Advanced toggle (search-page pattern);
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
                      Advanced
                    </Box>
                  </Button>
                </Card>
              )}
            </Box>
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
                <AdvancedStats range={range} filtersOpen={advancedOpen}>
                  {user?.trackSleepingTime && (
                    <Box sx={{ mb: 3 }}>
                      <Suspense fallback={<LoadingSpiral />}>
                        <SleepChart range={range} />
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
                      <SleepChart range={range} />
                    </Suspense>
                  </Box>
                )}
                <Suspense fallback={<LoadingSpiral />}>
                  <StaticStatsCharts range={range} />
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
