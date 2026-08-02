import Image from "next/image"
import { useRouter } from "next/router"
import { usePaginatedQuery, useMutation, useQuery, invalidateQuery } from "src/core/rpc-client"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import Layout from "src/core/layouts/Layout"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import { getDreams } from "src/dreams/client"
import { CreateDream } from "src/dreams/validations"
import { createDream } from "src/dreams/client"
import React, { Fragment, Suspense, useEffect, useMemo, useState } from "react"
import { DateTime } from "luxon"
import titleDreams from "public/assets/title-dreams.png"
import sheepDreams from "public/assets/sheep-dreamingsheep.png"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import {
  Button,
  Card,
  CardContent,
  CardActions,
  Container,
  Grid,
  TextField,
  Box,
} from "@mui/material"
import { PickersDayProps, StaticDatePicker } from "@mui/x-date-pickers"
import { getDreamsByMonth } from "src/dreams/client"
import { renderDreamDay } from "src/dreams/components/DreamCalendarDay"
import { DreamItemFooter, DreamList } from "src/dreams/components/DreamList"
import { DreamForm, FORM_ERROR, FORM_RESET } from "src/dreams/components/DreamForm"
import { SleepingTimeForm } from "src/sleepingTimes/components/SleepingTimeForm"
import { DreamTime, DreamType, RecallTime } from "db"
import { ITEMS_PER_PAGE } from "src/core/constants/general"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

function getDateTime(date: string | string[] | undefined): DateTime {
  if (typeof date === "string") {
    return DateTime.fromFormat(date, "yyyy-MM-dd")
  }
  return DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
}

function getParamDateOrDefault(date: string | string[] | undefined): Date {
  return getDateTime(date).toJSDate()
}

function getTomorrow(today: Date): Date {
  return DateTime.fromJSDate(today)
    .plus({ day: 1 })
    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toJSDate()
}

function getCurrentMonthRange(today: Date): [Date, Date] {
  return [
    DateTime.fromJSDate(today)
      .startOf("month")
      .minus({ day: 1 }) // NOTE: it seems we have to subtract one day
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
      .toJSDate(),
    DateTime.fromJSDate(today)
      .endOf("month")
      .plus({ day: 1 }) // NOTE: it seems we have to add one more day
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
      .toJSDate(),
  ]
}

// determine the user's timezone on the client-side
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export const DreamsCalendar = () => {
  const router = useRouter()
  const today = useMemo(() => getParamDateOrDefault(router.query.date), [router.query.date]) // today will be the date set on param (default: current date)
  const paramDate = useMemo(() => getParamDateOrDefault(router.query.date), [router.query.date]) // paramDate will be the date set on param (default: current month)
  const month = useMemo(() => getCurrentMonthRange(paramDate), [paramDate]) // current month will be based on the value of paramDate
  const debugParam = router.query.debug?.toString()

  const [dreamsByMonth] = useQuery(getDreamsByMonth, {
    where: { dreamAt: { gt: month[0], lt: month[1] } },
    userTimezone: userTimezone, // add userTimezone as a parameter
  })

  if (debugParam === "true") {
    console.debug(`userTimezone ${userTimezone}`)
    console.debug("[dreamsByMonth] " + JSON.stringify(dreamsByMonth, null, 2))
  }

  const renderWeekPickerDay = (
    day: DateTime,
    selectedDates: Array<DateTime | null>,
    pickersDayProps: PickersDayProps<DateTime>
  ) => renderDreamDay(day, dreamsByMonth, DateTime.fromJSDate(today), pickersDayProps, debugParam)

  return (
    <StaticDatePicker<DateTime>
      openTo="day"
      value={DateTime.fromJSDate(today)}
      disableFuture
      reduceAnimations
      renderDay={renderWeekPickerDay}
      shouldDisableYear={(value) =>
        value < DateTime.fromFormat("yyyy-MM-dd", "2020-01-01").startOf("day")
      }
      onMonthChange={(value) => {
        router.push(Routes.DreamsPage({ date: value.toFormat("yyyy-MM-dd") }))
      }}
      onChange={(newValue) => {
        const date = newValue
          ? newValue.toISODate()
          : DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISODate()
        router.push(Routes.DreamsPage({ date: date }))
      }}
      renderInput={(params) => <TextField {...params} />}
      inputFormat="dd/MM/yyyy"
      componentsProps={{
        actionBar: {
          actions: [],
        },
      }}
      showToolbar={false}
      className="translate-x-0 translate-y-0 transform-gpu"
    />
  )
}

export const DreamsList = () => {
  const router = useRouter()
  const query = router.query.q as string | undefined
  const today = useMemo(() => getParamDateOrDefault(router.query.date), [router.query.date]) // today will be the date set on param (default: current date)
  const tomorrow = useMemo(() => getTomorrow(today), [today])

  // convert today and tomorrow to local timezone before the DB query // NOTE: possible UTC/local timezone conflict, double-check
  const localToday = DateTime.fromJSDate(today).setZone(userTimezone).toJSDate()
  const localTomorrow = DateTime.fromJSDate(tomorrow).setZone(userTimezone).toJSDate()

  const [{ dreams, count }, { isLoading, refetch }] = usePaginatedQuery(getDreams, {
    orderBy: { id: "asc" },
    skip: 0,
    take: ITEMS_PER_PAGE,
    ...(query
      ? { where: { OR: [{ title: { contains: query } }, { description: { contains: query } }] } }
      : { where: { dreamAt: { gte: localToday, lt: localTomorrow } } }),
  })

  return (
    <DreamList
      isLoading={isLoading}
      dreams={dreams}
      count={count}
      refetchList={refetch}
      noDreamMessage={query ? "No dreams matching your query." : "No dreams on this day yet."}
    />
  )
}

const DreamsPage: BlitzPage = () => {
  const router = useRouter()
  const user = useCurrentUser()
  const query = router.query.q
  const currentDate = useMemo(() => getDateTime(router.query.date).toISO(), [router.query.date])
  const debugParam = router.query.debug?.toString()

  if (debugParam === "true") {
    console.debug(`currentDate ${currentDate}`)
  }

  const [createDreamMutation, { isLoading: isCreateDreamLoading }] = useMutation(createDream)
  const createDreamFormInitialValues = {
    dreamAt: "",
    title: "",
    description: "",
    type: "REGULAR" as DreamType,
    time: "NIGHT" as DreamTime,
    recall: "N_A" as RecallTime,
    mood: 3,
    favorite: false,
    symbols: [] as Symbol[],
  }
  const [createDreamFormValues, setCreateDreamFormValues] = useState<any>(
    createDreamFormInitialValues
  )
  const [showForm, setShowForm] = useState(false)

  // set default date query
  useEffect(() => {
    if (!router.query.date) {
      router.push(
        Routes.DreamsPage({
          date: DateTime.now()
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toFormat("yyyy-MM-dd"),
        })
      )
    }
  }, [router])

  return (
    <Fragment>
      <Container>
        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} sm={5} md={3} lg={4}>
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
                src={sheepDreams}
                alt="dreams sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </Box>
          </Grid>
          <Grid
            item
            xs={12}
            sm={7}
            md={5}
            lg={4}
            sx={{ overflowX: "hidden", marginBottom: { xs: "2rem", sm: "0" }, borderRadius: "4px" }}
          >
            {!query && (
              <Suspense
                fallback={
                  <Box sx={{ height: "100%", display: "flex", minHeight: "21rem" }}>
                    <LoadingSpiral />
                  </Box>
                }
              >
                <Box className="xsmax:-mx-8">
                  <DreamsCalendar />
                </Box>
              </Suspense>
            )}
          </Grid>
        </Grid>

        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} md={8}>
            <h1 className="heading inline-flex items-center">
              <Image src={titleDreams} alt="Dreams" width="100" height="55" />{" "}
              {/* <span className="text-base font-normal ml-4"> May 18, 2022</span> */}
              <span className="sr-only">Dreams</span>
            </h1>

            {user?.trackSleepingTime && (
              <Grid container sx={{ mt: { xs: -4, sm: -11 }, mb: 2 }} spacing={2}>
                <Grid item xs={12} sm={5} lg={6}></Grid>
                <Grid item xs={12} sm={7} lg={6}>
                  <Suspense fallback={<LoadingSpiral />}>
                    <SleepingTimeForm key={currentDate} currentDate={currentDate} />
                  </Suspense>
                </Grid>
              </Grid>
            )}

            <Suspense fallback={<LoadingSpiral />}>
              <DreamsList />
            </Suspense>

            <p className="mt-4 text-right">
              <Button variant="contained" onClick={() => setShowForm(true)}>
                New dream
              </Button>
            </p>

            {showForm && (
              <Grid className="mt-4">
                <Card className="-mx-4">
                  <CardContent>
                    <DreamForm
                      id="create-dream"
                      schema={CreateDream}
                      initialValues={createDreamFormInitialValues}
                      onSubmit={async (values) => {
                        try {
                          const nowDate = DateTime.now()
                            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                            .toISO()

                          // add the current hours/minutes/seconds... to currentDate so that the difference is exactly 24 hours
                          const currentDateTimestampUtc = DateTime.fromISO(currentDate)
                            .set({
                              hour: DateTime.now().hour,
                              minute: DateTime.now().minute,
                              second: DateTime.now().second,
                            })
                            .toUTC()
                            .toISO()

                          if (debugParam === "true") {
                            console.debug(
                              `currentDate/currentDateTimestampUtc ${currentDate}/${currentDateTimestampUtc}`
                            )
                            console.debug(
                              `currentDate/nowDate/equal? ${currentDate}/${nowDate}/${
                                currentDate === nowDate
                              }`
                            )
                          }

                          values.dreamAt =
                            currentDate === nowDate
                              ? DateTime.now().toUTC().toISO()
                              : currentDateTimestampUtc // NOTE: possible UTC/local timezone conflict, double-check

                          await createDreamMutation(values)
                          invalidateQuery(getDreams)
                          invalidateQuery(getDreamsByMonth)
                          setShowForm(false)
                          return { [FORM_RESET]: true }
                        } catch (error: any) {
                          return {
                            [FORM_ERROR]: error.toString(),
                          }
                        }
                      }}
                      onValuesChange={(values) => setCreateDreamFormValues(values)}
                    />
                  </CardContent>
                  <CardActions className="p-4 flex flex-column">
                    <div className="grow">
                      <DreamItemFooter
                        time={createDreamFormValues?.time}
                        mood={createDreamFormValues?.mood}
                        recall={createDreamFormValues?.recall}
                        type={createDreamFormValues?.type}
                        symbols={createDreamFormValues?.symbols}
                      />
                    </div>
                    <div className="flex flex-row">
                      <Button
                        onClick={() => {
                          setShowForm(false)
                          setCreateDreamFormValues(createDreamFormInitialValues)
                        }}
                        disabled={isCreateDreamLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="primary"
                        variant="contained"
                        type="submit"
                        form="create-dream"
                        sx={{ ml: 2 }}
                        disabled={isCreateDreamLoading}
                        className={`w-auto transition-all ease-in-out duration-300 ${
                          isCreateDreamLoading ? "max-w-[87px]" : "max-w-[64px]"
                        }`}
                        endIcon={
                          isCreateDreamLoading && <HourglassTopIcon className="opacity-50" />
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </CardActions>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

DreamsPage.authenticate = true
DreamsPage.getLayout = (page) => <Layout title="Dreams">{page}</Layout>

export default DreamsPage
