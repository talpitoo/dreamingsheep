export { FORM_ERROR } from "src/core/components/Form"
import { z } from "zod"
import { Form, FormProps } from "src/core/components/Form"
import { Button, ButtonGroup, InputBase, Paper, Box, InputBaseProps } from "@mui/material"
import { forwardRef, Fragment, PropsWithoutRef, Suspense, useEffect, useState } from "react"
import { KeyboardArrowDown, Search, Settings } from "@mui/icons-material"
import ToggleButtonField from "src/core/components/ToggleButtonField"
import SymbolsAutocomplete from "./SymbolsAutocomplete"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import {
  FAVORITE_ICONS,
  MOOD_ICONS,
  RECALL_ICONS,
  TIME_ICONS,
  TYPE_ICONS,
} from "src/core/helpers/icons"
import { Controller, useFormContext, UseFormProps } from "react-hook-form"

interface SearchKeywordFieldProps extends PropsWithoutRef<Omit<InputBaseProps, "variant">> {
  /** Field name. */
  name: string
}
export const SearchKeywordField = forwardRef<InputBaseProps, SearchKeywordFieldProps>(
  ({ name, ...props }, ref) => {
    const {
      control,
      formState: { isSubmitting },
    } = useFormContext()

    const controllerProps = { name, control }
    const keywordFieldProps: InputBaseProps = {
      ...props,
      disabled: isSubmitting,
      ...(props.disabled ? { InputProps: { disabled: true } } : {}),
    }

    return (
      <Controller
        {...controllerProps}
        render={({ field }) => <InputBase {...field} {...keywordFieldProps} />}
      />
    )
  }
)
SearchKeywordField.displayName = "SearchKeywordField"

const isExpanded = (openState: "expanded" | "condensed") => openState === "expanded"

export interface DreamSearchFormProps<S extends z.ZodType<any, any>> extends Partial<FormProps<S>> {
  initialValues: UseFormProps<z.infer<S>>["defaultValues"]
}

export function DreamSearchForm<S extends z.ZodType<any, any>>({
  initialValues,
  ...props
}: DreamSearchFormProps<S>) {
  const [openState, setState] = useState<"expanded" | "condensed">("condensed")

  function toggle() {
    setState((prev) => (isExpanded(prev) ? "condensed" : "expanded"))
  }

  useEffect(() => {
    if (initialValues?.c === "TRUE") {
      setState("condensed")
    }
  }, [initialValues])

  return (
    <Fragment>
      <Form<S> {...props} id="search-dream" initialValues={initialValues}>
        <Paper sx={{ mb: 2, display: "flex", alignItems: "center" }}>
          <SearchKeywordField sx={{ ml: 1, mr: 1, flex: 1 }} name="q" placeholder="Search..." />
          <ButtonGroup size="large">
            <Button variant="outlined" endIcon={<KeyboardArrowDown />} onClick={toggle}>
              <Settings sx={{ display: { xs: "inline", sm: "none" } }} />{" "}
              <Box sx={{ display: { xs: "none", sm: "inline" } }}>Advanced</Box>
            </Button>
            <Button variant="contained" type="submit" form="search-dream">
              <Search />
            </Button>
          </ButtonGroup>
        </Paper>

        {isExpanded(openState) && (
          <Paper sx={{ mb: 2, p: 2 }}>
            <ToggleButtonField
              label="favorite"
              name="favorite"
              exclusive={true}
              buttons={FAVORITE_ICONS}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="time"
              name="time"
              exclusive={false}
              buttons={TIME_ICONS}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="mood"
              name="mood"
              exclusive={false}
              buttons={MOOD_ICONS}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="recall"
              exclusive={false}
              name="recall"
              buttons={RECALL_ICONS}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="type"
              name="type"
              exclusive={false}
              buttons={TYPE_ICONS}
              className="mb-4 flex-wrap"
            />

            <Suspense fallback={<LoadingSpiral />}>
              <SymbolsAutocomplete />
            </Suspense>
          </Paper>
        )}
      </Form>
    </Fragment>
  )
}
