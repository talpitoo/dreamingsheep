import { useMutation, useQuery } from "@blitzjs/rpc"
import { Form } from "src/core/components/Form"
export { FORM_ERROR } from "src/core/components/Form"
import { Button, Grid, TextField, TextFieldProps } from "@mui/material"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { TimePicker, TimePickerProps } from "@mui/x-date-pickers/TimePicker"
import {
  forwardRef,
  Fragment,
  JSXElementConstructor,
  PropsWithoutRef,
  ReactElement,
  useEffect,
  useState,
} from "react"
import { FORM_ERROR } from "src/core/components/Form"
import createSleepingTime from "src/sleepingTimes/mutations/createSleepingTime"
import updateSleepingTime from "src/sleepingTimes/mutations/updateSleepingTime"
import { Controller, useFormContext } from "react-hook-form"
import { DateTime } from "luxon"
import getSleepingTime from "../queries/getSleepingTime"

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
}

const TimePickerField = forwardRef<Partial<TimePickerProps<Date, Date>>, TimePickerFieldProps>(
  ({ name, renderInput, onChangeSubmit, nowRounding, ...props }, ref) => {
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
                                onClick={(event) => {
                                  event.stopPropagation()
                                  const nowValue = nowOnFiveMinuteGrid(nowRounding)
                                  onChange(nowValue)
                                  onChangeSubmit(nowValue)
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
    </Fragment>
  )
}
