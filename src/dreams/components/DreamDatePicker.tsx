import React, { useMemo, useState } from "react"
import { DateTime } from "luxon"
import { TextField } from "@mui/material"
import { DatePicker, PickersDayProps } from "@mui/x-date-pickers"
import { useQuery } from "src/core/rpc-client"
import { getDreamsByMonth } from "src/dreams/client"
import { DreamsByMonth, renderDreamDay } from "src/dreams/components/DreamCalendarDay"

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// the dreams-page calendar queries a month as [startOfMonth - 1 day, endOfMonth + 1 day]
function monthBounds(month: DateTime): [Date, Date] {
  return [
    month.startOf("month").minus({ day: 1 }).startOf("day").toJSDate(),
    month.endOf("month").plus({ day: 1 }).startOf("day").toJSDate(),
  ]
}

export interface DreamDatePickerProps {
  label: string
  value: DateTime | null
  onChange: (value: DateTime | null) => void
  disableFuture?: boolean
  minDate?: DateTime
  maxDate?: DateTime
}

// A DatePicker whose calendar reuses the dreams-page day styling (dream days
// tinted, today cyan, selected primary). Fetches one month at a time, refetching
// as the user navigates — same cost as the dreams calendar.
export const DreamDatePicker = ({
  label,
  value,
  onChange,
  disableFuture,
  minDate,
  maxDate,
}: DreamDatePickerProps) => {
  const [viewedMonth, setViewedMonth] = useState<DateTime>(value ?? DateTime.now())
  const [monthStart, monthEnd] = useMemo(() => monthBounds(viewedMonth), [viewedMonth])

  const [dreamsByMonth] = useQuery(getDreamsByMonth, {
    where: { dreamAt: { gt: monthStart, lt: monthEnd } },
    userTimezone,
  })

  return (
    <DatePicker<DateTime>
      label={label}
      value={value}
      onChange={onChange}
      onMonthChange={(month) => setViewedMonth(month)}
      disableFuture={disableFuture}
      minDate={minDate}
      maxDate={maxDate}
      reduceAnimations
      inputFormat="dd/MM/yyyy"
      renderDay={(day, _selectedDays, pickersDayProps: PickersDayProps<DateTime>) =>
        renderDreamDay(day, dreamsByMonth as DreamsByMonth, value, pickersDayProps)
      }
      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
    />
  )
}

export default DreamDatePicker
