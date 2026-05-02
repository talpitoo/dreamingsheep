import {
  FormLabel,
  StandardTextFieldProps,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  ToggleButtonGroupProps,
} from "@mui/material"
import classnames from "src/utils/classnames"
import React, { forwardRef, PropsWithoutRef } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { useUIDSeed } from "react-uid"

function handleChanges(val: any, onChange: () => void, required = false, exclusive = false) {
  if ((required && ((exclusive && val !== null) || (!exclusive && val?.length))) || !required) {
    onChange()
  }
}

export interface ToggleButtonFieldProps
  extends PropsWithoutRef<Omit<ToggleButtonGroupProps, "variant">> {
  /** Field name. */
  name: string
  label: string
  buttons: { label?: string; value: string | number; icon?: string }[]
  required?: boolean
}

export const ToggleButtonField = forwardRef<ToggleButtonGroupProps, ToggleButtonFieldProps>(
  ({ name, buttons, label, required = false, ...props }, ref) => {
    const seed = useUIDSeed()
    const {
      control,
      formState: { errors },
    } = useFormContext()

    const error = Array.isArray(errors[name])
      ? (errors[name] as unknown as string[])?.join(", ")
      : errors[name]?.message || errors[name]

    const controllerProps = { name, control }
    const groupFieldProps: ToggleButtonGroupProps = {
      color: "primary",
      exclusive: true,
      ...props,
    }

    return (
      <Controller
        {...controllerProps}
        render={({ field }) => (
          <div className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <ToggleButtonGroup
              {...field}
              {...groupFieldProps}
              onChange={(_, val) => {
                handleChanges(val, () => field.onChange(val), required, groupFieldProps.exclusive)
              }}
            >
              {buttons.map((button) => (
                <ToggleButton key={seed(button.value)} value={button.value}>
                  <span className="flex flex-col items-center justify-center">
                    <span
                      className={classnames(
                        button.icon,
                        button.label ? "mb-1 h-5 w-5 text-2xl" : "w-8 h-8 text-2xl"
                      )}
                    />
                    {button.label}
                  </span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        )}
      />
    )
  }
)
ToggleButtonField.displayName = "ToggleButtonField"

export default ToggleButtonField
