import { StandardTextFieldProps, TextField, InputLabelProps } from "@mui/material"
import { forwardRef, PropsWithoutRef } from "react"
import { Controller, useFormContext } from "react-hook-form"

export interface LabeledTextFieldProps
  extends PropsWithoutRef<Omit<StandardTextFieldProps, "variant">> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  /** Field type. Doesn't include radio buttons and checkboxes */
  type?: "text" | "password" | "email" | "number"
  /** Additional inputProps to customize the input element */
  inputProps?: any // Use any to avoid type incompatibility
  /** Additional InputLabelProps to customize the label */
  inputLabelProps?: InputLabelProps
}

export const LabeledTextField = forwardRef<StandardTextFieldProps, LabeledTextFieldProps>(
  ({ label, name, inputProps, inputLabelProps, ...props }, ref) => {
    const {
      control,
      formState: { isSubmitting, errors },
    } = useFormContext()

    const error: string = Array.isArray(errors[name])
      ? (errors[name] as unknown as string[])?.join(", ")
      : (errors[name]?.message as string) || (errors[name] as unknown as string)

    const controllerProps = { name, control }
    const textFieldProps: StandardTextFieldProps = {
      ...props,
      label,
      error: !!error,
      helperText: error,
      disabled: isSubmitting,
      ...(props.disabled ? { InputProps: { disabled: true } } : {}),
    }

    // Merge inputLabelProps with additional properties
    if (inputProps) {
      textFieldProps.InputProps = {
        ...textFieldProps.InputProps,
        ...inputProps,
      }
    }

    // Merge inputLabelProps with additional properties
    if (inputLabelProps) {
      textFieldProps.InputLabelProps = {
        ...textFieldProps.InputLabelProps,
        ...inputLabelProps,
      }
    }

    return (
      <Controller
        {...controllerProps}
        render={({ field }) => <TextField {...field} {...textFieldProps} />}
      />
    )
  }
)
LabeledTextField.displayName = "LabeledTextField"

export default LabeledTextField
