import React, { PropsWithoutRef, ReactNode, useEffect, useState } from "react"
import { FormProvider, useForm, UseFormProps } from "react-hook-form"
import { z } from "zod"

import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Typography } from "@mui/material"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export interface FormProps<S extends z.ZodType<any, any>>
  extends Omit<PropsWithoutRef<JSX.IntrinsicElements["form"]>, "onSubmit"> {
  /** All your form fields */
  children?: ReactNode
  /** Text to display in the submit button */
  submitText?: string
  schema?: S
  onSubmit?: (values: z.infer<S>) => Promise<void | OnSubmitResult>
  initialValues?: UseFormProps<z.infer<S>>["defaultValues"]
  onAfterReset?: () => void
  resetValues?: UseFormProps<z.infer<S>>["defaultValues"]
  resetOnInitialValuesChange?: boolean
  onValuesChange?: (values: z.infer<S>) => void
}

interface OnSubmitResult {
  FORM_RESET?: boolean
  FORM_ERROR?: string
  [prop: string]: any
}

export const FORM_RESET = "FORM_RESET"

export const FORM_ERROR = "FORM_ERROR"

export function Form<S extends z.ZodType<any, any>>({
  children,
  submitText,
  schema,
  initialValues,
  onSubmit,
  onAfterReset,
  resetValues = initialValues,
  resetOnInitialValuesChange = false,
  onValuesChange,
  ...props
}: FormProps<S>) {
  const ctx = useForm<z.infer<S>>({
    mode: "onBlur",
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: initialValues,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const submitFn = ctx.handleSubmit(async (values) => {
    const result = (await onSubmit?.(values)) || {}
    for (const [key, value] of Object.entries(result)) {
      if (key === FORM_RESET && value) {
        ctx.reset(resetValues)
      }
      if (key === FORM_ERROR) {
        setFormError(value)
      } else {
        ctx.setError(key as any, { type: "submit", message: value })
      }
    }
  })

  const resetForm = () => {
    ctx.reset(resetValues)
    onAfterReset?.()
  }

  useEffect(() => {
    if (resetOnInitialValuesChange && initialValues) {
      ctx.reset(initialValues)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetOnInitialValuesChange, initialValues, ctx.reset])

  useEffect(() => {
    const subscription = ctx.watch((values) => onValuesChange?.(values))
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onValuesChange, ctx.watch])

  return (
    <FormProvider {...ctx}>
      <form onSubmit={submitFn} onReset={resetForm} className="form" {...props}>
        {/* Form fields supplied as children are rendered here */}
        {children}

        {formError && (
          <Typography variant="caption" sx={{ color: "red" }}>
            {formError}
          </Typography>
        )}

        {submitText && (
          <div className="pt-5">
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={ctx.formState.isSubmitting}
              endIcon={ctx.formState.isSubmitting && <HourglassTopIcon className="opacity-50" />}
              fullWidth
            >
              {submitText}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}

export default Form
