import { rpcFetch, useMutation, useQuery } from "src/core/rpc-client"
import { Form } from "src/core/components/Form"
export { FORM_ERROR } from "src/core/components/Form"
import { Button, Grid, Snackbar, TextField, TextFieldProps } from "@mui/material"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { TimePicker, TimePickerProps } from "@mui/x-date-pickers/TimePicker"
import {
  forwardRef,
  Fragment,
  JSXElementConstructor,
  PropsWithoutRef,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from "react"
import { FORM_ERROR } from "src/core/components/Form"
import { createSleepingTime } from "src/sleepingTimes/client"
import { updateSleepingTime } from "src/sleepingTimes/client"
import { Controller, useFormContext } from "react-hook-form"
import { DateTime } from "luxon"
import { getSleepingTime } from "src/sleepingTimes/client"
import { BEDTIME_NIGHT_CUTOFF_HOUR, bedtimeNightTarget } from "src/sleepingTimes/helpers"

function getISODateString(date: Date | null) {
  if (date) {
    return DateTime.fromJSDate(date).set({ second: 0, millisecond: 0 }).toISO()
  }
  return null
}

// the current time snapped to the historic 5-minute grid: wake-up rounds DOWN
// (7:08 -> 7:05 — you were already awake), bedtime rounds UP (21:03 -> 21:05 —
// you're not asleep yet)
function nowOnFiveMinuteGrid(rounding: "floor" | "ceil"): Date {
  const now = new Date()
  const minutes =
    rounding === "ceil" ? Math.ceil(now.getMinutes() / 5) * 5 : Math.floor(now.getMinutes() / 5) * 5
  now.setMinutes(minutes, 0, 0) // 60 rolls over into the next hour
  return now
}

interface TimePickerFieldProps
  extends PropsWithoutRef<Omit<Partial<TimePickerProps<Date, Date>>, "variant">> {
  /** Field name. */
  name: string
  /** Field renderInput. */
  renderInput: (props: TextFieldProps) => ReactElement<any, string | JSXElementConstructor<any>>
  onChangeSubmit: (value: Date) => void
  /** adds an inline "now" button; how the current time snaps to the 5-minute grid */
  nowRounding?: "floor" | "ceil"
  /**
   * intercepts the "now" button only (never picker-typed values): return true
   * when the value was handled elsewhere — the field and the default submit
   * are then left untouched (used by the after-midnight bedtime shift)
   */
  onNowPressed?: (value: Date) => boolean | Promise<boolean>
}

const TimePickerField = forwardRef<Partial<TimePickerProps<Date, Date>>, TimePickerFieldProps>(
  ({ name, renderInput, onChangeSubmit, nowRounding, onNowPressed, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [timePickerValue, setTimePickerValue] = useState<Date | null>(null)
    const {
      control,
      formState: { isSubmitting },
    } = useFormContext()

    const controllerProps = { name, control }
    const timePickerProps: Partial<TimePickerProps<Date, Date>> = {
      ...props,
      disabled: isSubmitting,
      ...(props.disabled ? { InputProps: { disabled: true } } : {}),
    }

    useEffect(() => {
      if (!isOpen && timePickerValue) {
        onChangeSubmit(timePickerValue)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, timePickerValue])

    return (
      <Controller
        {...controllerProps}
        render={({ field: { onChange, value } }) => (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TimePicker
              {...timePickerProps}
              value={value}
              onChange={(val) => {
                onChange(val)
                setTimePickerValue(val)
              }}
              renderInput={(params) =>
                renderInput(
                  nowRounding
                    ? {
                        ...params,
                        InputProps: {
                          ...params.InputProps,
                          endAdornment: (
                            <Fragment>
                              <Button
                                size="small"
                                color="primary"
                                disabled={isSubmitting}
                                sx={{ minWidth: 0, px: 1 }}
                                // keep the tap from focusing/opening the picker (mobile
                                // variant opens its dialog on any click into the field)
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={async (event) => {
                                  event.stopPropagation()
                                  const nowValue = nowOnFiveMinuteGrid(nowRounding)
                                  const handled = onNowPressed
                                    ? await onNowPressed(nowValue)
                                    : false
                                  if (!handled) {
                                    onChange(nowValue)
                                    onChangeSubmit(nowValue)
                                  }
                                }}
                              >
                                now
                              </Button>
                              {params.InputProps?.endAdornment}
                            </Fragment>
                          ),
                        },
                      }
                    : params
                )
              }
              open={isOpen}
              onOpen={() => setIsOpen(true)}
              onClose={() => setIsOpen(false)}
            />
          </LocalizationProvider>
        )}
      />
    )
  }
)
TimePickerField.displayName = "TimePickerField"

export interface SleepingTimeFormProps {
  currentDate: string
}

export function SleepingTimeForm({ currentDate }: SleepingTimeFormProps) {
  const [sleepingTime, { isLoading, refetch }] = useQuery(getSleepingTime, {
    where: { sleepingAt: currentDate },
  })
  const [createSleepingTimeMutation] = useMutation(createSleepingTime)
  const [updateSleepingTimeMutation] = useMutation(updateSleepingTime)
  const [toast, setToast] = useState<ReactNode>(null)

  // night-anchoring (see the spec): a bedtime "now" press belongs to the night
  // derived from the CLOCK — before noon means you're up past midnight and the
  // value files to the previous day's row. Returns true when handled here so
  // the viewed day's field stays untouched.
  async function saveBedtimeToNight(value: Date): Promise<boolean> {
    const targetDay = bedtimeNightTarget(value)
    if (!targetDay || targetDay === currentDate) return false
    try {
      const existing = await rpcFetch("getSleepingTime", { where: { sleepingAt: targetDay } })
      if (!existing) {
        await createSleepingTimeMutation({
          bedtime: getISODateString(value),
          wakeUpTime: null,
          sleepingAt: targetDay,
        })
      } else {
        await updateSleepingTimeMutation({
          bedtime: getISODateString(value),
          wakeUpTime: getISODateString(existing.wakeUpTime),
          sleepingAt: targetDay,
          id: existing.id,
        })
      }
      const prefix =
        DateTime.fromJSDate(value).hour < BEDTIME_NIGHT_CUTOFF_HOUR ? "after midnight — " : ""
      setToast(
        <span className="flex items-center gap-2">
          <span className="lucidicon-starry-night h-5 w-5 text-xl"></span>
          {`${prefix}saved as ${DateTime.fromISO(targetDay).toFormat("MMM d")}'s bedtime`}
        </span>
      )
    } catch (error: any) {
      setToast(`could not save the bedtime: ${error.toString()}`)
    }
    return true
  }

  return (
    <Fragment>
      {!isLoading && (
        <Form
          id="sleepingTime"
          initialValues={!sleepingTime ? { bedtime: null, wakeUpTime: null } : sleepingTime}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TimePickerField
                label="wake-up time"
                name="wakeUpTime"
                className="translate-x-0 translate-y-0 transform-gpu"
                minutesStep={5}
                nowRounding="floor"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="wake-up time"
                    InputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="text-outline translate-x-0 translate-y-0 transform-gpu"
                  />
                )}
                onChangeSubmit={async (value) => {
                  try {
                    if (!sleepingTime) {
                      await createSleepingTimeMutation({
                        bedtime: null,
                        wakeUpTime: getISODateString(value),
                        sleepingAt: currentDate,
                      })
                    } else {
                      await updateSleepingTimeMutation({
                        bedtime: getISODateString(sleepingTime.bedtime),
                        wakeUpTime: getISODateString(value),
                        sleepingAt: currentDate,
                        id: sleepingTime.id,
                      })
                    }
                    refetch()
                  } catch (error: any) {
                    return { [FORM_ERROR]: error.toString() }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePickerField
                label="bedtime"
                name="bedtime"
                className="translate-x-0 translate-y-0 transform-gpu"
                minutesStep={5}
                nowRounding="ceil"
                onNowPressed={saveBedtimeToNight}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="bedtime"
                    InputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="text-outline translate-x-0 translate-y-0 transform-gpu"
                  />
                )}
                onChangeSubmit={async (value) => {
                  try {
                    if (!sleepingTime) {
                      await createSleepingTimeMutation({
                        bedtime: getISODateString(value),
                        wakeUpTime: null,
                        sleepingAt: currentDate,
                      })
                    } else {
                      await updateSleepingTimeMutation({
                        bedtime: getISODateString(value),
                        wakeUpTime: getISODateString(sleepingTime.wakeUpTime),
                        sleepingAt: currentDate,
                        id: sleepingTime.id,
                      })
                    }
                    refetch()
                  } catch (error: any) {
                    return { [FORM_ERROR]: error.toString() }
                  }
                }}
              />
            </Grid>
          </Grid>
        </Form>
      )}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Fragment>
  )
}
