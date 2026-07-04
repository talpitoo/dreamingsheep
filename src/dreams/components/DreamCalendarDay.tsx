import React from "react"
import { DateTime } from "luxon"
import { styled } from "@mui/material"
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers"
import { cyan } from "@mui/material/colors"

// Shared calendar-day styling for the dreams-page calendar and the stats from/to
// pickers: days with dreams are tinted, today is cyan, the selected day is primary.
interface SelectedPickerDayProps extends PickersDayProps<DateTime> {
  hasDreams?: boolean
  numberOfDreams?: number
  selected?: boolean
  today?: boolean
  debug?: string
}

export const SelectedPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) =>
    prop !== "hasDreams" &&
    prop !== "selected" &&
    prop !== "today" &&
    prop !== "numberOfDreams" &&
    prop !== "debug",
})<SelectedPickerDayProps>(({ theme, hasDreams, numberOfDreams, selected, today, debug }) => ({
  ...(hasDreams && {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.common.black,
    transform: "translate3d(0,0,0)",
    "&:hover, &:focus": {
      backgroundColor: theme.palette.secondary.dark,
    },
    "&:after": {
      // NOTE: debug the number of dreams // NOTE: possible UTC/local timezone conflict, double-check
      fontWeight: "bold",
      opacity: 0.25,
      content: debug === "true" ? `':${numberOfDreams}'` : "''",
    },
  }),
  ...(today && {
    backgroundColor: cyan[500],
    color: theme.palette.common.white,
    transform: "translate3d(0,0,0)",
    "&:hover, &:focus": {
      backgroundColor: cyan[700],
    },
  }),
  ...(selected && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    transform: "translate3d(0,0,0)",
    "&:hover, &:focus": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
})) as React.ComponentType<SelectedPickerDayProps>

export type DreamsByMonth = Record<string, { count: number }>

// renderDay helper: highlights a day for dreams / today / the given selected date
export function renderDreamDay(
  day: DateTime,
  dreamsByMonth: DreamsByMonth,
  selectedDate: DateTime | null,
  pickersDayProps: PickersDayProps<DateTime>,
  debug?: string
) {
  const isoDate = day.toISODate() ?? "" // NOTE: possible UTC/local timezone conflict, double-check
  const entry = dreamsByMonth[isoDate]
  const numberOfDreams = entry ? entry.count : 0
  const hasDreams = !!entry
  const isToday =
    day.hasSame(DateTime.local(), "day") &&
    day.hasSame(DateTime.local(), "month") &&
    day.hasSame(DateTime.local(), "year")
  const selected =
    !!selectedDate &&
    day.hasSame(selectedDate, "day") &&
    day.hasSame(selectedDate, "month") &&
    day.hasSame(selectedDate, "year")

  return (
    <SelectedPickersDay
      {...pickersDayProps}
      today={isToday}
      selected={selected}
      hasDreams={hasDreams}
      numberOfDreams={numberOfDreams}
      debug={debug}
    />
  )
}
