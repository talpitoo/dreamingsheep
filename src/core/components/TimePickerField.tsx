import { forwardRef, PropsWithoutRef } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { TimePicker, TimePickerProps } from "@mui/x-date-pickers/TimePicker"

export interface TimePickerFieldProps
  extends PropsWithoutRef<Omit<TimePickerProps<String, Date>, "variant">> {
  /** Field name. */
  name: string
}

export const TimePickerField = forwardRef<TimePickerProps<String, Date>, TimePickerFieldProps>(
  ({ name, ...props }, ref) => {
    const {
      control,
      formState: { isSubmitting },
    } = useFormContext()

    const controllerProps = { name, control }
    const timePickerProps: TimePickerProps<String, Date> = {
      ...props,
      disabled: isSubmitting,
      ...(props.disabled ? { InputProps: { disabled: true } } : {}),
    }

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
              }}
            />
          </LocalizationProvider>
        )}
      />
    )
  }
)
TimePickerField.displayName = "TimePickerField"

export default TimePickerField
