import {
  Checkbox,
  CheckboxProps,
  IconButton,
  InputAdornment,
  StandardTextFieldProps,
  TextField,
  InputLabelProps,
} from "@mui/material"
import { forwardRef, PropsWithoutRef } from "react"
import { Controller, useFormContext } from "react-hook-form"

export interface CheckboxFieldProps extends CheckboxProps {
  name: string
}

const FavoriteField = ({ name, ...props }: CheckboxFieldProps) => {
  const {
    control,
    formState: { isSubmitting },
  } = useFormContext()

  const favoriteFieldControllerProps = { name, control }

  return (
    <Controller
      {...favoriteFieldControllerProps}
      render={({ field: { onChange, value } }) => (
        <InputAdornment position="end">
          <Checkbox sx={{ display: "none", displayPrint: "block" }} {...props} checked={value} />
          <IconButton
            sx={{ mr: 0 }}
            aria-label="favorite"
            edge="end"
            onClick={() => onChange(!value)}
            disabled={props.disabled || isSubmitting}
          >
            {value ? (
              <span className="lucidicon lucidicon-star-full text-xl leading-none"></span>
            ) : (
              <span className="lucidicon lucidicon-star text-xl leading-none"></span>
            )}
          </IconButton>
        </InputAdornment>
      )}
    />
  )
}

export interface LabeledTextFieldFavoriteProps
  extends PropsWithoutRef<Omit<StandardTextFieldProps, "variant">> {
  /** Input Field name. */
  textFieldName: string
  /** Field label. */
  textFieldLabel: string
  /** Input Field placeholder. */
  textFieldPlaceHolder: string
  /** Field type. Doesn't include radio buttons and checkboxes */
  textFieldType?: "text" | "password" | "email" | "number"
  /** Favorite Field name. */
  favoriteFieldName: string
}

export const LabeledTextFieldFavorite = forwardRef<
  StandardTextFieldProps,
  LabeledTextFieldFavoriteProps
>(
  (
    {
      textFieldName,
      textFieldLabel,
      textFieldPlaceHolder,
      textFieldType,
      favoriteFieldName,
      ...props
    },
    ref
  ) => {
    const {
      control,
      formState: { isSubmitting, errors },
    } = useFormContext()

    const error: string = Array.isArray(errors[textFieldName])
      ? (errors[textFieldName] as unknown as string[])?.join(", ")
      : (errors[textFieldName]?.message as string) || (errors[textFieldName] as unknown as string)

    const textFieldControllerProps = { name: textFieldName, control }
    const textFieldProps: StandardTextFieldProps = {
      ...props,
      name: textFieldName,
      label: textFieldLabel,
      placeholder: textFieldPlaceHolder,
      type: textFieldType,
      error: !!error,
      helperText: error,
      disabled: isSubmitting,
      ...(props.disabled ? { InputProps: { disabled: true } } : {}),
    }

    return (
      <Controller
        {...textFieldControllerProps}
        render={({ field }) => (
          <TextField
            {...field}
            {...textFieldProps}
            InputLabelProps={{ shrink: true, disableAnimation: true }}
            InputProps={{
              sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
              endAdornment: (
                <InputAdornment position="end">
                  <FavoriteField name={favoriteFieldName} disabled={props.disabled} />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    )
  }
)
LabeledTextFieldFavorite.displayName = "LabeledTextFieldFavorite"

export default LabeledTextFieldFavorite
