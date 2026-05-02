import { Checkbox, CheckboxProps } from "@mui/material"
import { forwardRef, PropsWithoutRef } from "react"
import { Controller, useFormContext } from "react-hook-form"

export interface CheckboxFieldProps extends PropsWithoutRef<Omit<CheckboxProps, "variant">> {
  name: string
}

export const CheckboxField = forwardRef<CheckboxProps, CheckboxFieldProps>(
  ({ name, ...props }, ref) => {
    const {
      control,
      formState: { isSubmitting },
    } = useFormContext()

    const controllerProps = { name, control }
    const checkboxFieldProps: CheckboxProps = {
      ...props,
      disabled: isSubmitting || props.disabled,
    }

    return (
      <Controller
        {...controllerProps}
        render={({ field: { onChange, value } }) => (
          <Checkbox
            {...checkboxFieldProps}
            checked={value}
            onChange={(_, checked) => onChange(checked)}
          />
        )}
      />
    )
  }
)
CheckboxField.displayName = "CheckboxField"

export default CheckboxField
