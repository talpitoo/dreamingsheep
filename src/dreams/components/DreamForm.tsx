import { Form, FormProps } from "src/core/components/Form"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { z } from "zod"
export { FORM_ERROR, FORM_RESET } from "src/core/components/Form"
import { Button } from "@mui/material"
import { Fragment, Suspense, useState } from "react"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import ToggleButtonField from "src/core/components/ToggleButtonField"
import CreateInstantSymbolDialog from "./CreateInstantSymbolDialog"
import SymbolsAutocomplete from "./SymbolsAutocomplete"
import LoadingSpiral from "src/core/components/LoadingSpiral"

import { MOOD_ICONS, RECALL_ICONS, TIME_ICONS, TYPE_ICONS } from "src/core/helpers/icons"
import LabeledTextFieldFavorite from "src/core/components/LabeledTextFieldFavorite"

const isExpanded = (openState: "expanded" | "condensed") => openState === "expanded"

export function DreamForm<S extends z.ZodType<any, any>>(props: FormProps<S>) {
  const [openState, setState] = useState<"expanded" | "condensed">("condensed")
  const buttonText = isExpanded(openState) ? "Less" : "More"
  const buttonIcon = isExpanded(openState) ? <KeyboardArrowUp /> : <KeyboardArrowDown />

  function toggle() {
    setState((prev) => (isExpanded(prev) ? "condensed" : "expanded"))
  }

  return (
    <Fragment>
      <Form<S> {...props}>
        <LabeledTextFieldFavorite
          textFieldName="title"
          textFieldLabel="title"
          textFieldPlaceHolder="title"
          favoriteFieldName="favorite"
          fullWidth
          // className="rounded-top"
          inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
          // inputLabelProps={{ shrink: true, disableAnimation: true }}
          className="translate-x-0 translate-y-0 transform-gpu"
        />
        <LabeledTextField
          name="description"
          label="description"
          placeholder="description"
          multiline
          fullWidth
          // className="rounded-bottom"
          inputProps={{
            sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
          }}
          inputLabelProps={{ shrink: true, disableAnimation: true }}
          className="translate-x-0 translate-y-0 transform-gpu"
        />

        <Button variant="outlined" endIcon={buttonIcon} fullWidth sx={{ my: 2 }} onClick={toggle}>
          {buttonText}
        </Button>

        {isExpanded(openState) && (
          <Fragment>
            <ToggleButtonField
              label="time"
              name="time"
              buttons={TIME_ICONS}
              required={true}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="mood"
              name="mood"
              buttons={MOOD_ICONS}
              required={true}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="recall"
              name="recall"
              buttons={RECALL_ICONS}
              required={true}
              className="mb-4 flex-wrap"
            />
            <ToggleButtonField
              label="type"
              name="type"
              buttons={TYPE_ICONS}
              required={true}
              className="mb-4 flex-wrap"
            />

            <Suspense fallback={<LoadingSpiral />}>
              <SymbolsAutocomplete />
            </Suspense>
          </Fragment>
        )}
      </Form>

      <CreateInstantSymbolDialog />
    </Fragment>
  )
}
