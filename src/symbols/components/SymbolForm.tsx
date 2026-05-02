import { Form, FormProps } from "src/core/components/Form"
import { z } from "zod"
export { FORM_ERROR, FORM_RESET } from "src/core/components/Form"
import { Grid } from "@mui/material"
import LabeledTextField from "src/core/components/LabeledTextField"
import { Fragment } from "react"
import classnames from "src/utils/classnames"
import FileUpload from "src/core/components/FileUpload"

export interface SymbolFormProps<S extends z.ZodType<any, any>> extends FormProps<S> {
  builtInSymbol?: boolean
  onAfterUpdate?: () => void
}

export function SymbolForm<S extends z.ZodType<any, any>>({
  builtInSymbol = false,
  onAfterUpdate,
  ...props
}: SymbolFormProps<S>) {
  return (
    <Fragment>
      <Form<S> {...props}>
        <Grid container sx={{ mb: 2 }}>
          <Grid item xs={12}>
            {!builtInSymbol && (
              <LabeledTextField
                name="name"
                label="name"
                placeholder="symbol name"
                fullWidth
                // className="rounded-top"
                inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
                inputLabelProps={{ shrink: true, disableAnimation: true }}
                className="translate-x-0 translate-y-0 transform-gpu"
              />
            )}
          </Grid>
          <Grid item xs={12}>
            <LabeledTextField
              name="description"
              label="description"
              placeholder="symbol description"
              fullWidth
              multiline={builtInSymbol}
              disabled={builtInSymbol}
              className={classnames(!builtInSymbol && "translate-x-0 translate-y-0 transform-gpu")}
              // className="rounded-bottom"
              inputProps={{
                sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
              }}
              inputLabelProps={{ shrink: true, disableAnimation: true }}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {!builtInSymbol && (
              <FileUpload
                name="picture"
                initialValues={props?.initialValues}
                onAfterUpdate={onAfterUpdate}
              />
            )}
          </Grid>
        </Grid>
      </Form>
    </Fragment>
  )
}
